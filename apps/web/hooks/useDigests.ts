import useSWR from 'swr';
import { useState } from 'react';
import {
  generateDigest,
  getDigestById,
  getDigests,
  getLatestDigest,
} from '../services/digests.service';
import type {
  DigestQueryParams,
  GenerateDigestDto,
  LatestDigestQueryParams,
} from '../types/digests.types';

/** Paginated digest list, optionally filtered by location. */
export const useDigests = (query?: DigestQueryParams) => {
  const { data, error, isLoading, mutate } = useSWR(
    ['digests', query],
    async () => {
      const result = await getDigests(query);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** Fetch a single digest by UUID. */
export const useDigest = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `digests/${id}` : null,
    async () => {
      const result = await getDigestById(id!);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/**
 * Fetch the most recent digest for a given location.
 * Pass `null` to skip fetching until the location is known.
 */
export const useLatestDigest = (params: LatestDigestQueryParams | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    params ? ['digests/latest', params] : null,
    async () => {
      const result = await getLatestDigest(params!);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** Trigger AI digest generation for a location + date range. */
export const useGenerateDigest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: GenerateDigestDto) => {
    setIsLoading(true);
    setError(null);
    const result = await generateDigest(dto);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};
