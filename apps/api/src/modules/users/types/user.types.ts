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
  country: string | null;
  added_by: string | null;
  can_sell_below_net_price: boolean;
  min_sale_price_percentage: number | null;
  below_net_price_approved_by: string | null;
  below_net_price_approved_at: Date | null;
  below_net_price_notes: string | null;
  created_at: string;
  roles: IRole[];
}
