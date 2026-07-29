import type { VoteResponse } from '../types/votes.types';
import { apiHandler } from './handler.service';
import { ClientHttp } from './http/http.client.service';

export const toggleVote = async (reportId: string) => {
  return apiHandler<VoteResponse>(ClientHttp.post(`/reports/${reportId}/vote`));
};
