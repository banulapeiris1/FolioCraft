"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";
import PasswordInput from "@/components/auth/PasswordInput";
import SocialAuthButton from "@/components/auth/SocialAuthButton";
import AuthDivider from "@/components/auth/AuthDivider";
import { MailIcon, KeyIcon, AlertCircleIcon } from "@/components/auth/AuthIcons";
import { useAuth } from "@/context/AuthContext";
import { loginUser, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Note: Remember me is currently a presentation-only UI control in this MVP phase
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Please enter your password.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await loginUser({
        email: email.trim(),
        password,
      });

      login(response.token, response.user);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError("Invalid email or password. Please check your credentials.");
        } else {
          setServerError(err.message || "Unable to sign in. Please try again.");
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
        eyebrow="AUTHENTICATION"
        eyebrowIcon={<KeyIcon className="w-3.5 h-3.5 text-[#6e56cf]" />}
        title="Welcome back"
        subtitle="Enter your credentials to access your account"
      >
        {/* GitHub Social Button (Visual UI only) */}
        <SocialAuthButton
          label="Sign in with GitHub"
          onClick={() => {
            // Visual element only — GitHub OAuth is not in scope
          }}
        />

        {/* Divider */}
        <AuthDivider label="OR CONTINUE WITH EMAIL" />

        {/* Server Error Banner */}
        {serverError && (
          <div
            className="mb-4 p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs font-medium flex items-start gap-2 animate-fadeIn"
            role="alert"
          >
            <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{serverError}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthInput
            id="login-email"
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

          <PasswordInput
            id="login-password"
            name="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            disabled={isSubmitting}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              if (serverError) setServerError(null);
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
                disabled={isSubmitting}
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
            disabled={isSubmitting}
            className={`w-full mt-2 py-2.5 px-4 rounded-xl bg-[#6e56cf] hover:bg-[#5d46be] text-white text-sm font-semibold shadow-md shadow-[#6e56cf]/20 hover:shadow-lg hover:shadow-[#6e56cf]/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/50 cursor-pointer ${
              isSubmitting ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Signing in..." : "Sign in to FolioCraft"}
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
