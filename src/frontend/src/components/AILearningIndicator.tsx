import {
  getModelStats,
  getRealDataConfidenceLabel,
} from "../engines/linearRegressionEngine";

export default function AILearningIndicator() {
  const stats = getModelStats();

  if (!stats) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/40 text-sm">
        AI model initializing...
      </div>
    );
  }

  const { label, level } = getRealDataConfidenceLabel(stats.realDataDominance);
  const realPct = stats.realDataDominance;
  const builderPct = 100 - realPct;

  const badgeClass =
    level === "high"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : level === "medium"
        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
        : "bg-amber-500/20 text-amber-300 border-amber-500/30";

  const barColor =
    level === "high"
      ? "bg-emerald-400"
      : level === "medium"
        ? "bg-blue-400"
        : "bg-amber-400";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-white/70 text-xs font-medium">
            AI Learning Status
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}
        >
          {label}
        </span>
      </div>

      {/* Info lines */}
      <div className="space-y-1">
        <p className="text-white/60 text-xs">
          🤖 AI is learning from real transactions
        </p>
        <p className="text-white/60 text-xs">
          📈 Accuracy improving with each new sale
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Real data</span>
          <span className="text-white/50">Builder data</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
          <div
            className={`h-full rounded-l-full transition-all duration-700 ${barColor}`}
            style={{ width: `${realPct}%` }}
          />
          <div
            className="h-full rounded-r-full bg-white/20"
            style={{ width: `${builderPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/40">{realPct}% real</span>
          <span className="text-white/40">{builderPct}% builder</span>
        </div>
      </div>

      {/* Count */}
      <p className="text-white/30 text-xs">
        Based on {stats.realCount} real sales + {stats.builderCount} builder
        records
      </p>
    </div>
  );
}
