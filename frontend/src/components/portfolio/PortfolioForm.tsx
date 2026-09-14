"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PortfolioFormData,
  PortfolioFormErrors,
  TemplateOption,
} from "@/types/portfolio";
import {
  UserIcon,
  MailIcon,
  ImageIcon,
  GlobeIcon,
  SparklesIcon,
  AlertCircleIcon,
} from "./PortfolioIcons";

const TEMPLATES: TemplateOption[] = [
  {
    id: "modern",
    name: "Modern Developer",
    description: "Tech-stack chips, interactive cards, and vibrant code-focused accents.",
    badge: "Most Popular",
  },
  {
    id: "minimal",
    name: "Minimal Editorial",
    description: "Typography-first layout focused purely on content clarity and elegance.",
  },
  {
    id: "professional",
    name: "Classic Executive",
    description: "Structured corporate presentation suited for leadership and consultants.",
  },
];

export interface PortfolioFormProps {
  mode: "create" | "edit";
  initialData?: Partial<PortfolioFormData>;
  onSubmit?: (data: PortfolioFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  serverError?: string | null;
  serverFieldErrors?: Record<string, string>;
}

function getInitialFormData(initialData: Partial<PortfolioFormData> = {}): PortfolioFormData {
  return {
    name: initialData.name || "",
    title: initialData.title || "",
    about: initialData.about || "",
    email: initialData.email || "",
    phone: initialData.phone || "",
    location: initialData.location || "",
    profileImageUrl: initialData.profileImageUrl || "",
    socialLinks: {
      github: initialData.socialLinks?.github || "",
      linkedin: initialData.socialLinks?.linkedin || "",
      twitter: initialData.socialLinks?.twitter || "",
      website: initialData.socialLinks?.website || "",
      ...(initialData.socialLinks || {}),
    },
    username: initialData.username || "",
    template: initialData.template || "modern",
  };
}

export default function PortfolioForm({
  mode,
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  serverError = null,
  serverFieldErrors = {},
}: PortfolioFormProps) {
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  const [formData, setFormData] = useState<PortfolioFormData>(() =>
    getInitialFormData(initialData)
  );

  // Sync state if initialData object reference changes
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setFormData(getInitialFormData(initialData));
  }

  const [errors, setErrors] = useState<PortfolioFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [imageLoadError, setImageLoadError] = useState(false);

