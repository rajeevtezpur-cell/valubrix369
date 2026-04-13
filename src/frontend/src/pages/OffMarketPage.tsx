import { Bell, Bookmark, Eye, Phone, X } from "lucide-react";
import { useMemo, useState } from "react";
import BuyerLayout from "../components/BuyerLayout";
import SmartLocationSearch from "../components/SmartLocationSearch";
import type { LocationRecord } from "../data/locationData";

const OPPORTUNITIES = [
  {
    id: 1,
    locality: "Whitefield",
    city: "Bangalore",
    type: "Villa",
    value: "₹2.3 Cr",
    probability: 72,
    probLabel: "High",
    signals: ["Owned 8+ years", "Area prices +12%", "3 nearby sales"],
  },
  {
    id: 2,
    locality: "Koramangala",
    city: "Bangalore",
    type: "Flat",
    value: "₹1.8 Cr",
    probability: 65,
    probLabel: "High",
    signals: ["Owned 6 years", "High demand zone", "Recent registrations"],
  },
  {
    id: 3,
    locality: "Hebbal",
    city: "Bangalore",
    type: "Flat",
    value: "₹95 L",
    probability: 58,
    probLabel: "Moderate",
    signals: ["Mortgage maturity soon", "Area appreciation 9%"],
  },
  {
    id: 4,
    locality: "Baner",
    city: "Pune",
    type: "Villa",
    value: "₹3.1 Cr",
    probability: 71,
    probLabel: "High",
    signals: ["Owned 10+ years", "Family relocation signal", "5 nearby sales"],
  },
  {
    id: 5,
    locality: "Indiranagar",
    city: "Bangalore",
    type: "Flat",
    value: "₹1.4 Cr",
    probability: 68,
    probLabel: "High",
    signals: ["Owned 7 years", "Job change signal", "Price peak zone"],
  },
  {
    id: 6,
    locality: "Sarjapur Road",
    city: "Bangalore",
    type: "Plot",
    value: "₹1.1 Cr",
    probability: 52,
    probLabel: "Moderate",
    signals: ["Owned 12 years", "Estate settlement signal"],
  },
  {
    id: 7,
    locality: "Dwarka",
    city: "Delhi",
    type: "Flat",
    value: "₹82 L",
    probability: 44,
    probLabel: "Moderate",
    signals: ["Owned 9 years", "Sector development nearby"],
  },
  {
    id: 8,
    locality: "South Delhi",
    city: "Delhi",
    type: "Villa",
    value: "₹4.8 Cr",
    probability: 61,
    probLabel: "High",
    signals: ["Owned 15+ years", "Luxury segment active", "4 comparable sales"],
  },
];

