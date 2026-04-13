import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import GlobalNav from "../components/GlobalNav";
import { useAdmin } from "../context/AdminContext";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { adminUsers, suspendUser, deleteUser } = useAdmin();

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
        <h1 className="text-2xl font-bold text-white mb-6">User Management</h1>
        <div
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          data-ocid="admin.users.table"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="text-left px-6 py-4">Name</th>
                <th className="text-left px-6 py-4">Email</th>
                <th className="text-left px-6 py-4">City</th>
                <th className="text-left px-6 py-4">Role</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                >
                  <td className="px-6 py-4 text-white text-sm">{u.name}</td>
                  <td className="px-6 py-4 text-white/60 text-sm">{u.email}</td>
                  <td className="px-6 py-4 text-white/60 text-sm">{u.city}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        u.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => suspendUser(u.id)}
                        className="text-xs px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        {u.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        data-ocid={`admin.users.delete_button.${i + 1}`}
                        onClick={() => deleteUser(u.id)}
                        className="text-xs px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {adminUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-white/30 text-sm"
                    data-ocid="admin.users.empty_state"
                  >
                    No users found.
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
