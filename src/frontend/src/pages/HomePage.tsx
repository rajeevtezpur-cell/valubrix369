import {
  Building2,
  Home,
  Mail,
  MapPin,
  Phone,
  TrendingUp,
  Users,
} from "lucide-react";
import BookAppointment from "../components/BookAppointment";
import FeatureCards from "../components/FeatureCards";
import Footer from "../components/Footer";
import GuestLimitModal from "../components/GuestLimitModal";
import HeroSection from "../components/HeroSection";
import MissionVision from "../components/MissionVision";
import Navbar from "../components/Navbar";
import OurPromise from "../components/OurPromise";
import PortalEntryCards from "../components/PortalEntryCards";
import PriceForecastPreview from "../components/PriceForecastPreview";
import PropertyIntelligencePanel from "../components/PropertyIntelligencePanel";
import RecentlyListed from "../components/RecentlyListed";
import StageJourney from "../components/StageJourney";
import StatsCounter from "../components/StatsCounter";
import TrustCard from "../components/TrustCard";
import WhatsAppHero from "../components/WhatsAppHero";
import WhyValuBrix from "../components/WhyValuBrix";
import { useGuestLimit } from "../hooks/useGuestLimit";

const portalValues = [
  {
    icon: Home,
    title: "For Buyers & Investors",
    color: "#D4AF37",
    points: [
      "AI-powered property valuation in seconds",
      "Real comparable sales from 150+ transactions",
      "Investment scoreboard & rental yield analysis",
      "Neighborhood intelligence & infra impact scores",
    ],
  },
  {
    icon: TrendingUp,
    title: "For Sellers",
    color: "#A5D6A7",
    points: [
      "AI-verified optimal listing price",
      "Market insights and competition analysis",
      "Lead pipeline and offer management",
      "Real-time buyer demand signals",
    ],
  },
  {
    icon: Building2,
    title: "For Banks & FIs",
    color: "#80DEEA",
    points: [
      "Independent collateral valuation reports",
      "Bulk property valuation for loan portfolios",
      "Risk-calibrated confidence scoring",
      "RBI-compliant audit trails",
    ],
  },
];

export default function HomePage() {
  const { checkUsage, isLimitReached, dismissLimit } = useGuestLimit();

  return (
    <div id="home" style={{ background: "#0A0F1E", minHeight: "100vh" }}>
      <Navbar />
      <main>
        <WhatsAppHero serviceType="general" />
        <HeroSection onSearch={checkUsage} />
        <PortalEntryCards />
        <StatsCounter />
        <MissionVision />
        <WhyValuBrix />
        <FeatureCards />
        <TrustCard />
        <OurPromise />
        <PriceForecastPreview />

        <PropertyIntelligencePanel />
        <StageJourney />
        <RecentlyListed />
        <BookAppointment />

        {/* About Us Section */}
        <section
          id="about"
          className="py-24 px-4"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,15,30,0) 0%, rgba(18,27,53,0.6) 50%, rgba(10,15,30,0) 100%)",
          }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Vision headline */}
            <div className="text-center mb-16">
              <p
                className="text-sm font-semibold uppercase tracking-widest mb-4"
                style={{ color: "#D4AF37" }}
              >
                About ValuBrix
              </p>
              <h2
                className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Smarter Property Decisions
                <br />
                <span style={{ color: "#D4AF37" }}>Start with Clarity</span>
              </h2>
              <p className="text-white/40 text-base font-medium tracking-wide mb-8 uppercase">
                Property Intelligence. Reimagined for India.
              </p>
              <div className="max-w-3xl mx-auto space-y-4 text-left">
                <p className="text-white/60 text-base leading-relaxed">
                  ValuBrix is built to bring transparency and confidence to real
                  estate decisions. The platform combines verified transaction
                  insights, regulatory information, and intelligent analytics to
                  help users understand the true value of a property — not just
                  an estimate, but a well-reasoned range backed by data.
                </p>
                <p className="text-white/60 text-base leading-relaxed">
                  Real estate decisions often depend on fragmented information,
                  inconsistent pricing, and subjective opinions. ValuBrix
                  changes that by analyzing location dynamics, builder
                  reputation, comparable transactions, market movement, and
                  property-specific characteristics to deliver clear and
                  explainable valuations.
                </p>
                <p className="text-white/60 text-base leading-relaxed">
                  Whether someone is buying, selling, investing, or financing,
                  ValuBrix provides a unified view of pricing, demand, and
                  neighborhood intelligence — all in one place.
                </p>
                <p className="text-white/55 text-base leading-relaxed italic">
                  The goal is simple: reduce guesswork, increase transparency,
                  and enable better property decisions.
                </p>
              </div>
            </div>

            {/* Portal value props */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {portalValues.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl p-6 border"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${p.color}18` }}
                  >
                    <p.icon size={20} style={{ color: p.color }} />
                  </div>
                  <h3
                    className="font-bold text-white mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {p.title}
                  </h3>
                  <ul className="space-y-2">
                    {p.points.map((pt) => (
                      <li
                        key={pt}
                        className="flex items-start gap-2 text-sm text-white/55"
                      >
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: p.color }}
                        />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div
              className="rounded-2xl p-8 border text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <h3
                className="text-xl font-bold text-white mb-6"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Get in Touch
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.12)" }}
                  >
                    <Mail size={16} style={{ color: "#D4AF37" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-white/40 text-xs">Email</p>
                    <p className="text-white text-sm">hello@valubrix.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.12)" }}
                  >
                    <Phone size={16} style={{ color: "#D4AF37" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-white/40 text-xs">Phone</p>
                    <p className="text-white text-sm">+91 98765 43210</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.12)" }}
                  >
                    <MapPin size={16} style={{ color: "#D4AF37" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-white/40 text-xs">Headquarters</p>
                    <p className="text-white text-sm">Bangalore, India</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.12)" }}
                  >
                    <Users size={16} style={{ color: "#D4AF37" }} />
                  </div>
                  <div className="text-left">
                    <p className="text-white/40 text-xs">Coverage</p>
                    <p className="text-white text-sm">
                      Bangalore · Pune · Delhi
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <GuestLimitModal isOpen={isLimitReached} onClose={dismissLimit} />
    </div>
  );
}
