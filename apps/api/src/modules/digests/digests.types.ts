import { LocationType } from 'src/common/util/location.util';

export interface GenerateDigestInput {
  location_type: LocationType;
  location_code: string;
  period_start: string; // 'YYYY-MM-DD'
  period_end: string; // 'YYYY-MM-DD'
}
