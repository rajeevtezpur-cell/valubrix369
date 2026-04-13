import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import GlobalNav from "../components/GlobalNav";
import { useAdmin } from "../context/AdminContext";

export default function AdminApprovalsPage() {
  const navigate = useNavigate();
  const { bankOfficers, approveBankOfficer, rejectBankOfficer } = useAdmin();
  const pending = bankOfficers.filter((o) => o.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft size={16} /> Back to Admin
        </button>
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white">
            Bank Officer Approvals
          </h1>
          {pending > 0 && (
            <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {pending} pending
            </span>
          )}
        </div>
        <div
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          data-ocid="admin.approvals.table"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="text-left px-6 py-4">Officer Name</th>
                <th className="text-left px-6 py-4">Organization</th>
                <th className="text-left px-6 py-4">Department</th>
                <th className="text-left px-6 py-4">Email</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bankOfficers.map((o, i) => (
                <tr
                  key={o.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                >
                  <td className="px-6 py-4 text-white text-sm">{o.name}</td>
                  <td className="px-6 py-4 text-white/60 text-sm">{o.orgId}</td>
                  <td className="px-6 py-4 text-white/60 text-sm">
                    {o.department}
                  </td>
                  <td className="px-6 py-4 text-white/60 text-sm">{o.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        o.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : o.status === "rejected"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {o.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-ocid={`admin.approve.button.${i + 1}`}
                          onClick={() => approveBankOfficer(o.id)}
                          className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          data-ocid={`admin.reject.button.${i + 1}`}
                          onClick={() => rejectBankOfficer(o.id)}
                          className="text-xs px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {o.status !== "pending" && (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {bankOfficers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-white/30 text-sm"
                    data-ocid="admin.approvals.empty_state"
                  >
                    No bank officer applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
