import type {
  AnalyticsOverview,
  CountySummary,
  LocationSummary,
  ReturningDevice,
  TopCategory,
} from '../types/analytics.types';
import type { LocationType } from '../types/users.types';
import { apiHandler } from './handler.service';
import { ClientHttp } from './http/http.client.service';

export const getAnalyticsOverview = async () => {
  return apiHandler<AnalyticsOverview>(ClientHttp.get('/analytics/overview'));
};

export const getLocationSummary = async (location_type?: LocationType) => {
  return apiHandler<LocationSummary[]>(
    ClientHttp.get('/analytics/locations', { params: location_type ? { location_type } : undefined }),
  );
};

export const getCountySummary = async () => {
  return apiHandler<CountySummary[]>(ClientHttp.get('/analytics/counties'));
};

export const getTopCategories = async () => {
  return apiHandler<TopCategory[]>(ClientHttp.get('/analytics/categories'));
};

export const getReturningDevices = async () => {
  return apiHandler<ReturningDevice[]>(ClientHttp.get('/analytics/returning-devices'));
};
