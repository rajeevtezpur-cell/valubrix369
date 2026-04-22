import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Brain,
  Building2,
  Home,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";
import { motion } from "motion/react";

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const utm = encodeURIComponent(
    typeof window !== "undefined" ? window.location.hostname : "valubrix",
  );

  const navLinks = [
    { label: "Buy", to: "/buy" },
    { label: "Rent", to: "/rent" },
    { label: "Sell", to: "/seller" },
    { label: "Area Intelligence", to: "/area-intelligence" },
    { label: "AI Valuation", to: "/valuation" },
    { label: "Banker Portal", to: "/bank" },
    { label: "Admin", to: "/admin" },
  ];

  const socialLinks = [
    { Icon: Twitter, label: "Twitter", href: "#" },
    { Icon: Linkedin, label: "LinkedIn", href: "#" },
    { Icon: Instagram, label: "Instagram", href: "#" },
    { Icon: Youtube, label: "YouTube", href: "#" },
  ];

  return (
    <footer
      style={{
        background:
          "linear-gradient(180deg, rgba(7,26,47,0) 0%, rgba(3,16,31,0.95) 30%, #03101F 100%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="md:col-span-1">
            <button
              type="button"
              className="flex items-center gap-2 mb-4 bg-transparent border-0 p-0 cursor-pointer"
              onClick={() => navigate({ to: "/" })}
            >
              <img
                src="/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png"
                alt="ValuBrix"
                className="h-9 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span
                className="font-bold text-lg tracking-tight"
                style={{
                  color: "#D8B56A",
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                ValuBrix
                <sup
                  style={{
                    fontSize: "0.5em",
                    color: "#E8C97A",
                    marginLeft: "2px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  AI
                </sup>
              </span>
            </button>
            <p
              className="text-sm leading-relaxed mb-5"
              style={{ color: "#B9C6D8" }}
            >
              India&apos;s most transparent property intelligence platform.
              AI-powered valuations for Bangalore and beyond.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ Icon, label, href }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  whileHover={{ scale: 1.1 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#B9C6D8",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      "rgba(216,181,106,0.4)";
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "#D8B56A";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      "rgba(255,255,255,0.14)";
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "#B9C6D8";
                  }}
                >
                  <Icon size={14} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Portals column */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "#D8B56A" }}
            >
              Portals
            </h4>
            <ul className="space-y-3">
              {navLinks.slice(0, 4).map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to as any}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "#B9C6D8" }}
                    data-ocid="footer.link"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services column */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "#D8B56A" }}
            >
              Services
            </h4>
            <ul className="space-y-3">
              {navLinks.slice(4).map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to as any}
                    className="text-sm transition-colors hover:text-white"
                    style={{ color: "#B9C6D8" }}
                    data-ocid="footer.link"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className="text-sm transition-colors hover:text-white bg-transparent border-0 p-0 cursor-pointer"
                  style={{ color: "#B9C6D8" }}
                  onClick={() =>
                    document
                      .getElementById("services")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  All Services
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-sm transition-colors hover:text-white bg-transparent border-0 p-0 cursor-pointer"
                  style={{ color: "#B9C6D8" }}
                  onClick={() =>
                    document
                      .getElementById("about")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  About Us
                </button>
              </li>
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-5"
              style={{ color: "#D8B56A" }}
            >
              Contact
            </h4>
            <ul className="space-y-4">
              {[
                { Icon: Mail, text: "hello@valubrix.com" },
                { Icon: Phone, text: "+91 98765 43210" },
                { Icon: MapPin, text: "Bangalore, India" },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(216,181,106,0.12)" }}
                  >
                    <Icon size={13} style={{ color: "#D8B56A" }} />
                  </div>
                  <span className="text-sm" style={{ color: "#B9C6D8" }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>
            {/* What we cover */}
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { Icon: Brain, label: "AI Valuation" },
                { Icon: BarChart2, label: "Area Intel" },
                { Icon: Home, label: "Buy/Sell" },
                { Icon: Building2, label: "Bank" },
              ].map(({ Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#B9C6D8",
                  }}
                >
                  <Icon size={10} style={{ color: "#D8B56A" }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        className="py-5 px-4"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "rgba(185,198,216,0.5)" }}>
            &copy; {year} ValuBrix. India&apos;s Property Intelligence Platform.
          </p>
          <div className="flex items-center gap-3">
            <p className="text-xs" style={{ color: "rgba(185,198,216,0.4)" }}>
              Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${utm}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/70 transition-colors underline underline-offset-2"
              >
                caffeine.ai
              </a>
            </p>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(212,175,55,0.5)",
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 6,
                padding: "2px 6px",
                letterSpacing: "0.05em",
              }}
              data-ocid="footer.version_badge"
            >
              ValuBrix v1.2.0 • Built Apr 22, 2026
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
