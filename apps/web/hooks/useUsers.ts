import useSWR from 'swr';
import { useState } from 'react';
import {
  createUser,
  deleteUser,
  getRoles,
  getUserById,
  getUsers,
  updatePassword,
  updateUser,
} from '../services/users.service';
import type {
  CreateUserDto,
  UpdatePasswordDto,
  UpdateUserDto,
  UserQueryParams,
} from '../types/users.types';

/** Paginated, filterable user list. Re-fetches whenever `query` changes. */
export const useUsers = (query?: UserQueryParams) => {
  const { data, error, isLoading, mutate } = useSWR(
    ['users', query],
    async () => {
      const result = await getUsers(query);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** Fetch a single user by UUID. */
export const useUser = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `users/${id}` : null,
    async () => {
      const result = await getUserById(id!);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** Fetch all available roles (for dropdowns). */
export const useRoles = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'users/roles',
    async () => {
      const result = await getRoles();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? [], error, isLoading, mutate };
};

/** Create a new user (supports optional avatar file). */
export const useCreateUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: CreateUserDto, avatar?: File) => {
    setIsLoading(true);
    setError(null);
    const result = await createUser(dto, avatar);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** Update an existing user (supports optional avatar file). */
export const useUpdateUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (id: string, dto: UpdateUserDto, avatar?: File) => {
    setIsLoading(true);
    setError(null);
    const result = await updateUser(id, dto, avatar);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** Admin password update for a specific user. */
export const useUpdatePassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (id: string, dto: UpdatePasswordDto) => {
    setIsLoading(true);
    setError(null);
    const result = await updatePassword(id, dto);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** Delete a user by UUID. */
export const useDeleteUser = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (id: string) => {
    setIsLoading(true);
    setError(null);
    const result = await deleteUser(id);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};
