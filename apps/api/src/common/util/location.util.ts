import { kenyaLocations } from 'ke-locations-data';

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
      return {
        ...EMPTY,
        location_type: 'locality',
        location_code: locality.code,
        location_name: locality.name,
        county_code: locality.county_code,
        county_name: locality.county_name,
        locality_code: locality.code,
        locality_name: locality.name,
        location_raw: locality as unknown as Record<string, unknown>,
      };
    }

    case 'area': {
      const area = kenyaLocations.getAreaByCode(code);
      if (!area) return { ...EMPTY };
      return {
        ...EMPTY,
        location_type: 'area',
        location_code: area.code,
        location_name: area.name,
        county_code: area.county_code,
        county_name: area.county_name,
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
