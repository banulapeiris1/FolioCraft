import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import type { Project } from "@/types/project";
import type { Experience } from "@/types/experience";
import type { Skill } from "@/types/skill";
import type { PortfolioTemplateId, PortfolioViewData } from "../types";
import { TEMPLATE_LIST } from "../registry";
import {
  MAX_STAGGER_INDEX,
  TEMPLATE_MOTION_PROFILES,
  getTemplateMotion,
  getTemplateMotionProfile,
  motionCardProps,
  motionMediaProps,
  resolveMotionMode,
  revealProps,
} from "./motionConfig";
import { AnimatedTemplateRenderer } from "../TemplateRenderer";
import { AboutView } from "../site/AboutView";
import { ExperienceView } from "../site/ExperienceView";
import { ProjectsListView } from "../site/ProjectsListView";
import { ProjectDetailView } from "../site/ProjectDetailView";
import { PageHeader } from "../site/SitePrimitives";
import { getSiteTheme } from "../site/siteThemes";
import { buildProjectEntries, createProjectHrefResolver, findProjectBySlug } from "../site/siteModel";

// ---------------------------------------------------------------------------
// Fixtures: enough content for every section of every template to render.
// ---------------------------------------------------------------------------

const STAMP = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

function project(i: number, withImage: boolean): Project {
  return {
    id: `p${i}`,
    portfolioId: "port-1",
    title: `Project ${i}`,
    description: `Description of project ${i}.`,
    technologies: ["TypeScript", "React", "PostgreSQL"],
    githubUrl: `https://github.com/example/p${i}`,
    projectUrl: `https://p${i}.example.com`,
    imageUrl: withImage ? `https://example.com/p${i}.png` : null,
    orderIndex: i,
    ...STAMP,
  };
}

function experience(i: number): Experience {
  return {
    id: `e${i}`,
    portfolioId: "port-1",
    company: `Company ${i}`,
    position: `Engineer ${i}`,
    description: `Worked on things ${i}.`,
    startDate: `20${10 + i}-01-01`,
    endDate: i === 0 ? null : `20${11 + i}-01-01`,
    isCurrent: i === 0,
    ...STAMP,
  };
}

function skill(i: number, category: string): Skill {
  return { id: `s${i}`, portfolioId: "port-1", name: `Skill ${i}`, category, orderIndex: i, ...STAMP };
}

const PROJECTS = [0, 1, 2, 3, 4, 5].map((i) => project(i, i % 2 === 0));

function fixture(template: string): PortfolioViewData {
  return {
    name: "Jane Doe",
    title: "Software Engineer",
    about: "I build reliable web platforms. ".repeat(12).trim(),
    email: "jane@example.com",
    phone: "+94 77 000 0000",
    location: "Colombo",
    profileImageUrl: "https://example.com/me.png",
    socialLinks: { github: "https://github.com/jane", linkedin: "https://linkedin.com/in/jane" },
    username: "janedoe",
    projects: PROJECTS,
    skills: [skill(0, "Languages"), skill(1, "Languages"), skill(2, "Cloud"), skill(3, "Data")],
    experiences: [0, 1, 2].map(experience),
    template,
  };
}

const TEMPLATE_IDS = TEMPLATE_LIST.map((t) => t.meta.id) as PortfolioTemplateId[];

// ---------------------------------------------------------------------------
// A small HTML walker (renderToStaticMarkup output is well formed).
// ---------------------------------------------------------------------------

interface El {
  tag: string;
  attrs: string;
  reveal: boolean;
  hero: boolean;
  card: boolean;
  media: boolean;
  revealI: number;
  heroI: number;
  ancestors: El[];
}

const VOID = new Set(["img", "br", "hr", "input", "meta", "link", "source", "area", "col", "wbr"]);

function walk(html: string): El[] {
  const out: El[] = [];
  const stack: El[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      while (stack.length && stack.pop()!.tag !== tag) {
        /* pop to the matching element */
      }
      continue;
    }
    const num = (name: string) => {
      const v = attrs.match(new RegExp(`${name}:\\s*(\\d+)`));
      return v ? Number(v[1]) : 0;
    };
    const el: El = {
      tag,
      attrs,
      reveal: /\sdata-reveal=""/.test(attrs),
      hero: /\sdata-hero-item=""/.test(attrs),
      card: /\sdata-motion-card=""/.test(attrs),
      media: /\sdata-motion-media=""/.test(attrs),
      revealI: num("--reveal-i"),
      heroI: num("--hero-i"),
      ancestors: [...stack],
    };
    out.push(el);
    if (!VOID.has(tag) && !attrs.trim().endsWith("/")) stack.push(el);
  }
  return out;
}

