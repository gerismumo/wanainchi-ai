import { LocationType } from 'src/common/util/location.util';

export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPayload {
  id: string;
  email: string;
  roles: string[];
}

export interface IRole {
  id: string;
  name: string;
}

export interface IUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  password_hash: string;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  added_by: string | null;
  can_sell_below_net_price: boolean;
  min_sale_price_percentage: number | null;
  below_net_price_approved_by: string | null;
  below_net_price_approved_at: Date | null;
  below_net_price_notes: string | null;
  created_at: string;
  roles: IRole[];

  // Location ancestry — mirrors addLocationColumns() in the migration
  // (shared with reports / ai_digests). A user may have no location at
  // all, or only the levels relevant to their location_type populated.
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