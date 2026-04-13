import { Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CreditCard,
  FileText,
  Landmark,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import GlobalNav from "../components/GlobalNav";
import OTPInput from "../components/OTPInput";
import { useAuth } from "../context/AuthContext";

type Phase = "role" | "form" | "otp" | "docs";
type UserRole = "buyer" | "seller" | "bankOfficer";

const ROLES: {
  id: UserRole;
  icon: React.ElementType;
  title: string;
  desc: string;
  ocid: string;
}[] = [
  {
    id: "buyer",
    icon: Search,
    title: "Buyer / Investor",
    desc: "Discover and invest in properties",
    ocid: "signup.role.buyer.card",
  },
  {
    id: "seller",
    icon: Building2,
    title: "Property Seller",
    desc: "List and sell your property",
    ocid: "signup.role.seller.card",
  },
  {
    id: "bankOfficer",
    icon: Landmark,
    title: "Bank Officer",
    desc: "Professional valuation tools",
    ocid: "signup.role.bank.card",
  },
];

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    email: "",
    city: "",
    pan: "",
    username: "",
    password: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(60);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panDrag, setPanDrag] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const panRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);

  const startTimer = () => {
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
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.mobile.trim()) e.mobile = "Required";
    if (!form.email.trim()) e.email = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.pan.trim()) e.pan = "Required";
    if (!form.username.trim()) e.username = "Required";
    if (!form.password.trim()) e.password = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sendOtp = () => {
    if (!validateForm()) return;
    setPhase("otp");
    startTimer();
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
  };

  const verifyOtp = () => {
    if (otp.join("") === "123456") {
      setPhase("docs");
    } else {
      setOtpError("Invalid OTP. Please try again.");
    }
  };

  const completeRegistration = () => {
    if (!panFile) {
      alert("PAN card upload is required.");
      return;
    }
    const role = selectedRole || "buyer";
    login({
      username: form.username,
      fullName: form.fullName,
      city: form.city,
      role,
      mobile: form.mobile,
      email: form.email,
    });
    if (role === "buyer") navigate({ to: "/buyer" });
    else if (role === "seller") navigate({ to: "/seller" });
    else navigate({ to: "/bank" });
  };

  const field = (
    key: keyof typeof form,
    label: string,
    Icon: React.ElementType,
    type = "text",
  ) => (
    <div key={key}>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-3.5 text-white/40" />
        <input
          type={type}
          placeholder={label}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#D4AF37] ${
            errors[key] ? "border-red-500" : "border-white/10"
          }`}
        />
      </div>
      {errors[key] && (
        <p className="text-red-400 text-xs mt-1">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 px-4 flex items-center justify-center min-h-screen py-8">
        <div className="w-full max-w-lg">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8">
            {/* PHASE: Role Selection */}
            {phase === "role" && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Create Your ValuBrix Account
                </h1>
                <p className="text-white/50 text-sm mb-6">
                  First, tell us who you are
                </p>
                <p className="text-white/70 font-medium mb-4">I am a...</p>
                <div className="space-y-3 mb-6">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const active = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        data-ocid={r.ocid}
                        onClick={() => setSelectedRole(r.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          active
                            ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                            : "border-white/10 bg-white/3 hover:border-white/20"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-xl ${
                            active ? "bg-[#D4AF37]/20" : "bg-white/5"
                          }`}
                        >
                          <Icon
                            size={22}
                            className={
                              active ? "text-[#D4AF37]" : "text-white/50"
                            }
                          />
                        </div>
                        <div>
                          <p
                            className={`font-semibold text-sm ${active ? "text-[#D4AF37]" : "text-white"}`}
                          >
                            {r.title}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {r.desc}
                          </p>
                        </div>
                        {active && (
                          <div className="ml-auto w-5 h-5 rounded-full border-2 border-[#D4AF37] flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  data-ocid="signup.role.continue.button"
                  disabled={!selectedRole}
                  onClick={() => setPhase("form")}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8960C] disabled:opacity-40 text-black font-semibold py-3 rounded-xl transition-all"
                >
                  Continue
                </button>
                <p className="text-center text-white/40 text-sm mt-4">
                  Already have an account?{" "}
                  <Link to="/auth" className="text-[#D4AF37] hover:underline">
                    Login
                  </Link>
                </p>
              </>
            )}

            {/* PHASE: Form */}
            {phase === "form" && (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setPhase("role")}
                    className="text-white/40 hover:text-white text-sm"
                  >
                    ←
                  </button>
                  <h1 className="text-xl font-bold text-white">Your Details</h1>
                </div>
                <div className="space-y-3">
                  {field("fullName", "Full Name", User)}
                  {field("mobile", "Mobile Number", Phone, "tel")}
                  {field("email", "Email ID", Mail, "email")}
                  {field("city", "City", MapPin)}
                  {field("pan", "PAN Number", CreditCard)}
                  {field("username", "Username", User)}
                  {field("password", "Password", Lock, "password")}
                  <button
                    type="button"
                    data-ocid="auth.signup.submit_button"
                    onClick={sendOtp}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all mt-2"
                  >
                    Send OTP
                  </button>
                </div>
              </>
            )}

            {/* PHASE: OTP */}
            {phase === "otp" && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Verify Your Mobile
                </h1>
                <p className="text-white/50 text-sm mb-6">
                  OTP sent to {form.mobile}
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

            {/* PHASE: Docs */}
            {phase === "docs" && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">
                  Upload Documents
                </h1>
                <p className="text-white/50 text-sm mb-6">
                  Verify your identity to complete registration
                </p>
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm font-medium mb-2">
                      PAN Card <span className="text-red-400">*</span>
                    </p>
                    <div
                      onClick={() => panRef.current?.click()}
                      onKeyDown={(e) =>
                        e.key === "Enter" && panRef.current?.click()
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        setPanDrag(true);
                      }}
                      onDragLeave={() => setPanDrag(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setPanDrag(false);
                        const f = e.dataTransfer.files[0];
                        if (f) setPanFile(f);
                      }}
                      // biome-ignore lint/a11y/useSemanticElements: drag-drop zone
                      role="button"
                      tabIndex={0}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        panDrag
                          ? "border-[#D4AF37] bg-[#D4AF37]/10"
                          : "border-white/20 hover:border-[#D4AF37]/50"
                      }`}
                    >
                      <Upload
                        size={24}
                        className="mx-auto text-white/40 mb-2"
                      />
                      {panFile ? (
                        <p className="text-green-400 text-sm flex items-center justify-center gap-1">
                          <FileText size={14} /> {panFile.name}
                        </p>
                      ) : (
                        <p className="text-white/40 text-sm">
                          Drag & drop or click to upload PAN card
                        </p>
                      )}
                    </div>
                    <input
                      ref={panRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-medium mb-2">
                      Aadhaar Card{" "}
                      <span className="text-white/30">(Optional)</span>
                    </p>
                    <div
                      onClick={() => aadhaarRef.current?.click()}
                      onKeyDown={(e) =>
                        e.key === "Enter" && aadhaarRef.current?.click()
                      }
                      // biome-ignore lint/a11y/useSemanticElements: drag-drop zone
                      role="button"
                      tabIndex={0}
                      className="border-2 border-dashed border-white/20 hover:border-[#D4AF37]/50 rounded-xl p-6 text-center cursor-pointer transition-all"
                    >
                      <Upload
                        size={24}
                        className="mx-auto text-white/40 mb-2"
                      />
                      {aadhaarFile ? (
                        <p className="text-green-400 text-sm flex items-center justify-center gap-1">
                          <FileText size={14} /> {aadhaarFile.name}
                        </p>
                      ) : (
                        <p className="text-white/40 text-sm">
                          Drag & drop or click to upload Aadhaar card
                        </p>
                      )}
                    </div>
                    <input
                      ref={aadhaarRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) =>
                        setAadhaarFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={completeRegistration}
                    className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-semibold py-3 rounded-xl transition-all"
                  >
                    Complete Registration
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
