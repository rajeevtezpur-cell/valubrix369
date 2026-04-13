import { AlertTriangle, CheckCircle, RefreshCw, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import SellerLayout from "../components/SellerLayout";

const MOCK_PROPERTIES = [
  {
    id: 1,
    title: "Prestige Park 3BHK, Whitefield",
    listingPrice: 1.28,
    marketAvg: 1.19,
  },
  {
    id: 2,
    title: "Sobha Villa, Sarjapur",
    listingPrice: 2.45,
    marketAvg: 2.38,
  },
  {
    id: 3,
    title: "Brigade Plot, Devanahalli",
    listingPrice: 0.62,
    marketAvg: 0.58,
  },
  {
    id: 4,
    title: "Godrej Commercial, Electronic City",
    listingPrice: 1.85,
    marketAvg: 1.82,
  },
];

const AI_DESCRIPTIONS: Record<number, string> = {
  1: "Premium 3BHK apartment in the heart of Whitefield, Bangalore's tech corridor. Featuring world-class amenities, superior construction quality, and excellent connectivity to major IT parks. This property offers an exceptional investment opportunity with strong rental demand and projected 8% annual appreciation. Spacious 1,450 sq ft layout with 3 bedrooms, modern kitchen, and dedicated parking.",
  2: "Exquisite 4BHK luxury villa in the prestigious Sarjapur Road corridor. Sprawling 2,800 sq ft of curated living space with premium finishes, landscaped garden, and private pool. Located in a gated community with 24/7 security, clubhouse, and sports facilities. Ideal for families seeking a premium lifestyle with excellent social infrastructure.",
  3: "Prime residential plot in the rapidly appreciating Devanahalli micro-market, adjacent to Kempegowda International Airport. 1,200 sq ft of clear-title land in an approved layout. Exceptional infrastructure growth driven by aerospace SEZ, IT corridors, and upcoming metro connectivity. Build your dream home in North Bangalore's fastest-growing investment zone.",
  4: "Grade-A commercial space in Electronic City, Bangalore's established IT hub. 3,200 sq ft of ready-to-occupy space ideal for corporate offices, IT companies, or retail establishments. Excellent visibility, ample parking, and proximity to major tech parks. Strong rental yield potential with established corporate tenant base in the micro-market.",
};

const AI_SUGGESTIONS: Record<
  number,
  { title: string; impact: string; type: "positive" | "warning" }[]
> = {
  1: [
    {
      title: "Add high-quality photos (8+)",
      impact: "+34% more views",
      type: "positive",
    },
    {
      title: "Mention metro connectivity",
      impact: "+18% inquiries",
      type: "positive",
    },
    {
      title: "Price is 7.5% above market",
      impact: "Consider reducing by ₹1.5L",
      type: "warning",
    },
  ],
  2: [
    {
      title: "Highlight private pool",
      impact: "+28% premium buyer interest",
      type: "positive",
    },
    { title: "Add virtual tour", impact: "+45% engagement", type: "positive" },
    {
      title: "Price aligned with market",
      impact: "Good positioning",
      type: "positive",
    },
  ],
  3: [
    {
      title: "Mention airport proximity",
      impact: "+22% inquiries",
      type: "positive",
    },
    {
      title: "Add legal clearance documents",
      impact: "Builds buyer confidence",
      type: "positive",
    },
    {
      title: "Price 6.9% above market",
      impact: "Reduce for faster sale",
      type: "warning",
    },
  ],
  4: [
    {
      title: "Target IT companies in listing",
      impact: "+31% relevant inquiries",
      type: "positive",
    },
    {
      title: "Mention power backup",
      impact: "Key requirement for corporates",
      type: "positive",
    },
    {
      title: "Price competitive with market",
      impact: "Strong positioning",
      type: "positive",
    },
  ],
};

export default function SellerOptimizePage() {
  const [selectedId, setSelectedId] = useState(1);
  const selected = MOCK_PROPERTIES.find((p) => p.id === selectedId)!;
  const [generating, setGenerating] = useState(false);
  const [generatedDesc, setGeneratedDesc] = useState<string | null>(null);
  const [applied, setApplied] = useState<number[]>([]);
  const [appliedDesc, setAppliedDesc] = useState<number[]>([]);
  const [showAppliedBanner, setShowAppliedBanner] = useState(false);

  const priceDiff = (
    ((selected.listingPrice - selected.marketAvg) / selected.marketAvg) *
    100
  ).toFixed(1);
  const isOverpriced = selected.listingPrice > selected.marketAvg * 1.03;
  const suggestions = AI_SUGGESTIONS[selectedId] ?? [];

  const handleGenerate = () => {
    setGenerating(true);
    setGeneratedDesc(null);
    setTimeout(() => {
      setGenerating(false);
      setGeneratedDesc(AI_DESCRIPTIONS[selectedId]);
    }, 2000);
  };

  const handleApplySuggestion = (idx: number) => {
    setApplied((prev) => [...prev, idx]);
  };

  const handleApplyDesc = () => {
    setAppliedDesc((prev) => [...prev, selectedId]);
    setShowAppliedBanner(true);
    setTimeout(() => setShowAppliedBanner(false), 3000);
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            AI <span className="text-[#D4AF37]">Listing Optimization</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            AI-powered suggestions to sell faster
          </p>
        </div>

        {/* Applied Banner */}
        <AnimatePresence>
          {showAppliedBanner && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2"
            >
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                Description applied to your listing successfully!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Property Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MOCK_PROPERTIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedId(p.id);
                setGeneratedDesc(null);
                setApplied([]);
              }}
              className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                selectedId === p.id
                  ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                  : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>

        {/* Price Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border rounded-2xl p-4 flex items-center gap-4 ${
            isOverpriced
              ? "bg-red-500/5 border-red-500/20"
              : "bg-emerald-500/5 border-emerald-500/20"
          }`}
        >
          {isOverpriced ? (
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          )}
          <div>
            <p
              className={`font-semibold text-sm ${isOverpriced ? "text-red-400" : "text-emerald-400"}`}
            >
              {isOverpriced
                ? `Listing price is ${priceDiff}% above market average`
                : "Listing price is competitive"}
            </p>
            <p className="text-white/40 text-xs">
              Listed at ₹{selected.listingPrice} Cr · Market avg ₹
              {selected.marketAvg} Cr
            </p>
          </div>
        </motion.div>

        {/* AI Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">AI Suggestions</h2>
          <div className="space-y-3">
            {suggestions.map((s, idx) => (
              <div
                key={s.title}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  s.type === "positive"
                    ? "bg-emerald-500/5 border border-emerald-500/10"
                    : "bg-amber-500/5 border border-amber-500/10"
                }`}
              >
                {s.type === "positive" ? (
                  <CheckCircle
                    size={14}
                    className="text-emerald-400 flex-shrink-0"
                  />
                ) : (
                  <AlertTriangle
                    size={14}
                    className="text-amber-400 flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <p className="text-white text-sm">{s.title}</p>
                  <p className="text-white/40 text-xs">{s.impact}</p>
                </div>
                <button
                  type="button"
                  disabled={applied.includes(idx)}
                  onClick={() => handleApplySuggestion(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                    applied.includes(idx)
                      ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                      : "bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                  }`}
                >
                  {applied.includes(idx) ? "Applied ✓" : "Apply"}
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Description Generator */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">
              AI Description Generator
            </h2>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 disabled:opacity-50 rounded-xl text-sm font-medium transition-all"
            >
              {generating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>

          {generatedDesc && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                {generatedDesc}
              </p>
              <button
                type="button"
                onClick={handleApplyDesc}
                disabled={appliedDesc.includes(selectedId)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  appliedDesc.includes(selectedId)
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-[#D4AF37] hover:bg-[#B8960C] text-black"
                }`}
              >
                <CheckCircle size={14} />
                {appliedDesc.includes(selectedId)
                  ? "Applied to Listing ✓"
                  : "Apply to Listing"}
              </button>
            </motion.div>
          )}

          {!generatedDesc && !generating && (
            <p className="text-white/30 text-sm text-center py-6">
              Click Generate to create an AI-optimized listing description
            </p>
          )}
        </motion.div>
      </div>
    </SellerLayout>
  );
}
