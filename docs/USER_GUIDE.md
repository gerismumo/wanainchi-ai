# Wananchi AI — User Guide

> A plain-language guide for citizens, community leaders, and MPs on how to use the platform.

---

## What is Wananchi AI?

Wananchi AI is a citizen reporting platform for Kenya. You can report a broken road, a burst water pipe, a failing school roof, a security concern — anything affecting your community — directly from your phone. No account, no login, no form-filling. Gemini AI reads your report, classifies it, and clusters similar reports so that community priorities surface to the people who can act on them.

---

## For Citizens — Submitting a Report

### No account needed

You do not need to register or log in. The platform recognises your device through a secure, anonymous identifier stored in your browser. Your name and phone number are never collected.

---

### Step 1 — Open the Submit page

Tap **Submit** in the bottom navigation bar. The platform will silently attempt to detect your location using GPS. If permission is granted, the location field is pre-filled — you can always change it.

---

### Step 2 — Choose your report type

Three options are available:

| Type | When to use |
|---|---|
| **Text** | You want to type a description. Any language — English, Kiswahili, or Sheng. |
| **Voice** | You prefer to speak. Record directly in the browser or upload an audio file. |
| **Photo** | You have a photo of the issue. Take one with your camera or upload from your gallery. |

---

### Text report

1. Select **Text**.
2. Type your report in the text box — describe the issue in as much detail as you can. Min 5 characters, max 5 000.
3. Pick the language you wrote in (English, Kiswahili, or Sheng) so the AI reads it correctly.
4. Optionally pick a category (Water, Roads, Health, Security, Education, Electricity, Sanitation) or type your own.
5. Confirm or adjust the location.
6. Tap **Submit Report**.

---

### Voice report

1. Select **Voice**.
2. Tap the record button and speak clearly. Mention the place name out loud ("near Kangemi market, there is…") — the AI will detect it.
3. When done, stop recording. You can preview and re-record.
4. Alternatively, tap **Upload** to attach an existing audio file.
5. Confirm location and tap **Submit Report**.

Your voice is transcribed by AI, then classified the same way a text report is.

---

### Photo report

1. Select **Photo**.
2. Tap **Take photo** to use your camera, or **Upload photo** to choose from your gallery.
3. Add an optional caption describing what the photo shows.
4. Confirm location and tap **Submit Report**.

The AI reads the image directly — it will identify the type of issue visible and check for a place name in any visible signage or in your caption.

---

### Location — how it works

The location field does three things automatically:

1. **GPS detection** — if you allow location access, the platform reverse-geocodes your coordinates against Kenya's administrative database and pre-fills the nearest ward, constituency, or county.
2. **AI extraction** — even if you never set a location, the AI will try to pull a place name from your report text, audio, or photo caption (e.g. "the road between Ngong and Karen"). If it finds one, it resolves it to the correct administrative level.
3. **Manual picker** — you can always open the location picker and choose county → constituency → ward manually from a cascading dropdown. No internet lookup needed — all location data is bundled in the app.

---

### After you submit

You will see a **Report received** confirmation screen. The AI will:

- Translate your report to English if written in Kiswahili or Sheng
- Assign a category, urgency score, and sentiment
- Check whether it is a genuine report or spam
- Cluster it with similar reports from the same area

You can view your submitted reports anytime by visiting the **Reports** page and filtering for your device's submissions.

---

## For Community Leaders and MPs — Using Digests

### What is a digest?

A digest is an AI-generated briefing that summarises all citizen reports for a specific location and time period. Think of it as a structured community survey compiled automatically from real reports submitted by residents.

A digest for a constituency will show:

- A 3–5 sentence priority summary of what residents are reporting
- A ranked list of issue categories (e.g. Roads: 24 reports, Water: 18 reports)
- Average urgency level per category

---

### Generating a digest for your constituency

Any user can request a digest via the API:

```
POST /api/digests/generate

{
  "location_type": "constituency",
  "location_code": "080",
  "period_start": "2026-07-01",
  "period_end": "2026-07-31"
}
```

The system will:

1. Expand your constituency code to include all wards within it
2. Fetch all valid (non-spam) reports submitted from that area during the period
3. Pass the report summaries to Gemini AI
4. Return a structured digest with a plain-English briefing and ranked issues

Digests can also be generated at **county**, **ward**, or **locality** level.

---

### Reading digests on the dashboard

1. Open the **Digests** page from the navigation.
2. Browse or search digests by location.
3. Click any digest to see the full AI summary, top-issues chart, and a "Browse reports" link that opens the pre-filtered reports feed for that location and period.

---

## Voting on reports

Any visitor can upvote a report they agree with or have personally witnessed. Tap the vote button on any report card. Tapping again removes your vote. Vote counts are visible on every report and help surface the most widely-felt issues.

---

## Privacy

- No name, email, or phone number is ever collected.
- Your device is identified by a random UUID stored as a browser cookie. This cookie is used only to enforce rate limits and prevent spam — it is not shared with third parties.
- Voice recordings and photos are stored in a private object-storage bucket and are not publicly accessible without a direct URL.
- Reports flagged as spam are hidden from the public feed but retained for audit purposes.
