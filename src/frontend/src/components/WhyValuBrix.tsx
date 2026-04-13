import { useScrollReveal } from "../hooks/useScrollReveal";

export default function WhyValuBrix() {
  const ref = useScrollReveal();
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-20 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0A0F1E 0%, #0D1628 50%, #0A0F1E 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 80% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto px-4">
        <div
          className="glass-card p-10 md:p-14"
          style={{ borderLeft: "4px solid #C9A84C" }}
        >
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Why ValuBrix Exists
          </h2>
          <div className="space-y-5 text-white/65 leading-relaxed text-base md:text-lg">
            <p>
              Real estate in India is the largest financial decision most
              families will ever make — yet pricing remains opaque,
              broker-driven, and riddled with information asymmetry. Buyers
              routinely overpay by 10–30% simply because they have no reliable
              benchmark.
            </p>
            <p>
              Agents and developers set prices based on sentiment and
              negotiation leverage, not data. Valuation reports are expensive,
              slow, and often inaccessible to ordinary buyers. Meanwhile,
              institutional investors and large developers operate with
              sophisticated data — a playing field that has never been level.
            </p>
            <p>
              <strong className="text-white">ValuBrix changes that.</strong> We
              aggregate public records, registration data, comparable sales,
              infrastructure development timelines, and AI-computed micro-market
              signals to give every buyer, seller, and investor a clear,
              confident answer:{" "}
              <em style={{ color: "#C9A84C" }}>
                "What is this property really worth?"
              </em>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
