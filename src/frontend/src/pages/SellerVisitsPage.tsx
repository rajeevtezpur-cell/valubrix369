import { Calendar, Check, Clock, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import SellerLayout from "../components/SellerLayout";
import { useAuth } from "../context/AuthContext";
import { getSellerVisits } from "../services/listingService";

interface VisitEntry {
  id: string | number;
  buyer?: string;
  buyerName?: string;
  property?: string;
  propertyTitle?: string;
  date: string;
  time: string;
  status: string;
  sellerId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-amber-500/20 text-amber-400",
  pending: "bg-amber-500/20 text-amber-400",
  Approved: "bg-emerald-500/20 text-emerald-400",
  Completed: "bg-blue-500/20 text-blue-400",
  Rescheduled: "bg-purple-500/20 text-purple-400",
  Declined: "bg-red-500/20 text-red-400",
};

function normalizeVisit(v: any, idx: number): VisitEntry {
  return {
    id: v.id ?? idx,
    buyer: v.buyerName || v.buyer || "Unknown Buyer",
    buyerName: v.buyerName || v.buyer || "Unknown Buyer",
    property: v.propertyTitle || v.property || "Property",
    propertyTitle: v.propertyTitle || v.property || "Property",
    date:
      v.date ||
      (v.createdAt
        ? new Date(v.createdAt).toLocaleDateString("en-IN")
        : "Pending confirmation"),
    time: v.time || "To be confirmed",
    status: v.status === "pending" ? "Pending" : v.status || "Pending",
    sellerId: v.sellerId,
  };
}

export default function SellerVisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitEntry[]>([]);
  const [rescheduleId, setRescheduleId] = useState<string | number | null>(
    null,
  );
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  function loadVisits() {
    try {
      const mine = getSellerVisits(user);
      setVisits(mine.map(normalizeVisit));
    } catch {
      setVisits([]);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadLeads/loadVisits is stable within mount
  useEffect(() => {
    loadVisits();
    const interval = setInterval(loadVisits, 5000);
    return () => clearInterval(interval);
  }, [user]);

  function updateStatus(id: string | number, status: string) {
    setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    try {
      const stored: any[] = JSON.parse(
        localStorage.getItem("valubrix_visit_requests") || "[]",
      );
      const updated = stored.map((v: any) =>
        v.id === id ? { ...v, status } : v,
      );
      localStorage.setItem("valubrix_visit_requests", JSON.stringify(updated));
    } catch {}
    if (status === "Approved") toast.success("Visit approved!");
    if (status === "Declined") toast.error("Visit declined.");
  }

  function handleReschedule() {
    if (rescheduleId !== null && newDate) {
      setVisits((prev) =>
        prev.map((v) =>
          v.id === rescheduleId
            ? {
                ...v,
                status: "Rescheduled",
                date: newDate,
                time: newTime || v.time,
              }
            : v,
        ),
      );
      try {
        const stored: any[] = JSON.parse(
          localStorage.getItem("valubrix_visit_requests") || "[]",
        );
        const updated = stored.map((v: any) =>
          v.id === rescheduleId
            ? {
                ...v,
                status: "Rescheduled",
                date: newDate,
                time: newTime || v.time,
              }
            : v,
        );
        localStorage.setItem(
          "valubrix_visit_requests",
          JSON.stringify(updated),
        );
      } catch {}
      toast.success("Visit rescheduled!");
      setRescheduleId(null);
      setNewDate("");
      setNewTime("");
    }
  }

  const pending = visits.filter(
    (v) => v.status === "Pending" || v.status === "pending",
  );
  const others = visits.filter(
    (v) => v.status !== "Pending" && v.status !== "pending",
  );
  const groups = [
    { label: "Awaiting Approval", items: pending },
    { label: "Confirmed / Past", items: others },
  ].filter((g) => g.items.length > 0);

  let itemIndex = 0;

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Visit <span className="text-[#D4AF37]">Scheduling</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {pending.length} visits awaiting approval · {visits.length} total
            </p>
          </div>
          <button
            type="button"
            onClick={loadVisits}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white text-xs transition-all"
            data-ocid="seller.visits.refresh.button"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {visits.length === 0 ? (
          <div
            data-ocid="seller.visits.empty_state"
            className="text-center py-16 text-white/30"
          >
            <p className="text-lg">No visit requests yet</p>
            <p className="text-sm mt-1">
              When buyers schedule visits, they'll appear here
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.items.map((visit) => {
                  const idx = ++itemIndex;
                  return (
                    <motion.div
                      key={String(visit.id)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"
                      data-ocid={`seller.visits.item.${idx}`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex flex-col items-center justify-center flex-shrink-0">
                        <Calendar size={14} className="text-[#D4AF37] mb-0.5" />
                        <span className="text-[#D4AF37] text-[10px] font-bold">
                          {visit.time}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold">
                            {visit.buyer || visit.buyerName}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[visit.status] || "bg-white/10 text-white/60"}`}
                          >
                            {visit.status}
                          </span>
                        </div>
                        <p className="text-white/40 text-sm">
                          {visit.property || visit.propertyTitle}
                        </p>
                        <p className="text-white/30 text-xs">
                          <Clock size={10} className="inline mr-1" />
                          {visit.date} at {visit.time}
                        </p>
                      </div>
                      {(visit.status === "Pending" ||
                        visit.status === "pending") && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            type="button"
                            data-ocid="seller.visits.approve.button"
                            onClick={() => updateStatus(visit.id, "Approved")}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-medium transition-all"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            type="button"
                            data-ocid="seller.visits.reschedule.button"
                            onClick={() => setRescheduleId(visit.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition-all"
                          >
                            <Calendar size={12} /> Reschedule
                          </button>
                          <button
                            type="button"
                            data-ocid="seller.visits.decline.button"
                            onClick={() => updateStatus(visit.id, "Declined")}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-all"
                          >
                            <X size={12} /> Decline
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            data-ocid="seller.visits.reschedule.dialog"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Reschedule Visit</h3>
                <button
                  type="button"
                  data-ocid="seller.visits.reschedule.close_button"
                  onClick={() => setRescheduleId(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="reschedule-date"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    New Date
                  </label>
                  <input
                    type="date"
                    id="reschedule-date"
                    data-ocid="seller.visits.reschedule.date.input"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reschedule-time"
                    className="text-white/50 text-xs mb-1.5 block"
                  >
                    New Time
                  </label>
                  <input
                    type="time"
                    id="reschedule-time"
                    data-ocid="seller.visits.reschedule.time.input"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                  />
                </div>
                <button
                  type="button"
                  data-ocid="seller.visits.reschedule.confirm_button"
                  onClick={handleReschedule}
                  disabled={!newDate}
                  className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#B8960C] disabled:opacity-50 text-black font-bold rounded-xl transition-all"
                >
                  Confirm Reschedule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
