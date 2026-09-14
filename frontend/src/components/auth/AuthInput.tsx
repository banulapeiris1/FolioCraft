import React from "react";
import { AlertCircleIcon } from "./AuthIcons";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  hint?: string;
}

export default function AuthInput({
  id,
  label,
  error,
  leftIcon,
  hint,
  className = "",
  ...props
}: AuthInputProps) {
  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
        >
          {label}
          {props.required && <span className="text-[#6e56cf] ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-[#94a3b8]">{hint}</span>}
      </div>

      <div className="relative rounded-xl shadow-xs">
        {leftIcon && (
          <div
            className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]"
            aria-hidden="true"
          >
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/20 ${
            leftIcon ? "pl-10" : "pl-3.5"
          } pr-3.5 py-2.5 ${
            error
              ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
              : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf]"
          } ${className}`}
          {...props}
        />
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1 animate-fadeIn"
          role="alert"
        >
          <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
