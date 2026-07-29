import useSWR from 'swr';
import { useState } from 'react';
import { forgotPassword, getProfile, login, resetPassword } from '../services/auth.service';
import type { ForgotDto, LoginDto, ResetDto } from '../types/auth.types';

/**
 * Fetch the authenticated user's profile.
 * Pass `enabled = false` to skip fetching (e.g. on public pages).
 */
export const useProfile = (enabled = true) => {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? 'auth/profile' : null,
    async () => {
      const result = await getProfile();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** One-shot login — not SWR-based, returns a promise the caller awaits. */
export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: LoginDto) => {
    setIsLoading(true);
    setError(null);
    const result = await login(dto);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** One-shot forgot-password request. */
export const useForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: ForgotDto) => {
    setIsLoading(true);
    setError(null);
    const result = await forgotPassword(dto);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** One-shot password reset. */
export const useResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: ResetDto) => {
    setIsLoading(true);
    setError(null);
    const result = await resetPassword(dto);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};
