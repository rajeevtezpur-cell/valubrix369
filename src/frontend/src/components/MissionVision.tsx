import { Eye, Target } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

export default function MissionVision() {
  const ref = useScrollReveal(true);
  return (
    <section className="py-20 max-w-6xl mx-auto px-4" id="valuation">
      <div className="text-center mb-12">
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Our Purpose
        </h2>
        <p className="text-white/50 text-lg">
          Driving transparency in Indian real estate
        </p>
      </div>
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div className="glass-card p-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            <Target size={26} style={{ color: "#C9A84C" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Our Mission</h3>
          <p className="text-white/60 leading-relaxed">
            To help every Indian validate property value before purchasing —
            making real, trustworthy valuations accessible to all, regardless of
            financial literacy or market expertise.
          </p>
        </div>
        <div className="glass-card p-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            <Eye size={26} style={{ color: "#C9A84C" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Our Vision</h3>
          <p className="text-white/60 leading-relaxed">
            A future where no one overpays for property due to lack of
            information. Where buyers, sellers, and institutions transact with
            complete confidence backed by data and AI.
          </p>
        </div>
      </div>
    </section>
  );
}
