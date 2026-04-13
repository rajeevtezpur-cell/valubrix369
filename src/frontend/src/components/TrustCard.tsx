import { CheckCircle } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const trustPoints = [
  "Verified public data sources — registration records & municipal data",
  "Secure document storage with bank-grade encryption",
  "Transparent valuation models — no hidden parameters",
  "Strictly no hidden brokerage or agent commissions",
  "Bank-grade valuation logic for institutional-quality reports",
];

export default function TrustCard() {
  const ref = useScrollReveal();
  return (
    <section className="py-20 max-w-6xl mx-auto px-4">
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="relative rounded-[24px] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(10,15,30,0.9) 100%)",
          border: "1px solid rgba(201,168,76,0.2)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{
            background:
              "linear-gradient(to bottom, #C9A84C, rgba(201,168,76,0.2))",
          }}
        />
        <div className="px-10 md:px-16 py-12 md:py-16">
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(201,168,76,0.15)",
                border: "1px solid rgba(201,168,76,0.3)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9A84C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <title>Shield</title>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2
              className="text-2xl md:text-3xl font-bold text-white"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Trust, Security &amp; Transparency
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trustPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <CheckCircle
                  size={18}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: "#16C784" }}
                />
                <span className="text-white/70 text-sm md:text-base">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
