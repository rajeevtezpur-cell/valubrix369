import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";

interface OTPInputProps {
  value: string[];
  onChange: (val: string[]) => void;
  error?: string;
}

export default function OTPInput({ value, onChange, error }: OTPInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newVal = [...value];
    newVal[index] = char.slice(-1);
    onChange(newVal);
    if (char && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newVal = [...value];
    for (let i = 0; i < 6; i++) newVal[i] = pasted[i] || "";
    onChange(newVal);
    const lastFilled = Math.min(pasted.length, 5);
    inputs.current[lastFilled]?.focus();
  };

  return (
    <div>
      <div className="flex gap-3 justify-center" data-ocid="auth.otp.input">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-12 h-14 text-center text-xl font-mono font-bold rounded-lg border-2 bg-white/5 text-white outline-none transition-all
              ${value[i] ? "border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)]" : "border-white/20"}
              ${error ? "border-red-500" : ""}
              focus:border-[#D4AF37] focus:shadow-[0_0_12px_rgba(212,175,55,0.4)]`}
          />
        ))}
      </div>
      {error && (
        <p className="text-red-400 text-sm text-center mt-2">{error}</p>
      )}
    </div>
  );
}
