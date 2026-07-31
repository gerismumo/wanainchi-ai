# Wananchi AI — System Architecture & Developer Reference

> This document covers how every part of the platform works end-to-end: from a citizen tapping "Submit" on their phone to an MP reading an AI digest of their constituency. Auth and user management are not active in the current build.

---

## Table of Contents

1. [How the Web and API Connect](#1-how-the-web-and-api-connect)
2. [Device Identity — Anonymous, Persistent, Cookied](#2-device-identity)
3. [Submitting a Report](#3-submitting-a-report)
   - 3a. Text report
   - 3b. Voice report
   - 3c. Photo report
4. [AI Pipeline — How Each Report is Processed](#4-ai-pipeline)
5. [Location Resolution with ke-locations-data](#5-location-resolution)
6. [Spam Detection & Abuse Logging](#6-spam-detection--abuse-logging)
7. [Device Trust Score](#7-device-trust-score)
8. [Duplicate Detection](#8-duplicate-detection)
9. [Votes](#9-votes)
10. [AI Digests — From Reports to an MP's Briefing](#10-ai-digests)
11. [API Endpoint Reference](#11-api-endpoint-reference)
12. [Flowcharts](#12-flowcharts)

---

## 1. How the Web and API Connect

```
Browser (Next.js 16)                     Server (NestJS 11)
──────────────────────                   ──────────────────
apps/web/services/http/                  apps/api/src/modules/
  http.client.service.ts  ──── HTTP ──►  reports.controller.ts
  (Axios instance)             /api      digests.controller.ts
                                         votes.controller.ts
                                         analytics.controller.ts
```

Every Axios request goes through `ClientHttp`, a singleton that:

- Reads `NEXT_PUBLIC_API_URL` from env and sets it as `baseURL`
- Reads the `x-client-uuid` cookie via `getClientUuid()` and attaches it as a request header on every call — this is the anonymous device ID
- Forwards through `apiHandler()` which normalises the response shape and surface errors consistently

All API routes are prefixed `/api`. The frontend never talks to the database or Gemini directly.

---

## 2. Device Identity

### The problem it solves

Wananchi AI requires **no account**. Citizens should be able to submit a report in 30 seconds. But the system still needs a stable identity per device to:

- Rate-limit submissions
- Build a per-device trust score
- Track duplicates and spam per device

### How it works

```
apps/web/lib/device-identity.ts
```

On the **first page load** a UUID is generated with `crypto.randomUUID()` (or an RFC 4122 fallback) and stored as a cookie named `x-client-uuid` with a 2-year expiry and `SameSite=Lax`. The cookie survives page refreshes, new tabs, and browser restarts.

Every HTTP request carries this UUID in the `x-client-uuid` header. On the API side the `@DeviceId()` decorator reads it. `DevicesService.resolveDevice()` then:

1. Looks for an existing device row by `client_uuid`
2. Falls back to `fingerprint_hash` if cookies were cleared
3. Creates a new device row if neither matches
4. Updates `last_seen_at`, `last_ip`, and bumps `submission_count` on every request

The device row in Postgres is the anonymous backbone for everything that follows.

---

## 3. Submitting a Report

### Rate limiting

Before any report is saved, two rate limits fire:

| Layer | Cap | Window |
|---|---|---|
| HTTP decorator (`@RateLimit`) | 5 requests / device | 60 seconds |
| Service guard (`guardRateLimit`) | 6 submissions / device (2 for low-trust devices) | 60 minutes |

Low-trust devices (trust score < 0.3) are squeezed to 2 per hour. Exceeding either limit writes an `abuse_logs` row with `reason = "rate_limit"` and returns HTTP 403.

---

### 3a. Text Report

```
POST /api/reports/text
Content-Type: application/json

{
  "content_text": "...",
  "language": "en" | "sw" | "sheng",
  "location_type": "ward",     // optional — from the location picker
  "location_code": "007"       // optional
}
```

**Flow:**

```
Client submits text
  → resolveDevice (find or create device row)
  → guardRateLimit
  → ai.analyzeText(content_text)          ← Gemma 4 31B
      returns: category, summary, sentiment,
               urgencyScore, spamScore, isSpam,
               mentionedLocation
  → resolveReportLocation(dto, mentionedLocation)
  → repo.create(...)
  → finalizeReport (dedup + abuse log + trust adjust)
  → return ReportPublic
```

---

### 3b. Voice Report

```
POST /api/reports/voice
Content-Type: multipart/form-data

file: <audio blob>
location_type: "ward"    // optional
location_code: "007"     // optional
```

The audio is kept in memory (`memStorage`) — never written to disk before processing.

**Flow:**

```
Client submits audio file
  → resolveDevice + guardRateLimit
  → storage.handleReportUpload(file)      ← upload to MinIO, get URL
  → ai.transcribeVoice(buffer, mimetype)  ← Gemini 3.6 Flash (audio model)
      returns: transcript, detectedLanguage, mentionedLocation
  → ai.analyzeText(transcript)            ← Gemma 4 31B classifies the transcript
      returns: category, summary, sentiment, urgencyScore, isSpam, …
  → resolveReportLocation(dto, mentionedLocation)
  → repo.create({ type: 'voice', media_url, content_text: transcript, … })
  → finalizeReport
  → return ReportPublic
```

Audio transcription uses **Gemini 3.6 Flash** (the only model in the stack with audio input support). The transcript is then piped into the same text classification as a regular text report.

---

### 3c. Photo Report

```
POST /api/reports/photo
Content-Type: multipart/form-data

file: <image blob>
caption: "Burst pipe on Ngong Road"   // optional
location_type: "constituency"         // optional
location_code: "012"                  // optional
```

**Flow:**

```
Client submits image file
  → resolveDevice + guardRateLimit
  → storage.handleReportUpload(file)      ← upload to MinIO, get URL
  → ai.analyzeImage(buffer, mimetype, caption)  ← Gemma 4 31B (vision)
      returns: description, category,
               hasVisibleIssue, isSpam, spamScore,
               mentionedLocation
  → resolveReportLocation(dto, mentionedLocation)
  → repo.create({ type: 'photo', media_url, content_text: caption || description, … })
  → finalizeReport
  → return ReportPublic
```

The image is passed as a base64 `inlineData` part alongside the classification prompt. Gemma reads visible signage, landmarks, and the optional caption to extract a place name.

---

### Location resolution priority

```
1. Explicit picker (location_type + location_code from DTO)  ← most reliable
       ↓ if absent
2. mentionedLocation from AI (name extracted from text/audio/image)
       ↓ if absent or lookup fails
3. All location fields stored as NULL
```

---

## 4. AI Pipeline

### Models

| Task | Model | Why |
|---|---|---|
| Text classification | `gemma-4-31b-it` | Large context, multilingual (EN/SW/Sheng) |
| Image analysis | `gemma-4-31b-it` | Native vision support |
| Voice transcription | `gemini-3.6-flash` | Only model with audio input modality |
| Digest generation | `gemma-4-31b-it` | Summarisation over many report texts |

### Text analysis output

```typescript
{
  translatedText: string | null,      // English translation if not already in English
  detectedLanguage: 'en'|'sw'|'sheng'|'other',
  category: 'water'|'roads'|'health'|'security'|
            'education'|'electricity'|'sanitation'|'other',
  summary: string,                    // max 2 sentences, always in English
  sentiment: 'positive'|'neutral'|'negative'|'urgent',
  urgencyScore: number,               // 0–1, risk to life/health/safety
  confidenceScore: number,            // 0–1, how sure the model is
  isSpam: boolean,
  spamScore: number,                  // 0–1
  mentionedLocation: {
    name: string,                     // as written by the citizen
    levelGuess: 'county'|'constituency'|'ward'|'locality'|'area'|null
  } | null
}
```

### Graceful degradation

If Gemini throws (network error, quota exceeded, model refusal), the report is **still saved** with safe defaults (category `other`, urgencyScore `0.3`, isSpam `false`). The error is logged but the citizen gets a success response. This ensures a network hiccup at Gemini never blocks a legitimate submission.

---

## 5. Location Resolution with ke-locations-data

The [`ke-locations-data`](https://www.npmjs.com/package/ke-locations-data) npm package ships a static, offline lookup of Kenya's full administrative hierarchy: **47 counties → 290 constituencies → 1 450 wards → localities → areas**.

The library is used in three distinct ways:

### 5a. Resolving a known (type, code) pair — `resolveLocation()`

When the citizen uses the location picker on the frontend, the picker returns a known `location_type` and `location_code`. `resolveLocation()` fans this out into the full flattened ancestry row stored on every report:

```
resolveLocation('ward', '290')
→ {
    location_type: 'ward',
    location_code: '290',
    location_name: 'Kangemi',
    county_code: '030',
    county_name: 'Nairobi',
    constituency_code: '080',
    constituency_name: 'Westlands',
    locality_code: null,
    locality_name: null,
    location_raw: { … raw object from package … }
  }
```

This flat shape means filtering reports by county works without a JOIN — it's just `WHERE county_code = '030'`.

---

### 5b. Resolving a free-text place name — `resolveLocationByName()`

When Gemma extracts `"Kangemi"` or `"Waiyaki Way"` from a report's text or audio, there is no code — only a string. `resolveLocationByName()` calls:

```typescript
kenyaLocations.search(query)  // fuzzy full-text search across all levels
```

The search returns ranked `SearchResult[]`, each carrying a `.type` (county/constituency/ward/locality/area) and `.item` (the full object). If Gemma also provided a `levelGuess` (e.g. "locality"), the first result matching that level wins. Otherwise the top result wins.

```
resolveLocationByName('Kangemi', 'ward')
  → search returns [
      { type: 'ward',     item: { code: '290', name: 'Kangemi', … } },
      { type: 'locality', item: { code: 'L012', name: 'Kangemi Market', … } },
    ]
  → picks ward (levelGuess match)
  → resolveLocation('ward', '290')
  → full flattened row
```

---

### 5c. Expanding a location to all children — `expandLocationCodes()`

Used for **querying and digest generation**: when you filter by `county/030`, you want reports tagged as county, constituency, ward, locality, or area — not just those explicitly marked `county`. `expandLocationCodes()` walks the hierarchy and returns every `{location_type, location_code}` pair that belongs inside the given location:

```
expandLocationCodes('county', '030')
→ [
    { location_type: 'county',        location_code: '030' },
    { location_type: 'constituency',  location_code: '080' },
    { location_type: 'constituency',  location_code: '081' },
    … all 17 Nairobi constituencies …
    { location_type: 'ward',          location_code: '290' },
    … all 85 Nairobi wards …
    { location_type: 'locality',      location_code: 'L001' },
    … all Nairobi localities and areas …
  ]
```

The repository then generates a compound `WHERE (location_type = X AND location_code = Y) OR …` clause, so a county-level digest or filter automatically includes every nested report regardless of which level it was tagged at.

---

### Location picker on the frontend

The web app ships the same `ke-locations-data` package client-side. The `LocationPicker` component (`apps/web/components/location-picker.tsx`) drives a cascading dropdown: select county → constituencies of that county load → wards of that constituency load. All data is local — zero API calls for the location hierarchy.

Additionally, on the submit page, **GPS auto-detection** runs silently on mount:

```
navigator.geolocation.getCurrentPosition(coords)
  → Nominatim reverse-geocode (openstreetmap.org)
  → extract suburb / neighbourhood / village / town from response
  → kenyaLocations.search(candidate, 3) for each
  → first match sets the location picker value
  → (silent — no toast, no error shown if it fails)
```

The citizen can always override whatever GPS detected.

---

## 6. Spam Detection & Abuse Logging

### Spam scoring

Every report goes through Gemma before being saved. The model returns:

- `isSpam: boolean` — true for gibberish, advertising, content with no civic complaint
- `spamScore: number` — 0 to 1 confidence that the report is spam

Reports where `isSpam = true` are saved with `status = 'reviewed'` (bypassing the normal `processing` queue) and `is_spam = true`. They remain in the database for auditing but are hidden from the public feed by default (`WHERE is_spam = false` unless `include_spam=true` is passed).

### Abuse log entries

`AbuseLogsRepository.log()` writes a row to `abuse_logs` in two situations:

| Event | `reason` | When |
|---|---|---|
| AI flagged a report as spam | `ai_flagged` | After `repo.create()` if `isSpam = true` |
| Device exceeded hourly rate limit | `rate_limit` | In `guardRateLimit()` before report is created |

Each row stores: `report_id`, `device_id`, `ip_address`, `reason`, and `created_at`.

---

## 7. Device Trust Score

Every device starts with a **trust score of 0.5** (stored in `devices.trust_score`, a `DECIMAL(4,3)` clamped between 0 and 1).

After every report is finalised:

| Outcome | Change | Effect |
|---|---|---|
| Report saved and not spam | `+0.01` | Reward for legitimate contribution |
| Report flagged as spam | `−0.05` | Penalise for abuse |

The adjustment is applied with a `GREATEST(0, LEAST(1, trust_score + delta))` SQL expression to prevent the score going outside 0–1.

The trust score feeds the **hourly rate limit**:

```
trust_score < 0.3  →  max 2 submissions per hour  (LOW_TRUST_HOURLY_LIMIT)
trust_score ≥ 0.3  →  max 6 submissions per hour  (DEFAULT_HOURLY_LIMIT)
```

A device that consistently submits spam will drift toward 0 and be squeezed to 2 per hour. A device with a clean history can submit freely.

---

## 8. Duplicate Detection

After every non-spam report is saved, `tryFlagDuplicate()` runs:

1. Fetch up to 10 recent reports from the **same category + same location_code** within the last **72 hours**, excluding the new report.
2. For each candidate, compute **Jaccard similarity** on word sets between the new report's summary and the candidate's summary.
3. If any candidate exceeds the **0.6 similarity threshold**, mark the new report as `duplicate_of = <candidate.id>` and set its status to `reviewed`.

The Jaccard function is intentionally lightweight — it catches identical or near-identical "same pothole" reports without a vector-database round trip on every submission.

---

## 9. Votes

Any device can upvote any non-spam report. Votes are toggled — a second call from the same device removes the vote.

```
POST /api/reports/:reportId/vote
Header: x-client-uuid: <device-uuid>
```

**Flow:**

```
Request arrives
  → resolveDevice (find or create device)
  → votes.findExisting(reportId, userId=null, deviceId)
  → if existing → remove vote
  → if not     → create vote
  → countForReport(reportId)  → return { voted, voteCount }
```

Vote counts are denormalised into the reports read query as `COUNT(DISTINCT v.id) AS vote_count` via a `LEFT JOIN` — no extra round-trip when listing reports.

---

## 10. AI Digests

### What is a digest?

A digest is an AI-generated briefing summarising all citizen reports for a given **location** (county, constituency, ward, locality, or area) over a chosen **time period**. It contains:

- A 3–5 sentence plain-English summary of community priorities
- A ranked list of top issue categories with count and average urgency

### How an MP generates a digest for their constituency

Anyone (including an MP or county officer) can call:

```
POST /api/digests/generate
Content-Type: application/json

{
  "location_type": "constituency",
  "location_code": "080",
  "period_start": "2026-07-01",
  "period_end": "2026-07-31"
}
```

**Flow:**

```
Request arrives
  → resolveLocation(location_type, location_code)
      validates code exists in ke-locations-data
  → expandLocationCodes(location_type, location_code)
      builds full list of child (type, code) pairs
  → repo.getReportsForPeriod(locations, period_start, period_end)
      fetches all non-spam reports tagged at any level within the location
      (ward reports, locality reports, area reports — all included)
  → build categoryCounts: { water: 12, roads: 8, health: 3, … }
  → extract summaries[] from reports
  → ai.summarizeForDigest(summaries, categoryCounts)
      ← Gemma 4 31B writes a plain-English briefing
      returns: { summaryText, topIssues[] }
  → repo.create(digest row)
  → return IAiDigest
```

The same endpoint can be called for a county (gets all reports from all 17 constituencies + wards), a ward, or even a specific locality.

### Reading digests

```
GET /api/digests?location_type=constituency&location_code=080&page=1&limit=10
GET /api/digests/latest?location_type=constituency&location_code=080
GET /api/digests/:id
```

From the web dashboard, the **Digests** page lists all digests. Clicking a digest shows the summary, top-issues chart, and a "Browse reports from this location" link that takes the reader directly to the pre-filtered reports feed.

---

## 11. API Endpoint Reference

All routes are prefixed `/api`.

### Reports

| Method | Path | Description |
|---|---|---|
| `POST` | `/reports/text` | Submit a text report |
| `POST` | `/reports/voice` | Submit a voice report (multipart) |
| `POST` | `/reports/photo` | Submit a photo report (multipart) |
| `GET` | `/reports` | Paginated report list (filterable) |
| `GET` | `/reports/mine` | Reports from this device |
| `GET` | `/reports/:id` | Single report |
| `PATCH` | `/reports/:id/status` | Update status (moderator only) |

**`GET /reports` query params:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default 1) |
| `limit` | number | Per page, max 100 (default 20) |
| `status` | enum | received / processing / reviewed / in_progress / resolved |
| `category` | string | water, roads, health, etc. |
| `sentiment` | enum | positive / neutral / negative / urgent |
| `location_type` | enum | county / constituency / ward / locality / area |
| `location_code` | string | Code for the location — expands to all children |
| `county_code` | string | Direct county filter |
| `constituency_code` | string | Direct constituency filter |
| `q` | string | Full-text search on content and summary |
| `include_spam` | boolean | Include spam reports (default false) |

### Digests

| Method | Path | Description |
|---|---|---|
| `POST` | `/digests/generate` | Generate a new AI digest |
| `GET` | `/digests` | Paginated digest list |
| `GET` | `/digests/latest` | Latest digest for a location |
| `GET` | `/digests/:id` | Single digest |

### Votes

| Method | Path | Description |
|---|---|---|
| `POST` | `/reports/:reportId/vote` | Toggle vote on a report |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics/overview` | Total reports, counties, spam, resolved counts |
| `GET` | `/analytics/categories` | Report counts + avg urgency per category |
| `GET` | `/analytics/locations` | Report counts per location |

---

## 12. Flowcharts

### Report submission (all types)

```
                    ┌─────────────────────────────────┐
                    │   Citizen opens submit page      │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  GPS auto-detect (silent)        │
                    │  Nominatim → ke-locations-data   │
                    │  search() → pre-fill location    │
                    └──────────────┬──────────────────┘
                                   │
                         ┌─────────▼────────┐
                         │  Choose type      │
                         └──┬────────┬───┬──┘
                            │        │   │
                          TEXT     VOICE PHOTO
                            │        │   │
                    ┌───────▼──────────────────┐
                    │  POST /api/reports/{type} │
                    │  Header: x-client-uuid    │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │  resolveDevice()           │
                    │  Find by UUID → fallback   │
                    │  fingerprint → create new  │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │  guardRateLimit()          │
                    │  > limit?  →  403 + log    │
                    └───────────┬───────────────┘
                                │
               ┌────────────────┼───────────────────────┐
               │ TEXT           │ VOICE                  │ PHOTO
               │                │                        │
      analyzeText()    transcribeVoice()       analyzeImage()
      Gemma 4 31B      Gemini 3.6 Flash        Gemma 4 31B
               │          → analyzeText()               │
               └────────────────┬───────────────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │  resolveReportLocation()   │
                    │  1. Explicit picker code   │
                    │  2. AI mentionedLocation   │
                    │     → search() by name     │
                    │  3. NULL fallback          │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │  repo.create()             │
                    │  Persist to PostgreSQL     │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │  finalizeReport()          │
                    ├───────────────────────────┤
                    │  tryFlagDuplicate()        │
                    │  Jaccard similarity        │
                    │  > 0.6 → mark duplicate   │
                    ├───────────────────────────┤
                    │  isSpam?                   │
                    │  YES → abuse_logs + penalize│
                    │  NO  → reward device       │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │   201 Created              │
                    │   ReportPublic JSON        │
                    └───────────────────────────┘
```

---

### Spam & trust score lifecycle

```
New device created
  trust_score = 0.50
        │
        ▼
 Submit report
        │
        ├─── AI: isSpam = false ──► +0.01 trust  (max 1.0)
        │                           status = 'processing'
        │
        └─── AI: isSpam = true  ──► −0.05 trust
                                    status = 'reviewed'
                                    abuse_log: ai_flagged
                                    hidden from public feed

Repeated spam:
  0.50 → 0.45 → 0.40 → 0.35 → 0.30 → crosses threshold
                                        hourly cap: 2 (was 6)
  0.30 → 0.25 → 0.20 …

Rate limit hit (before save):
  abort report
  abuse_log: rate_limit
  (trust score unchanged — limit, not spam)
```

---

### Location resolution pipeline

```
Report arrives with optional location fields
            │
            ▼
 dto.location_type AND dto.location_code present?
            │
           YES ────► resolveLocation(type, code)
            │         ke-locations-data.getXxxByCode(code)
            │         → full flattened row (county/const/ward codes)
            │
            NO
            │
            ▼
 AI returned mentionedLocation.name ?
            │
           YES ────► resolveLocationByName(name, levelGuess)
            │         kenyaLocations.search(name)
            │         → ranked results → pick levelGuess match
            │         → resolveLocation(type, code)
            │
            NO
            │
            ▼
        All NULL  (stored but report is still saved)
```

---

### Digest generation

```
POST /api/digests/generate
  { location_type, location_code, period_start, period_end }
            │
            ▼
  resolveLocation()  ── unknown code? → 400
            │
            ▼
  expandLocationCodes(type, code)
    county → all constituencies + wards + localities + areas
    constituency → constituency + wards + localities
    ward → ward only
    locality → locality + areas
    area → area only
            │
            ▼
  getReportsForPeriod(locations[], start, end)
    WHERE (location_type=X AND location_code=Y) OR …
    AND is_spam = false
    AND created_at BETWEEN start AND end
            │
     0 reports? → 400
            │
            ▼
  Build categoryCounts { water: 12, roads: 8, … }
  Extract summaries[]
            │
            ▼
  ai.summarizeForDigest(summaries, categoryCounts)
    ← Gemma 4 31B
    → { summaryText, topIssues[] }
            │
            ▼
  repo.create(digest)
  → stored with full location ancestry
            │
            ▼
  Return IAiDigest  { id, summary_text, top_issues, report_count, … }
```

---

### Vote toggle

```
POST /api/reports/:reportId/vote
  Header: x-client-uuid: <uuid>
            │
            ▼
  resolveDevice(uuid)
            │
            ▼
  votes.findExisting(reportId, deviceId)
            │
      exists? ──YES──► repo.remove(vote)  → voted = false
            │
            NO
            │
            ▼
      repo.create(vote)  → voted = true
            │
            ▼
  countForReport(reportId)
            │
            ▼
  { voted: bool, voteCount: number }
```