  const validateField = (name: keyof PortfolioFormData, value: unknown): string | undefined => {
    switch (name) {
      case "name":
        if (!value || typeof value !== "string" || !value.trim()) {
          return "Full name is required";
        }
        if (value.trim().length > 100) {
          return "Name cannot exceed 100 characters";
        }
        return undefined;

      case "title":
        if (!value || typeof value !== "string" || !value.trim()) {
          return "Professional title is required";
        }
        if (value.trim().length > 100) {
          return "Title cannot exceed 100 characters";
        }
        return undefined;

      case "username":
        if (!value || typeof value !== "string" || !value.trim()) {
          return "Portfolio username is required";
        }
        if (value.trim().length > 50) {
          return "Username cannot exceed 50 characters";
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
          return "Username can only contain letters, numbers, hyphens (-), and underscores (_)";
        }
        return undefined;

      case "email":
        if (value && typeof value === "string" && value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            return "Please enter a valid email address";
          }
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const handleChange = (
    field: keyof PortfolioFormData,
    value: string
  ) => {
    if (field === "profileImageUrl") {
      setImageLoadError(false);
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: err,
      }));
    }
  };

  const handleSocialChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  const handleBlur = (field: keyof PortfolioFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({
      ...prev,
      [field]: err,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: PortfolioFormErrors = {};

    const nameErr = validateField("name", formData.name);
    if (nameErr) newErrors.name = nameErr;

    const titleErr = validateField("title", formData.title);
    if (titleErr) newErrors.title = titleErr;

    const usernameErr = validateField("username", formData.username);
    if (usernameErr) newErrors.username = usernameErr;

    const emailErr = validateField("email", formData.email);
    if (emailErr) newErrors.email = emailErr;

    setErrors(newErrors);
    setTouched({
      name: true,
      title: true,
      username: true,
      email: true,
      about: true,
      phone: true,
      location: true,
      profileImageUrl: true,
    });

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to top error if invalid
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Clean up empty social link keys
    const cleanedSocialLinks: Record<string, string> = {};
    if (formData.socialLinks) {
      for (const [k, v] of Object.entries(formData.socialLinks)) {
        if (v && v.trim()) {
          cleanedSocialLinks[k] = v.trim();
        }
      }
    }

    const payload: PortfolioFormData = {
      name: formData.name.trim(),
      title: formData.title.trim(),
      username: formData.username.trim().toLowerCase(),
      about: formData.about?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      location: formData.location?.trim() || undefined,
      profileImageUrl: formData.profileImageUrl?.trim() || undefined,
      socialLinks: cleanedSocialLinks,
      template: formData.template || "modern",
    };

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Server Error Alert Banner */}
      {serverError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 animate-fadeIn flex items-start gap-3">
          <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-900">
              {mode === "create" ? "Unable to create portfolio" : "Unable to save portfolio changes"}
            </h4>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{serverError}</p>
          </div>
        </div>
      )}

      {/* 1. Basic Information Card */}
      <section className="bg-white rounded-2xl border border-[#eae6f5] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#f1edf9]">
          <div className="w-8 h-8 rounded-lg bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf]">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Personal Information
            </h2>
            <p className="text-xs text-[#64748b]">
              Your primary professional identity showcased on your portfolio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="portfolio-name"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Full Name <span className="text-[#6e56cf]">*</span>
            </label>
            <input
              id="portfolio-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="e.g. Siyumi Gamage"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
                errors.name
                  ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                  : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
              }`}
            />
            {errors.name && (
              <p id="name-error" className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
                <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Professional Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="portfolio-title"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Professional Title <span className="text-[#6e56cf]">*</span>
            </label>
            <input
              id="portfolio-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={() => handleBlur("title")}
              placeholder="e.g. Full Stack Developer"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
                errors.title
                  ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                  : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
              }`}
            />
            {errors.title && (
              <p id="title-error" className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
                <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* About Me */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="portfolio-about"
                className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
              >
                About Me
              </label>
              <span className="text-[11px] text-[#94a3b8]">Optional bio</span>
            </div>
            <textarea
              id="portfolio-about"
              rows={4}
              value={formData.about || ""}
              onChange={(e) => handleChange("about", e.target.value)}
              placeholder="Share a concise introduction about your background, expertise, and what drives your work..."
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20 resize-y"
            />
          </div>
        </div>
      </section>

      {/* 2. Contact Information Card */}
      <section className="bg-white rounded-2xl border border-[#eae6f5] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#f1edf9]">
          <div className="w-8 h-8 rounded-lg bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf]">
            <MailIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Contact Information
            </h2>
            <p className="text-xs text-[#64748b]">
              Public contact channels displayed on your portfolio for recruiters and clients.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="portfolio-email"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Contact Email
            </label>
            <input
              id="portfolio-email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder="you@domain.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
                errors.email
                  ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                  : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
              }`}
            />
            {errors.email && (
              <p id="email-error" className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
                <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="portfolio-phone"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Phone Number
            </label>
            <input
              id="portfolio-phone"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+1 (555) 012-3456"
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label
              htmlFor="portfolio-location"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Location
            </label>
            <input
              id="portfolio-location"
              type="text"
              value={formData.location || ""}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20"
            />
          </div>
        </div>
      </section>

      {/* 3. Profile Image Card */}
      <section className="bg-white rounded-2xl border border-[#eae6f5] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#f1edf9]">
          <div className="w-8 h-8 rounded-lg bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf]">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Profile Image
            </h2>
            <p className="text-xs text-[#64748b]">
              Provide an avatar URL to personalize your portfolio header.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-[#f3f0ff] border-2 border-[#dcd3f8] flex items-center justify-center overflow-hidden shadow-xs relative">
              {formData.profileImageUrl && !imageLoadError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.profileImageUrl}
                  alt={formData.name || "Portfolio avatar preview"}
                  className="w-full h-full object-cover"
                  onError={() => setImageLoadError(true)}
                />
              ) : (
                <div className="text-lg font-bold text-[#6e56cf]">
                  {formData.name
                    ? formData.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "FC"}
                </div>
              )}
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#94a3b8]">
              {formData.profileImageUrl && !imageLoadError ? "Live Preview" : "Avatar Fallback"}
            </span>
          </div>

          {/* URL Input */}
          <div className="flex-1 w-full space-y-1.5">
            <label
              htmlFor="portfolio-image-url"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Profile Image URL
            </label>
            <input
              id="portfolio-image-url"
              type="url"
              value={formData.profileImageUrl || ""}
              onChange={(e) => handleChange("profileImageUrl", e.target.value)}
              placeholder="https://images.unsplash.com/... or https://github.com/username.png"
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20"
            />
            <p className="text-[11px] text-[#64748b]">
              Paste a public image URL from GitHub, LinkedIn, Unsplash, or your CDN.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Social Links Card */}
      <section className="bg-white rounded-2xl border border-[#eae6f5] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#f1edf9]">
          <div className="w-8 h-8 rounded-lg bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf]">
            <GlobeIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Social &amp; Professional Links
            </h2>
            <p className="text-xs text-[#64748b]">
              Direct visitors to your active repositories, profiles, and external work.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* GitHub */}
          <div className="space-y-1.5">
            <label
              htmlFor="social-github"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              GitHub URL
            </label>
            <input
              id="social-github"
              type="url"
              value={formData.socialLinks?.github || ""}
              onChange={(e) => handleSocialChange("github", e.target.value)}
              placeholder="https://github.com/username"
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20"
            />
          </div>

          {/* LinkedIn */}
          <div className="space-y-1.5">
            <label
              htmlFor="social-linkedin"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              LinkedIn URL
            </label>
            <input
              id="social-linkedin"
              type="url"
              value={formData.socialLinks?.linkedin || ""}
              onChange={(e) => handleSocialChange("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20"
            />
          </div>

          {/* Twitter / X */}
          <div className="space-y-1.5">
            <label
              htmlFor="social-twitter"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Twitter / X URL
            </label>
            <input
              id="social-twitter"
              type="url"
              value={formData.socialLinks?.twitter || ""}
              onChange={(e) => handleSocialChange("twitter", e.target.value)}
              placeholder="https://x.com/username"
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20"
            />
          </div>

          {/* Personal Website */}
          <div className="space-y-1.5">
            <label
              htmlFor="social-website"
              className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
            >
              Personal Website / Blog
            </label>
            <input
              id="social-website"
              type="url"
              value={formData.socialLinks?.website || ""}
              onChange={(e) => handleSocialChange("website", e.target.value)}
              placeholder="https://yourdomain.com"
              className="block w-full rounded-xl border border-[#eae6f5] text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 hover:border-[#dcd3f8] focus:bg-white focus:outline-none focus:border-[#6e56cf] focus:ring-2 focus:ring-[#6e56cf]/20"
            />
          </div>
        </div>
      </section>

      {/* 5. Handle & Template Settings Card */}
      <section className="bg-white rounded-2xl border border-[#eae6f5] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-6 border-b border-[#f1edf9]">
          <div className="w-8 h-8 rounded-lg bg-[#f3f0ff] border border-[#dcd3f8] flex items-center justify-center text-[#6e56cf]">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0f172a]">
              Portfolio Handle &amp; Template
            </h2>
            <p className="text-xs text-[#64748b]">
              Your public URL address and initial visual theme.
            </p>
          </div>
        </div>

        {/* Username */}
        {(() => {
          const usernameErrMsg = errors.username || serverFieldErrors?.username;
          return (
            <div className="space-y-2 mb-8">
              <label
                htmlFor="portfolio-username"
                className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
              >
                Portfolio Username (Handle) <span className="text-[#6e56cf]">*</span>
              </label>
              <div
                className={`flex items-center rounded-xl border bg-[#fbfaff] focus-within:bg-white overflow-hidden transition-all ${
                  usernameErrMsg
                    ? "border-[#f87171] focus-within:border-[#ef4444] focus-within:ring-2 focus-within:ring-[#ef4444]/20"
                    : "border-[#eae6f5] focus-within:border-[#6e56cf] focus-within:ring-2 focus-within:ring-[#6e56cf]/20"
                }`}
              >
                <span className="px-3.5 py-2.5 text-xs font-mono text-[#64748b] bg-[#f4f2fa] border-r border-[#eae6f5] select-none">
                  foliocraft.dev/u/
                </span>
                <input
                  id="portfolio-username"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value.toLowerCase())}
                  onBlur={() => handleBlur("username")}
                  placeholder="yourusername"
                  aria-invalid={Boolean(usernameErrMsg)}
                  aria-describedby={usernameErrMsg ? "username-error" : "username-hint"}
                  className="flex-1 px-3.5 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8] bg-transparent focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span id="username-hint" className="text-[#64748b]">
                  Your public URL:{" "}
                  <strong className="text-[#6e56cf] font-mono">
                    /u/{formData.username || "yourname"}
                  </strong>
                </span>
                <span className="text-[11px] text-[#94a3b8]">1-50 chars (a-z, 0-9, -, _)</span>
              </div>

              {usernameErrMsg && (
                <p id="username-error" className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
                  <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{usernameErrMsg}</span>
                </p>
              )}
            </div>
          );
        })()}

        {/* Template Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
            Curated Presentation Theme
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TEMPLATES.map((tmpl) => {
              const isSelected = formData.template === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleChange("template", tmpl.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-[#6e56cf] bg-[#fcfbfe] shadow-sm ring-2 ring-[#6e56cf]/20"
                      : "border-[#eae6f5] bg-white hover:border-[#dcd3f8] hover:bg-[#faf9fd]"
                  }`}
                >
                  {tmpl.badge && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#6e56cf] text-white">
                      {tmpl.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-[#0f172a]">
                      {tmpl.name}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-[#6e56cf] bg-[#6e56cf]" : "border-[#cbd5e1]"
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b] leading-relaxed">
                    {tmpl.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Form Submission Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#eae6f5]">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-[#475569] bg-white hover:bg-[#f8f7fd] border border-[#eae6f5] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-center text-[#475569] bg-white hover:bg-[#f8f7fd] border border-[#eae6f5] transition-colors"
          >
            Back to Dashboard
          </Link>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-md shadow-[#6e56cf]/25 hover:shadow-lg hover:shadow-[#6e56cf]/35 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>{mode === "create" ? "Creating Portfolio..." : "Saving Changes..."}</span>
          ) : mode === "create" ? (
            <span>Create Portfolio</span>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>
    </form>
  );
}
