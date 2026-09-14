"use client";

import React, { useState } from "react";
import { LockIcon, EyeIcon, EyeOffIcon, AlertCircleIcon } from "./AuthIcons";

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export default function PasswordInput({
  id,
  label,
  error,
  hint,
  className = "",
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

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
        <div
          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94a3b8]"
          aria-hidden="true"
        >
          <LockIcon className="w-4 h-4" />
        </div>
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/20 pl-10 pr-11 py-2.5 ${
            error
              ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
              : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf]"
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94a3b8] hover:text-[#0f172a] focus:outline-none focus:text-[#6e56cf] transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={0}
        >
          {showPassword ? (
            <EyeOffIcon className="w-4 h-4" />
          ) : (
            <EyeIcon className="w-4 h-4" />
          )}
        </button>
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
