import useSWR from 'swr';
import { useState } from 'react';
import {
  createPhotoReport,
  createTextReport,
  createVoiceReport,
  getMyReports,
  getReportById,
  getReports,
  updateReportStatus,
} from '../services/reports.service';
import type {
  CreateMediaReportDto,
  CreateTextReportDto,
  MyReportsQueryParams,
  ReportQueryParams,
  UpdateReportStatusDto,
} from '../types/reports.types';

/** Paginated, filterable public report list. Re-fetches when `query` changes. */
export const useReports = (query?: ReportQueryParams) => {
  const { data, error, isLoading, mutate } = useSWR(
    ['reports', query],
    async () => {
      const result = await getReports(query);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** Fetch a single report by UUID. */
export const useReport = (id: string | null) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `reports/${id}` : null,
    async () => {
      const result = await getReportById(id!);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** Reports submitted by the current device / user. */
export const useMyReports = (query?: MyReportsQueryParams) => {
  const { data, error, isLoading, mutate } = useSWR(
    ['reports/mine', query],
    async () => {
      const result = await getMyReports(query);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
  );

  return { data: data ?? null, error, isLoading, mutate };
};

/** Submit a plain-text report. */
export const useCreateTextReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: CreateTextReportDto) => {
    setIsLoading(true);
    setError(null);
    const result = await createTextReport(dto);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** Submit a voice report with an audio file. */
export const useCreateVoiceReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: CreateMediaReportDto, file: File) => {
    setIsLoading(true);
    setError(null);
    const result = await createVoiceReport(dto, file);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** Submit a photo report with an image file. */
export const useCreatePhotoReport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (dto: CreateMediaReportDto, file: File) => {
    setIsLoading(true);
    setError(null);
    const result = await createPhotoReport(dto, file);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};

/** Moderator/admin status update for a report. */
export const useUpdateReportStatus = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (id: string, dto: UpdateReportStatusDto) => {
    setIsLoading(true);
    setError(null);
    const result = await updateReportStatus(id, dto);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};
