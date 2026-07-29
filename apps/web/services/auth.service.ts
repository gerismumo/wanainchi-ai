import type { ForgotDto, LoginDto, LoginResponse, ResetDto, UserPayload } from '../types/auth.types';
import { apiHandler } from './handler.service';
import { ClientHttp } from './http/http.client.service';

export const login = async (dto: LoginDto) => {
  return apiHandler<LoginResponse>(ClientHttp.post('/auth/login', dto));
};

export const forgotPassword = async (dto: ForgotDto) => {
  return apiHandler<null>(ClientHttp.post('/auth/forgot', dto));
};

export const resetPassword = async (dto: ResetDto) => {
  return apiHandler<null>(ClientHttp.post('/auth/reset', dto));
};

export const getProfile = async () => {
  return apiHandler<UserPayload>(ClientHttp.get('/auth/profile'));
};
