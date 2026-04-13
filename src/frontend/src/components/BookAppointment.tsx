import { Calendar } from "lucide-react";
import { useState } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

export default function BookAppointment() {
  const [hovered, setHovered] = useState(false);
  const ref = useScrollReveal();
  return (
    <section className="py-24 max-w-3xl mx-auto px-4 text-center">
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-4">
          Get Started
        </p>
        <h2
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Talk to a Property Expert
        </h2>
        <p className="text-white/50 mb-10 max-w-xl mx-auto">
          Our certified property analysts can help you evaluate any property,
          resolve doubts, and guide your investment decision.
        </p>
        <button
          type="button"
          data-ocid="appointment.primary_button"
          className="inline-flex items-center gap-3 px-10 py-5 rounded-full text-white font-bold text-base transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            boxShadow: hovered
              ? "0 12px 40px rgba(249,115,22,0.5)"
              : "0 6px 24px rgba(249,115,22,0.3)",
            transform: hovered ? "scale(1.05)" : "scale(1)",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Calendar size={20} />
          Book An Appointment
        </button>
      </div>
    </section>
  );
}
