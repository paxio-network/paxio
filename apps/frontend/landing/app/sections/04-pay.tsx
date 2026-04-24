'use client';
import { useQuery } from '@tanstack/react-query';
import { paxioClient } from '@paxio/api-client';
import { ConditionalSection, FAPDiagram, RailsSkeleton, SectionFrame, UpcomingBadge } from '@paxio/ui';

export function Pay() {
  const { data, isPending } = useQuery({
    queryKey: ['landing-rails'],
    queryFn: () => paxioClient.landing.getRails(),
    staleTime: 10_000,
  });

  // Inline narrowing: `!data || data.length === 0` narrows `data` from
  // `RailInfo[] | undefined` to `RailInfo[]` in the truthy branch.
  // `exactOptionalPropertyTypes: true` amplifies any remaining `undefined`
  // into a confusing TS2719 ("Two different types with this name exist").
  // `?? false` on `hasTraffic` ensures `ConditionalSection.show` always
  // receives a strict `boolean` (not `boolean | undefined`).
  const hasTraffic = data?.some((r) => r.share_pct > 0) ?? false;

  return (
    <SectionFrame id="pay" eyebrow="Payment Layer" dark>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-white">Meta-Facilitator — Multi-Rail Routing</h2>
          <p className="text-white/50">FAP routes payments across x402, MPP, Skyfire, TAP, BTC L1</p>
        </div>
        {isPending || !data || data.length === 0 ? (
          <RailsSkeleton />
        ) : (
          <ConditionalSection
            show={hasTraffic}
            fallback={
              <div className="flex justify-center">
                <UpcomingBadge label="FAP routing — launching with M-L4b" />
              </div>
            }
          >
            <FAPDiagram rails={data} className="mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {data.slice(0, 4).map(r => (
                <div key={r.name} className="border border-white/10 rounded-lg p-4 bg-white/5">
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: r.color_hex }} />
                  <div className="text-sm font-mono text-white/70">{r.name}</div>
                  <div className="text-xs font-mono text-white/30 mt-1">{r.fee_description}</div>
                </div>
              ))}
            </div>
          </ConditionalSection>
        )}
      </div>
    </SectionFrame>
  );
}
