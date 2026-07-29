export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotDto {
  email: string;
  type: 'password' | 'pin';
}

export interface ResetDto {
  token: string;
  newValue: string;
  email: string;
}

export interface UserPayload {
  id: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: UserPayload;
}
