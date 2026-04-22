import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart2,
  CheckSquare,
  Database,
  Home,
  List,
  Lock,
  MessageSquare,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // AuthContext admin/tester users bypass the legacy login gate
    if (user && (user.role === "admin" || user.role === "tester")) {
      navigate({ to: "/admin/dashboard" });
      return;
    }
    try {
      const s = localStorage.getItem("valubrix_admin");
      if (s) setLoggedIn(true);
    } catch {
      /* ignore */
    }
  }, [user, navigate]);

  const handleLogin = () => {
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("valubrix_admin", JSON.stringify({ username }));
      setLoggedIn(true);
      setError("");
    } else {
      setError("Invalid credentials. Use admin / admin123");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("valubrix_admin");
    setLoggedIn(false);
    setUsername("");
    setPassword("");
  };

  const cards = [
    {
      icon: Users,
      title: "User Management",
      desc: "View, suspend, or delete users",
      route: "/admin/users",
      color: "blue",
    },
    {
      icon: CheckSquare,
      title: "Bank Officer Approvals",
      desc: "Approve or reject pending bank officers",
      route: "/admin/approvals",
      color: "emerald",
    },
    {
      icon: List,
      title: "Listing Moderation",
      desc: "Review and moderate property listings",
      route: "/admin/listings",
      color: "amber",
    },
    {
      icon: BarChart2,
      title: "Reports Monitoring",
      desc: "Monitor valuation and bank report activity",
      route: "/admin/reports",
      color: "purple",
    },
    {
      icon: Database,
      title: "Data Distribution",
      desc: "Real records and avg price per sqft by locality",
      route: "/admin/data-distribution",
      color: "emerald",
    },
    {
      icon: Database,
      title: "RERA Upload",
      desc: "Upload new RERA projects to AI valuation engine",
      route: "/admin/rera",
      color: "amber",
    },
    {
      icon: MessageSquare,
      title: "Leads Manager",
      desc: "View, filter, and manage WhatsApp leads",
      route: "/admin/leads",
      color: "green",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35] px-4">
      <div className="max-w-2xl mx-auto pt-16 pb-16">
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            <Home size={14} /> Back to Home
          </button>
          {loggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-red-400/70 hover:text-red-400 text-sm"
            >
              Logout
            </button>
          )}
        </div>

        {!loggedIn ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
                <Shield size={24} className="text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  ValuBrix Admin Panel
                </h1>
                <p className="text-white/40 text-sm">Restricted access</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="admin-username"
                  className="text-white/60 text-sm mb-1 block"
                >
                  Username
                </label>
                <input
                  id="admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-password"
                  className="text-white/60 text-sm mb-1 block"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="button"
                data-ocid="admin.login.submit_button"
                onClick={handleLogin}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all"
              >
                <Lock size={16} className="inline mr-2" />
                Login
              </button>
            </div>
            <p className="text-white/20 text-xs text-center mt-4">
              Demo: admin / admin123
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
              <p className="text-white/40 text-sm mt-1">
                Logged in as <span className="text-[#D4AF37]">admin</span>
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.map(({ icon: Icon, title, desc, route, color }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => navigate({ to: route })}
                  className={`bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:-translate-y-1 hover:bg-white/8 hover:border-white/20 transition-all group bg-${color}-500/0`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors bg-${color}-500/15 group-hover:bg-${color}-500/25`}
                  >
                    <Icon size={22} className={`text-${color}-400`} />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-white/40 text-sm">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
