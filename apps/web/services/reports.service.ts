import type {
  CreateMediaReportDto,
  CreateTextReportDto,
  IReport,
  IReportsListResponse,
  MyReportsQueryParams,
  ReportQueryParams,
  UpdateReportStatusDto,
} from '../types/reports.types';
import { apiHandler } from './handler.service';
import { ClientHttp } from './http/http.client.service';

export const getReports = async (params?: ReportQueryParams) => {
  return apiHandler<IReportsListResponse>(ClientHttp.get('/reports', { params }));
};

export const getReportById = async (id: string) => {
  return apiHandler<IReport>(ClientHttp.get(`/reports/${id}`));
};

export const getMyReports = async (params?: MyReportsQueryParams) => {
  return apiHandler<IReportsListResponse>(ClientHttp.get('/reports/mine', { params }));
};

export const createTextReport = async (dto: CreateTextReportDto) => {
  return apiHandler<IReport>(ClientHttp.post('/reports/text', dto));
};

export const createVoiceReport = async (dto: CreateMediaReportDto, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  if (dto.caption) formData.append('caption', dto.caption);
  if (dto.location_type) formData.append('location_type', dto.location_type);
  if (dto.location_code) formData.append('location_code', dto.location_code);
  if (dto.latitude !== undefined) formData.append('latitude', String(dto.latitude));
  if (dto.longitude !== undefined) formData.append('longitude', String(dto.longitude));

  return apiHandler<IReport>(
    ClientHttp.post('/reports/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
};

export const createPhotoReport = async (dto: CreateMediaReportDto, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  if (dto.caption) formData.append('caption', dto.caption);
  if (dto.location_type) formData.append('location_type', dto.location_type);
  if (dto.location_code) formData.append('location_code', dto.location_code);
  if (dto.latitude !== undefined) formData.append('latitude', String(dto.latitude));
  if (dto.longitude !== undefined) formData.append('longitude', String(dto.longitude));

  return apiHandler<IReport>(
    ClientHttp.post('/reports/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
};

export const updateReportStatus = async (id: string, dto: UpdateReportStatusDto) => {
  return apiHandler<IReport>(ClientHttp.patch(`/reports/${id}/status`, dto));
};
