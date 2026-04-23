'use client';

interface RailsSkeletonProps {
  className?: string;
}

/**
 * Loading placeholder for FAP rails (TD-12 Real Data Invariant — no hardcoded fallback).
 * Shown while `paxioClient.landing.getRails()` is pending or returns an empty array.
 * Skeleton shape mirrors the 4-tile rail grid so layout is stable.
 */
export function RailsSkeleton({ className }: RailsSkeletonProps) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading payment rails">
      {/* Ghost FAP diagram */}
      <div className="h-32 rounded-lg border border-white/10 bg-white/5 animate-pulse mb-8" />
      {/* Ghost rail grid — 4 placeholder tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="border border-white/10 rounded-lg p-4 bg-white/5 animate-pulse"
          >
            <div className="w-3 h-3 rounded-full mx-auto mb-2 bg-white/20" />
            <div className="h-3 rounded bg-white/20 mx-auto w-16 mt-2" />
            <div className="h-2 rounded bg-white/10 mx-auto w-12 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
