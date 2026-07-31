import { kenyaLocations, SearchResult } from 'ke-locations-data';

export type LocationType = 'county' | 'constituency' | 'ward' | 'locality' | 'area';

export interface ResolvedLocation {
  location_type: LocationType | null;
  location_code: string | null;
  location_name: string | null;
  county_code: string | null;
  county_name: string | null;
  constituency_code: string | null;
  constituency_name: string | null;
  locality_code: string | null;
  locality_name: string | null;
  location_raw: Record<string, unknown> | null;
}

const EMPTY: ResolvedLocation = {
  location_type: null,
  location_code: null,
  location_name: null,
  county_code: null,
  county_name: null,
  constituency_code: null,
  constituency_name: null,
  locality_code: null,
  locality_name: null,
  location_raw: null,
};

/**
 * Best-effort constituency inference for locations that don't carry a
 * direct constituency link in the package (areas, and localities in
 * counties with multiple constituencies). Matches the location's own name
 * against every ward name in the same county — informal settlement and
 * estate names very often coincide with, or are contained within, a ward
 * name (e.g. "Kawangware" the estate sits inside "Kawangware" the ward).
 * Best-effort and silent on failure — an unresolved constituency just
 * stays null rather than blocking the report.
 */
function inferConstituencyByNameInCounty(
  name: string,
  countyCode: string,
): { constituency_code: string | null; constituency_name: string | null } {
  try {
    const needle = name.toLowerCase().trim();
    if (!needle) return { constituency_code: null, constituency_name: null };

    const constituencies = kenyaLocations.getConstituenciesByCounty(countyCode) ?? [];
    for (const constituency of constituencies) {
      const wards = kenyaLocations.getWardsByConstituency(constituency.code) ?? [];
      const match = wards.find((w) => {
        const wardName = w.name.toLowerCase();
        return wardName.includes(needle) || needle.includes(wardName);
      });
      if (match) {
        return { constituency_code: match.constituency_code, constituency_name: match.constituency_name };
      }
    }
  } catch {
    // package call failed — fall through to null
  }
  return { constituency_code: null, constituency_name: null };
}

/**
 * Resolves a (location_type, location_code) pair coming from the client into
 * the fully-flattened ancestry shape shared by users/reports/ai_digests
 * (see addLocationColumns() in the migration). Returns an all-null object
 * if the type/code is missing or unknown to the ke-locations-data package —
 * callers can safely spread the result straight into an insert/update.
 */
export function resolveLocation(type?: LocationType, code?: string): ResolvedLocation {
  if (!type || !code) return { ...EMPTY };

  switch (type) {
    case 'county': {
      const county = kenyaLocations.getCountyByCode(code);
      if (!county) return { ...EMPTY };
      return {
        ...EMPTY,
        location_type: 'county',
        location_code: county.code,
        location_name: county.name,
        county_code: county.code,
        county_name: county.name,
        location_raw: county as unknown as Record<string, unknown>,
      };
    }

    case 'constituency': {
      const constituency = kenyaLocations.getConstituencyByCode(code);
      if (!constituency) return { ...EMPTY };
      return {
        ...EMPTY,
        location_type: 'constituency',
        location_code: constituency.code,
        location_name: constituency.name,
        county_code: constituency.county_code,
        county_name: constituency.county_name,
        constituency_code: constituency.code,
        constituency_name: constituency.name,
        location_raw: constituency as unknown as Record<string, unknown>,
      };
    }

    case 'ward': {
      const ward = kenyaLocations.getWardByCode(code);
      if (!ward) return { ...EMPTY };
      return {
        ...EMPTY,
        location_type: 'ward',
        location_code: ward.code,
        location_name: ward.name,
        county_code: ward.county_code,
        county_name: ward.county_name,
        constituency_code: ward.constituency_code,
        constituency_name: ward.constituency_name,
        location_raw: ward as unknown as Record<string, unknown>,
      };
    }

    case 'locality': {
      const locality = kenyaLocations.getLocalityByCode(code);
      if (!locality) return { ...EMPTY };
      // Localities don't carry a direct constituency link in the package —
      // infer it by matching the locality's name against ward names in the
      // same county, so a locality-level report still rolls up to an MP's
      // actual constituency instead of stopping at the county level.
      const inferred = inferConstituencyByNameInCounty(locality.name, locality.county_code);
      return {
        ...EMPTY,
        location_type: 'locality',
        location_code: locality.code,
        location_name: locality.name,
        county_code: locality.county_code,
        county_name: locality.county_name,
        constituency_code: inferred.constituency_code,
        constituency_name: inferred.constituency_name,
        locality_code: locality.code,
        locality_name: locality.name,
        location_raw: locality as unknown as Record<string, unknown>,
      };
    }

    case 'area': {
      const area = kenyaLocations.getAreaByCode(code);
      if (!area) return { ...EMPTY };
      // Same gap as localities, one level deeper — areas only carry a raw
      // `locality` string and a county code, no constituency link. Try the
      // area's own name first (most specific), then its parent locality
      // name, against ward names in the county.
      const inferred =
        inferConstituencyByNameInCounty(area.name, area.county_code).constituency_code
          ? inferConstituencyByNameInCounty(area.name, area.county_code)
          : inferConstituencyByNameInCounty(area.locality, area.county_code);
      return {
        ...EMPTY,
        location_type: 'area',
        location_code: area.code,
        location_name: area.name,
        county_code: area.county_code,
        county_name: area.county_name,
        constituency_code: inferred.constituency_code,
        constituency_name: inferred.constituency_name,
        // IArea only carries a raw `locality` string, not a code — stored in
        // both slots since it's the closest we have to a locality code here.
        locality_code: area.locality,
        locality_name: area.locality,
        location_raw: area as unknown as Record<string, unknown>,
      };
    }

    default:
      return { ...EMPTY };
  }
}