/** Shared structural rules every rendered template / view must follow. */
function assertMotionStructure(html: string, label: string): El[] {
  const els = walk(html);
  for (const el of els) {
    const insideReveal = el.ancestors.some((a) => a.reveal);
    const insideHero = el.ancestors.some((a) => a.hero);
    assert.ok(!(el.reveal && el.hero), `${label}: <${el.tag}> is both a reveal and a hero item`);
    assert.ok(!(el.reveal && insideReveal), `${label}: nested reveal on <${el.tag}>`);
    assert.ok(!(el.reveal && insideHero), `${label}: reveal inside a hero item (<${el.tag}>)`);
    assert.ok(!(el.hero && insideReveal), `${label}: hero item inside a reveal (<${el.tag}>)`);
    assert.ok(!(el.hero && insideHero), `${label}: nested hero item (<${el.tag}>)`);
    // Short, professional delays: grid staggers restart every row.
    assert.ok(el.revealI <= 2, `${label}: reveal stagger index ${el.revealI} is too long`);
    assert.ok(el.heroI <= 5, `${label}: hero stagger index ${el.heroI} is too long`);
    // Reveals inside a sticky box could never scroll into view.
    if (el.reveal) {
      const sticky = el.ancestors.find((a) => /class="[^"]*\bsticky\b/.test(a.attrs) || /class="[^"]*\blg:sticky\b/.test(a.attrs));
      assert.equal(sticky, undefined, `${label}: reveal <${el.tag}> inside a sticky container`);
    }
  }
  assert.ok(!/data-revealed|data-motion-ready/.test(html), `${label}: server HTML carries client-only motion state`);
  return els;
}

const count = (els: El[], key: "reveal" | "hero" | "card" | "media") => els.filter((e) => e[key]).length;

function renderTemplate(template: PortfolioTemplateId, siteMode: boolean): string {
  const data = fixture(template);
  return renderToStaticMarkup(
    React.createElement(AnimatedTemplateRenderer, {
      data,
      templateId: template,
      siteNav: siteMode ? React.createElement("nav", { "aria-label": "Site" }, "nav") : undefined,
      getProjectHref: siteMode ? createProjectHrefResolver("janedoe", data.projects) : undefined,
    })
  );
}

// ---------------------------------------------------------------------------
// Template motion profiles
// ---------------------------------------------------------------------------

test("Phase 14 Stage 2: template motion profiles", async (t) => {
  await t.test("every registered template has a profile", () => {
    for (const id of TEMPLATE_IDS) assert.ok(TEMPLATE_MOTION_PROFILES[id], `${id} has a motion profile`);
    assert.equal(Object.keys(TEMPLATE_MOTION_PROFILES).length, TEMPLATE_IDS.length);
  });

  await t.test("profiles express each template's identity", () => {
    const p = TEMPLATE_MOTION_PROFILES;
    // Calm templates: whole sections only, no hover movement.
    for (const id of ["minimal", "academic"] as const) {
      assert.deepEqual(p[id], { itemReveals: false, cardLift: false, mediaZoom: false }, id);
    }
    // Restrained: entries reveal, but nothing moves on hover.
    assert.equal(p.executive.cardLift, false);
    assert.equal(p.executive.mediaZoom, false);
    assert.equal(p.professional.mediaZoom, false);
    // Image-led and interactive templates.
    assert.equal(p.editorial.mediaZoom, true);
    assert.equal(p.editorial.cardLift, false);
    for (const id of ["modern", "bento", "studio", "showcase"] as const) {
      assert.deepEqual(p[id], { itemReveals: true, cardLift: true, mediaZoom: true }, id);
    }
  });

  await t.test("academic and executive never exceed subtle", () => {
    assert.equal(resolveMotionMode("creative", "academic"), "subtle");
    assert.equal(resolveMotionMode("creative", "executive"), "subtle");
    assert.equal(resolveMotionMode("minimal", "executive"), "minimal");
  });

  await t.test("getTemplateMotionProfile normalises ids and falls back safely", () => {
    assert.equal(getTemplateMotionProfile(" Academic "), TEMPLATE_MOTION_PROFILES.academic);
    assert.deepEqual(getTemplateMotionProfile("unknown"), TEMPLATE_MOTION_PROFILES.modern);
    assert.deepEqual(getTemplateMotionProfile(null), TEMPLATE_MOTION_PROFILES.modern);
  });

  await t.test("bound helpers follow the profile and never nest reveals", () => {
    const expressive = getTemplateMotion("modern");
    assert.deepEqual(expressive.section(), {});
    assert.deepEqual(expressive.heading(), revealProps());
    assert.deepEqual(expressive.item(4, 3), revealProps(1), "stagger restarts every row");
    assert.deepEqual(expressive.item(2, 2), revealProps(0));
    assert.deepEqual(expressive.item(3), revealProps(0), "lists reveal each entry without delay");
    assert.deepEqual(expressive.card(), motionCardProps());
    assert.deepEqual(expressive.media(), motionMediaProps());

    const calm = getTemplateMotion("academic");
    assert.deepEqual(calm.section(), revealProps());
    assert.deepEqual(calm.heading(), {});
    assert.deepEqual(calm.item(1, 2), {});
    assert.deepEqual(calm.card(), {});
    assert.deepEqual(calm.media(), {});

    assert.deepEqual(expressive.item(5, 0), revealProps(0), "invalid column counts are treated as one column");
  });
});

