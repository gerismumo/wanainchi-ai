import type {
  CreateUserDto,
  IUser,
  IUsersListResponse,
  RoleResponse,
  UpdatePasswordDto,
  UpdateUserDto,
  UserQueryParams,
} from '../types/users.types';
import { apiHandler } from './handler.service';
import { ClientHttp } from './http/http.client.service';

export const getUsers = async (params?: UserQueryParams) => {
  return apiHandler<IUsersListResponse>(ClientHttp.get('/users', { params }));
};

export const getUserById = async (id: string) => {
  return apiHandler<IUser>(ClientHttp.get(`/users/${id}`));
};

export const getRoles = async () => {
  return apiHandler<RoleResponse[]>(ClientHttp.get('/users/roles'));
};

export const createUser = async (dto: CreateUserDto, avatar?: File) => {
  const formData = new FormData();

  // Append all scalar fields
  formData.append('first_name', dto.first_name);
  formData.append('last_name', dto.last_name);
  formData.append('email', dto.email);
  formData.append('password', dto.password);
  if (dto.phone_number) formData.append('phone_number', dto.phone_number);
  if (dto.is_active !== undefined) formData.append('is_active', String(dto.is_active));
  if (dto.location_type) formData.append('location_type', dto.location_type);
  if (dto.location_code) formData.append('location_code', dto.location_code);

  // Roles must be serialised — the server parses JSON.parse() on the string
  formData.append('roles', JSON.stringify(dto.roles));

  if (avatar) formData.append('avatar', avatar);

  return apiHandler<IUser>(
    ClientHttp.post('/users', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
};

export const updateUser = async (id: string, dto: UpdateUserDto, avatar?: File) => {
  const formData = new FormData();

  formData.append('first_name', dto.first_name);
  formData.append('last_name', dto.last_name);
  formData.append('email', dto.email);
  if (dto.phone_number) formData.append('phone_number', dto.phone_number);
  if (dto.is_active !== undefined) formData.append('is_active', String(dto.is_active));
  if (dto.location_type) formData.append('location_type', dto.location_type);
  if (dto.location_code) formData.append('location_code', dto.location_code);
  if (dto.avatar_url) formData.append('avatar_url', dto.avatar_url);

  formData.append('roles', JSON.stringify(dto.roles));

  if (avatar) formData.append('avatar', avatar);

  return apiHandler<IUser>(
    ClientHttp.patch(`/users/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
};

export const updatePassword = async (id: string, dto: UpdatePasswordDto) => {
  return apiHandler<null>(ClientHttp.patch(`/users/${id}/password`, dto));
};

export const deleteUser = async (id: string) => {
  return apiHandler<null>(ClientHttp.delete(`/users/${id}`));
};
