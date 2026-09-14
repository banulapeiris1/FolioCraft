"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { LockIcon, ArrowLeftIcon, CheckIcon } from "@/components/auth/AuthIcons";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!password) {
      newErrors.password = "Please enter a new password.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Local UI demonstration state only — No backend API call in this phase
      setSubmitted(true);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        eyebrow="NEW CREDENTIALS"
        eyebrowIcon={<LockIcon className="w-3.5 h-3.5 text-[#6e56cf]" />}
        title="Create a new password"
        subtitle="Your new password must be different from previous passwords."
      >
        {submitted ? (
          <div className="space-y-5 animate-fadeIn text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#10b981]">
              <CheckIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0f172a]">
                Password updated
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Your password has been successfully reset. You can now sign in with
                your new credentials.
              </p>
            </div>

            <Link
              href="/login"
              className="w-full inline-block py-2.5 px-4 rounded-xl bg-[#6e56cf] hover:bg-[#5d46be] text-white text-sm font-semibold shadow-md shadow-[#6e56cf]/20 hover:shadow-lg hover:shadow-[#6e56cf]/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/50 text-center cursor-pointer"
            >
              Sign in with new password
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <PasswordInput
                id="reset-password"
                name="new-password"
                label="New password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                error={errors.password}
                autoComplete="new-password"
                required
              />
              {/* 4-segment Password Strength Meter */}
              <PasswordStrengthMeter password={password} />
            </div>

            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              label="Confirm password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
            />

            {/* Primary CTA */}
            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#6e56cf] hover:bg-[#5d46be] text-white text-sm font-semibold shadow-md shadow-[#6e56cf]/20 hover:shadow-lg hover:shadow-[#6e56cf]/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/50 cursor-pointer"
            >
              Update password
            </button>

            {/* Back to Login Link */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-[#6e56cf] transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Back to login</span>
              </Link>
            </div>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
