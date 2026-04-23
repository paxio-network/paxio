'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

export function useGuard(agentDid: string) {
  return useQuery({
    queryKey: ['guard', agentDid],
    queryFn: () => paxioClient.guard?.check(agentDid),
    enabled: !!agentDid,
    staleTime: 30_000,
  });
}