export interface LocationRef {
  location_type: LocationType;
  location_code: string;
}

/**
 * Given a (type, code) pair, returns every (type, code) pair that belongs
 * to — or is contained within — that location.
 *
 * Examples:
 *   county/001  → county/001 + all its constituencies + wards + localities + areas
 *   constituency/001 → constituency/001 + its wards + localities in county + areas in those localities
 *   ward/001    → ward/001 only (wards are the leaf before areas, areas link by locality string)
 *   locality/001 → locality/001 + its areas
 *   area/001    → area/001 only
 *
 * Results are deduplicated so the query stays clean even when the package
 * returns overlapping data.
 */
export function expandLocationCodes(type: LocationType, code: string): LocationRef[] {
  const seen = new Set<string>();
  const refs: LocationRef[] = [];

  const add = (t: LocationType, c: string) => {
    const key = `${t}:${c}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push({ location_type: t, location_code: c });
  };

  switch (type) {
    case 'county': {
      const county = kenyaLocations.getCountyByCode(code);
      if (!county) break;
      add('county', county.code);

      const constituencies = kenyaLocations.getConstituenciesByCounty(county.code);
      for (const c of constituencies) {
        add('constituency', c.code);
        for (const w of kenyaLocations.getWardsByConstituency(c.code)) {
          add('ward', w.code);
        }
      }

      for (const loc of kenyaLocations.getLocalitiesByCounty(county.code)) {
        add('locality', loc.code);
        for (const area of kenyaLocations.getAreasByLocality(loc.name)) {
          add('area', area.code);
        }
      }

      for (const area of kenyaLocations.getAreasByCounty(county.code)) {
        add('area', area.code);
      }
      break;
    }

    case 'constituency': {
      const constituency = kenyaLocations.getConstituencyByCode(code);
      if (!constituency) break;
      add('constituency', constituency.code);

      for (const w of kenyaLocations.getWardsByConstituency(constituency.code)) {
        add('ward', w.code);
      }

      // Pull localities + areas that belong to the same county and whose
      // areas fall within wards of this constituency (best-effort — the
      // package has no direct constituency→locality link).
      for (const loc of kenyaLocations.getLocalitiesByCounty(constituency.county_code)) {
        add('locality', loc.code);
        for (const area of kenyaLocations.getAreasByLocality(loc.name)) {
          add('area', area.code);
        }
      }
      break;
    }

    case 'ward': {
      const ward = kenyaLocations.getWardByCode(code);
      if (!ward) break;
      add('ward', ward.code);
      break;
    }

    case 'locality': {
      const locality = kenyaLocations.getLocalityByCode(code);
      if (!locality) break;
      add('locality', locality.code);
      for (const area of kenyaLocations.getAreasByLocality(locality.name)) {
        add('area', area.code);
      }
      break;
    }

    case 'area': {
      const area = kenyaLocations.getAreaByCode(code);
      if (!area) break;
      add('area', area.code);
      break;
    }
  }

  return refs;
}

// A small hand-curated gazetteer of well-known informal settlements,
// estates, and landmarks that citizens will absolutely say out loud
// ("Kibera", "Mathare", "Eastleigh", "Kawangware") but which the official
// ke-locations-data package may not carry as a searchable entry at all,
// since it tracks formal administrative units, not colloquial place names.
// Tried only after kenyaLocations.search() comes up empty — this is a
// deliberately small, high-confidence list, not an attempt to replace the
// package; add to it as you discover more gaps during testing.
const KNOWN_LANDMARKS: Record<string, { type: LocationType; code: string }> = {
  // Nairobi
  kibera: { type: 'constituency', code: 'KE-047-08' },
  mathare: { type: 'constituency', code: 'KE-047-04' },
  eastleigh: { type: 'constituency', code: 'KE-047-05' },
  kawangware: { type: 'ward', code: 'KE-047-06-02' },
  kangemi: { type: 'ward', code: 'KE-047-21-02' },
  // Mombasa
  'old town': { type: 'constituency', code: 'KE-001-01' },
  likoni: { type: 'constituency', code: 'KE-001-02' },
  // NOTE: the exact codes above are illustrative placeholders — verify each
  // against the actual ke-locations-data codes for your installed version
  // before relying on this table in a demo. Wrong codes are worse than no
  // match, since they'll misfile a report under the wrong constituency.
};

function lookupKnownLandmark(name: string): ResolvedLocation | null {
  const key = name.toLowerCase().trim();
  const hit = KNOWN_LANDMARKS[key];
  if (!hit) return null;
  return resolveLocation(hit.type, hit.code);
}

/**
 * Fallback path for reports where the citizen never picked a location on a
 * map/dropdown — Gemma pulls a place name straight out of the free text
 * ("Kangemi", "Waiyaki Way, Westlands") and we look it up here by name
 * instead of by code.
 *
 * Resolution order, most confident first:
 *   1. Exact case-insensitive name match from the package search, at the
 *      level Gemma guessed (if any).
 *   2. Most SPECIFIC level available among the remaining search results
 *      (ward/locality/area beat constituency/county) — a specific match
 *      carries more of the ancestry chain for free.
 *   3. The hand-curated KNOWN_LANDMARKS gazetteer, for informal
 *      settlements/estates the official package doesn't carry at all.
 *
 * NB: assumes `kenyaLocations.search(query)` exists per the package's own
 * `SearchResult`/`SearchType` types — verify against the installed
 * ke-locations-data version if search() isn't actually exposed that way.
 */
export function resolveLocationByName(
  name: string,
  levelHint?: LocationType | null,
): ResolvedLocation {
  const query = name?.trim();
  if (!query) return { ...EMPTY };

  const SPECIFICITY: LocationType[] = ['area', 'locality', 'ward', 'constituency', 'county'];

  try {
    const results: SearchResult[] = kenyaLocations.search(query) ?? [];

    if (results.length) {
      const exactMatches = results.filter(
        (r) => (r.item as { name?: string }).name?.toLowerCase() === query.toLowerCase(),
      );
      const pool = exactMatches.length ? exactMatches : results;

      const hintMatch = levelHint ? pool.find((r) => r.type === levelHint) : undefined;

      const bySpecificity = [...pool].sort(
        (a, b) => SPECIFICITY.indexOf(a.type as LocationType) - SPECIFICITY.indexOf(b.type as LocationType),
      );

      const match:any = hintMatch ?? bySpecificity[0];
      const code = (match.item as { code: string }).code;
      return resolveLocation(match.type as LocationType, code);
    }
  } catch {
    // Package threw (unknown query shape, version mismatch, etc.) — fall
    // through to the landmark gazetteer rather than failing the report.
  }

  return lookupKnownLandmark(query) ?? { ...EMPTY };
}