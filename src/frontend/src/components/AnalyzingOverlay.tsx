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
  const [stepVisible, setStepVisible] = useState(true);

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
      setStepVisible(true);
      startTimeRef.current = null;
      return;
    }

    startTimeRef.current = Date.now();
    setAnimDone(false);
    setProgress(0);
    setCurrentStep(0);

    let stepIdx = 0;
    stepIntervalRef.current = setInterval(() => {
      setStepVisible(false);
      setTimeout(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        setCurrentStep(stepIdx);
        setStepVisible(true);
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
          <div className="flex flex-col items-center gap-8 px-6 text-center max-w-md w-full">
            {/* Pulse ring animation */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: 80, height: 80 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 80,
                    height: 80,
                    border:
                      i % 2 === 0
                        ? "1.5px solid rgba(212,175,55,0.5)"
                        : "1.5px solid rgba(99,102,241,0.4)",
                  }}
                  animate={{ scale: [1, 2.8], opacity: [0.7, 0] }}
                  transition={{
                    duration: 1.8,
                    delay: i * 0.6,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeOut",
                  }}
                />
              ))}
              {/* Core circle */}
              <div
                className="relative z-10 flex items-center justify-center rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  background:
                    "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(99,102,241,0.18) 100%)",
                  border: "1.5px solid rgba(212,175,55,0.45)",
                  boxShadow:
                    "0 0 28px rgba(212,175,55,0.25), 0 0 60px rgba(99,102,241,0.12)",
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="14"
                      cy="14"
                      r="4"
                      fill="#D4AF37"
                      opacity="0.9"
                    />
                    <path
                      d="M14 4 L14 8"
                      stroke="#D4AF37"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    <path
                      d="M14 20 L14 24"
                      stroke="#6366F1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    <path
                      d="M4 14 L8 14"
                      stroke="#D4AF37"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    <path
                      d="M20 14 L24 14"
                      stroke="#6366F1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                    <path
                      d="M7.05 7.05 L9.88 9.88"
                      stroke="#D4AF37"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                    <path
                      d="M18.12 18.12 L20.95 20.95"
                      stroke="#6366F1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                    <path
                      d="M20.95 7.05 L18.12 9.88"
                      stroke="#D4AF37"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                    <path
                      d="M9.88 18.12 L7.05 20.95"
                      stroke="#6366F1"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.4"
                    />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Module-specific Title */}
            <div>
              <h2
                className="text-white font-semibold mb-2"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(18px, 4vw, 26px)",
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h2>
            </div>

            {/* Animated step text */}
            <div className="h-6 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {stepVisible && (
                  <motion.p
                    key={`step-${currentStep}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium"
                    style={{ color: "rgba(212,175,55,0.8)" }}
                  >
                    {steps[currentStep]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 3, background: "rgba(255,255,255,0.08)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #D4AF37 0%, #6366F1 60%, #D4AF37 100%)",
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
