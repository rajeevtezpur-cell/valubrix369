import { Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail, Phone } from "lucide-react";
import { useState } from "react";
import GlobalNav from "../components/GlobalNav";
import OTPInput from "../components/OTPInput";

type Step = "select" | "otp" | "newpass";

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("select");
  const [method, setMethod] = useState<"mobile" | "email">("mobile");
  const [value, setValue] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(0);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passError, setPassError] = useState("");

  const sendOtp = () => {
    if (!value.trim()) return;
    setStep("otp");
    setTimer(60);
    const tick = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(tick);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
  };

  const verifyOtp = () => {
    if (otp.join("") === "123456") setStep("newpass");
    else setOtpError("Invalid OTP. Please try again.");
  };

  const resetPassword = () => {
    if (!newPass.trim()) {
      setPassError("Enter new password.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("Passwords do not match.");
      return;
    }
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 px-4 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
            {step === "select" && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Reset Password
                </h1>
                <p className="text-white/50 text-sm mb-6">
                  We'll send an OTP to verify your identity
                </p>
                <div className="flex gap-3 mb-4">
                  {(["mobile", "email"] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        method === m
                          ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                          : "bg-white/5 text-white/60 border-white/10"
                      }`}
                    >
                      {m === "mobile" ? "Mobile" : "Email"}
                    </button>
                  ))}
                </div>
                <div className="relative mb-4">
                  {method === "mobile" ? (
                    <Phone
                      size={16}
                      className="absolute left-3 top-3.5 text-white/40"
                    />
                  ) : (
                    <Mail
                      size={16}
                      className="absolute left-3 top-3.5 text-white/40"
                    />
                  )}
                  <input
                    type={method === "mobile" ? "tel" : "email"}
                    placeholder={
                      method === "mobile" ? "Mobile Number" : "Email Address"
                    }
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendOtp}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                >
                  Send OTP
                </button>
                <p className="text-center mt-4">
                  <Link
                    to="/auth"
                    className="text-[#D4AF37] text-sm hover:underline"
                  >
                    Back to Login
                  </Link>
                </p>
              </>
            )}

            {step === "otp" && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Enter OTP
                </h1>
                <p className="text-white/50 text-sm mb-6">
                  OTP sent to {value}
                </p>
                <div className="space-y-4">
                  <OTPInput value={otp} onChange={setOtp} error={otpError} />
                  <div className="text-center text-sm">
                    {timer > 0 ? (
                      <span className="text-white/40">Resend in {timer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={sendOtp}
                        className="text-[#D4AF37] hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={verifyOtp}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                  >
                    Verify OTP
                  </button>
                </div>
              </>
            )}

            {step === "newpass" && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Create New Password
                </h1>
                <p className="text-white/50 text-sm mb-6">
                  Choose a strong password
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-3.5 text-white/40"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-3.5 text-white/40"
                    />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  {passError && (
                    <p className="text-red-400 text-sm">{passError}</p>
                  )}
                  <button
                    type="button"
                    onClick={resetPassword}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                  >
                    Reset Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
