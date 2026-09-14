import React from "react";

interface PasswordStrengthMeterProps {
  password?: string;
}

export default function PasswordStrengthMeter({
  password = "",
}: PasswordStrengthMeterProps) {
  const getStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-slate-200" };

    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Weak", color: "bg-[#ef4444]", text: "text-[#ef4444]" };
      case 2:
        return { score: 2, label: "Fair", color: "bg-[#f59e0b]", text: "text-[#f59e0b]" };
      case 3:
        return { score: 3, label: "Good", color: "bg-[#6366f1]", text: "text-[#6366f1]" };
      case 4:
        return { score: 4, label: "Strong", color: "bg-[#10b981]", text: "text-[#10b981]" };
      default:
        return { score: 0, label: "", color: "bg-[#e2e8f0]", text: "text-[#94a3b8]" };
    }
  };

  const { score, label, color, text } = getStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className="w-full space-y-1.5 pt-1" aria-live="polite">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#64748b] font-medium">Password strength:</span>
        <span className={`font-semibold ${text}`}>{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              step <= score ? color : "bg-[#f1edf9]"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-[#94a3b8]">
        Use 8+ characters with uppercase, numbers, and symbols.
      </p>
    </div>
  );
}
