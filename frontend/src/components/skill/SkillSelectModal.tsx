"use client";

import React, { useEffect, useMemo } from "react";
import {
  SearchIcon,
  CheckIcon,
  PlusIcon,
  XIcon,
  SparklesIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface CatalogSkill {
  id: string;
  name: string;
  category: string;
  iconKey?: string | null;
}

export interface SkillSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogSkills: CatalogSkill[];
  selectedSkillNames: string[];
  isLoading?: boolean;
  search: string;
  category: string;
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: string) => void;
  onSelectSkill: (skill: CatalogSkill) => void;
  onCustomSkillClick?: () => void;
  categories?: string[];
}

const DEFAULT_CATEGORIES = [
  "All",
  "Frontend",
  "Backend",
  "Database",
  "Cloud & DevOps",
  "Tools",
];

export default function SkillSelectModal({
  isOpen,
  onClose,
  catalogSkills,
  selectedSkillNames,
  isLoading = false,
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onSelectSkill,
  onCustomSkillClick,
  categories = DEFAULT_CATEGORIES,
}: SkillSelectModalProps) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Set of selected skill names (case-insensitive) for fast duplicate lookup
  const selectedSet = useMemo(() => {
    return new Set(selectedSkillNames.map((name) => name.trim().toLowerCase()));
  }, [selectedSkillNames]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skill-select-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0f172a]/40 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl border border-[#eae6f5] shadow-2xl shadow-[#6e56cf]/10 max-w-2xl w-full p-6 sm:p-8 relative my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#f1edf9] flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-[11px] font-semibold text-[#6e56cf] uppercase tracking-wider mb-2">
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Skill Catalog</span>
            </div>
            <h2
              id="skill-select-modal-title"
              className="text-lg sm:text-xl font-bold text-[#0f172a] tracking-tight"
            >
              Add Skills from Catalog
            </h2>
            <p className="text-xs text-[#64748b] mt-1">
              Search and click any predefined skill to instantly add it to your portfolio.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f7fd] border border-transparent hover:border-[#eae6f5] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="mt-4 flex-shrink-0">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search skills (e.g. React, PostgreSQL, Docker)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#eae6f5] bg-[#faf9fd] text-xs sm:text-sm text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:border-[#6e56cf] focus:outline-none focus:ring-2 focus:ring-[#6e56cf]/15 transition-all"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8] hover:text-[#0f172a] rounded-lg cursor-pointer"
                aria-label="Clear search"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1.5 flex-shrink-0 scrollbar-none">
          {categories.map((cat) => {
            const isSelected =
              category === cat || (cat === "All" && (!category || category === "All"));
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat === "All" ? "" : cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#6e56cf] text-white shadow-xs"
                    : "bg-[#f8f7fd] text-[#64748b] hover:text-[#0f172a] border border-[#eae6f5] hover:bg-[#f1edf9]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Catalog Skills Grid / Results Container */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 min-h-[220px]">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-[#6e56cf]/20 border-t-[#6e56cf] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#64748b]">Loading skills catalog...</p>
            </div>
          ) : catalogSkills.length === 0 ? (
            /* Empty State */
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[#dcd3f8] bg-[#faf9fd] my-2">
              <p className="text-sm font-semibold text-[#0f172a]">
                No skills found{search ? ` for "${search}"` : ""}
              </p>
              <p className="text-xs text-[#64748b] mt-1 max-w-sm mx-auto">
                Can&apos;t find what you&apos;re looking for? You can create a custom skill with any name and category.
              </p>
              {onCustomSkillClick && (
                <button
                  type="button"
                  onClick={onCustomSkillClick}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm transition-all cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Custom Skill</span>
                </button>
              )}
            </div>
          ) : (
            /* Skill Cards / Chips */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1">
              {catalogSkills.map((item) => {
                const isAlreadySelected = selectedSet.has(
                  item.name.trim().toLowerCase()
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isAlreadySelected}
                    onClick={() => {
                      if (!isAlreadySelected) {
                        onSelectSkill(item);
                      }
                    }}
                    className={`group p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isAlreadySelected
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-950 cursor-default opacity-90"
                        : "bg-white hover:bg-[#faf9fd] border-[#eae6f5] hover:border-[#6e56cf] shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 w-full">
                      <span className="text-xs sm:text-sm font-semibold text-[#0f172a] group-hover:text-[#6e56cf] transition-colors line-clamp-1">
                        {item.name}
                      </span>
                      {isAlreadySelected ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md flex-shrink-0"
                          title="Already added to portfolio"
                        >
                          <CheckIcon className="w-3 h-3" />
                          <span>Added</span>
                        </span>
                      ) : (
                        <span className="text-[#94a3b8] group-hover:text-[#6e56cf] flex-shrink-0 transition-colors">
                          <PlusIcon className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#64748b] mt-1 line-clamp-1">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer / Custom Skill Fallback */}
        <div className="mt-4 pt-4 border-t border-[#f1edf9] flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 text-xs">
          <div className="text-[#64748b] text-center sm:text-left">
            <span>Want a skill not listed in the catalog?</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onCustomSkillClick && (
              <button
                type="button"
                onClick={onCustomSkillClick}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-[#6e56cf] hover:text-[#5d46be] bg-[#f3f0ff] hover:bg-[#ede8fc] border border-[#dcd3f8] transition-colors cursor-pointer text-center"
              >
                Add Custom Skill
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] hover:text-[#0f172a] bg-white border border-[#eae6f5] hover:bg-[#f8f7fd] transition-colors cursor-pointer text-center"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
