import React from "react";

interface AuthDividerProps {
  label?: string;
}

export default function AuthDivider({
  label = "OR CONTINUE WITH EMAIL",
}: AuthDividerProps) {
  return (
    <div className="relative my-6 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-[#eae6f5]" />
      </div>
      <div className="relative bg-white px-3 text-[11px] font-semibold tracking-wider uppercase text-[#94a3b8]">
        {label}
      </div>
    </div>
  );
}
