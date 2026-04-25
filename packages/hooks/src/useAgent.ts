'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';

export function useAgent(did: string) {
  return useQuery({
    queryKey: ['agent', did],
    queryFn: () => paxioClient.registry.resolve(did),
    enabled: did.length > 0,
  });
}