"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import SocialAuthButton from "@/components/auth/SocialAuthButton";
import AuthDivider from "@/components/auth/AuthDivider";
import { MailIcon, UserIcon, SparklesIcon } from "@/components/auth/AuthIcons";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
  }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      terms?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = "Please enter your full name.";
    }

    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Please create a password.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!agreeTerms) {
      newErrors.terms = "You must agree to the Terms of Service and Privacy Policy.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Client-side UI only — No backend integration in this phase
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        eyebrow="GET STARTED"
        eyebrowIcon={<SparklesIcon className="w-3.5 h-3.5 text-[#6e56cf]" />}
        title="Create your account"
        subtitle="Get started with your professional portfolio in minutes"
      >
        {/* GitHub Social Button (Visual UI only) */}
        <SocialAuthButton
          label="Sign up with GitHub"
          onClick={() => {
            // Visual element only — GitHub OAuth is not connected
          }}
        />

        {/* Divider */}
        <AuthDivider label="OR REGISTER WITH EMAIL" />

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthInput
            id="register-name"
            name="name"
            type="text"
            label="Full name"
            placeholder="Alex Chen"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={errors.name}
            leftIcon={<UserIcon className="w-4 h-4" />}
            autoComplete="name"
            required
          />

          <AuthInput
            id="register-email"
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

          <div className="space-y-2">
            <PasswordInput
              id="register-password"
              name="password"
              label="Password"
              placeholder="Create a secure password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              autoComplete="new-password"
              required
            />
            {/* 4-segment Password Strength Meter */}
            <PasswordStrengthMeter password={password} />
          </div>

          {/* Terms & Privacy Checkbox */}
          <div className="pt-1">
            <label
              htmlFor="agree-terms"
              className="flex items-start gap-2.5 cursor-pointer select-none"
            >
              <input
                id="agree-terms"
                name="agree-terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
                className="w-4 h-4 mt-0.5 rounded border-[#dcd3f8] text-[#6e56cf] focus:ring-[#6e56cf]/30 accent-[#6e56cf] cursor-pointer"
                required
              />
              <span className="text-xs text-[#475569] leading-tight">
                I agree to the{" "}
                <span className="text-[#6e56cf] hover:underline cursor-pointer">
                  Terms of Service
                </span>{" "}
                and{" "}
                <span className="text-[#6e56cf] hover:underline cursor-pointer">
                  Privacy Policy
                </span>
                .
              </span>
            </label>
            {errors.terms && (
              <p className="text-xs text-[#dc2626] font-medium mt-1.5" role="alert">
                {errors.terms}
              </p>
            )}
          </div>

          {/* Primary CTA */}
          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#6e56cf] hover:bg-[#5d46be] text-white text-sm font-semibold shadow-md shadow-[#6e56cf]/20 hover:shadow-lg hover:shadow-[#6e56cf]/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/50 cursor-pointer"
          >
            Create free account
          </button>
        </form>

        {/* Switch Link */}
        <div className="mt-6 text-center text-xs text-[#64748b]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#6e56cf] hover:text-[#5d46be] transition-colors underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