export default function OffMarketPage() {
  const [watchlist, setWatchlist] = useState<number[]>([]);
  const [alertEmail, setAlertEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [filterLoc, setFilterLoc] = useState<string | null>(null);

  const toggleWatch = (id: number) => {
    setWatchlist((w) =>
      w.includes(id) ? w.filter((x) => x !== id) : [...w, id],
    );
  };

  const probColor = (p: number) =>
    p >= 65
      ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
      : "text-blue-300 bg-blue-500/15 border-blue-500/30";

  const filtered = useMemo(() => {
    if (!filterLoc) return OPPORTUNITIES;
    return OPPORTUNITIES.filter(
      (o) =>
        o.locality.toLowerCase().includes(filterLoc.toLowerCase()) ||
        o.city.toLowerCase().includes(filterLoc.toLowerCase()),
    );
  }, [filterLoc]);

  const handleLocationSelect = (loc: LocationRecord) => {
    setFilterLoc(loc.name);
  };

  return (
    <BuyerLayout>
      <div className="max-w-6xl mx-auto" data-ocid="offmarket.page">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <Eye size={22} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Off-Market Opportunities
            </h1>
            <p className="text-white/50 text-sm">
              AI-predicted properties likely to enter the market soon
            </p>
          </div>
        </div>

        {/* Search filter */}
        <div className="mb-5">
          <SmartLocationSearch
            placeholder="Filter by locality or city..."
            onSelect={handleLocationSelect}
          />
          {filterLoc && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-white/40 text-xs">
                Showing results near{" "}
                <span className="text-[#D4AF37]">{filterLoc}</span>
              </p>
              <button
                type="button"
                onClick={() => setFilterLoc(null)}
                className="text-white/30 hover:text-white/60 text-xs underline"
              >
                Show all
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {[
            {
              label: "High Probability",
              val: `${filtered.filter((o) => o.probability >= 65).length} Properties`,
            },
            {
              label: "Avg. Sale Probability",
              val: filtered.length
                ? `${Math.round(filtered.reduce((a, o) => a + o.probability, 0) / filtered.length)}%`
                : "—",
            },
            {
              label: "Cities Covered",
              val: `${new Set(filtered.map((o) => o.city)).size} Cities`,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            >
              <p className="text-white/40 text-xs">{s.label}</p>
              <p className="text-[#D4AF37] font-bold font-mono">{s.val}</p>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div
            className="text-center py-12 text-white/30"
            data-ocid="offmarket.empty_state"
          >
            <p>No opportunities found near {filterLoc}.</p>
            <button
              type="button"
              onClick={() => setFilterLoc(null)}
              className="mt-2 text-[#D4AF37] underline text-sm"
            >
              Show all areas
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
          {filtered.map((opp, i) => (
            <div
              key={opp.id}
              data-ocid={`offmarket.item.${i + 1}`}
              className="bg-white/5 hover:bg-white/8 border border-white/10 hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">
                    {opp.locality}
                  </p>
                  <p className="text-white/40 text-xs">
                    {opp.city} · {opp.type}
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid={`offmarket.toggle.${i + 1}`}
                  onClick={() => toggleWatch(opp.id)}
                  className={`transition-colors ${watchlist.includes(opp.id) ? "text-[#D4AF37]" : "text-white/20 hover:text-white/60"}`}
                >
                  <Bookmark size={16} />
                </button>
              </div>
              <p className="text-[#D4AF37] font-bold font-mono text-lg mb-2">
                {opp.value}
              </p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium mb-3 ${probColor(opp.probability)}`}
              >
                {opp.probability}% Probability — {opp.probLabel}
              </span>
              <div className="flex flex-wrap gap-1 mb-4">
                {opp.signals.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] bg-white/5 border border-white/10 text-white/50 px-2 py-0.5 rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-indigo-300 text-xs font-medium mb-3">
                Potential Off-Market Opportunity
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  data-ocid={`offmarket.track.button.${i + 1}`}
                  className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <Phone size={12} /> Request Owner Contact
                </button>
                <button
                  type="button"
                  className="w-full bg-white/5 hover:bg-white/8 border border-white/10 text-white/60 text-xs font-medium py-2 rounded-lg transition-all"
                >
                  Track Opportunity
                </button>
              </div>
            </div>
          ))}
        </div>

        {watchlist.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Bookmark size={18} className="text-[#D4AF37]" /> My Watchlist (
              {watchlist.length})
            </h2>
            <div className="space-y-2">
              {watchlist.map((id) => {
                const opp = OPPORTUNITIES.find((o) => o.id === id)!;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {opp.locality}, {opp.city}
                      </p>
                      <p className="text-white/40 text-xs">
                        {opp.type} · {opp.value} · {opp.probability}%
                        probability
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleWatch(id)}
                      className="text-white/30 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6 text-center">
          <Bell size={28} className="text-indigo-400 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-1">
            Get Early Alerts
          </h3>
          <p className="text-white/50 text-sm mb-5">
            Get alerts for new off-market opportunities in your preferred areas
          </p>
          {subscribed ? (
            <p className="text-green-400 font-medium">✓ You're subscribed!</p>
          ) : (
            <div className="flex gap-3 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Your email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                data-ocid="offmarket.alert.input"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                data-ocid="offmarket.alert.submit_button"
                onClick={() => alertEmail && setSubscribed(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all"
              >
                Subscribe
              </button>
            </div>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}
