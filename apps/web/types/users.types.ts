import type { PaginatedResult } from './pagination.types';

export type LocationType = 'county' | 'constituency' | 'ward' | 'locality' | 'area';

export interface IRole {
  id: string;
  name: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  added_by: string | null;
  created_at: string;
  roles: IRole[];

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

export interface CreateUserDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number?: string;
  is_active?: boolean;
  roles: string[]; // role UUIDs
  location_type?: LocationType;
  location_code?: string;
}

export interface UpdateUserDto {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  is_active?: boolean;
  roles: string[]; // role UUIDs
  avatar_url?: string;
  location_type?: LocationType;
  location_code?: string;
}

export interface UpdatePasswordDto {
  password: string;
}

export interface UserQueryParams {
  page?: number;
  q?: string;
  role?: string;
  roleId?: string;
}

export interface IUsersListResponse extends PaginatedResult<IUser> {}
