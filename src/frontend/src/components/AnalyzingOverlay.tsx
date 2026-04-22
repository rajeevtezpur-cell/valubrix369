// AnalyzingOverlay.tsx — Premium full-screen AI processing overlay
// Module-specific titles and steps per ValuBrix brand requirements
// Shows for minimum 1.5s, maximum 3s, or until data is ready (whichever is longer)
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { FlowMode } from "./steps/types";

export interface AnalyzingOverlayProps {
  /** Whether the overlay should be shown */
  isVisible: boolean;
  /** Called when animation finishes AND data is ready */
  onComplete?: () => void;
  /** Module context for title and steps */
  module: FlowMode;
  /** Set to true when external data is ready — overlay waits for this + min duration */
  dataReady?: boolean;
  /** Alias for isVisible — supports both prop names */
  visible?: boolean;
}

const MIN_DURATION_MS = 1500;
const MAX_DURATION_MS = 3000;
const STEP_INTERVAL_MS = 600;

// ─── Module-specific titles ───────────────────────────────────────────────────

const MODULE_TITLES: Record<FlowMode, string> = {
  valuation: "ValuBrix AI is Analyzing Property Intelligence…",
  buy: "ValuBrix Agent is Finding Your Dream Property…",
  rent: "ValuBrix is Finding the Best Rental Options…",
  area: "Analyzing Location Intelligence & Growth Signals…",
  sell: "ValuBrix is Evaluating Your Property for Best Exit…",
};

// ─── Module-specific steps ────────────────────────────────────────────────────

const MODULE_STEPS: Record<FlowMode, string[]> = {
  valuation: [
    "Scanning 1200+ transactions…",
    "Running valuation models…",
    "Analyzing market trends…",
  ],
  buy: [
    "Searching best matching homes…",
    "Filtering top projects…",
    "Optimizing based on your preferences…",
  ],
  rent: [
    "Scanning rental listings nearby…",
    "Analyzing pricing trends…",
    "Matching with your budget…",
  ],
  area: [
    "Evaluating connectivity…",
    "Mapping infrastructure…",
    "Analyzing future growth…",
  ],
  sell: [
    "Analyzing demand in your area…",
    "Matching buyer trends…",
    "Estimating optimal selling price…",
  ],
};

// ─── Neural Network Node Positions (static, pre-defined) ─────────────────────

const NODE_POSITIONS = [
  { x: 40, y: 30 },
  { x: 100, y: 15 },
  { x: 170, y: 40 },
  { x: 240, y: 20 },
  { x: 290, y: 55 },
  { x: 60, y: 90 },
  { x: 130, y: 75 },
  { x: 200, y: 95 },
  { x: 265, y: 80 },
  { x: 25, y: 150 },
  { x: 90, y: 140 },
  { x: 155, y: 160 },
  { x: 220, y: 145 },
  { x: 295, y: 165 },
  { x: 50, y: 200 },
  { x: 130, y: 195 },
  { x: 190, y: 210 },
  { x: 260, y: 200 },
];

const NODE_RADII = [6, 4, 7, 5, 6, 4, 8, 5, 6, 4, 7, 5, 6, 4, 5, 7, 4, 6];
const NODE_PULSE_DURATIONS = [
  1.4, 1.8, 1.1, 2.2, 1.6, 2.4, 0.9, 1.7, 2.0, 1.3, 1.9, 1.5, 2.1, 0.8, 1.6,
  1.2, 2.3, 1.0,
];
const NODE_PULSE_DELAYS = [
  0, 0.3, 0.7, 1.1, 0.5, 1.4, 0.2, 0.9, 1.6, 0.4, 1.0, 0.6, 1.8, 0.1, 1.2, 0.8,
  0.3, 1.5,
];

// ─── Build edges between nearby nodes (< 120px apart) ────────────────────────

type Edge = { x1: number; y1: number; x2: number; y2: number; length: number };

function buildEdges(): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < NODE_POSITIONS.length; i++) {
    for (let j = i + 1; j < NODE_POSITIONS.length; j++) {
      const dx = NODE_POSITIONS[j].x - NODE_POSITIONS[i].x;
      const dy = NODE_POSITIONS[j].y - NODE_POSITIONS[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        edges.push({
          x1: NODE_POSITIONS[i].x,
          y1: NODE_POSITIONS[i].y,
          x2: NODE_POSITIONS[j].x,
          y2: NODE_POSITIONS[j].y,
          length: dist,
        });
      }
    }
  }
  return edges;
}

const EDGES = buildEdges();

// ─── Orbiting dots config ─────────────────────────────────────────────────────

const ORBIT_DOTS = [
  { nodeIdx: 6, orbitR: 16, speed: 2.2, startAngle: 0 },
  { nodeIdx: 11, orbitR: 14, speed: 3.1, startAngle: 120 },
  { nodeIdx: 1, orbitR: 13, speed: 1.8, startAngle: 60 },
  { nodeIdx: 14, orbitR: 15, speed: 2.6, startAngle: 240 },
  { nodeIdx: 8, orbitR: 12, speed: 3.5, startAngle: 180 },
];

