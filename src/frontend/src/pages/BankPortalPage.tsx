import { useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  LogOut,
  Map as MapIcon,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BankerPendingScreen from "../components/BankerPendingScreen";
import GlobalMapComponent from "../components/GlobalMapComponent";
import GlobalNav from "../components/GlobalNav";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";

type PageState = "login" | "otp" | "profile" | "pending" | "dashboard";

interface OfficerSession {
  id: string;
  name: string;
  orgId: string;
  designation: string;
  department: string;
  employeeId: string;
  email: string;
  status: "pending" | "approved" | "rejected";
}

export default function BankPortalPage() {
  const navigate = useNavigate();
  const { addBankOfficer, bankOfficers } = useAdmin();
  const { user } = useAuth();

  const [pageState, setPageState] = useState<PageState>("login");
  const [orgId, setOrgId] = useState("");
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [officerData, setOfficerData] = useState({
    name: "",
    designation: "",
    department: "",
    employeeId: "",
  });
  const [session, setSession] = useState<OfficerSession | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    try {
      const s = localStorage.getItem("valubrix_bank_officer");
      if (s) {
        const parsed: OfficerSession = JSON.parse(s);
        const fromAdmin = bankOfficers.find((o) => o.id === parsed.id);
        const currentStatus = fromAdmin?.status ?? parsed.status;
        const updated = { ...parsed, status: currentStatus };
        setSession(updated);
        localStorage.setItem("valubrix_bank_officer", JSON.stringify(updated));
        setPageState(updated.status === "approved" ? "dashboard" : "pending");
      }
    } catch {
      /* ignore */
    }
  }, [bankOfficers]);

  useEffect(() => {
    if (!timerActive) return;
    if (timer === 0) {
      setTimerActive(false);
      return;
    }
    const t = setTimeout(() => setTimer((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, timerActive]);

  // FIX: If AuthContext user is banker with pending/rejected status, show appropriate screen
  // All hooks are above this point so this is safe.
  if (user && (user.role === "banker" || user.role === "bankOfficer")) {
    if (user.bankOfficerStatus === "pending") return <BankerPendingScreen />;
    if (user.bankOfficerStatus === "rejected") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0F1F] to-[#121B35] px-4">
          <GlobalNav />
          <div
            className="text-center rounded-2xl p-10 max-w-md w-full mt-20"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <span style={{ fontSize: 40 }}>❌</span>
            <h2
              className="text-xl font-bold text-white mt-4 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Access Not Approved
            </h2>
            <p className="text-white/50 text-sm">
              Your banker access request was not approved. Please contact
              support for more information.
            </p>
          </div>
        </div>
      );
    }
  }

  const handleSendOtp = () => {
    if (!orgId.trim() || !contact.trim()) return;
    setPageState("otp");
    setTimer(60);
    setTimerActive(true);
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleVerifyOtp = () => {
    const code = otp.join("");
    if (code !== "123456") {
      setOtpError("Invalid OTP. Use 123456");
      return;
    }
    setOtpError("");
    const existing = bankOfficers.find(
      (o) => o.email === contact || o.orgId === orgId,
    );
    if (existing) {
      localStorage.setItem("valubrix_bank_officer", JSON.stringify(existing));
      setSession(existing);
      setPageState(existing.status === "approved" ? "dashboard" : "pending");
    } else {
      setPageState("profile");
    }
  };

  const handleProfileSubmit = () => {
    if (
      !officerData.name ||
      !officerData.designation ||
      !officerData.department ||
      !officerData.employeeId
    )
      return;
    const newOfficer: OfficerSession = {
      id: `bo_${Date.now()}`,
      name: officerData.name,
      orgId,
      designation: officerData.designation,
      department: officerData.department,
      employeeId: officerData.employeeId,
      email: contact,
      status: "pending",
    };
    addBankOfficer({ ...newOfficer });
    localStorage.setItem("valubrix_bank_officer", JSON.stringify(newOfficer));
    setSession(newOfficer);
    setPageState("pending");
  };

  const handleLogout = () => {
    localStorage.removeItem("valubrix_bank_officer");
    setSession(null);
    setPageState("login");
    setOtp(["", "", "", "", "", ""]);
    setContact("");
    setOrgId("");
  };

  const dashCards = [
    {
      icon: TrendingUp,
      title: "Single Property Valuation",
      desc: "Evaluate a property's fair market value",
      route: "/valuation",
    },
    {
      icon: BarChart2,
      title: "Bulk Valuation",
      desc: "Evaluate up to 5 properties at once",
      route: "/bank/bulk",
    },
    {
      icon: FileText,
      title: "Loan Risk Reports",
      desc: "View detailed risk analysis reports",
      route: "/bank/history",
    },
    {
      icon: Clock,
      title: "Valuation History",
      desc: "Access all past valuations",
      route: "/bank/history",
    },
  ];

  const profileFields = [
    { key: "name" as const, label: "Full Name", placeholder: "Your full name" },
    {
      key: "designation" as const,
      label: "Designation",
      placeholder: "e.g. Senior Loan Officer",
    },
    {
      key: "department" as const,
      label: "Department",
      placeholder: "e.g. Home Loans",
    },
    {
      key: "employeeId" as const,
      label: "Employee ID",
      placeholder: "e.g. EMP-0042",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        {pageState === "login" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center">
                <Building2 size={24} className="text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Bank & Financial Institution Portal
                </h1>
                <p className="text-white/50 text-sm">
                  Secure access for verified officers
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="orgId"
                  className="text-white/70 text-sm mb-1 block"
                >
                  Organization ID
                </label>
                <input
                  id="orgId"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  placeholder="e.g. HDFC-MUM-001"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label
                  htmlFor="contact"
                  className="text-white/70 text-sm mb-1 block"
                >
                  Official Email or Mobile
                </label>
                <input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="email@bank.com or 9876543210"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <button
                type="button"
                data-ocid="bank.login.submit_button"
                onClick={handleSendOtp}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              >
                Send OTP
              </button>
            </div>
            <p className="text-white/30 text-xs text-center mt-4">
              Credentials are verified against RBI-registered institutions
            </p>
          </div>
        )}

        {pageState === "otp" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="text-2xl font-bold text-white mb-2">
              OTP Verification
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Enter the 6-digit code sent to {contact}
            </p>
            <div className="flex gap-3 justify-center mb-4">
              {([0, 1, 2, 3, 4, 5] as const).map((i) => {
                const d = otp[i];
                return (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={d}
                    data-ocid="bank.otp.input"
                    aria-label={`OTP digit ${i + 1}`}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0)
                        inputRefs.current[i - 1]?.focus();
                    }}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all bg-white/5 text-white focus:outline-none ${
                      d
                        ? "border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                        : "border-white/20"
                    }`}
                  />
                );
              })}
            </div>
            {otpError && (
              <p className="text-red-400 text-sm text-center mb-3">
                {otpError}
              </p>
            )}
            <div className="text-center mb-4">
              {timerActive ? (
                <span className="text-white/50 text-sm">
                  Resend OTP in{" "}
                  <span className="text-[#D4AF37] font-mono">{timer}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTimer(60);
                    setTimerActive(true);
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  className="text-[#D4AF37] text-sm hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleVerifyOtp}
              className="w-full py-3 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all"
            >
              Verify & Continue
            </button>
            <p className="text-white/30 text-xs text-center mt-3">
              Demo OTP: 123456
            </p>
          </div>
        )}

        {pageState === "profile" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="text-2xl font-bold text-white mb-2">
              Complete Your Profile
            </h2>
            <p className="text-white/50 text-sm mb-6">
              This information is required for verification
            </p>
            <div className="space-y-4">
              {profileFields.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label
                    htmlFor={`profile-${key}`}
                    className="text-white/70 text-sm mb-1 block"
                  >
                    {label}
                  </label>
                  <input
                    id={`profile-${key}`}
                    value={officerData[key]}
                    onChange={(e) =>
                      setOfficerData((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              ))}
              <button
                type="button"
                data-ocid="bank.profile.submit_button"
                onClick={handleProfileSubmit}
                className="w-full py-3 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        )}

        {pageState === "pending" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Awaiting Admin Approval
            </h2>
            <p className="text-white/60 mb-2">
              Welcome, <span className="text-[#D4AF37]">{session?.name}</span>
            </p>
            <p className="text-white/50 text-sm mb-6">
              Your account has been submitted for review. An administrator will
              approve your access shortly.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
              <p className="text-amber-300 text-sm">
                Status:{" "}
                <span className="font-semibold">Pending Admin Approval</span>
              </p>
              <p className="text-white/40 text-xs mt-1">
                Organization: {session?.orgId}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 mx-auto text-white/50 hover:text-white text-sm"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}

        {pageState === "dashboard" && (
          <div>
            <button
              type="button"
              data-ocid="bank.dashboard.back.button"
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-1.5 mb-6 text-sm font-medium transition-colors hover:opacity-100"
              style={{ color: "#C9A84C", opacity: 0.8 }}
            >
              <span style={{ fontSize: "16px" }}>←</span>
              <span>Back to Home</span>
            </button>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Welcome, {session?.name}
                </h2>
                <p className="text-white/50 text-sm">
                  {session?.designation} · {session?.orgId}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full">
                  <CheckCircle size={12} /> Approved
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-white/40 hover:text-white"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {dashCards.map(({ icon: Icon, title, desc, route }) => (
                <button
                  key={title}
                  type="button"
                  data-ocid="bank.dashboard.valuation.card"
                  onClick={() => navigate({ to: route })}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:-translate-y-1 hover:bg-white/8 hover:border-[#D4AF37]/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/25 transition-colors">
                    <Icon size={22} className="text-[#D4AF37]" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{title}</h3>
                  <p className="text-white/50 text-sm">{desc}</p>
                </button>
              ))}
            </div>

            {/* Property Market Map */}
            <div
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              data-ocid="bank.market_map.section"
            >
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                <MapIcon size={16} className="text-[#D4AF37]" />
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    Property Market Map
                  </h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    Market overview for collateral assessment
                  </p>
                </div>
              </div>
              <div style={{ height: 360 }}>
                <GlobalMapComponent
                  mode="explore"
                  center={[12.9716, 77.5946]}
                  zoom={12}
                  height="360px"
                  showLayerToggle={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
