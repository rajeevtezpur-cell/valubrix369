import React from "react";

interface ProCardSkeletonProps {
  height?: string;
}

export function ProCardSkeleton({ height = "160px" }: ProCardSkeletonProps) {
  return (
    <div
      className="glass-card relative overflow-hidden"
      style={{ minHeight: height }}
      aria-label="Loading pro intelligence data"
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 rounded-[18px]"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }}
        aria-hidden="true"
      />

      {/* Skeleton content structure */}
      <div className="relative z-10 p-5 flex flex-col gap-3">
        {/* Icon + label row */}
        <div className="flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-2.5 w-40 rounded" />
          </div>
        </div>
        {/* Value block */}
        <div className="skeleton h-10 w-32 rounded-lg mt-1" />
        {/* Progress or meter */}
        <div className="skeleton h-2.5 w-full rounded-full" />
        {/* Sub-label */}
        <div className="skeleton h-2.5 w-24 rounded" />
      </div>
    </div>
  );
}