// ─── Animated SVG line ────────────────────────────────────────────────────────

function NeuralEdge({ edge, delay }: { edge: Edge; delay: number }) {
  return (
    <motion.line
      x1={edge.x1}
      y1={edge.y1}
      x2={edge.x2}
      y2={edge.y2}
      stroke="rgba(212,175,55,0.22)"
      strokeWidth={0.75}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        pathLength: { duration: 0.8, delay, ease: "easeInOut" },
        opacity: { duration: 0.3, delay },
      }}
    />
  );
}

// ─── Orbiting dot ────────────────────────────────────────────────────────────

function OrbitDot({
  nodeIdx,
  orbitR,
  speed,
  startAngle,
}: (typeof ORBIT_DOTS)[0]) {
  const cx = NODE_POSITIONS[nodeIdx].x;
  const cy = NODE_POSITIONS[nodeIdx].y;

  return (
    <motion.circle
      r={2}
      fill="rgba(246,215,122,0.85)"
      style={{ filter: "drop-shadow(0 0 3px rgba(246,215,122,0.9))" }}
      initial={{
        cx: cx + orbitR * Math.cos((startAngle * Math.PI) / 180),
        cy: cy + orbitR * Math.sin((startAngle * Math.PI) / 180),
      }}
      animate={{
        cx: [
          cx + orbitR * Math.cos(((startAngle + 0) * Math.PI) / 180),
          cx + orbitR * Math.cos(((startAngle + 90) * Math.PI) / 180),
          cx + orbitR * Math.cos(((startAngle + 180) * Math.PI) / 180),
          cx + orbitR * Math.cos(((startAngle + 270) * Math.PI) / 180),
          cx + orbitR * Math.cos(((startAngle + 360) * Math.PI) / 180),
        ],
        cy: [
          cy + orbitR * Math.sin(((startAngle + 0) * Math.PI) / 180),
          cy + orbitR * Math.sin(((startAngle + 90) * Math.PI) / 180),
          cy + orbitR * Math.sin(((startAngle + 180) * Math.PI) / 180),
          cy + orbitR * Math.sin(((startAngle + 270) * Math.PI) / 180),
          cy + orbitR * Math.sin(((startAngle + 360) * Math.PI) / 180),
        ],
      }}
      transition={{
        duration: speed,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    />
  );
}

// ─── Glowing node ─────────────────────────────────────────────────────────────

function NeuralNode({
  x,
  y,
  r,
  pulseDuration,
  pulseDelay,
}: {
  x: number;
  y: number;
  r: number;
  pulseDuration: number;
  pulseDelay: number;
}) {
  return (
    <motion.circle
      cx={x}
      cy={y}
      r={r}
      fill="url(#nodeGrad)"
      style={{ filter: "drop-shadow(0 0 5px rgba(212,175,55,0.75))" }}
      initial={{ scale: 1, opacity: 0 }}
      animate={{
        scale: [1, 1.35, 0.75, 1.2, 1],
        opacity: [0, 1, 1, 1, 1],
      }}
      transition={{
        scale: {
          duration: pulseDuration,
          delay: pulseDelay,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        },
        opacity: { duration: 0.4, delay: pulseDelay },
      }}
    />
  );
}

// ─── Full neural network SVG ──────────────────────────────────────────────────

function NeuralNetworkSVG() {
  return (
    <svg
      width={320}
      height={240}
      viewBox="0 0 320 240"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="nodeGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#F6D77A" />
          <stop offset="100%" stopColor="#D4AF37" />
        </radialGradient>
      </defs>

      {/* Edges */}
      {EDGES.map((edge, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, index is stable
        <NeuralEdge key={`edge-${i}`} edge={edge} delay={i * 0.04} />
      ))}

      {/* Nodes */}
      {NODE_POSITIONS.map((pos, i) => (
        <NeuralNode // biome-ignore lint/suspicious/noArrayIndexKey: static geometry, index is stable
          key={`node-${i}`}
          x={pos.x}
          y={pos.y}
          r={NODE_RADII[i]}
          pulseDuration={NODE_PULSE_DURATIONS[i]}
          pulseDelay={NODE_PULSE_DELAYS[i]}
        />
      ))}

      {/* Orbiting dots */}
      {ORBIT_DOTS.map((dot, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static geometry array, index is stable
        <OrbitDot key={`orbit-${i}`} {...dot} />
      ))}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyzingOverlay({
  isVisible: isVisibleProp,
  visible,
  onComplete,
  module,
  dataReady = false,
}: AnalyzingOverlayProps) {
  // Support both `isVisible` and `visible` prop names
  const isVisible = isVisibleProp ?? visible ?? false;

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [animDone, setAnimDone] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = MODULE_STEPS[module];

  // Start timers when overlay becomes visible
  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setProgress(0);
      setAnimDone(false);
      startTimeRef.current = null;
      return;
    }

    startTimeRef.current = Date.now();
    setAnimDone(false);
    setProgress(0);
    setCurrentStep(0);

    let stepIdx = 0;
    stepIntervalRef.current = setInterval(() => {
      setTimeout(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        setCurrentStep(stepIdx);
      }, 200);
    }, STEP_INTERVAL_MS);

    const progressTick = 50;
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) =>
        Math.min(100, prev + (progressTick / MAX_DURATION_MS) * 100),
      );
    }, progressTick);

    minTimerRef.current = setTimeout(() => {
      setAnimDone(true);
    }, MIN_DURATION_MS);

    maxTimerRef.current = setTimeout(() => {
      setAnimDone(true);
      setProgress(100);
    }, MAX_DURATION_MS);

    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    };
  }, [isVisible, steps.length]);

  // Fire onComplete when BOTH animDone AND dataReady (or dataReady is not required)
  useEffect(() => {
    if (animDone && (dataReady || !isVisible)) {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      onComplete?.();
    }
  }, [animDone, dataReady, isVisible, onComplete]);

  const title = MODULE_TITLES[module];

  // Derive step checklist: completed = all steps up to currentStep
  const completedSteps = currentStep;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="analyzing-overlay"
          data-ocid="analyzing_overlay.container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, #1a2340 0%, #0F172A 55%, #07101e 100%)",
          }}
          aria-live="polite"
          aria-label={title}
        >
          {/* Logo */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2">
            <img
              src="/assets/valubrix-logo.png"
              alt="ValuBrix"
              style={{ height: 56, width: "auto", objectFit: "contain" }}
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.includes("uploads")) {
                  img.src =
                    "/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png";
                } else {
                  img.style.display = "none";
                  const fallback = img.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "block";
                }
              }}
            />
            <span
              className="text-sm font-bold tracking-widest opacity-40"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "#D4AF37",
                display: "none",
              }}
            >
              VALUBRIX
            </span>
          </div>

          {/* Main content */}
          <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm w-full">
            {/* ── Neural Network Animation ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                position: "relative",
                width: 320,
                height: 240,
              }}
            >
              <NeuralNetworkSVG />

              {/* Subtle ambient glow behind network */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.07) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />
            </motion.div>

            {/* ── Module Badge ─────────────────────────────────── */}
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.25)",
              }}
            >
              <span
                className="text-xs tracking-[0.18em] uppercase font-semibold"
                style={{ color: "rgba(212,175,55,0.65)" }}
              >
                ✦ Area Intelligence
              </span>
            </div>

            {/* ── ANALYSING label ───────────────────────────────── */}
            <div>
              <p
                className="text-xs tracking-[0.25em] uppercase mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                ANALYSING
              </p>
              <h2
                className="font-semibold"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(16px, 3.5vw, 22px)",
                  lineHeight: 1.3,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {title}
              </h2>
            </div>

            {/* ── Step checklist ────────────────────────────────── */}
            <div className="w-full flex flex-col gap-2">
              {steps.map((step, idx) => {
                const isDone = idx < completedSteps;
                const isActive = idx === completedSteps;
                return (
                  <motion.div // biome-ignore lint/suspicious/noArrayIndexKey: steps array is static per module
                    key={`step-${idx}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15, duration: 0.3 }}
                    className="flex items-center gap-3 text-left"
                  >
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: isDone
                          ? "rgba(212,175,55,0.2)"
                          : isActive
                            ? "rgba(212,175,55,0.1)"
                            : "rgba(255,255,255,0.05)",
                        border: isDone
                          ? "1px solid rgba(212,175,55,0.6)"
                          : isActive
                            ? "1px solid rgba(212,175,55,0.3)"
                            : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {isDone ? (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          role="img"
                          aria-hidden="true"
                        >
                          <path
                            d="M2 5l2.5 2.5L8 3"
                            stroke="#D4AF37"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : isActive ? (
                        <motion.div
                          className="w-2 h-2 rounded-full"
                          style={{ background: "#D4AF37" }}
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{
                            duration: 0.8,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                        />
                      ) : (
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.15)" }}
                        />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className="text-xs flex-1"
                      style={{
                        color: isDone
                          ? "rgba(212,175,55,0.7)"
                          : isActive
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.25)",
                        textDecoration: isDone ? "line-through" : "none",
                      }}
                    >
                      {step}
                    </span>

                    {/* Active "processing…" tag */}
                    {isActive && (
                      <AnimatePresence>
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1.2,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                          className="text-[10px] italic"
                          style={{ color: "rgba(212,175,55,0.55)" }}
                        >
                          processing…
                        </motion.span>
                      </AnimatePresence>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* ── Progress bar ──────────────────────────────────── */}
            <div className="w-full">
              <div className="flex justify-between mb-1.5">
                <span
                  className="text-[10px] tracking-wider uppercase"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Analysis Progress
                </span>
                <span
                  className="text-[10px] font-semibold tabular-nums"
                  style={{ color: "rgba(212,175,55,0.7)" }}
                >
                  {Math.round(progress)}%
                </span>
              </div>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: 3, background: "rgba(255,255,255,0.07)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #D4AF37 0%, #F6D77A 50%, #D4AF37 100%)",
                    backgroundSize: "200% 100%",
                    width: `${progress}%`,
                  }}
                  animate={{ backgroundPosition: ["0% 0%", "100% 0%"] }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
