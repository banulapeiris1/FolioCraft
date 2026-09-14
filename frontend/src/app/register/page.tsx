"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import SocialAuthButton from "@/components/auth/SocialAuthButton";
import AuthDivider from "@/components/auth/AuthDivider";
import { MailIcon, UserIcon, SparklesIcon, AlertCircleIcon } from "@/components/auth/AuthIcons";
import { useAuth } from "@/context/AuthContext";
import { registerUser, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    terms?: string;
  }>({});

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

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
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      login(response.token, response.user);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setServerError("An account with this email address already exists. Please sign in instead.");
        } else {
          setServerError(err.message || "Registration failed. Please check your information and try again.");
        }
      } else {
        setServerError("Unable to connect to the server. Please check your internet connection.");
      }
    } finally {
      setIsSubmitting(false);
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
            // Visual element only — GitHub OAuth is not in scope
          }}
        />

        {/* Divider */}
        <AuthDivider label="OR REGISTER WITH EMAIL" />

        {/* Server Error Banner */}
        {serverError && (
          <div
            className="mb-4 p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-medium flex items-start gap-2 animate-fadeIn"
            role="alert"
          >
            <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{serverError}</span>
              {serverError.includes("already exists") && (
                <div className="mt-1">
                  <Link href="/login" className="font-semibold underline hover:text-[#991b1b]">
                    Go to Sign In →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthInput
            id="register-name"
            name="name"
            type="text"
            label="Full name"
            placeholder="Alex Chen"
            value={name}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              if (serverError) setServerError(null);
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
              disabled={isSubmitting}
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
                disabled={isSubmitting}
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
            disabled={isSubmitting}
            className={`w-full mt-2 py-2.5 px-4 rounded-xl bg-[#6e56cf] hover:bg-[#5d46be] text-white text-sm font-semibold shadow-md shadow-[#6e56cf]/20 hover:shadow-lg hover:shadow-[#6e56cf]/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/50 cursor-pointer ${
              isSubmitting ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Creating account..." : "Create free account"}
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
