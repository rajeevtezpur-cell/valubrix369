import { ChevronDown, ChevronUp, Info, Shield } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export interface AuditBreakdownItem {
  label: string;
  value: string;
  contribution?: number; // percentage 0–100
  explanation: string;
}

interface AuditPanelProps {
  title?: string;
  confidence: number;
  confidenceReason: string;
  breakdown: AuditBreakdownItem[];
  disclaimer?: string;
  defaultOpen?: boolean;
}

function confidenceColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 55) return "#D4AF37";
  return "#ef4444";
}

function confidenceLabel(score: number): string {
  if (score >= 75) return "High Confidence";
  if (score >= 55) return "Moderate Confidence";
  return "Low Confidence";
}

export default function AuditPanel({
  title = "Detailed Analysis",
  confidence,
  confidenceReason,
  breakdown,
  disclaimer,
  defaultOpen = false,
}: AuditPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const color = confidenceColor(confidence);

  return (
    <div
      className="mt-6 rounded-2xl border border-white/10 bg-white/3 overflow-hidden"
      data-ocid="audit.panel"
    >
      {/* Header — always visible */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white/5">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-[#D4AF37]" />
          <span className="text-sm font-semibold text-white/80">{title}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Confidence pill */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: `${color}20`,
              color,
              border: `1px solid ${color}40`,
            }}
          >
            <span>{confidence}%</span>
            <span className="opacity-70">{confidenceLabel(confidence)}</span>
          </div>

          <button
            type="button"
            data-ocid="audit.panel.toggle"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-all"
            aria-expanded={open}
          >
            {open ? (
              <>
                <ChevronUp size={13} />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                <span>How calculated</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/40">Data confidence</span>
          <span className="text-xs" style={{ color }}>
            {confidenceReason}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="audit-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {/* Component table */}
              <div className="mt-3 rounded-xl overflow-hidden border border-white/8">
                <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                  <span className="col-span-3">Component</span>
                  <span className="col-span-3 text-right">Value</span>
                  <span className="col-span-2 text-right">Weight</span>
                  <span className="col-span-4 text-right">Explanation</span>
                </div>
                {breakdown.map((item, i) => (
                  <div
                    key={item.label}
                    className={`grid grid-cols-12 px-3 py-2.5 text-xs items-center gap-1 ${
                      i % 2 === 0 ? "bg-white/2" : "bg-transparent"
                    } border-b border-white/5 last:border-0`}
                  >
                    <span className="col-span-3 text-white/70 font-medium">
                      {item.label}
                    </span>
                    <span className="col-span-3 text-right text-[#D4AF37] font-mono font-semibold">
                      {item.value}
                    </span>
                    <span className="col-span-2 text-right">
                      {item.contribution !== undefined ? (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${confidenceColor(item.contribution)}18`,
                            color: confidenceColor(item.contribution),
                          }}
                        >
                          {item.contribution}%
                        </span>
                      ) : null}
                    </span>
                    <span className="col-span-4 text-right text-white/35 text-[10px]">
                      {item.explanation}
                    </span>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              {disclaimer && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/8">
                  <Info size={12} className="text-white/30 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-white/30 leading-relaxed">
                    {disclaimer}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
