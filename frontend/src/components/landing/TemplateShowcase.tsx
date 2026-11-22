import React from "react";
import Link from "next/link";
import { SparklesIcon } from "./icons";
import { TEMPLATE_CATEGORIES, TEMPLATE_LIST, getTemplateCategoryLabel } from "@/templates/registry";
import type { PortfolioTemplateId } from "@/types/portfolio";

/**
 * Landing-page template showcase (updated for the Phase 13 collection).
 *
 * Names, descriptions, categories and badges come from the template registry,
 * so the marketing page always matches the templates users can pick. Each card
 * shows a lightweight, static CSS sketch of that template's layout (rendering
 * nine full live templates on the landing page would be needlessly heavy).
 */

const bar = (cls: string) => <span aria-hidden="true" className={`block rounded-sm ${cls}`} />;

const MOCKUPS: Record<PortfolioTemplateId, React.ReactNode> = {
  modern: (
    <div className="h-full bg-slate-950 p-3 space-y-2.5">
      <div className="flex items-center justify-between">{bar("h-1.5 w-10 bg-emerald-400")}{bar("h-1.5 w-14 bg-slate-700")}</div>
      {bar("h-3 w-3/4 bg-white")}
      <div className="flex gap-1">{["w-8", "w-10", "w-7"].map((w) => <span key={w} className={`h-2.5 ${w} rounded bg-emerald-950 border border-emerald-500/40`} />)}</div>
      <div className="grid grid-cols-2 gap-1.5 pt-1">{[0, 1].map((i) => <span key={i} className="h-10 rounded bg-slate-900 border border-slate-800" />)}</div>
    </div>
  ),
  minimal: (
    <div className="h-full bg-white p-4 space-y-2.5">
      {bar("h-3 w-1/2 bg-slate-900")}
      {bar("h-1.5 w-1/3 bg-slate-400")}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">{["w-full", "w-11/12", "w-4/5"].map((w) => <span key={w} className={`block h-1.5 ${w} bg-slate-200 rounded-sm`} />)}</div>
      <div className="space-y-1.5 pt-1">{[0, 1].map((i) => <span key={i} className="block h-6 rounded border border-slate-200" />)}</div>
    </div>
  ),
  professional: (
    <div className="h-full bg-slate-50 space-y-2">
      <div className="h-5 bg-white border-b border-slate-200 flex items-center gap-1.5 px-3"><span className="w-2.5 h-2.5 rounded-sm bg-blue-900" />{bar("h-1.5 w-12 bg-slate-300")}</div>
      <div className="px-3 space-y-2">
        {bar("h-3 w-2/3 bg-slate-900")}
        {[0, 1].map((i) => <span key={i} className="block h-8 rounded-md bg-white border border-slate-200 border-l-4 border-l-blue-900" />)}
      </div>
    </div>
  ),
  editorial: (
    <div className="h-full bg-[#f6f1e7] p-3 space-y-2">
      <div className="border-y border-[#1c1917] py-0.5 flex justify-between">{bar("h-1 w-8 bg-[#1c1917]")}{bar("h-1 w-5 bg-[#1c1917]")}</div>
      <p className="font-display-serif text-2xl leading-none font-semibold text-[#1c1917]">Alex Chen</p>
      <p className="font-display-serif italic text-[10px] text-[#57534e]">Full-Stack Developer</p>
      <div className="border-t-2 border-[#1c1917] pt-1.5 flex gap-2">
        <span className="font-display-serif text-lg leading-none text-[#8a2c0d]">A</span>
        <div className="flex-1 space-y-1">{["w-full", "w-5/6", "w-4/6"].map((w) => <span key={w} className={`block h-1 ${w} bg-[#1c1917]/30`} />)}</div>
      </div>
    </div>
  ),
  bento: (
    <div className="h-full bg-[#efeee9] p-2 grid grid-cols-3 grid-rows-3 gap-1.5">
      <span className="col-span-2 row-span-2 rounded-xl bg-white p-2"><span className="block w-5 h-5 rounded-md bg-lime-300" /><span className="block mt-2 h-2 w-3/4 rounded-sm bg-zinc-900" /></span>
      <span className="rounded-xl bg-zinc-900 p-1.5"><span className="block h-2 w-4 bg-lime-300 rounded-sm" /></span>
      <span className="rounded-xl bg-lime-300" />
      <span className="col-span-2 rounded-xl bg-zinc-800" />
      <span className="rounded-xl bg-white" />
    </div>
  ),
  studio: (
    <div className="h-full bg-[#111111] flex flex-col">
      <div className="p-3 flex-1">
        <p className="font-grotesk text-[26px] leading-[0.85] font-bold uppercase tracking-tighter text-[#f2efe8]">Alex<br />Chen<span className="text-[#ff5b1f]">.</span></p>
      </div>
      <div className="bg-[#ff5b1f] -rotate-2 scale-105 py-1 px-2 font-grotesk text-[9px] font-bold uppercase whitespace-nowrap overflow-hidden text-[#111111]">React ✦ Motion ✦ Branding ✦ Node ✦</div>
      <div className="p-3 grid grid-cols-5 gap-2 items-center"><span className="col-span-3 h-9 bg-[#f2efe8]" /><span className="col-span-2 space-y-1">{bar("h-1.5 w-full bg-white/70")}{bar("h-1.5 w-2/3 bg-[#ff5b1f]")}</span></div>
    </div>
  ),
  executive: (
    <div className="h-full bg-[#fbfaf7] p-2 grid grid-cols-5 gap-2">
      <div className="col-span-2 bg-[#1f2329] p-2 space-y-1.5">
        <span className="block w-6 h-6 border border-[#b08d57]" />
        {bar("h-1.5 w-full bg-white/80")}
        {["w-4/5", "w-3/5", "w-4/5"].map((w) => <span key={w} className="flex items-center gap-1"><span className="w-1 h-1 rotate-45 bg-[#b08d57]" /><span className={`h-1 ${w} bg-white/30`} /></span>)}
      </div>
      <div className="col-span-3 space-y-1.5 pt-1">
        {bar("h-2 w-3/4 bg-[#1f2329]")}
        {bar("h-px w-6 bg-[#b08d57]")}
        <div className="grid grid-cols-3 border-y border-[#e7e2d8] divide-x divide-[#e7e2d8] py-1">{[0, 1, 2].map((i) => <span key={i} className="mx-auto h-2 w-3 bg-[#1f2329]" />)}</div>
        {[0, 1].map((i) => <span key={i} className="block h-5 bg-white border border-[#e7e2d8] border-l-2 border-l-[#b08d57]" />)}
      </div>
    </div>
  ),
  showcase: (
    <div className="h-full bg-[#f6f8fa]">
      <div className="bg-white border-b border-slate-200 px-2.5 pt-1.5"><span className="font-mono text-[8px] text-slate-500"><span className="text-indigo-600">alex</span> / portfolio</span><div className="mt-1 flex gap-2">{bar("h-1 w-7 bg-indigo-500")}{bar("h-1 w-7 bg-slate-200")}</div></div>
      <div className="p-2 space-y-1.5">
        <div className="grid grid-cols-5 rounded-md overflow-hidden border border-slate-200 bg-white"><span className="col-span-3 h-10 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500" /><span className="col-span-2 p-1 space-y-1">{bar("h-1.5 w-full bg-slate-800")}{bar("h-1 w-2/3 bg-slate-300")}</span></div>
        <div className="grid grid-cols-2 gap-1.5">{["bg-amber-500", "bg-emerald-500"].map((c) => <span key={c} className="h-7 rounded-md bg-white border border-slate-200 p-1 flex items-end gap-1"><span className={`w-1.5 h-1.5 rounded-full ${c}`} />{bar("h-1 w-6 bg-slate-300")}</span>)}</div>
      </div>
    </div>
  ),
  academic: (
    <div className="h-full bg-[#fdfcf9] p-3 font-text-serif">
      <p className="text-center text-sm font-semibold text-[#1d1917]">Alex Chen</p>
      <p className="text-center text-[8px] italic text-[#5c534d]">Researcher · alex@uni.edu</p>
      <span aria-hidden="true" className="block mx-auto mt-1.5 h-px w-8 bg-[#7a1f2b]" />
      {["Positions", "Selected Work"].map((label) => (
        <div key={label} className="mt-2 pt-1.5 border-t border-[#e6e1d8] grid grid-cols-3 gap-1.5">
          <span className="text-[7px] uppercase tracking-wider text-[#7a1f2b] font-semibold">{label}</span>
          <span className="col-span-2 space-y-1">{label === "Selected Work" ? <span className="flex gap-1 text-[7px] text-[#7a1f2b]">[1]<span className="flex-1 h-1 mt-1 bg-[#2a2522]/30" /></span> : null}<span className="block h-1 w-full bg-[#2a2522]/30" /><span className="block h-1 w-3/4 bg-[#2a2522]/20" /></span>
        </div>
      ))}
    </div>
  ),
};

