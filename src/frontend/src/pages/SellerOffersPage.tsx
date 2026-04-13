import {
  Brain,
  Check,
  DollarSign,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import SellerLayout from "../components/SellerLayout";

const MOCK_OFFERS = [
  {
    id: 1,
    buyer: "Arjun Mehta",
    property: "Prestige Park 3BHK, Whitefield",
    listingPrice: 1.28,
    offeredPrice: 1.18,
    aiValue: 1.3,
    date: "Today, 2:00 PM",
    status: "Pending",
    message: "I am a serious buyer. Please consider my offer.",
    financing: "Loan Pre-approved",
    credibility: 88,
  },
  {
    id: 2,
    buyer: "Priya Sharma",
    property: "Sobha Villa, Sarjapur",
    listingPrice: 2.45,
    offeredPrice: 2.35,
    aiValue: 2.42,
    date: "Yesterday",
    status: "Pending",
    message: "Ready for immediate registration.",
    financing: "Cash Buyer",
    credibility: 92,
  },
  {
    id: 3,
    buyer: "Ravi Kumar",
    property: "Prestige Park 3BHK, Whitefield",
    listingPrice: 1.28,
    offeredPrice: 1.28,
    aiValue: 1.3,
    date: "2 days ago",
    status: "Accepted",
    message: "Full asking price. Need possession in 30 days.",
    financing: "Loan Pre-approved",
    credibility: 74,
  },
  {
    id: 4,
    buyer: "Anil Joshi",
    property: "Godrej Commercial, Electronic City",
    listingPrice: 1.85,
    offeredPrice: 1.65,
    aiValue: 1.78,
    date: "4 days ago",
    status: "Rejected",
    message: "This is our final offer.",
    financing: "Self-funded",
    credibility: 65,
  },
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-500/20 text-amber-400",
  Accepted: "bg-emerald-500/20 text-emerald-400",
  Rejected: "bg-red-500/20 text-red-400",
  "Counter Sent": "bg-purple-500/20 text-purple-400",
};

export default function SellerOffersPage() {
  const [offers, setOffers] = useState(MOCK_OFFERS);
  const [counterId, setCounterId] = useState<number | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [aiOffer, setAiOffer] = useState<(typeof MOCK_OFFERS)[0] | null>(null);
  const [sliderVal, setSliderVal] = useState(1.28);

  const updateStatus = (id: number, status: string) => {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const handleCounter = () => {
    if (counterId && counterPrice.trim()) {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === counterId ? { ...o, status: "Counter Sent" } : o,
        ),
      );
      setCounterId(null);
      setCounterPrice("");
    }
  };

  const openAI = (offer: (typeof MOCK_OFFERS)[0]) => {
    setAiOffer(offer);
    const suggested =
      Math.round(((offer.offeredPrice + offer.aiValue) / 2) * 100) / 100;
    setSliderVal(suggested);
  };

  const getProbability = (val: number, offer: (typeof MOCK_OFFERS)[0]) => {
    const diff = (offer.aiValue - val) / offer.aiValue;
    return Math.max(20, Math.min(90, Math.round(50 + diff * 200)));
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Offer <span className="text-[#D4AF37]">Management</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {offers.filter((o) => o.status === "Pending").length} pending offers
          </p>
        </div>

        {/* AI Negotiation Summary Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
            <Brain size={20} className="text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-[#D4AF37] font-semibold text-sm">
              AI Negotiation Assistant Active
            </p>
            <p className="text-white/50 text-xs">
              Click "AI Advisor" on any pending offer to get AI-powered
              counter-offer suggestions with success probability.
            </p>
          </div>
        </motion.div>

        <div className="space-y-4">
          {offers.map((offer, i) => {
            const diff = (
              ((offer.offeredPrice - offer.listingPrice) / offer.listingPrice) *
              100
            ).toFixed(1);
            const isBelow = offer.offeredPrice < offer.listingPrice;
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5"
                data-ocid={`seller.offers.item.${i + 1}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">
                        {offer.buyer}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[offer.status]}`}
                      >
                        {offer.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        {offer.financing}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">
                      {offer.property} · {offer.date}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-white/30 text-xs">
                        Buyer Credibility:
                      </span>
                      <span className="text-[#D4AF37] text-xs font-bold">
                        {offer.credibility}/100
                      </span>
                    </div>
                    <p className="text-white/50 text-sm italic mt-2">
                      "{offer.message}"
                    </p>
                    <div className="flex items-center gap-6 mt-3">
                      <div>
                        <p className="text-white/30 text-xs">Listing</p>
                        <p className="text-white font-bold">
                          ₹{offer.listingPrice} Cr
                        </p>
                      </div>
                      <div className="text-xl text-white/20">→</div>
                      <div>
                        <p className="text-white/30 text-xs">Offered</p>
                        <p
                          className={`font-bold text-lg ${isBelow ? "text-red-400" : "text-emerald-400"}`}
                        >
                          ₹{offer.offeredPrice} Cr
                        </p>
                      </div>
                      <div>
                        <p className="text-white/30 text-xs">AI Value</p>
                        <p className="text-[#D4AF37] font-bold">
                          ₹{offer.aiValue} Cr
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm font-semibold ${isBelow ? "text-red-400" : "text-emerald-400"}`}
                      >
                        {isBelow ? (
                          <TrendingDown size={14} />
                        ) : (
                          <TrendingUp size={14} />
                        )}
                        {diff}%
                      </div>
                    </div>
                  </div>
                  {offer.status === "Pending" && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        type="button"
                        data-ocid="seller.offers.accept.button"
                        onClick={() => updateStatus(offer.id, "Accepted")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl text-sm font-semibold transition-all"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        type="button"
                        data-ocid="seller.offers.ai.button"
                        onClick={() => openAI(offer)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 rounded-xl text-sm font-semibold transition-all"
                      >
                        <Brain size={14} /> AI Advisor
                      </button>
                      <button
                        type="button"
                        data-ocid="seller.offers.counter.button"
                        onClick={() => {
                          setCounterId(offer.id);
                          setCounterPrice("");
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-xl text-sm font-semibold transition-all"
                      >
                        <DollarSign size={14} /> Counter
                      </button>
                      <button
                        type="button"
                        data-ocid="seller.offers.reject.button"
                        onClick={() => updateStatus(offer.id, "Rejected")}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl text-sm font-semibold transition-all"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Negotiation Modal */}
      <AnimatePresence>
        {aiOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            data-ocid="seller.offers.ai.dialog"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0A0F1F] border border-[#D4AF37]/20 rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain size={18} className="text-[#D4AF37]" />
                  <h3 className="text-white font-bold">
                    AI Negotiation Assistant
                  </h3>
                </div>
                <button
                  type="button"
                  data-ocid="seller.offers.ai.close_button"
                  onClick={() => setAiOffer(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-white/40 text-xs">Buyer Offer</p>
                  <p className="text-red-400 font-bold">
                    ₹{aiOffer.offeredPrice} Cr
                  </p>
                </div>
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl p-3 text-center">
                  <p className="text-white/40 text-xs">AI Market Value</p>
                  <p className="text-[#D4AF37] font-bold">
                    ₹{aiOffer.aiValue} Cr
                  </p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-white/40 text-xs">Suggested Counter</p>
                  <p className="text-emerald-400 font-bold">
                    ₹{sliderVal.toFixed(2)} Cr
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-white/40 mb-2">
                  <span>₹{(aiOffer.offeredPrice * 0.95).toFixed(2)} Cr</span>
                  <span>Counter Price</span>
                  <span>₹{(aiOffer.listingPrice * 1.05).toFixed(2)} Cr</span>
                </div>
                <input
                  type="range"
                  data-ocid="seller.offers.ai.toggle"
                  min={aiOffer.offeredPrice * 0.95}
                  max={aiOffer.listingPrice * 1.05}
                  step={0.01}
                  value={sliderVal}
                  onChange={(e) =>
                    setSliderVal(Number.parseFloat(e.target.value))
                  }
                  className="w-full accent-[#D4AF37]"
                />
                <p className="text-center text-2xl font-bold text-white mt-2">
                  ₹{sliderVal.toFixed(2)} Cr
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 mb-5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/50 text-xs">
                    Success Probability
                  </span>
                  <span className="text-[#D4AF37] font-bold">
                    {getProbability(sliderVal, aiOffer)}%
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-emerald-400 rounded-full"
                    animate={{
                      width: `${getProbability(sliderVal, aiOffer)}%`,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
              <button
                type="button"
                data-ocid="seller.offers.ai.confirm_button"
                onClick={() => {
                  updateStatus(aiOffer.id, "Counter Sent");
                  setAiOffer(null);
                }}
                className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all"
              >
                Send Counter at ₹{sliderVal.toFixed(2)} Cr
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Counter Modal */}
      <AnimatePresence>
        {counterId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            data-ocid="seller.offers.counter.dialog"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Send Counter Offer</h3>
                <button
                  type="button"
                  data-ocid="seller.offers.counter.close_button"
                  onClick={() => setCounterId(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-white/50 text-sm mb-4">
                {offers.find((o) => o.id === counterId)?.property}
              </p>
              <label
                htmlFor="counter-price"
                className="text-white/50 text-xs mb-1.5 block"
              >
                Your Counter Price (₹ Cr)
              </label>
              <input
                type="number"
                step="0.01"
                id="counter-price"
                data-ocid="seller.offers.counter.input"
                placeholder="e.g. 1.25"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40 mb-4"
              />
              <button
                type="button"
                data-ocid="seller.offers.counter.confirm_button"
                onClick={handleCounter}
                disabled={!counterPrice.trim()}
                className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-xl transition-all"
              >
                Send Counter Offer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
