"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import { MailIcon, KeyIcon, ArrowLeftIcon, CheckIcon } from "@/components/auth/AuthIcons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(undefined);
    // Local UI demonstration state only — No backend API call in this phase
    setSubmitted(true);
  };

  return (
    <AuthLayout>
      <AuthCard
        eyebrow="ACCOUNT RECOVERY"
        eyebrowIcon={<KeyIcon className="w-3.5 h-3.5 text-[#6e56cf]" />}
        title="Reset your password"
        subtitle="Enter your email and we'll send you a link to reset your password"
      >
        {submitted ? (
          <div className="space-y-5 animate-fadeIn text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#10b981]">
              <CheckIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#0f172a]">
                Check your inbox
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                If an account exists for{" "}
                <span className="font-semibold text-[#0f172a]">{email}</span>, a
                password reset link will be sent.
              </p>
            </div>

            <div className="p-3 bg-[#f8f7fc] border border-[#eae6f5] rounded-xl text-[12px] text-[#64748b]">
              <span className="font-semibold text-[#6e56cf]">UI Demo:</span> For testing purposes, you can proceed directly to the{" "}
              <Link
                href="/reset-password"
                className="font-semibold text-[#6e56cf] underline hover:text-[#5d46be]"
              >
                Reset Password screen
              </Link>
              .
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="text-xs font-semibold text-[#6e56cf] hover:text-[#5d46be] hover:underline"
            >
              Send to a different email
            </button>

            <div className="pt-2 border-t border-[#eae6f5]">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Back to login</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AuthInput
              id="forgot-email"
              name="email"
              type="email"
              label="Work email"
              placeholder="alex.chen@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(undefined);
              }}
              error={error}
              leftIcon={<MailIcon className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            {/* Primary CTA */}
            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#6e56cf] hover:bg-[#5d46be] text-white text-sm font-semibold shadow-md shadow-[#6e56cf]/20 hover:shadow-lg hover:shadow-[#6e56cf]/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/50 cursor-pointer"
            >
              Send reset link
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
