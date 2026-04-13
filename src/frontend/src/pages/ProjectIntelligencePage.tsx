import GlobalNav from "../components/GlobalNav";
import ProjectIntelligenceView from "../components/ProjectIntelligenceView";

export default function ProjectIntelligencePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1E] to-[#0D1B2A]">
      <GlobalNav />

      <main className="pt-16">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-[#0A0F1E] via-[#0D1B2A] to-[#0A0F1E] border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMTIsMTc1LDU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          <div className="max-w-7xl mx-auto px-6 py-10 relative">
            <div className="flex items-center gap-2 text-[#D4AF37]/60 text-sm mb-3">
              <span>ValuBrix</span>
              <span>/</span>
              <span className="text-[#D4AF37]">Project Intelligence</span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Project Intelligence
            </h1>
            <p className="text-white/50 text-lg max-w-2xl">
              AI-powered insights across 150 Bangalore projects — smart
              filtering, investment scoring, hotspot analysis & price
              intelligence.
            </p>
            <div className="flex flex-wrap gap-6 mt-6">
              {[
                { label: "150 Projects", sub: "Fully analyzed" },
                { label: "5 Zones", sub: "All of Bangalore" },
                { label: "AI-Powered", sub: "Real engine scores" },
              ].map(({ label, sub }) => (
                <div key={label} className="flex flex-col">
                  <span className="text-[#D4AF37] font-bold text-lg">
                    {label}
                  </span>
                  <span className="text-white/40 text-xs">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <ProjectIntelligenceView mode="public" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0F1E] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/30 text-sm">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
