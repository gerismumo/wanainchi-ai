import type {
  DigestQueryParams,
  GenerateDigestDto,
  IAiDigest,
  IDigestsListResponse,
  LatestDigestQueryParams,
} from '../types/digests.types';
import { apiHandler } from './handler.service';
import { ClientHttp } from './http/http.client.service';

export const generateDigest = async (dto: GenerateDigestDto) => {
  return apiHandler<IAiDigest>(ClientHttp.post('/digests/generate', dto));
};

export const getDigests = async (params?: DigestQueryParams) => {
  return apiHandler<IDigestsListResponse>(ClientHttp.get('/digests', { params }));
};

export const getDigestById = async (id: string) => {
  return apiHandler<IAiDigest>(ClientHttp.get(`/digests/${id}`));
};

export const getLatestDigest = async (params: LatestDigestQueryParams) => {
  return apiHandler<IAiDigest>(ClientHttp.get('/digests/latest', { params }));
};