export default function TemplateShowcase() {
  const total = TEMPLATE_LIST.length;

  return (
    <section id="templates" className="py-20 sm:py-28 bg-[#ffffff] border-b border-[#eae6f5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] text-xs font-semibold uppercase tracking-wider text-[#6e56cf]">
            Curated Collection
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#0f172a]">
            One portfolio. {total} distinct designs.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#475569]">
            Keep your content. Switch between genuinely different layouts — from bento grids to
            magazine editorials — with a single click.
          </p>
        </div>

        {/* Category legend */}
        <ul className="flex flex-wrap justify-center gap-2 mb-12" aria-label="Template categories">
          {TEMPLATE_CATEGORIES.map((category) => {
            const count = TEMPLATE_LIST.filter((t) => t.meta.category === category.id).length;
            if (count === 0) return null;
            return (
              <li
                key={category.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#faf9fd] border border-[#eae6f5] text-[#475569]"
              >
                {category.label}
                <span className="px-1.5 rounded-full bg-[#f3f0ff] text-[10px] text-[#6e56cf] tabular-nums">{count}</span>
              </li>
            );
          })}
        </ul>

        {/* Template cards */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {TEMPLATE_LIST.map(({ meta }) => {
            const highlighted = meta.id === "modern";
            return (
              <li
                key={meta.id}
                data-testid={`landing-template-${meta.id}`}
                className={`relative flex flex-col rounded-2xl bg-white p-5 transition-all ${
                  highlighted
                    ? "border-2 border-[#6e56cf] shadow-lg shadow-[#6e56cf]/10"
                    : "border border-[#eae6f5] shadow-xs hover:shadow-md hover:border-[#cfc6eb]"
                }`}
              >
                {meta.badge && (
                  <span className="absolute -top-3 right-6 bg-[#6e56cf] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm inline-flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3" />
                    {meta.badge}
                  </span>
                )}

                <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-[#f1edf9]">
                  <h3 className="text-base font-bold text-[#0f172a]">{meta.name}</h3>
                  <span className="text-[11px] font-medium text-[#6e56cf] bg-[#f3f0ff] px-2 py-0.5 rounded border border-[#dcd3f8] flex-shrink-0">
                    {getTemplateCategoryLabel(meta.category)}
                  </span>
                </div>

                {/* Static layout sketch */}
                <div aria-hidden="true" className="h-44 rounded-xl border border-[#eae6f5] overflow-hidden select-none">
                  {MOCKUPS[meta.id]}
                </div>

                <p className="mt-4 text-xs text-[#64748b] leading-relaxed">{meta.description}</p>
              </li>
            );
          })}
        </ul>

        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#6e56cf] hover:bg-[#5d46be] shadow-sm shadow-[#6e56cf]/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6e56cf] focus-visible:ring-offset-2"
          >
            <SparklesIcon className="w-4 h-4" />
            Create my portfolio
          </Link>
        </div>
      </div>
    </section>
  );
}
