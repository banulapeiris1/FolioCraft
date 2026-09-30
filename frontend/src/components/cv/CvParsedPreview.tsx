"use client";

import React from "react";
import { StructuredCvData } from "@/types/cv";
import {
  UserIcon,
  BriefcaseIcon,
  SparklesIcon,
  FolderGit2Icon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeIcon,
  GithubIcon,
} from "@/components/portfolio/PortfolioIcons";

interface CvParsedPreviewProps {
  data: StructuredCvData;
  uploadId?: string;
  fileName?: string;
  onOpenImport?: () => void;
  isPreparingImport?: boolean;
}

export default function CvParsedPreview({
  data,
  uploadId,
  fileName,
  onOpenImport,
  isPreparingImport = false,
}: CvParsedPreviewProps) {
  const { personal, experience, education, skills, projects } = data;

  const hasPersonalInfo =
    Boolean(personal.fullName) ||
    Boolean(personal.email) ||
    Boolean(personal.phone) ||
    Boolean(personal.location) ||
    Boolean(personal.website) ||
    Boolean(personal.linkedin) ||
    Boolean(personal.github);

  return (
    <div className="space-y-6">
      {/* Notice Banner & Import Trigger */}
      <div className="rounded-3xl bg-[#f8f6fe] border border-[#e4daf7] p-5 text-xs text-[#0f172a] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center shrink-0 border border-[#dcd3f8]">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-[#0f172a] block">
              CV Data Extracted &amp; Ready for Import
            </span>
            <p className="mt-0.5 text-[#64748b] leading-relaxed">
              Review your extracted details below. Click <strong>Import to Portfolio</strong> to select sections and safely pre-fill your portfolio records.
            </p>
            {uploadId && (
              <p className="mt-1 text-[11px] font-mono text-[#94a3b8]">
                Upload Ref: {uploadId} {fileName ? `(${fileName})` : ""}
              </p>
            )}
          </div>
        </div>

        {onOpenImport && (
          <button
            type="button"
            onClick={onOpenImport}
            disabled={isPreparingImport}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPreparingImport ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Loading Portfolio Items...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span>Import to Portfolio</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 1. Personal Information & Summary */}
      <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#eae6f5] mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0f172a]">
              Personal Information & Summary
            </h3>
            <p className="text-xs text-[#64748b]">
              Candidate identity and contact details extracted from the CV header.
            </p>
          </div>
        </div>

        {hasPersonalInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {personal.fullName && (
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] block mb-0.5">
                  Full Name
                </span>
                <span className="text-sm font-bold text-[#0f172a]">
                  {personal.fullName}
                </span>
              </div>
            )}
            {personal.email && (
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <MailIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Email</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a] break-all">
                  {personal.email}
                </span>
              </div>
            )}
            {personal.phone && (
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <PhoneIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Phone</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {personal.phone}
                </span>
              </div>
            )}
            {personal.location && (
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <MapPinIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Location</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {personal.location}
                </span>
              </div>
            )}
            {personal.website && (
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <GlobeIcon className="w-3.5 h-3.5 text-[#6e56cf]" />
                  <span>Website</span>
                </span>
                <span className="text-sm font-semibold text-[#6e56cf] break-all">
                  {personal.website}
                </span>
              </div>
            )}
            {personal.linkedin && (
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <GlobeIcon className="w-3.5 h-3.5 text-[#0077b5]" />
                  <span>LinkedIn</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a] break-all">
                  {personal.linkedin}
                </span>
              </div>
            )}
            {personal.github && (
              <div className="p-3 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9]">
                <span className="text-[11px] font-semibold text-[#64748b] flex items-center gap-1.5 mb-0.5">
                  <GithubIcon className="w-3.5 h-3.5 text-[#0f172a]" />
                  <span>GitHub</span>
                </span>
                <span className="text-sm font-semibold text-[#0f172a] break-all">
                  {personal.github}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#94a3b8] italic mb-4">
            No explicit contact or personal header fields detected.
          </p>
        )}

        {personal.summary && (
          <div className="p-4 rounded-2xl bg-[#fbfaff] border border-[#eae6f5]">
            <span className="text-xs font-bold text-[#6e56cf] uppercase tracking-wider block mb-1.5">
              Professional Summary
            </span>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed whitespace-pre-line">
              {personal.summary}
            </p>
          </div>
        )}
      </div>

      {/* 2. Work Experience */}
      <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
              <BriefcaseIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">
                Work Experience
              </h3>
              <p className="text-xs text-[#64748b]">
                Employment history and professional roles extracted from the CV.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
            {experience.length} {experience.length === 1 ? "Role" : "Roles"}
          </span>
        </div>

        {experience.length > 0 ? (
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <h4 className="text-sm font-bold text-[#0f172a]">
                    {exp.position}
                    {exp.company && (
                      <span className="text-[#6e56cf]"> • {exp.company}</span>
                    )}
                  </h4>
                  <span className="text-xs font-semibold text-[#64748b] bg-white border border-[#eae6f5] px-2.5 py-0.5 rounded-lg self-start sm:self-auto">
                    {exp.startDate || "Date unknown"} –{" "}
                    {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-line">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#94a3b8] italic">
            No work experience entries detected in this document.
          </p>
        )}
      </div>

      {/* 3. Education */}
      <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                <path d="M22 10v6" />
                <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Education</h3>
              <p className="text-xs text-[#64748b]">
                Degrees, universities, and academic certifications.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
            {education.length} {education.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {education.length > 0 ? (
          <div className="space-y-4">
            {education.map((edu, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <h4 className="text-sm font-bold text-[#0f172a]">
                    {edu.degree || edu.field || "Degree"}
                    {edu.institution && (
                      <span className="text-[#6e56cf]">
                        {" "}
                        • {edu.institution}
                      </span>
                    )}
                  </h4>
                  {(edu.startDate || edu.endDate) && (
                    <span className="text-xs font-semibold text-[#64748b] bg-white border border-[#eae6f5] px-2.5 py-0.5 rounded-lg self-start sm:self-auto">
                      {edu.startDate ? `${edu.startDate} – ` : ""}
                      {edu.endDate || ""}
                    </span>
                  )}
                </div>
                {edu.field && edu.degree && (
                  <p className="text-xs font-medium text-[#64748b] mt-0.5">
                    Field of Study: {edu.field}
                  </p>
                )}
                {edu.description && (
                  <p className="text-xs text-[#475569] leading-relaxed mt-2 whitespace-pre-line">
                    {edu.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#94a3b8] italic">
            No education entries detected in this document.
          </p>
        )}
      </div>

      {/* 4. Technical Skills */}
      <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Skills</h3>
              <p className="text-xs text-[#64748b]">
                Programming languages, frameworks, libraries, and technical proficiencies.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
            {skills.length} {skills.length === 1 ? "Skill" : "Skills"}
          </span>
        </div>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#faf9fd] text-[#0f172a] border border-[#e4daf7] text-xs font-semibold hover:border-[#6e56cf] transition-colors"
              >
                {skill.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#94a3b8] italic">
            No technical skills detected in this document.
          </p>
        )}
      </div>

      {/* 5. Projects */}
      <div className="bg-white rounded-3xl border border-[#eae6f5] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#eae6f5] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f3f0ff] text-[#6e56cf] flex items-center justify-center">
              <FolderGit2Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Projects</h3>
              <p className="text-xs text-[#64748b]">
                Software projects, applications, and portfolio works.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#f8f7fd] border border-[#eae6f5] text-xs font-bold text-[#6e56cf]">
            {projects.length} {projects.length === 1 ? "Project" : "Projects"}
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#faf9fd] border border-[#f0ecf9] hover:border-[#e2dcfa] transition-colors"
              >
                <h4 className="text-sm font-bold text-[#0f172a] mb-1">
                  {proj.title}
                </h4>
                {proj.description && (
                  <p className="text-xs text-[#475569] leading-relaxed mb-3 whitespace-pre-line">
                    {proj.description}
                  </p>
                )}
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {proj.technologies.map((tech, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-[#eae6f5] text-[11px] font-medium text-[#64748b]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#94a3b8] italic">
            No projects detected in this document.
          </p>
        )}
      </div>
    </div>
  );
}
