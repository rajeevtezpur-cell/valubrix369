import { useScrollReveal } from "../hooks/useScrollReveal";

export default function OurPromise() {
  const ref = useScrollReveal();
  return (
    <section className="py-24 max-w-4xl mx-auto px-4 text-center">
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <p
          className="text-sm font-semibold uppercase tracking-widest mb-6"
          style={{ color: "#C9A84C" }}
        >
          Our Promise
        </p>
        <blockquote
          className="italic text-2xl md:text-3xl lg:text-4xl leading-relaxed"
          style={{
            color: "#C9A84C",
            textShadow: "0 0 40px rgba(201,168,76,0.3)",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          &ldquo;ValuBrix is committed to bringing clarity and trust to property
          transactions in India.&rdquo;
        </blockquote>
        <div className="mt-8 flex justify-center">
          <div
            className="h-0.5 w-24"
            style={{
              background:
                "linear-gradient(to right, transparent, #C9A84C, transparent)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
