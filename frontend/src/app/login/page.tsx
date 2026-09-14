"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialAuthButton from "@/components/auth/SocialAuthButton";
import AuthDivider from "@/components/auth/AuthDivider";
import { MailIcon, KeyIcon } from "@/components/auth/AuthIcons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Please enter your password.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Client-side UI only — No backend integration in this phase
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        eyebrow="AUTHENTICATION"
        eyebrowIcon={<KeyIcon className="w-3.5 h-3.5 text-[#6e56cf]" />}
        title="Welcome back"
        subtitle="Enter your credentials to access your account"
      >
        {/* GitHub Social Button (Visual UI only) */}
        <SocialAuthButton
          label="Sign in with GitHub"
          onClick={() => {
            // Visual element only — GitHub OAuth is not connected
          }}
        />

        {/* Divider */}
        <AuthDivider label="OR CONTINUE WITH EMAIL" />

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthInput
            id="login-email"
            name="email"
            type="email"
            label="Work email"
            placeholder="alex.chen@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            leftIcon={<MailIcon className="w-4 h-4" />}
            autoComplete="email"
            required
          />

          <PasswordInput
            id="login-password"
            name="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            autoComplete="current-password"
            required
          />

          {/* Remember me & Forgot password link */}
          <div className="flex items-center justify-between pt-1">
            <label
              htmlFor="remember-me"
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#dcd3f8] text-[#6e56cf] focus:ring-[#6e56cf]/30 accent-[#6e56cf] cursor-pointer"
              />
              <span className="text-xs text-[#475569] font-medium">
                Remember me
              </span>
            </label>

            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#6e56cf] hover:text-[#5d46be] transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#6e56cf] hover:bg-[#5d46be] text-white text-sm font-semibold shadow-md shadow-[#6e56cf]/20 hover:shadow-lg hover:shadow-[#6e56cf]/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/50 cursor-pointer"
          >
            Sign in to FolioCraft
          </button>
        </form>

        {/* Switch Link */}
        <div className="mt-6 text-center text-xs text-[#64748b]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#6e56cf] hover:text-[#5d46be] transition-colors underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
