import { useCountUp } from "../hooks/useCountUp";

function StatItem({
  target,
  label,
  prefix = "",
  suffix = "+",
}: { target: number; label: string; prefix?: string; suffix?: string }) {
  const { count, ref } = useCountUp(target, 2200);
  const display =
    target >= 1000 ? count.toLocaleString("en-IN") : count.toString();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="flex flex-col items-center gap-2"
    >
      <span
        className="text-4xl md:text-5xl font-bold"
        style={{
          color: "#D8B56A",
          fontFamily: "'Playfair Display', serif",
          textShadow: "0 0 30px rgba(216,181,106,0.30)",
        }}
      >
        {prefix}
        {display}
        {suffix}
      </span>
      <span
        className="text-sm md:text-base text-center"
        style={{ color: "#B9C6D8" }}
      >
        {label}
      </span>
    </div>
  );
}

export default function StatsCounter() {
  return (
    <section className="py-16 relative">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(216,181,106,0.04) 0%, transparent 50%, rgba(59,130,246,0.04) 100%)",
        }}
      />
      <div className="relative max-w-5xl mx-auto px-4">
        <div
          className="glass-card py-12 px-8 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-4 text-center"
          style={{ border: "1px solid rgba(216,181,106,0.18)" }}
        >
          <StatItem target={15000} label="Properties Analyzed" />
          <div
            className="hidden sm:block w-px self-stretch"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <StatItem target={50} label="Micro-locations Mapped" />
          <div
            className="hidden sm:block w-px self-stretch"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <StatItem target={98} label="Valuation Accuracy" suffix="%" />
        </div>
      </div>
    </section>
  );
}
