import {
  Brain,
  Calendar,
  Check,
  MessageSquare,
  Phone,
  RefreshCw,
  Star,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import SellerLayout from "../components/SellerLayout";
import { useAuth } from "../context/AuthContext";
import { getSellerLeads } from "../services/listingService";

const LEAD_STAGES = [
  "All",
  "New Inquiry",
  "Visit Scheduled",
  "Offer Received",
  "Negotiation",
  "Closed Deal",
];

const STAGE_COLORS: Record<string, string> = {
  "New Inquiry": "bg-[#D4AF37]/20 text-[#D4AF37]",
  "Visit Scheduled": "bg-blue-500/20 text-blue-400",
  "Offer Received": "bg-purple-500/20 text-purple-400",
  Negotiation: "bg-orange-500/20 text-orange-400",
  "Closed Deal": "bg-emerald-500/20 text-emerald-400",
  "Call Requested": "bg-cyan-500/20 text-cyan-400",
  new: "bg-[#D4AF37]/20 text-[#D4AF37]",
};

const MATCHED_BUYERS = [
  {
    id: 1,
    name: "Vikram Singh",
    budget: "₹1.2 – 1.5 Cr",
    locality: "Whitefield",
    type: "3BHK Apartment",
    match: 94,
  },
  {
    id: 2,
    name: "Deepa Iyer",
    budget: "₹2 – 2.5 Cr",
    locality: "Sarjapur Road",
    type: "Villa",
    match: 87,
  },
  {
    id: 3,
    name: "Ramesh Pillai",
    budget: "₹1.1 – 1.4 Cr",
    locality: "Whitefield",
    type: "3BHK Apartment",
    match: 82,
  },
  {
    id: 4,
    name: "Anita Gupta",
    budget: "₹55 – 75 L",
    locality: "Devanahalli",
    type: "Plot",
    match: 76,
  },
  {
    id: 5,
    name: "Suresh Babu",
    budget: "₹1.6 – 2 Cr",
    locality: "Electronic City",
    type: "Commercial",
    match: 71,
  },
];

interface LeadActivity {
  type?: string;
  message?: string;
  date?: string;
}

interface Lead {
  id: string | number;
  buyerName?: string;
  name?: string;
  buyerPhone?: string;
  phone?: string;
  propertyTitle?: string;
  property?: string;
  budget?: string;
  message: string;
  type?: string;
  stage: string;
  date?: string;
  createdAt?: string;
  interest?: string;
  credibility?: number;
  sellerId?: string;
  activities?: LeadActivity[];
  leadKey?: string;
}

function normalizeLead(l: any, idx: number): Lead {
  return {
    id: l.id ?? idx,
    buyerName: l.buyerName || l.name || "Unknown Buyer",
    name: l.buyerName || l.name || "Unknown Buyer",
    buyerPhone: l.buyerPhone || l.phone || "N/A",
    phone: l.buyerPhone || l.phone || "N/A",
    propertyTitle: l.propertyTitle || l.property || "Property",
    property: l.propertyTitle || l.property || "Property",
    budget: l.budget || "Not specified",
    message: l.message || "",
    type: l.type || "inquiry",
    stage:
      l.stage ||
      (l.type === "visit_request"
        ? "Visit Scheduled"
        : l.type === "callback_request"
          ? "Call Requested"
          : "New Inquiry"),
    date: l.createdAt
      ? new Date(l.createdAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : l.date || "Recently",
    createdAt: l.createdAt,
    interest: l.interest || "Medium",
    credibility: l.credibility || 70,
    sellerId: l.sellerId,
    activities: l.activities || [],
    leadKey: l.leadKey,
  };
}

export default function SellerLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeStage, setActiveStage] = useState("All");
  const [respondId, setRespondId] = useState<string | number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sent, setSent] = useState<(string | number)[]>([]);
  const [scheduleId, setScheduleId] = useState<string | number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [callRequested, setCallRequested] = useState<(string | number)[]>([]);
  const [expandedActivities, setExpandedActivities] = useState<
    (string | number)[]
  >([]);

  function loadLeads() {
    try {
      const myLeads = getSellerLeads(user);
      setLeads(myLeads.map(normalizeLead));
    } catch {
      setLeads([]);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadLeads/loadVisits is stable within mount
  useEffect(() => {
    loadLeads();
    const interval = setInterval(loadLeads, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const filtered =
    activeStage === "All"
      ? leads
      : leads.filter((l) => l.stage === activeStage);

  function updateLeadStage(id: string | number, stage: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    // Persist stage update
    try {
      const stored: any[] = JSON.parse(
        localStorage.getItem("valubrix_leads") || "[]",
      );
      const updated = stored.map((l: any) =>
        l.id === id ? { ...l, stage } : l,
      );
      localStorage.setItem("valubrix_leads", JSON.stringify(updated));
    } catch {}
  }

  function handleSendReply() {
    if (respondId !== null && replyText.trim()) {
      setSent((prev) => [...prev, respondId]);
      updateLeadStage(respondId, "Negotiation");
      setRespondId(null);
      setReplyText("");
      toast.success("Message sent to buyer!");
    }
  }

  function handleScheduleVisit() {
    if (scheduleId !== null && scheduleDate) {
      updateLeadStage(scheduleId, "Visit Scheduled");
      setScheduleId(null);
      setScheduleDate("");
      setScheduleTime("");
      toast.success("Visit scheduled successfully!");
    }
  }

  function handleRequestCall(id: string | number) {
    setCallRequested((prev) => [...prev, id]);
    updateLeadStage(id, "Call Requested");
    toast.success("Call request logged!");
  }

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Buyer <span className="text-[#D4AF37]">Leads</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {leads.filter((l) => l.stage === "New Inquiry").length} new
              inquiries · {leads.length} total leads
            </p>
          </div>
          <button
            type="button"
            onClick={loadLeads}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white text-xs transition-all"
            data-ocid="seller.leads.refresh.button"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Stage Filter */}
        <div
          className="flex flex-wrap gap-2"
          data-ocid="seller.leads.stage.tab"
        >
          {LEAD_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeStage === stage
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>

        {/* Leads */}
        {filtered.length === 0 ? (
          <div
            data-ocid="seller.leads.empty_state"
            className="text-center py-16 text-white/30"
          >
            <p className="text-lg">No leads yet</p>
            <p className="text-sm mt-1">
              Buyer actions from the portal will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((lead, i) => (
              <motion.div
                key={String(lead.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -2 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-5"
                data-ocid={`seller.leads.item.${i + 1}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-[#D4AF37]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold">
                          {lead.buyerName || lead.name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[lead.stage] || "bg-white/10 text-white/60"}`}
                        >
                          {lead.stage}
                        </span>
                        {lead.type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                            {lead.type === "callback_request"
                              ? "Callback Request"
                              : lead.type === "interest"
                                ? "Express Interest"
                                : lead.type === "visit_request"
                                  ? "Visit Request"
                                  : lead.type === "valuation_request"
                                    ? "Valuation Download"
                                    : lead.type.replace("_", " ")}
                          </span>
                        )}
                        {sent.includes(lead.id) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            Reply Sent
                          </span>
                        )}
                        {callRequested.includes(lead.id) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                            Call Requested
                          </span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">
                        {lead.buyerPhone || lead.phone} · {lead.date}
                      </p>
                      <p className="text-[#D4AF37] text-xs mt-1">
                        {lead.propertyTitle || lead.property}
                      </p>
                      {lead.budget && lead.budget !== "Not specified" && (
                        <p className="text-white/50 text-xs mt-1">
                          Budget: {lead.budget}
                        </p>
                      )}
                      {lead.credibility !== undefined && (
                        <div className="flex items-center gap-2 mt-2">
                          <Star size={12} className="text-[#D4AF37]" />
                          <span className="text-white/50 text-xs">
                            Credibility Score:
                          </span>
                          <span className="text-[#D4AF37] font-bold text-xs">
                            {lead.credibility}/100
                          </span>
                          <div className="flex-1 max-w-[100px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D4AF37] rounded-full"
                              style={{ width: `${lead.credibility}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {lead.message && (
                        <p className="text-white/60 text-sm mt-2 italic">
                          "{lead.message}"
                        </p>
                      )}
                      {lead.activities && lead.activities.length > 1 && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedActivities((prev) =>
                                prev.includes(lead.id)
                                  ? prev.filter((x) => x !== lead.id)
                                  : [...prev, lead.id],
                              )
                            }
                            className="text-[#D4AF37]/70 hover:text-[#D4AF37] text-xs underline underline-offset-2"
                          >
                            {expandedActivities.includes(lead.id)
                              ? "Hide history"
                              : `Show history (${lead.activities.length} interactions)`}
                          </button>
                          {expandedActivities.includes(lead.id) && (
                            <div className="mt-2 space-y-1 border-l-2 border-[#D4AF37]/20 pl-3">
                              {lead.activities.map((act, i) => (
                                <div
                                  key={`act-${i}-${act.type || "unknown"}`}
                                  className="text-white/40 text-xs"
                                >
                                  <span className="capitalize">
                                    {act.type?.replace(/_/g, " ") || "Inquiry"}
                                  </span>
                                  {act.date && (
                                    <span className="ml-2 text-white/25">
                                      {new Date(act.date).toLocaleDateString(
                                        "en-IN",
                                        { dateStyle: "medium" },
                                      )}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      type="button"
                      data-ocid="seller.leads.call.button"
                      disabled={callRequested.includes(lead.id)}
                      onClick={() => handleRequestCall(lead.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 rounded-lg text-xs font-medium transition-all"
                    >
                      <Phone size={12} />{" "}
                      {callRequested.includes(lead.id)
                        ? "Called"
                        : "Request Call"}
                    </button>
                    <button
                      type="button"
                      data-ocid="seller.leads.respond.button"
                      onClick={() => {
                        setRespondId(lead.id);
                        setReplyText("");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-lg text-xs font-medium transition-all"
                    >
                      <MessageSquare size={12} /> Message
                    </button>
                    <button
                      type="button"
                      data-ocid="seller.leads.schedule.button"
                      onClick={() => setScheduleId(lead.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-all"
                    >
                      <Calendar size={12} /> Schedule Visit
                    </button>
                    {lead.stage !== "Closed Deal" && (
                      <button
                        type="button"
                        data-ocid="seller.leads.close.button"
                        onClick={() => updateLeadStage(lead.id, "Closed Deal")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-all"
                      >
                        <X size={12} /> Close Lead
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* AI Matched Buyers */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
              <Brain size={16} className="text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-white font-bold">AI Matched Buyers</h2>
              <p className="text-white/40 text-xs">
                Buyers whose preferences match your listings
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MATCHED_BUYERS.map((buyer, i) => (
              <motion.div
                key={buyer.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                whileHover={{ y: -3 }}
                className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4"
                data-ocid={`seller.leads.match.item.${i + 1}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-sm">
                    {buyer.name}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
                    {buyer.match}% Match
                  </span>
                </div>
                <p className="text-white/50 text-xs">
                  {buyer.type} · {buyer.locality}
                </p>
                <p className="text-white/40 text-xs">Budget: {buyer.budget}</p>
                <button
                  type="button"
                  data-ocid="seller.leads.match.contact.button"
                  className="mt-3 w-full py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-lg text-xs font-medium transition-all"
                >
                  <Check size={11} className="inline mr-1" /> Connect with Buyer
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      <AnimatePresence>
        {respondId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
              data-ocid="seller.leads.message.dialog"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Send Message</h3>
                <button
                  type="button"
                  onClick={() => setRespondId(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40 resize-none mb-4"
                data-ocid="seller.leads.message.textarea"
              />
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-xl transition-all"
                data-ocid="seller.leads.message.submit_button"
              >
                Send Message
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Visit Modal */}
      <AnimatePresence>
        {scheduleId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
              data-ocid="seller.leads.schedule.dialog"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Schedule Visit</h3>
                <button
                  type="button"
                  onClick={() => setScheduleId(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="lead-visit-date"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    Date
                  </label>
                  <input
                    id="lead-visit-date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                    data-ocid="seller.leads.schedule.date.input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lead-visit-time"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    Time
                  </label>
                  <input
                    id="lead-visit-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                    data-ocid="seller.leads.schedule.time.input"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleScheduleVisit}
                  disabled={!scheduleDate}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-xl transition-all"
                  data-ocid="seller.leads.schedule.confirm_button"
                >
                  Confirm Visit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