// ---------------------------------------------------------------------------
// All nine templates
// ---------------------------------------------------------------------------

test("Phase 14 Stage 2: markers in all nine templates", async (t) => {
  assert.equal(TEMPLATE_IDS.length, 9);

  for (const id of TEMPLATE_IDS) {
    for (const siteMode of [false, true]) {
      const label = `${id}${siteMode ? " (site)" : ""}`;
      await t.test(label, () => {
        const profile = TEMPLATE_MOTION_PROFILES[id];
        const html = renderTemplate(id, siteMode);
        const els = assertMotionStructure(html, label);

        assert.ok(html.includes(`data-testid="template-${id}"`), `${label}: template rendered`);
        assert.ok(html.includes("Jane Doe") && html.includes("Project 5"), `${label}: content intact`);

        // Hero: the main heading and supporting items enter with a stagger.
        const h1 = els.find((e) => e.tag === "h1");
        assert.ok(h1, `${label}: has an h1`);
        assert.ok(h1!.hero || h1!.ancestors.some((a) => a.hero), `${label}: main heading is part of the hero entrance`);
        assert.ok(count(els, "hero") >= 3, `${label}: at least 3 hero items`);
        assert.ok(els.some((e) => e.heroI > 0), `${label}: hero items are staggered`);
        const img = els.find((e) => e.tag === "img" && /me\.png/.test(e.attrs));
        assert.ok(img && (img.hero || img.ancestors.some((a) => a.hero)), `${label}: profile image enters with the hero`);

        // Content sections reveal on scroll.
        assert.ok(count(els, "reveal") >= 3, `${label}: content sections reveal`);
        const revealTags = new Set(els.filter((e) => e.reveal).map((e) => e.tag));
        if (profile.itemReveals) {
          assert.ok([...revealTags].some((tag) => tag !== "section"), `${label}: entries reveal individually`);
        } else {
          assert.deepEqual([...revealTags], ["section"], `${label}: only whole sections reveal`);
        }

        // Interactions follow the template's profile.
        if (profile.cardLift) assert.ok(count(els, "card") >= 1, `${label}: project cards lift`);
        else assert.equal(count(els, "card"), 0, `${label}: no hover lift`);
        if (!profile.mediaZoom) assert.equal(count(els, "media"), 0, `${label}: no image zoom`);

        // Zoomed media always sits inside a clipping frame.
        for (const media of els.filter((e) => e.media)) {
          assert.ok(
            media.ancestors.some((a) => /\boverflow-hidden\b/.test(a.attrs)),
            `${label}: zoomed image is clipped by an overflow-hidden frame`
          );
        }
      });
    }
  }

  await t.test("template-specific details", () => {
    const executive = renderTemplate("executive", false);
    const aside = executive.slice(executive.indexOf("<aside"), executive.indexOf("</aside>"));
    assert.ok(!aside.includes("data-reveal"), "executive: nothing in the sticky sidebar is scroll-revealed");
    assert.ok(aside.includes("data-hero-item"), "executive: the sidebar takes part in the hero entrance");
    assert.match(executive, /gap-px[^"]*"[^>]*data-reveal=""/, "executive: hairline grid reveals as one unit");

    const modern = walk(renderTemplate("modern", false));
    assert.equal(count(modern, "media"), 0, "modern keeps its own image zoom (no doubled zoom)");

    const studio = walk(renderTemplate("studio", false));
    const marquee = studio.find((e) => /data-testid="studio-marquee"/.test(e.attrs));
    assert.ok(marquee && !marquee.reveal && !marquee.hero, "studio: decorative marquee is untouched");
    assert.ok(studio.some((e) => e.card && e.tag === "img"), "studio: screenshots lift off their offset frame");

    const showcase = walk(renderTemplate("showcase", false));
    assert.ok(count(showcase, "media") >= 1, "showcase: spotlight image zooms");
    assert.ok(count(showcase, "card") >= 2, "showcase: spotlight and repo cards lift");

    const bento = walk(renderTemplate("bento", false));
    assert.ok(count(bento, "media") >= 1, "bento: featured image zooms");
    const stats = bento.find((e) => /data-testid="bento-tile-stats"/.test(e.attrs));
    const now = bento.find((e) => /data-testid="bento-tile-now"/.test(e.attrs));
    assert.deepEqual([stats?.revealI, now?.revealI], [1, 2], "bento: neighbouring tiles are staggered");
  });

  await t.test("gallery 'none' mode keeps markers inert", () => {
    const html = renderToStaticMarkup(
      React.createElement(AnimatedTemplateRenderer, { data: fixture("bento"), templateId: "bento", animationStyle: "none" })
    );
    // React may hoist an image preload <link> ahead of the wrapper.
    const wrapper = html.replace(/^(<link [^>]*\/>)+/, "");
    assert.match(wrapper, /^<div data-motion-wrapper="" data-motion="none">/);
    assert.ok(!/--motion-/.test(wrapper.slice(0, 200)), "no preset variables in none mode");
    assert.ok(html.includes("data-reveal"), "markers are present but CSS ignores them under data-motion=none");
  });
});

// ---------------------------------------------------------------------------
// Phase 12 views
// ---------------------------------------------------------------------------

test("Phase 14 Stage 2: markers in the Phase 12 views", async (t) => {
  for (const id of TEMPLATE_IDS) {
    await t.test(id, () => {
      const profile = TEMPLATE_MOTION_PROFILES[id];
      const data = fixture(id);

      const about = renderToStaticMarkup(React.createElement(AboutView, { data, username: "janedoe" }));
      const aboutEls = assertMotionStructure(about, `${id} about`);
      assert.ok(aboutEls.find((e) => e.tag === "h1")?.hero, `${id} about: page title enters`);
      assert.ok(count(aboutEls, "reveal") >= 2, `${id} about: introduction and skills reveal`);

      const experience = renderToStaticMarkup(React.createElement(ExperienceView, { data, username: "janedoe" }));
      const expEls = assertMotionStructure(experience, `${id} experience`);
      const items = expEls.filter((e) => /data-testid="experience-item"/.test(e.attrs));
      assert.equal(items.length, 3);
      if (profile.itemReveals) assert.ok(items.every((e) => e.reveal), `${id} experience: each role reveals`);
      else assert.ok(expEls.find((e) => /experience-timeline/.test(e.attrs))?.reveal, `${id} experience: timeline reveals as a whole`);

      const list = renderToStaticMarkup(React.createElement(ProjectsListView, { data, username: "janedoe" }));
      const listEls = assertMotionStructure(list, `${id} projects`);
      const cards = listEls.filter((e) => /data-testid="project-card"/.test(e.attrs));
      assert.equal(cards.length, PROJECTS.length);
      assert.equal(cards.every((e) => e.card), profile.cardLift, `${id} projects: card lift follows profile`);
      const images = PROJECTS.filter((p) => p.imageUrl).length;
      assert.equal(count(listEls, "media"), profile.mediaZoom ? images : 0, `${id} projects: image zoom follows profile`);

      const entries = buildProjectEntries(data.projects);
      const location = findProjectBySlug(entries, entries[1].slug)!;
      const detail = renderToStaticMarkup(React.createElement(ProjectDetailView, { data, username: "janedoe", location }));
      const detailEls = assertMotionStructure(detail, `${id} detail`);
      assert.match(detail, /<h1 id="project-title"[^>]*data-hero-item=""[^>]*>Project 1<\/h1>/);
      const adjacent = detailEls.filter((e) => /data-testid="project-(previous|next)"/.test(e.attrs));
      assert.equal(adjacent.length, 2);
      assert.equal(adjacent.every((e) => e.card), profile.cardLift, `${id} detail: prev/next lift follows profile`);
      assert.ok(count(detailEls, "reveal") >= 2, `${id} detail: overview, technologies and pagination reveal`);
    });
  }

  await t.test("empty states render without nested reveals", () => {
    const data = { ...fixture("modern"), projects: [], experiences: [], skills: [], about: null };
    for (const View of [AboutView, ExperienceView, ProjectsListView]) {
      assertMotionStructure(renderToStaticMarkup(React.createElement(View, { data, username: "janedoe" })), View.name);
    }
  });

  await t.test("PageHeader staggers eyebrow, title and subtitle", () => {
    const html = renderToStaticMarkup(
      React.createElement(PageHeader, { theme: getSiteTheme("modern"), eyebrow: "Career", title: "Experience", subtitle: "3 roles" })
    );
    const heroes = walk(html).filter((e) => e.hero);
    assert.deepEqual(heroes.map((e) => [e.tag, e.heroI]), [["p", 0], ["h1", 1], ["p", 2]]);
  });
});

// ---------------------------------------------------------------------------
// CSS and source hygiene
// ---------------------------------------------------------------------------

test("Phase 14 Stage 2: card interaction CSS and source hygiene", async (t) => {
  const css = fs.readFileSync(path.join(__dirname, "motion.css"), "utf8");

  await t.test("card transitions keep Tailwind v4 translate/scale and colour transitions", () => {
    const rule = css.match(/\[data-motion-card\]\s*\{[^}]*transition-property:\s*([^;]+);/);
    assert.ok(rule, "card transition rule exists");
    for (const prop of ["transform", "translate", "scale", "box-shadow", "border-color", "background-color", "color"]) {
      assert.ok(rule![1].split(",").map((s) => s.trim()).includes(prop), `transitions ${prop}`);
    }
  });

  await t.test("keyboard focus lifts cards via :focus-visible, not :focus-within", () => {
    assert.ok(css.includes("[data-motion-card]:is(:focus-visible, :has(:focus-visible))"));
    assert.ok(!css.includes(":focus-within"));
    const lifts = css.match(/\[data-motion-card\](?::hover|:is\(:focus-visible, :has\(:focus-visible\)\))\s*\{[^}]*\}/g) ?? [];
    assert.equal(lifts.length, 2, "hover and focus lift rules");
    for (const rule of lifts) assert.match(rule, /translate:\s*none/, "preset lift replaces a theme's own translate");
  });

  await t.test("templates and views use the shared helpers only (no inline motion)", () => {
    const root = path.join(__dirname, "..");
    const files = [
      ...TEMPLATE_IDS.map((id) => path.join(root, id, `Template${id[0].toUpperCase()}${id.slice(1)}.tsx`)),
      ...["AboutView", "ExperienceView", "ProjectsListView", "ProjectDetailView", "SitePrimitives"].map((n) =>
        path.join(root, "site", `${n}.tsx`)
      ),
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      const name = path.basename(file);
      assert.ok(/from "\.\.\/motion\/motionConfig"/.test(src), `${name} imports the shared motion helpers`);
      assert.ok(!/"data-(reveal|hero-item|motion-card|motion-media)"|data-(reveal|hero-item|motion-card|motion-media)=/.test(src), `${name}: no hand-written motion attributes`);
      assert.ok(!/--reveal-i|--hero-i|--motion-/.test(src), `${name}: no inline motion variables`);
      assert.ok(!/["']use client["']/.test(src), `${name} stays a Server Component`);
    }
  });

  await t.test("stagger indices are clamped by the shared config", () => {
    assert.ok(MAX_STAGGER_INDEX <= 8);
  });
});
