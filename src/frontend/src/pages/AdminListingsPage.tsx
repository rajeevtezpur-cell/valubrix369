import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import GlobalNav from "../components/GlobalNav";
import { useAdmin } from "../context/AdminContext";

export default function AdminListingsPage() {
  const navigate = useNavigate();
  const { adminListings, approveListing, removeListing } = useAdmin();

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
        <h1 className="text-2xl font-bold text-white mb-6">
          Listing Moderation
        </h1>
        <div
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          data-ocid="admin.listings.table"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="text-left px-6 py-4">Property</th>
                <th className="text-left px-6 py-4">Location</th>
                <th className="text-left px-6 py-4">Type</th>
                <th className="text-left px-6 py-4">Price</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminListings.map((l, i) => (
                <tr
                  key={l.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                >
                  <td className="px-6 py-4 text-white text-sm">{l.property}</td>
                  <td className="px-6 py-4 text-white/60 text-sm">
                    {l.location}
                  </td>
                  <td className="px-6 py-4 text-white/60 text-sm">{l.type}</td>
                  <td className="px-6 py-4 text-[#D4AF37] font-mono text-sm">
                    {l.price}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        l.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : l.status === "removed"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {l.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => approveListing(l.id)}
                          className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {l.status !== "removed" && (
                        <button
                          type="button"
                          data-ocid={`admin.listings.delete_button.${i + 1}`}
                          onClick={() => removeListing(l.id)}
                          className="text-xs px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
