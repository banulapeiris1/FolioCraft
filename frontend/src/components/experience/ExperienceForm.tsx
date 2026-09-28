"use client";

import React, { useState } from "react";
import { ExperienceFormData, ExperienceFormErrors } from "@/types/experience";
import { AlertCircleIcon } from "@/components/portfolio/PortfolioIcons";

export interface ExperienceFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ExperienceFormData>;
  onSubmit: (data: ExperienceFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  serverError?: string | null;
}

function isValidCalendarDate(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [yearStr, monthStr, dayStr] = val.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export default function ExperienceForm({
  mode,
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  serverError = null,
}: ExperienceFormProps) {
  const [company, setCompany] = useState(initialData.company || "");
  const [position, setPosition] = useState(initialData.position || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [startDate, setStartDate] = useState(initialData.startDate || "");
  const [endDate, setEndDate] = useState(initialData.endDate || "");
  const [isCurrent, setIsCurrent] = useState(Boolean(initialData.isCurrent));

  const [errors, setErrors] = useState<ExperienceFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (
    field: string,
    val: string,
    currentFlag = isCurrent,
    startVal = startDate
  ): string | undefined => {
    switch (field) {
      case "company":
        if (!val || !val.trim()) {
          return "Company name is required";
        }
        if (val.trim().length > 255) {
          return "Company name cannot exceed 255 characters";
        }
        return undefined;

      case "position":
        if (!val || !val.trim()) {
          return "Job title / position is required";
        }
        if (val.trim().length > 255) {
          return "Position cannot exceed 255 characters";
        }
        return undefined;

      case "startDate":
        if (!val || !val.trim()) {
          return "Start date is required";
        }
        if (!isValidCalendarDate(val.trim())) {
          return "Start date must be a valid calendar date (YYYY-MM-DD)";
        }
        return undefined;

      case "endDate":
        if (currentFlag) {
          return undefined; // Current roles do not require end date
        }
        if (val && val.trim()) {
          if (!isValidCalendarDate(val.trim())) {
            return "End date must be a valid calendar date (YYYY-MM-DD)";
          }
          if (startVal && isValidCalendarDate(startVal) && val.trim() < startVal.trim()) {
            return "End date cannot be earlier than start date";
          }
        }
        return undefined;

      case "description":
        if (val && val.length > 2000) {
          return "Description cannot exceed 2000 characters";
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, value, isCurrent, startDate);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleCurrentToggle = (checked: boolean) => {
    setIsCurrent(checked);
    if (checked) {
      // Clear end date error if set to current
      setErrors((prev) => ({ ...prev, endDate: undefined }));
    } else {
      if (endDate) {
        const errorMsg = validateField("endDate", endDate, false, startDate);
        setErrors((prev) => ({ ...prev, endDate: errorMsg }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const companyError = validateField("company", company, isCurrent, startDate);
    const positionError = validateField("position", position, isCurrent, startDate);
    const startDateError = validateField("startDate", startDate, isCurrent, startDate);
    const endDateError = validateField("endDate", endDate, isCurrent, startDate);
    const descriptionError = validateField("description", description, isCurrent, startDate);

    const newErrors: ExperienceFormErrors = {};
    if (companyError) newErrors.company = companyError;
    if (positionError) newErrors.position = positionError;
    if (startDateError) newErrors.startDate = startDateError;
    if (endDateError) newErrors.endDate = endDateError;
    if (descriptionError) newErrors.description = descriptionError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({
        company: true,
        position: true,
        startDate: true,
        endDate: true,
        description: true,
      });
      return;
    }

    const payload: ExperienceFormData = {
      company: company.trim(),
      position: position.trim(),
      description: description.trim() ? description.trim() : null,
      startDate: startDate.trim(),
      endDate: isCurrent ? null : endDate.trim() ? endDate.trim() : null,
      isCurrent,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Server Error Banner */}
      {serverError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
          <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-rose-700 font-medium leading-relaxed">
            {serverError}
          </div>
        </div>
      )}

      {/* Position & Company Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Position */}
        <div className="space-y-1.5">
          <label
            htmlFor="exp-position"
            className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
          >
            Job Title / Position <span className="text-[#6e56cf]">*</span>
          </label>
          <input
            id="exp-position"
            type="text"
            required
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              if (touched.position) {
                const err = validateField("position", e.target.value);
                setErrors((prev) => ({ ...prev, position: err }));
              }
            }}
            onBlur={() => handleBlur("position", position)}
            placeholder="e.g. Senior Full-Stack Engineer"
            className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
              errors.position
                ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
            }`}
          />
          {errors.position && (
            <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
              <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.position}</span>
            </p>
          )}
        </div>

        {/* Company */}
        <div className="space-y-1.5">
          <label
            htmlFor="exp-company"
            className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
          >
            Company Name <span className="text-[#6e56cf]">*</span>
          </label>
          <input
            id="exp-company"
            type="text"
            required
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              if (touched.company) {
                const err = validateField("company", e.target.value);
                setErrors((prev) => ({ ...prev, company: err }));
              }
            }}
            onBlur={() => handleBlur("company", company)}
            placeholder="e.g. Acme Technologies"
            className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
              errors.company
                ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
            }`}
          />
          {errors.company && (
            <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
              <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.company}</span>
            </p>
          )}
        </div>
      </div>

      {/* Current Position Checkbox */}
      <div className="pt-1">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
          <input
            id="exp-is-current"
            type="checkbox"
            checked={isCurrent}
            onChange={(e) => handleCurrentToggle(e.target.checked)}
            className="w-4 h-4 rounded border-[#dcd3f8] text-[#6e56cf] focus:ring-[#6e56cf]/20 cursor-pointer"
          />
          <span className="text-xs sm:text-sm font-semibold text-[#0f172a]">
            I currently work here
          </span>
        </label>
      </div>

      {/* Start Date & End Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-1.5">
          <label
            htmlFor="exp-start-date"
            className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
          >
            Start Date <span className="text-[#6e56cf]">*</span>
          </label>
          <input
            id="exp-start-date"
            type="date"
            required
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (touched.startDate) {
                const err = validateField("startDate", e.target.value);
                setErrors((prev) => ({ ...prev, startDate: err }));
              }
              if (!isCurrent && endDate && touched.endDate) {
                const endErr = validateField("endDate", endDate, false, e.target.value);
                setErrors((prev) => ({ ...prev, endDate: endErr }));
              }
            }}
            onBlur={() => handleBlur("startDate", startDate)}
            className={`block w-full rounded-xl border text-sm text-[#0f172a] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
              errors.startDate
                ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
            }`}
          />
          {errors.startDate && (
            <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
              <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.startDate}</span>
            </p>
          )}
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <label
            htmlFor="exp-end-date"
            className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
          >
            End Date {isCurrent && <span className="text-[#94a3b8] font-normal lowercase">(present)</span>}
          </label>
          <input
            id="exp-end-date"
            type="date"
            disabled={isCurrent}
            value={isCurrent ? "" : endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (touched.endDate) {
                const err = validateField("endDate", e.target.value, isCurrent, startDate);
                setErrors((prev) => ({ ...prev, endDate: err }));
              }
            }}
            onBlur={() => handleBlur("endDate", endDate)}
            className={`block w-full rounded-xl border text-sm text-[#0f172a] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 ${
              isCurrent
                ? "bg-[#f1edf9]/50 border-[#eae6f5] text-[#94a3b8] cursor-not-allowed"
                : errors.endDate
                ? "bg-[#fbfaff] border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
                : "bg-[#fbfaff] border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
            }`}
          />
          {errors.endDate && !isCurrent && (
            <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
              <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errors.endDate}</span>
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="exp-description"
            className="block text-xs font-semibold text-[#0f172a] uppercase tracking-wider"
          >
            Key Responsibilities & Achievements
          </label>
          <span className="text-[11px] text-[#94a3b8]">
            {description.length}/2000
          </span>
        </div>
        <textarea
          id="exp-description"
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (touched.description) {
              const err = validateField("description", e.target.value);
              setErrors((prev) => ({ ...prev, description: err }));
            }
          }}
          onBlur={() => handleBlur("description", description)}
          placeholder="Describe your core accomplishments, technologies utilized, systems scaled, or team leadership..."
          className={`block w-full rounded-xl border text-sm text-[#0f172a] placeholder-[#94a3b8] bg-[#fbfaff] transition-all px-3.5 py-2.5 focus:bg-white focus:outline-none focus:ring-2 resize-y ${
            errors.description
              ? "border-[#f87171] focus:border-[#ef4444] focus:ring-[#ef4444]/20"
              : "border-[#eae6f5] hover:border-[#dcd3f8] focus:border-[#6e56cf] focus:ring-[#6e56cf]/20"
          }`}
        />
        {errors.description && (
          <p className="flex items-center gap-1.5 text-xs text-[#dc2626] font-medium mt-1">
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errors.description}</span>
          </p>
        )}
      </div>

      {/* Form Buttons */}
      <div className="pt-4 border-t border-[#eae6f5] flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#475569] bg-white hover:bg-[#f8f7fd] border border-[#eae6f5] transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <span>{mode === "create" ? "Adding Experience..." : "Saving..."}</span>
          ) : (
            <span>{mode === "create" ? "Add Experience" : "Save Changes"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
