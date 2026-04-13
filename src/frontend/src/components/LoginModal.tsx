import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import OTPInput from "./OTPInput";

// ─── Types ────────────────────────────────────────────────────────────────────
type TopMethod = "otp" | "email_password";
type OtpTab = "mobile" | "email";
type EpTab = "signin" | "signup";

const ROLE_COLORS: Record<string, string> = {
  buyer: "#3B82F6",
  seller: "#C9A84C",
  banker: "#16C784",
};
const ROLE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  banker: "Banker",
};

// ─── SHA-256 helper ───────────────────────────────────────────────────────────
async function sha256hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const goldGrad = "linear-gradient(135deg, #C9A84C, #D4AF37)";

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 0",
    background: disabled ? "rgba(201,168,76,0.3)" : goldGrad,
    color: "#0A0F1E",
    fontWeight: 700,
    fontSize: 14,
    borderRadius: 12,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "all 0.2s",
    boxShadow: disabled ? "none" : "0 4px 20px rgba(201,168,76,0.3)",
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  padding: "13px 16px",
  color: "white",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  fontSize: 13,
  display: "block",
  marginBottom: 8,
};

function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "rgba(201,168,76,0.5)";
}
function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = "rgba(255,255,255,0.12)";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoginModal() {
  const {
    showLoginModal,
    closeLoginModal,
    login,
    openRoleSelect,
    intendedPortal,
  } = useAuth();
  const navigate = useNavigate();
  const { actor } = useActor();

  // Top-level method selector
  const [topMethod, setTopMethod] = useState<TopMethod>("otp");

  // ── OTP state (mobile + email OTP) ──────────────────────────────────────────
  const [otpTab, setOtpTab] = useState<OtpTab>("mobile");
  const [otpStep, setOtpStep] = useState<"input" | "otp">("input");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // ── Email+Password state ────────────────────────────────────────────────────
  const [epTab, setEpTab] = useState<EpTab>("signin");
  const [epLoading, setEpLoading] = useState(false);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siError, setSiError] = useState("");

  // Create Account fields
  const [caName, setCaName] = useState("");
  const [caEmail, setCaEmail] = useState("");
  const [caPassword, setCaPassword] = useState("");
  const [caConfirm, setCaConfirm] = useState("");
  const [caError, setCaError] = useState("");
  const [caSuccess, setCaSuccess] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (showLoginModal) {
      setTopMethod("otp");
      setOtpTab("mobile");
      setOtpStep("input");
      setIdentifier("");
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
      setTimer(60);
      setTimerActive(false);
      setOtpLoading(false);
      setEpTab("signin");
      setSiEmail("");
      setSiPassword("");
      setSiError("");
      setCaName("");
      setCaEmail("");
      setCaPassword("");
      setCaConfirm("");
      setCaError("");
      setCaSuccess("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showLoginModal]);

  // OTP countdown
  useEffect(() => {
    if (!timerActive) return;
    if (timer === 0) {
      setTimerActive(false);
      return;
    }
    const t = setTimeout(() => setTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, timerActive]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const redirectAfterLogin = (
    role: AuthUser["role"],
    portal: "buyer" | "seller" | "banker" | null,
  ) => {
    const dest = portal ?? roleToPortal(role);
    if (dest === "buyer") navigate({ to: "/buyer" });
    else if (dest === "seller") navigate({ to: "/seller" });
    else if (dest === "banker") navigate({ to: "/bank" });
    else navigate({ to: "/" });
  };

  // ── OTP handlers (unchanged logic) ─────────────────────────────────────────
  const handleSendOtp = () => {
    if (!identifier.trim()) return;
    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      setOtpStep("otp");
      setTimer(60);
      setTimerActive(true);
    }, 600);
  };

  const handleResendOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    setTimer(60);
    setTimerActive(true);
  };

  const handleVerifyOtp = () => {
    const code = otp.join("");
    if (code !== "123456") {
      setOtpError("Invalid OTP. Use 123456 for demo.");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      let existingUser: AuthUser | null = null;
      try {
        const db = JSON.parse(localStorage.getItem("valubrix_user_db") || "{}");
        existingUser = db[identifier] ?? null;
      } catch {
        /* ignore */
      }

      if (existingUser) {
        login(existingUser);
        closeLoginModal();
        redirectAfterLogin(existingUser.role, intendedPortal);
      } else {
        const newUser: AuthUser = {
          username: identifier,
          fullName: "",
          city: "",
          role: (intendedPortal as AuthUser["role"]) ?? "buyer",
          auth_provider: "otp",
          ...(otpTab === "mobile"
            ? { mobile: identifier }
            : { email: identifier }),
        };
        login(newUser);
        closeLoginModal();
        if (intendedPortal) redirectAfterLogin(newUser.role, intendedPortal);
        else openRoleSelect();
      }
    }, 500);
  };

  // ── Email+Password: Sign In ─────────────────────────────────────────────────
  const handleSignIn = async () => {
    const trimEmail = siEmail.trim();
    const trimPw = siPassword.trim();
    if (!trimEmail || !trimPw) {
      setSiError("Please enter both email and password.");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(trimEmail)) {
      setSiError("Please enter a valid email address.");
      return;
    }

    setSiError("");
    setEpLoading(true);
    try {
      const emailHash = await sha256hex(trimEmail.toLowerCase());
      const passwordHash = await sha256hex(trimPw);

      if (actor) {
        const profile = await actor.loginWithEmail(emailHash, passwordHash);
        if (profile) {
          const authUser: AuthUser = {
            username: profile.email || profile.username,
            fullName: profile.fullName,
            city: profile.city,
            role: mapBackendRole(profile.role),
            email: profile.email,
            mobile: profile.mobile || undefined,
            auth_provider: "email",
          };
          login(authUser);
          closeLoginModal();
          redirectAfterLogin(authUser.role, intendedPortal);
        } else {
          setSiError("Invalid email or password.");
        }
      } else {
        // Fallback: local check
        const db = JSON.parse(localStorage.getItem("valubrix_user_db") || "{}");
        const existing: AuthUser | null = db[trimEmail] ?? null;
        if (existing) {
          login(existing);
          closeLoginModal();
          redirectAfterLogin(existing.role, intendedPortal);
        } else {
          setSiError("Invalid email or password.");
        }
      }
    } catch {
      setSiError("Sign in failed. Please try again.");
    } finally {
      setEpLoading(false);
    }
  };

  // ── Email+Password: Create Account ─────────────────────────────────────────
  const handleCreateAccount = async () => {
    const trimName = caName.trim();
    const trimEmail = caEmail.trim();
    const trimPw = caPassword.trim();
    const trimConfirm = caConfirm.trim();

    if (!trimName || !trimEmail || !trimPw) {
      setCaError("Please fill all required fields.");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(trimEmail)) {
      setCaError("Please enter a valid email address.");
      return;
    }
    if (trimPw.length < 8) {
      setCaError("Password must be at least 8 characters.");
      return;
    }
    if (trimPw !== trimConfirm) {
      setCaError("Passwords do not match.");
      return;
    }

    setCaError("");
    setEpLoading(true);
    try {
      const emailHash = await sha256hex(trimEmail.toLowerCase());
      const passwordHash = await sha256hex(trimPw);

      if (actor) {
        const userId = await actor.registerWithEmail(
          emailHash,
          passwordHash,
          trimName,
        );
        if (userId) {
          const newUser: AuthUser = {
            username: trimEmail,
            fullName: trimName,
            city: "",
            role: (intendedPortal as AuthUser["role"]) ?? "buyer",
            email: trimEmail,
            auth_provider: "email",
          };
          login(newUser);
          setCaSuccess("Account created! Redirecting...");
          setTimeout(() => {
            closeLoginModal();
            if (intendedPortal)
              redirectAfterLogin(newUser.role, intendedPortal);
            else openRoleSelect();
          }, 800);
        } else {
          setCaError(
            "Registration failed. This email may already be registered.",
          );
        }
      } else {
        // Fallback: local creation
        const newUser: AuthUser = {
          username: trimEmail,
          fullName: trimName,
          city: "",
          role: (intendedPortal as AuthUser["role"]) ?? "buyer",
          email: trimEmail,
          auth_provider: "email",
        };
        login(newUser);
        setCaSuccess("Account created! Redirecting...");
        setTimeout(() => {
          closeLoginModal();
          if (intendedPortal) redirectAfterLogin(newUser.role, intendedPortal);
          else openRoleSelect();
        }, 800);
      }
    } catch {
      setCaError("Registration failed. Please try again.");
    } finally {
      setEpLoading(false);
    }
  };

  if (!showLoginModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="login-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-ocid="login.modal"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(10,15,30,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeLoginModal();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          style={{
            background: "linear-gradient(145deg, #121B35 0%, #0A0F1E 100%)",
            border: "1px solid rgba(201,168,76,0.25)",
            borderRadius: 24,
            width: "100%",
            maxWidth: 460,
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.7), 0 0 40px rgba(201,168,76,0.08)",
            position: "relative",
          }}
        >
          {/* Gold top accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, transparent, #C9A84C, #D4AF37, transparent)",
            }}
          />

          <div style={{ padding: "32px 32px 28px" }}>
            {/* Close button */}
            <button
              type="button"
              data-ocid="login.close_button"
              onClick={closeLoginModal}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                lineHeight: 1,
                transition: "all 0.2s",
              }}
            >
              ×
            </button>

            {/* Logo + role badge */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <img
                src="/assets/uploads/5EB5878E-7937-4598-9486-6156F9B2EB9F-3-1.png"
                alt="ValuBrix"
                style={{
                  height: 48,
                  width: "auto",
                  margin: "0 auto 10px",
                  display: "block",
                  objectFit: "contain",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {intendedPortal && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}
                  >
                    Logging in as
                  </span>
                  <span
                    style={{
                      background: `${ROLE_COLORS[intendedPortal]}22`,
                      color: ROLE_COLORS[intendedPortal],
                      border: `1px solid ${ROLE_COLORS[intendedPortal]}44`,
                      borderRadius: 20,
                      padding: "2px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {ROLE_LABELS[intendedPortal]}
                  </span>
                </div>
              )}
            </div>

            {/* ── Top-level method picker ────────────────────────────────────── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                data-ocid="login.method.otp"
                onClick={() => setTopMethod("otp")}
                style={{
                  padding: "12px 8px",
                  borderRadius: 12,
                  border:
                    topMethod === "otp"
                      ? "1.5px solid rgba(201,168,76,0.6)"
                      : "1.5px solid rgba(255,255,255,0.1)",
                  background:
                    topMethod === "otp"
                      ? "rgba(201,168,76,0.1)"
                      : "rgba(255,255,255,0.03)",
                  color:
                    topMethod === "otp" ? "#C9A84C" : "rgba(255,255,255,0.5)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>📱</span>
                Continue with Phone
              </button>
              <button
                type="button"
                data-ocid="login.method.email_password"
                onClick={() => setTopMethod("email_password")}
                style={{
                  padding: "12px 8px",
                  borderRadius: 12,
                  border:
                    topMethod === "email_password"
                      ? "1.5px solid rgba(201,168,76,0.6)"
                      : "1.5px solid rgba(255,255,255,0.1)",
                  background:
                    topMethod === "email_password"
                      ? "rgba(201,168,76,0.1)"
                      : "rgba(255,255,255,0.03)",
                  color:
                    topMethod === "email_password"
                      ? "#C9A84C"
                      : "rgba(255,255,255,0.5)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>✉️</span>
                Email & Password
              </button>
            </div>

            {/* ── OTP Flow ─────────────────────────────────────────────────────── */}
            {topMethod === "otp" && (
              <OtpFlow
                otpTab={otpTab}
                setOtpTab={setOtpTab}
                otpStep={otpStep}
                setOtpStep={setOtpStep}
                identifier={identifier}
                setIdentifier={setIdentifier}
                otp={otp}
                setOtp={setOtp}
                otpError={otpError}
                timer={timer}
                timerActive={timerActive}
                isLoading={otpLoading}
                inputRef={inputRef}
                onSendOtp={handleSendOtp}
                onVerify={handleVerifyOtp}
                onResend={handleResendOtp}
              />
            )}

            {/* ── Email & Password Flow ─────────────────────────────────────────── */}
            {topMethod === "email_password" && (
              <EmailPasswordFlow
                epTab={epTab}
                setEpTab={setEpTab}
                isLoading={epLoading}
                inputRef={inputRef}
                // Sign in
                siEmail={siEmail}
                setSiEmail={setSiEmail}
                siPassword={siPassword}
                setSiPassword={setSiPassword}
                siError={siError}
                onSignIn={handleSignIn}
                // Create account
                caName={caName}
                setCaName={setCaName}
                caEmail={caEmail}
                setCaEmail={setCaEmail}
                caPassword={caPassword}
                setCaPassword={setCaPassword}
                caConfirm={caConfirm}
                setCaConfirm={setCaConfirm}
                caError={caError}
                caSuccess={caSuccess}
                onCreateAccount={handleCreateAccount}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── OTP Flow Subcomponent ────────────────────────────────────────────────────
function OtpFlow({
  otpTab,
  setOtpTab,
  otpStep,
  setOtpStep,
  identifier,
  setIdentifier,
  otp,
  setOtp,
  otpError,
  timer,
  timerActive,
  isLoading,
  inputRef,
  onSendOtp,
  onVerify,
  onResend,
}: {
  otpTab: OtpTab;
  setOtpTab: (t: OtpTab) => void;
  otpStep: "input" | "otp";
  setOtpStep: (s: "input" | "otp") => void;
  identifier: string;
  setIdentifier: (v: string) => void;
  otp: string[];
  setOtp: (v: string[]) => void;
  otpError: string;
  timer: number;
  timerActive: boolean;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSendOtp: () => void;
  onVerify: () => void;
  onResend: () => void;
}) {
  return (
    <>
      {/* OTP sub-tab: Mobile / Email */}
      {otpStep === "input" && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 16,
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            padding: 4,
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {(["mobile", "email"] as OtpTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              data-ocid={`login.otp.${tab}.tab`}
              onClick={() => {
                setOtpTab(tab);
                setIdentifier("");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: "none",
                background:
                  otpTab === tab ? "rgba(201,168,76,0.15)" : "transparent",
                color: otpTab === tab ? "#C9A84C" : "rgba(255,255,255,0.4)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                boxShadow:
                  otpTab === tab
                    ? "inset 0 0 0 1px rgba(201,168,76,0.3)"
                    : "none",
                transition: "all 0.2s",
              }}
            >
              {tab === "mobile" ? "📱 Mobile OTP" : "✉️ Email OTP"}
            </button>
          ))}
        </div>
      )}

      {otpStep === "input" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="login-otp-identifier" style={labelStyle}>
              {otpTab === "mobile" ? "Mobile Number" : "Email Address"}
            </label>
            <input
              id="login-otp-identifier"
              ref={inputRef}
              data-ocid="login.otp.identifier.input"
              type={otpTab === "mobile" ? "tel" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSendOtp();
              }}
              placeholder={
                otpTab === "mobile" ? "+91 98765 43210" : "you@example.com"
              }
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </div>
          <button
            type="button"
            data-ocid="login.otp.send.button"
            onClick={onSendOtp}
            disabled={isLoading || !identifier.trim()}
            style={btnStyle(isLoading || !identifier.trim())}
          >
            {isLoading ? "Sending..." : "Send OTP"}
          </button>
          <p
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 11,
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Demo OTP: 123456
          </p>
        </>
      )}

      {otpStep === "otp" && (
        <OTPVerifyStep
          otp={otp}
          setOtp={setOtp}
          otpError={otpError}
          identifier={identifier}
          timer={timer}
          timerActive={timerActive}
          isLoading={isLoading}
          onVerify={onVerify}
          onResend={onResend}
          onBack={() => {
            setOtpStep("input");
            setOtp(["", "", "", "", "", ""]);
          }}
          tab={otpTab}
        />
      )}
    </>
  );
}

// ─── OTP Verify Step ──────────────────────────────────────────────────────────
function OTPVerifyStep({
  otp,
  setOtp,
  otpError,
  identifier,
  timer,
  timerActive,
  isLoading,
  onVerify,
  onResend,
  onBack,
  tab,
}: {
  otp: string[];
  setOtp: (v: string[]) => void;
  otpError: string;
  identifier: string;
  timer: number;
  timerActive: boolean;
  isLoading: boolean;
  onVerify: () => void;
  onResend: () => void;
  onBack: () => void;
  tab: string;
}) {
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
          Enter the 6-digit OTP sent to
        </p>
        <p
          style={{
            color: "#C9A84C",
            fontSize: 14,
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          {identifier}
        </p>
      </div>
      <div style={{ marginBottom: 16 }}>
        <OTPInput value={otp} onChange={setOtp} error={otpError} />
      </div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        {timerActive ? (
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            Resend in{" "}
            <span
              style={{
                color: "#C9A84C",
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              {timer}s
            </span>
          </span>
        ) : (
          <button
            type="button"
            data-ocid="login.otp.resend.button"
            onClick={onResend}
            style={{
              color: "#C9A84C",
              fontSize: 13,
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Resend OTP
          </button>
        )}
      </div>
      <button
        type="button"
        data-ocid="login.otp.verify.button"
        onClick={onVerify}
        disabled={isLoading || otp.join("").length < 6}
        style={{
          ...btnStyle(isLoading || otp.join("").length < 6),
          marginBottom: 12,
        }}
      >
        {isLoading ? "Verifying..." : "Verify & Continue"}
      </button>
      <button
        type="button"
        onClick={onBack}
        style={{
          width: "100%",
          padding: "10px 0",
          background: "transparent",
          color: "rgba(255,255,255,0.4)",
          fontSize: 13,
          border: "none",
          cursor: "pointer",
        }}
      >
        ← Change {tab === "mobile" ? "number" : "email"}
      </button>
      <p
        style={{
          color: "rgba(255,255,255,0.2)",
          fontSize: 11,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        Demo OTP: 123456
      </p>
    </>
  );
}

// ─── Email & Password Flow ────────────────────────────────────────────────────
function EmailPasswordFlow({
  epTab,
  setEpTab,
  isLoading,
  inputRef,
  siEmail,
  setSiEmail,
  siPassword,
  setSiPassword,
  siError,
  onSignIn,
  caName,
  setCaName,
  caEmail,
  setCaEmail,
  caPassword,
  setCaPassword,
  caConfirm,
  setCaConfirm,
  caError,
  caSuccess,
  onCreateAccount,
}: {
  epTab: EpTab;
  setEpTab: (t: EpTab) => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  siEmail: string;
  setSiEmail: (v: string) => void;
  siPassword: string;
  setSiPassword: (v: string) => void;
  siError: string;
  onSignIn: () => void;
  caName: string;
  setCaName: (v: string) => void;
  caEmail: string;
  setCaEmail: (v: string) => void;
  caPassword: string;
  setCaPassword: (v: string) => void;
  caConfirm: string;
  setCaConfirm: (v: string) => void;
  caError: string;
  caSuccess: string;
  onCreateAccount: () => void;
}) {
  return (
    <>
      {/* Sub-tabs: Sign In / Create Account */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10,
          padding: 4,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {(["signin", "signup"] as EpTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            data-ocid={`login.ep.${tab}.tab`}
            onClick={() => setEpTab(tab)}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: "none",
              background:
                epTab === tab ? "rgba(201,168,76,0.15)" : "transparent",
              color: epTab === tab ? "#C9A84C" : "rgba(255,255,255,0.4)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              boxShadow:
                epTab === tab ? "inset 0 0 0 1px rgba(201,168,76,0.3)" : "none",
              transition: "all 0.2s",
            }}
          >
            {tab === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {epTab === "signin" && (
        <SignInForm
          email={siEmail}
          setEmail={setSiEmail}
          password={siPassword}
          setPassword={setSiPassword}
          error={siError}
          isLoading={isLoading}
          inputRef={inputRef}
          onSubmit={onSignIn}
        />
      )}

      {epTab === "signup" && (
        <CreateAccountForm
          name={caName}
          setName={setCaName}
          email={caEmail}
          setEmail={setCaEmail}
          password={caPassword}
          setPassword={setCaPassword}
          confirm={caConfirm}
          setConfirm={setCaConfirm}
          error={caError}
          success={caSuccess}
          isLoading={isLoading}
          inputRef={inputRef}
          onSubmit={onCreateAccount}
        />
      )}
    </>
  );
}

// ─── Sign In Form ─────────────────────────────────────────────────────────────
function SignInForm({
  email,
  setEmail,
  password,
  setPassword,
  error,
  isLoading,
  inputRef,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="ep-si-email" style={labelStyle}>
          Email Address
        </label>
        <input
          id="ep-si-email"
          ref={inputRef}
          data-ocid="login.ep.signin.email.input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="ep-si-password" style={labelStyle}>
          Password
        </label>
        <input
          id="ep-si-password"
          data-ocid="login.ep.signin.password.input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder="Enter your password"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>
      {error && (
        <p style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <button
        type="button"
        data-ocid="login.ep.signin.submit.button"
        onClick={onSubmit}
        disabled={isLoading}
        style={btnStyle(isLoading)}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </>
  );
}

// ─── Create Account Form ──────────────────────────────────────────────────────
function CreateAccountForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirm,
  setConfirm,
  error,
  success,
  isLoading,
  inputRef,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  error: string;
  success: string;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="ep-ca-name" style={labelStyle}>
          Full Name
        </label>
        <input
          id="ep-ca-name"
          ref={inputRef}
          data-ocid="login.ep.signup.name.input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="ep-ca-email" style={labelStyle}>
          Email Address
        </label>
        <input
          id="ep-ca-email"
          data-ocid="login.ep.signup.email.input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="ep-ca-password" style={labelStyle}>
          Password{" "}
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
            (min 8 chars)
          </span>
        </label>
        <input
          id="ep-ca-password"
          data-ocid="login.ep.signup.password.input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a strong password"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label htmlFor="ep-ca-confirm" style={labelStyle}>
          Confirm Password
        </label>
        <input
          id="ep-ca-confirm"
          data-ocid="login.ep.signup.confirm.input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder="Repeat your password"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>
      {error && (
        <p style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 10 }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: "#16C784", fontSize: 13, marginBottom: 10 }}>
          {success}
        </p>
      )}
      <button
        type="button"
        data-ocid="login.ep.signup.submit.button"
        onClick={onSubmit}
        disabled={isLoading}
        style={btnStyle(isLoading)}
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </button>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roleToPortal(
  role: AuthUser["role"],
): "buyer" | "seller" | "banker" | null {
  if (role === "buyer") return "buyer";
  if (role === "seller") return "seller";
  if (role === "banker" || role === "bankOfficer") return "banker";
  return null;
}

function mapBackendRole(role: string): AuthUser["role"] {
  if (role === "admin") return "admin";
  if (role === "user") return "buyer";
  return "buyer";
}
