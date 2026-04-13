import { Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export interface DrillDownItem {
  name: string;
  distance?: number;
  weight?: number;
  rating?: number;
  contribution?: string;
  line?: string; // for metro
}

interface ScoreDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoreType: "tech" | "amenity" | "location" | "demand" | "deal";
  title: string;
  items: DrillDownItem[];
  score: number;
}

const SCORE_COLORS: Record<string, string> = {
  tech: "#60a5fa",
  amenity: "#a78bfa",
  location: "#34d399",
  demand: "#f97316",
  deal: "#D4AF37",
};

const METRO_LINE_COLORS: Record<string, string> = {
  Purple: "bg-purple-500",
  Green: "bg-green-500",
  Yellow: "bg-yellow-500",
  Blue: "bg-blue-500",
  Red: "bg-red-500",
  Pink: "bg-pink-500",
};

export default function ScoreDrillDownModal({
  isOpen,
  onClose,
  scoreType,
  title,
  items,
  score,
}: ScoreDrillDownModalProps) {
  const color = SCORE_COLORS[scoreType] ?? "#D4AF37";
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            data-ocid="score_modal.backdrop"
          />

          {/* Panel — slides up on mobile, fade+scale on desktop */}
          <motion.div
            data-ocid="score_modal.dialog"
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] z-50 rounded-t-3xl md:rounded-2xl overflow-hidden"
            style={{
              background: "rgba(10,15,30,0.97)",
              border: `1px solid ${color}40`,
              boxShadow: `0 0 40px ${color}20, 0 20px 60px rgba(0,0,0,0.7)`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-white/10"
              style={{ borderBottomColor: `${color}20` }}
            >
              <div className="flex items-center gap-4">
                {/* Mini ring gauge */}
                <div className="relative w-[88px] h-[88px] flex-shrink-0">
                  <svg
                    width="88"
                    height="88"
                    viewBox="0 0 88 88"
                    role="img"
                    aria-label="Score ring"
                  >
                    <title>Score ring</title>
                    <circle
                      cx="44"
                      cy="44"
                      r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="6"
                    />
                    <motion.circle
                      cx="44"
                      cy="44"
                      r={radius}
                      fill="none"
                      stroke={color}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: dashOffset }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      transform="rotate(-90 44 44)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-bold text-xl" style={{ color }}>
                      {score}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">{title}</h2>
                  <p className="text-white/40 text-xs mt-0.5">
                    {items.length} contributing factors
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                data-ocid="score_modal.close_button"
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            {/* Items list */}
            <div className="max-h-80 overflow-y-auto px-6 py-4 space-y-2">
              {items.length === 0 && (
                <p className="text-white/30 text-sm text-center py-8">
                  No data available for this area.
                </p>
              )}
              {items.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/8"
                  data-ocid={`score_modal.item.${i + 1}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Metro line badge */}
                    {item.line && (
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${METRO_LINE_COLORS[item.line] ?? "bg-gray-500"}`}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {item.name}
                      </p>
                      {item.line && (
                        <p className="text-white/30 text-xs">
                          {item.line} Line
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    {item.rating !== undefined && (
                      <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                        <Star size={10} fill="currentColor" /> {item.rating}
                      </span>
                    )}
                    {item.distance !== undefined && (
                      <span className="text-white/50 text-xs font-mono">
                        {item.distance} mins
                      </span>
                    )}
                    {item.contribution && (
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{ color, background: `${color}20` }}
                      >
                        {item.contribution}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/8 text-center">
              <p className="text-white/25 text-xs">
                Scores are computed using travel time (mins) + weighted infra
                data
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
