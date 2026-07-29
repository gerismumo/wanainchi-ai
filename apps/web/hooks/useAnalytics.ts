import useSWR from 'swr';
import {
  getAnalyticsOverview,
  getCountySummary,
  getLocationSummary,
  getReturningDevices,
  getTopCategories,
} from '../services/analytics.service';
import type { LocationType } from '../types/users.types';

/** High-level dashboard counts (total reports, resolved, active counties, spam). */
export const useAnalyticsOverview = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'analytics/overview',
    async () => {
      const result = await getAnalyticsOverview();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/**
 * Per-location report summary.
 * Pass a `locationType` to filter (e.g. 'county'), or omit for all locations.
 */
export const useLocationSummary = (locationType?: LocationType) => {
  const { data, error, isLoading, mutate } = useSWR(
    ['analytics/locations', locationType],
    async () => {
      const result = await getLocationSummary(locationType);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? [], error, isLoading, mutate };
};

/** County-level aggregated summary. */
export const useCountySummary = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'analytics/counties',
    async () => {
      const result = await getCountySummary();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? [], error, isLoading, mutate };
};

/** Top report categories by volume. */
export const useTopCategories = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'analytics/categories',
    async () => {
      const result = await getTopCategories();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? [], error, isLoading, mutate };
};

/** Returning devices list (admin/moderator only). */
export const useReturningDevices = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'analytics/returning-devices',
    async () => {
      const result = await getReturningDevices();
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? [], error, isLoading, mutate };
};
