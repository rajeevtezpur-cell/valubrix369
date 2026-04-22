// @ts-nocheck
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import GlobalNav from "../components/GlobalNav";
import { useActor } from "../hooks/useActor";

// ─── Backend status helper ────────────────────────────────────────────────────
function getStatusString(status: {
  pending?: null;
  approved?: null;
  rejected?: null;
}): "pending" | "approved" | "rejected" {
  if ("approved" in status) return "approved";
  if ("rejected" in status) return "rejected";
  return "pending";
}

// ─── Row type ─────────────────────────────────────────────────────────────────
interface BankerRow {
  id: bigint;
  name: string;
  org: string;
  mobile: string;
  email: string;
  city: string;
  appliedAt: bigint;
  status: "pending" | "approved" | "rejected";
}

function formatDate(ns: bigint): string {
  try {
    const ms = Number(ns) / 1_000_000;
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function AdminApprovalsPage() {
  const navigate = useNavigate();
  const { actor, isFetching: actorLoading } = useActor();

  const [bankers, setBankers] = useState<BankerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );

  const pending = bankers.filter((b) => b.status === "pending").length;

  // ─── Fetch from backend + merge with localStorage queue ──────────────────────
  const fetchBankers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load from localStorage first (bankers registered via signup flow)
      let localBankers: BankerRow[] = [];
      try {
        const raw = localStorage.getItem("valubrix_bank_officers");
        if (raw) {
          const arr = JSON.parse(raw) as Array<{
            id: string;
            name: string;
            orgId?: string;
            designation?: string;
            email?: string;
            mobile?: string;
            city?: string;
            dateApplied?: string;
            status?: string;
          }>;
          localBankers = arr.map((a, idx) => ({
            id: BigInt(idx + 1),
            name: a.name || "Unknown",
            org: a.orgId || a.designation || "—",
            mobile: a.mobile || "—",
            email: a.email || "—",
            city: a.city || "—",
            appliedAt: BigInt(
              new Date(a.dateApplied || Date.now()).getTime() * 1_000_000,
            ),
            status: (a.status === "approved"
              ? "approved"
              : a.status === "rejected"
                ? "rejected"
                : "pending") as "pending" | "approved" | "rejected",
          }));
        }
      } catch {
        /* ignore localStorage errors */
      }

      // If backend actor is available, merge backend data (takes priority)
      if (actor) {
        const apps = await actor.getAllBankerApps();
        const backendRows: BankerRow[] = apps.map((a) => ({
          id: a.id,
          name: a.name,
          org: a.org,
          mobile: a.mobile,
          email: a.email,
          city: a.city,
          appliedAt: a.appliedAt,
          status: getStatusString(a.status),
        }));
        // Merge: backend data by email/name, then local
        const backendEmails = new Set(
          backendRows.map((r) => r.email.toLowerCase()),
        );
        const filteredLocal = localBankers.filter(
          (l) => !backendEmails.has(l.email.toLowerCase()),
        );
        const merged = [...backendRows, ...filteredLocal];
        merged.sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return Number(b.appliedAt - a.appliedAt);
        });
        setBankers(merged);
      } else {
        // No actor — use localStorage only
        localBankers.sort((a, b) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return Number(b.appliedAt - a.appliedAt);
        });
        setBankers(localBankers);
        if (localBankers.length === 0) {
          setError(
            "No banker applications found. Applications submitted via signup will appear here.",
          );
        }
      }
    } catch (e) {
      setError("Failed to load banker applications. Please try again.");
      console.error("[AdminApprovals] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    // Fetch bankers even if actor isn't ready yet (localStorage fallback)
    if (!actorLoading) {
      fetchBankers();
    }
  }, [actorLoading, fetchBankers]);

  // ─── Approve / Reject ───────────────────────────────────────────────────────
  async function handleApprove(id: bigint, bankerEmail?: string) {
    const key = id.toString();
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      if (actor) {
        const ok = await actor.approveBankOfficer(id, "Approved by admin");
        if (!ok) throw new Error("Backend returned false");
      } else {
        // localStorage fallback
        const raw = localStorage.getItem("valubrix_bank_officers");
        if (raw) {
          const arr = JSON.parse(raw);
          const idx = arr.findIndex(
            (_: unknown, i: number) => BigInt(i + 1) === id,
          );
          if (idx !== -1) arr[idx].status = "approved";
          localStorage.setItem("valubrix_bank_officers", JSON.stringify(arr));
        }
      }
      // Update localStorage banker list so logged-in banker's status refreshes
      if (bankerEmail) {
        try {
          const raw = localStorage.getItem("valubrix_bank_officers");
          if (raw) {
            const arr = JSON.parse(raw);
            const idx = arr.findIndex(
              (b: { email?: string }) =>
                b.email?.toLowerCase() === bankerEmail.toLowerCase(),
            );
            if (idx !== -1) arr[idx].status = "approved";
            localStorage.setItem("valubrix_bank_officers", JSON.stringify(arr));
          }
        } catch {
          /* ignore */
        }
      }
      toast.success("Banker approved successfully");
      await fetchBankers();
    } catch (e) {
      console.error("[AdminApprovals] approve error:", e);
      toast.error("Failed to approve banker. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleReject(id: bigint, bankerEmail?: string) {
    const key = id.toString();
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      if (actor) {
        const ok = await actor.rejectBankOfficer(id, "Rejected by admin");
        if (!ok) throw new Error("Backend returned false");
      } else {
        // localStorage fallback
        const raw = localStorage.getItem("valubrix_bank_officers");
        if (raw) {
          const arr = JSON.parse(raw);
          const idx = arr.findIndex(
            (_: unknown, i: number) => BigInt(i + 1) === id,
          );
          if (idx !== -1) arr[idx].status = "rejected";
          localStorage.setItem("valubrix_bank_officers", JSON.stringify(arr));
        }
      }
      // Update localStorage banker list
      if (bankerEmail) {
        try {
          const raw = localStorage.getItem("valubrix_bank_officers");
          if (raw) {
            const arr = JSON.parse(raw);
            const idx = arr.findIndex(
              (b: { email?: string }) =>
                b.email?.toLowerCase() === bankerEmail.toLowerCase(),
            );
            if (idx !== -1) arr[idx].status = "rejected";
            localStorage.setItem("valubrix_bank_officers", JSON.stringify(arr));
          }
        } catch {
          /* ignore */
        }
      }
      toast.success("Banker application rejected");
      await fetchBankers();
    } catch (e) {
      console.error("[AdminApprovals] reject error:", e);
      toast.error("Failed to reject banker application. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #0A0F1F, #121B35)" }}
    >
      <GlobalNav />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          className="flex items-center gap-2 mb-6 text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "white";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.4)";
          }}
        >
          <ArrowLeft size={16} /> Back to Admin
        </button>

        <div className="flex items-center gap-3 mb-6">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Banker Approvals
          </h1>
          {pending > 0 && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(251,191,36,0.15)",
                color: "#FBBF24",
                border: "1px solid rgba(251,191,36,0.3)",
              }}
            >
              {pending} pending
            </span>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchBankers}
            disabled={loading}
            data-ocid="admin.approvals.refresh_button"
            className="ml-auto flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            data-ocid="admin.approvals.error_state"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            className="flex items-center justify-center py-16"
            data-ocid="admin.approvals.loading_state"
          >
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            data-ocid="admin.approvals.table"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    {[
                      "Name",
                      "Organization",
                      "Mobile",
                      "Email",
                      "City",
                      "Date Applied",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "rgba(185,198,216,0.5)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bankers.map((o, i) => {
                    const key = o.id.toString();
                    const isActing = actionLoading[key];
                    return (
                      <tr
                        key={key}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                        data-ocid={`admin.approvals.row.${i + 1}`}
                      >
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-white">
                            {o.name}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="text-sm"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            {o.org || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="text-sm"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            {o.mobile || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="text-sm"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            {o.email}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="text-sm"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            {o.city || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="text-sm"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {formatDate(o.appliedAt)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-semibold"
                            style={
                              o.status === "approved"
                                ? {
                                    background: "rgba(16,185,129,0.12)",
                                    color: "#34D399",
                                    border: "1px solid rgba(16,185,129,0.25)",
                                  }
                                : o.status === "rejected"
                                  ? {
                                      background: "rgba(239,68,68,0.12)",
                                      color: "#f87171",
                                      border: "1px solid rgba(239,68,68,0.25)",
                                    }
                                  : {
                                      background: "rgba(251,191,36,0.12)",
                                      color: "#FBBF24",
                                      border: "1px solid rgba(251,191,36,0.25)",
                                    }
                            }
                          >
                            {o.status.charAt(0).toUpperCase() +
                              o.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {o.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                data-ocid={`admin.approve.button.${i + 1}`}
                                onClick={() => handleApprove(o.id, o.email)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                                style={{
                                  background: isActing
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(16,185,129,0.12)",
                                  color: "#34D399",
                                  border: "1px solid rgba(16,185,129,0.25)",
                                  opacity: isActing ? 0.5 : 1,
                                  cursor: isActing ? "not-allowed" : "pointer",
                                }}
                              >
                                <CheckCircle size={12} />
                                {isActing ? "…" : "Approve"}
                              </button>
                              <button
                                type="button"
                                data-ocid={`admin.reject.button.${i + 1}`}
                                onClick={() => handleReject(o.id, o.email)}
                                disabled={isActing}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                                style={{
                                  background: "rgba(239,68,68,0.08)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239,68,68,0.2)",
                                  opacity: isActing ? 0.5 : 1,
                                  cursor: isActing ? "not-allowed" : "pointer",
                                }}
                              >
                                <XCircle size={12} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span
                              style={{
                                color: "rgba(255,255,255,0.2)",
                                fontSize: 13,
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {bankers.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-14 text-center"
                        data-ocid="admin.approvals.empty_state"
                        style={{
                          color: "rgba(255,255,255,0.25)",
                          fontSize: 14,
                        }}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <span style={{ fontSize: 32 }}>🏦</span>
                          <p>No banker applications yet.</p>
                          <p
                            style={{
                              fontSize: 12,
                              color: "rgba(255,255,255,0.15)",
                            }}
                          >
                            When users sign up as Banker, they'll appear here
                            for approval.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
