import React from "react";
import { GithubIcon } from "./AuthIcons";

interface SocialAuthButtonProps {
  label?: string;
  onClick?: () => void;
}

export default function SocialAuthButton({
  label = "Sign in with GitHub",
  onClick,
}: SocialAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#dcd3f8] bg-white text-[#0f172a] text-sm font-semibold hover:bg-[#fbfaff] hover:border-[#6e56cf]/50 focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/30 active:scale-[0.99] transition-all shadow-sm"
      aria-label={label}
    >
      <GithubIcon className="w-5 h-5 text-[#0f172a]" />
      <span>{label}</span>
    </button>
  );
}
