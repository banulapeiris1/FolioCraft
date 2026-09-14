import React from "react";
import { ShieldCheckIcon } from "./AuthIcons";

interface AuthCardProps {
  eyebrow: string;
  eyebrowIcon?: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  securityNote?: string;
}

export default function AuthCard({
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  children,
  securityNote = "Secure authentication • Privacy protected",
}: AuthCardProps) {
  return (
    <div className="w-full max-w-[460px] mx-auto">
      <div className="bg-white rounded-2xl border border-[#eae6f5] shadow-xl shadow-[#6e56cf]/5 p-6 sm:p-8 lg:p-10 transition-all">
        {/* Eyebrow Pill */}
        <div className="flex items-center gap-1.5 w-fit px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-[11px] font-bold tracking-wider text-[#6e56cf] uppercase mb-4">
          {eyebrowIcon}
          <span>{eyebrow}</span>
        </div>

        {/* Header */}
        <div className="space-y-1.5 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f172a]">
            {title}
          </h2>
          <p className="text-sm text-[#475569] leading-relaxed">{subtitle}</p>
        </div>

        {/* Content / Form */}
        <div>{children}</div>
      </div>

      {/* Security Note at bottom */}
      {securityNote && (
        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#94a3b8]">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-[#10b981]" />
          <span>{securityNote}</span>
        </div>
      )}
    </div>
  );
}
