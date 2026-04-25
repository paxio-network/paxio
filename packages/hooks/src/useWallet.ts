'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

export function useWallet(agentDid: string) {
  return useQuery({
    queryKey: ['wallet', agentDid],
    queryFn: () => paxioClient.wallet?.getBalance(agentDid),
    enabled: !!agentDid,
    staleTime: 10_000,
  });
}