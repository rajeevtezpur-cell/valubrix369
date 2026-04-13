import { useActor } from "@/hooks/useActor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Lead, LeadFilter } from "../backend.d.ts";
import GlobalNav from "../components/GlobalNav";

// ── Service badge colour mapping ─────────────────────────────────────────────
const SERVICE_COLORS: Record<string, string> = {
  buy: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  sell: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  rent: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  investment: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  interior: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  general: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

function serviceBadgeClass(type: string) {
  return (
    SERVICE_COLORS[type.toLowerCase()] ??
    "bg-slate-500/20 text-slate-300 border-slate-500/30"
  );
}

function formatDate(ts: bigint) {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function whatsAppUrl(lead: Lead) {
  const msg = encodeURIComponent(
    `Lead: ${lead.name} | ${lead.service_type} | ${lead.phone} | ${lead.location}`,
  );
  return `https://wa.me/917259416508?text=${msg}`;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-32" />
      <div className="h-4 bg-white/10 rounded w-24 ml-auto" />
      <div className="h-5 bg-white/10 rounded w-16" />
      <div className="h-8 bg-white/10 rounded w-28" />
    </div>
  );
}

// ── Lead detail panel ─────────────────────────────────────────────────────────
function LeadDetail({
  lead,
  onMarkContacted,
  marking,
}: {
  lead: Lead;
  onMarkContacted: (id: string) => void;
  marking: boolean;
}) {
  return (
    <div
      className="bg-[#0F172A]/80 border-t border-white/10 px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"
      data-ocid="admin.leads.detail_panel"
    >
      <div className="space-y-1">
        <Row label="Name" value={lead.name} />
        <Row label="Phone" value={lead.phone} />
        <Row label="Email" value={lead.email || "—"} />
        <Row label="Location" value={lead.location} />
      </div>
      <div className="space-y-1">
        <Row label="Service" value={lead.service_type} />
        <Row label="Budget" value={lead.budget || "—"} />
        <Row label="Timestamp" value={formatDate(lead.created_at)} />
        <Row label="Priority" value={lead.is_priority ? "Yes" : "No"} />
        <Row label="Contacted" value={lead.is_contacted ? "Yes" : "No"} />
      </div>
      {lead.message && (
        <div className="sm:col-span-2 bg-white/5 rounded-lg px-3 py-2 text-white/60">
          <span className="text-white/40 text-xs uppercase tracking-wide block mb-1">
            Message
          </span>
          {lead.message}
        </div>
      )}
      <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onMarkContacted(lead.id)}
          disabled={lead.is_contacted || marking}
          data-ocid="admin.leads.mark_contacted_btn"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
            ${
              lead.is_contacted
                ? "bg-green-500/20 text-green-300 border border-green-500/30 cursor-default"
                : "bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20 disabled:opacity-50"
            }`}
        >
          <CheckCircle size={14} />
          {lead.is_contacted
            ? "Contacted"
            : marking
              ? "Saving…"
              : "Mark as Contacted"}
        </button>
        <a
          href={whatsAppUrl(lead)}
          target="_blank"
          rel="noopener noreferrer"
          data-ocid="admin.leads.whatsapp_detail_btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 transition-all"
        >
          <MessageCircle size={14} />
          Open in WhatsApp
        </a>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-white/40 w-20 shrink-0">{label}:</span>
      <span className="text-white/80 min-w-0 break-words">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function LeadsContent() {
  const { actor, isFetching: actorLoading } = useActor();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<{
    service_type: string;
    date_from: string;
    date_to: string;
  }>({ service_type: "", date_from: "", date_to: "" });

  const [appliedFilter, setAppliedFilter] = useState<LeadFilter>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const {
    data: leads = [],
    isLoading,
    isFetching,
  } = useQuery<Lead[]>({
    queryKey: ["adminLeads", appliedFilter],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = actor as any;
      if (typeof a.getLeads !== "function") return [];
      return a.getLeads(appliedFilter) as Promise<Lead[]>;
    },
    enabled: !!actor && !actorLoading,
  });

  const markContacted = useMutation({
    mutationFn: async (leadId: string) => {
      if (!actor) throw new Error("No actor");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = actor as any;
      if (typeof a.markLeadContacted !== "function")
        throw new Error("Method not found");
      return a.markLeadContacted(leadId) as Promise<boolean>;
    },
    onMutate: (leadId) => setMarkingId(leadId),
    onSettled: () => {
      setMarkingId(null);
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
    },
  });

  const handleApplyFilter = () => {
    const f: LeadFilter = {};
    if (filter.service_type) f.service_type = filter.service_type;
    if (filter.date_from)
      f.date_from = BigInt(new Date(filter.date_from).getTime()) * 1_000_000n;
    if (filter.date_to)
      f.date_to = BigInt(new Date(filter.date_to).getTime()) * 1_000_000n;
    setAppliedFilter(f);
  };

  const loading = isLoading || isFetching || actorLoading;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div
        className="bg-[#111827] border border-white/10 rounded-2xl p-4 flex flex-wrap gap-3 items-end"
        data-ocid="admin.leads.filter_bar"
      >
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label
            htmlFor="leads-service-filter"
            className="text-white/40 text-xs uppercase tracking-wide"
          >
            Service Type
          </label>
          <select
            id="leads-service-filter"
            value={filter.service_type}
            onChange={(e) =>
              setFilter((f) => ({ ...f, service_type: e.target.value }))
            }
            data-ocid="admin.leads.service_filter"
            className="bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
          >
            <option value="">All Services</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="rent">Rent</option>
            <option value="investment">Investment</option>
            <option value="interior">Interior</option>
            <option value="general">General</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="leads-date-from"
            className="text-white/40 text-xs uppercase tracking-wide"
          >
            From
          </label>
          <input
            id="leads-date-from"
            type="date"
            value={filter.date_from}
            onChange={(e) =>
              setFilter((f) => ({ ...f, date_from: e.target.value }))
            }
            data-ocid="admin.leads.date_from"
            className="bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="leads-date-to"
            className="text-white/40 text-xs uppercase tracking-wide"
          >
            To
          </label>
          <input
            id="leads-date-to"
            type="date"
            value={filter.date_to}
            onChange={(e) =>
              setFilter((f) => ({ ...f, date_to: e.target.value }))
            }
            data-ocid="admin.leads.date_to"
            className="bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37]/40"
          />
        </div>
        <button
          type="button"
          onClick={handleApplyFilter}
          data-ocid="admin.leads.apply_filter_btn"
          className="px-5 py-2 bg-[#D4AF37] hover:bg-[#B8960C] text-black text-sm font-bold rounded-xl transition-all"
        >
          Apply Filter
        </button>
        {leads.length > 0 && !loading && (
          <span className="text-white/40 text-sm ml-auto self-end">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Leads table */}
      <div
        className="bg-[#111827] border border-white/10 rounded-2xl overflow-hidden"
        data-ocid="admin.leads.table"
      >
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[1fr_130px_100px_130px_44px] gap-2 px-4 py-2 border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
          <span>Name / Location</span>
          <span>Phone</span>
          <span>Service</span>
          <span>Time</span>
          <span />
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-white/30"
            data-ocid="admin.leads.empty_state"
          >
            <MessageCircle size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No leads found</p>
            <p className="text-xs mt-1">Try changing the filter above</p>
          </div>
        ) : (
          <div>
            {leads.map((lead) => {
              const isExpanded = expandedId === lead.id;
              return (
                <div
                  key={lead.id}
                  className="border-b border-white/5 last:border-none"
                  data-ocid={`admin.leads.row-${lead.id}`}
                >
                  {/* Row */}
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_100px_130px_44px] gap-1 sm:gap-2 items-center">
                      {/* Name + location */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm truncate">
                            {lead.name}
                          </span>
                          {lead.is_priority && (
                            <Star
                              size={12}
                              className="text-[#D4AF37] fill-[#D4AF37] shrink-0"
                            />
                          )}
                          {lead.is_contacted && (
                            <CheckCircle
                              size={12}
                              className="text-green-400 shrink-0"
                            />
                          )}
                        </div>
                        <span className="text-white/40 text-xs truncate">
                          {lead.location}
                        </span>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-1 text-white/70 text-sm">
                        <Phone size={12} className="text-white/30 shrink-0" />
                        {lead.phone}
                      </div>

                      {/* Service badge */}
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${serviceBadgeClass(lead.service_type)}`}
                        >
                          {lead.service_type}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <span className="text-white/40 text-xs">
                        {formatDate(lead.created_at)}
                      </span>

                      {/* Expand toggle + WhatsApp */}
                      <div className="flex items-center gap-2 justify-end">
                        <a
                          href={whatsAppUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          data-ocid={`admin.leads.whatsapp_btn-${lead.id}`}
                          className="p-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition-colors"
                          title="Open in WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-white/40" />
                        ) : (
                          <ChevronDown size={14} className="text-white/40" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Detail panel */}
                  {isExpanded && (
                    <LeadDetail
                      lead={lead}
                      onMarkContacted={(id) => markContacted.mutate(id)}
                      marking={markingId === lead.id}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page wrapper with admin auth gate ─────────────────────────────────────────
export default function AdminLeadsPage() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("valubrix_admin");
      if (s) setLoggedIn(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35] flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-white/60 mb-4">Admin access required.</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/admin" })}
            className="px-6 py-2 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl text-sm transition-all"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Admin
        </button>
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white">Leads Manager</h1>
          <span className="text-white/30 text-sm">
            WhatsApp leads dashboard
          </span>
        </div>
        <LeadsContent />
      </div>
    </div>
  );
}
