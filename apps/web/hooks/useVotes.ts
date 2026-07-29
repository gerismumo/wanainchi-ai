import { useState } from 'react';
import { toggleVote } from '../services/votes.service';

/**
 * Toggle a vote on a report.
 * Optimistic UI is left to the caller — `mutate` from `useReport` or
 * `useReports` can be called after `execute` resolves.
 */
export const useToggleVote = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (reportId: string) => {
    setIsLoading(true);
    setError(null);
    const result = await toggleVote(reportId);
    setIsLoading(false);
    if (!result.success) setError(result.message);
    return result;
  };

  return { execute, isLoading, error };
};
