import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import GlobalNav from "../components/GlobalNav";
import OTPInput from "../components/OTPInput";
import { useAuth } from "../context/AuthContext";

type Tab = "mobile" | "email" | "password";
type Phase = "input" | "otp" | "done";

function getRoleRedirect(role: string): string {
  if (role === "buyer") return "/buyer";
  if (role === "seller") return "/seller";
  if (role === "bankOfficer") return "/bank";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

export default function AuthPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("mobile");
  const [phase, setPhase] = useState<Phase>("input");
  const [mobileVal, setMobileVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [error, setError] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: navigate is stable
  useEffect(() => {
    if (user) navigate({ to: getRoleRedirect(user.role) as any });
  }, [user]);

  useEffect(() => {
    if (!timerActive) return;
    if (timer === 0) {
      setTimerActive(false);
      return;
    }
    const t = setTimeout(() => setTimer((t2) => t2 - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, timerActive]);

  const startOtp = () => {
    setPhase("otp");
    setTimer(60);
    setTimerActive(true);
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
  };

  const verifyOtp = () => {
    const code = otp.join("");
    if (code === "123456") {
      const identifier = tab === "mobile" ? mobileVal : emailVal;
      // Try to find existing user in localStorage to preserve role
      let existingRole = "buyer";
      try {
        const stored = localStorage.getItem("valubrix_user");
        if (stored) {
          const u = JSON.parse(stored);
          if (
            u.username === identifier ||
            u.mobile === identifier ||
            u.email === identifier
          ) {
            existingRole = u.role;
          }
        }
      } catch {
        /* ignore */
      }
      const userData = {
        username: identifier,
        fullName: identifier,
        city: "",
        role: existingRole as any,
      };
      login(userData);
      navigate({ to: getRoleRedirect(existingRole) as any });
    } else {
      setOtpError("Invalid OTP. Please try again.");
    }
  };

  const handlePasswordLogin = () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }
    // Check stored user for role
    let existingRole = "buyer";
    try {
      const stored = localStorage.getItem("valubrix_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.username === username) existingRole = u.role;
      }
    } catch {
      /* ignore */
    }
    const userData = {
      username,
      fullName: username,
      city: "",
      role: existingRole as any,
    };
    login(userData);
    navigate({ to: getRoleRedirect(existingRole) as any });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "mobile", label: "Mobile OTP" },
    { id: "email", label: "Email OTP" },
    { id: "password", label: "Username & Password" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/50 text-sm mb-6">
              Sign in to your ValuBrix account
            </p>

            <div className="flex bg-white/5 rounded-xl p-1 mb-6">
              {tabs.map((t, i) => (
                <button
                  type="button"
                  key={t.id}
                  data-ocid={`auth.login.tab.${i + 1}`}
                  onClick={() => {
                    setTab(t.id);
                    setPhase("input");
                    setError("");
                    setOtpError("");
                  }}
                  className={`flex-1 py-2 px-1 text-xs rounded-lg font-medium transition-all ${
                    tab === t.id
                      ? "bg-[#D4AF37] text-black"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "mobile" &&
              (phase === "input" ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-3 top-3.5 text-white/40"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile Number"
                      value={mobileVal}
                      onChange={(e) => setMobileVal(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={startOtp}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                  >
                    Send OTP
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-white/60 text-sm text-center">
                    Enter OTP sent to {mobileVal}
                  </p>
                  <OTPInput value={otp} onChange={setOtp} error={otpError} />
                  <div className="text-center text-sm">
                    {timer > 0 ? (
                      <span className="text-white/40">Resend in {timer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={startOtp}
                        className="text-[#D4AF37] hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    data-ocid="auth.otp.submit_button"
                    onClick={verifyOtp}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                  >
                    Verify OTP
                  </button>
                </div>
              ))}

            {tab === "email" &&
              (phase === "input" ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-3.5 text-white/40"
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={emailVal}
                      onChange={(e) => setEmailVal(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={startOtp}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                  >
                    Send OTP
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-white/60 text-sm text-center">
                    Enter OTP sent to {emailVal}
                  </p>
                  <OTPInput value={otp} onChange={setOtp} error={otpError} />
                  <div className="text-center text-sm">
                    {timer > 0 ? (
                      <span className="text-white/40">Resend in {timer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={startOtp}
                        className="text-[#D4AF37] hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    data-ocid="auth.otp.submit_button"
                    onClick={verifyOtp}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                  >
                    Verify OTP
                  </button>
                </div>
              ))}

            {tab === "password" && (
              <div className="space-y-4">
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-3.5 text-white/40"
                  />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-3.5 text-white/40"
                  />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3.5 text-white/40"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="button"
                  onClick={handlePasswordLogin}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                >
                  Login
                </button>
                <div className="text-center">
                  <Link
                    to="/auth/reset"
                    className="text-[#D4AF37] text-sm hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>
            )}

            <p className="text-center text-white/40 text-sm mt-6">
              Don't have an account?{" "}
              <Link
                to="/auth/signup"
                className="text-[#D4AF37] hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
