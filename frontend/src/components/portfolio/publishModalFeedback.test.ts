// Ensure environment variable is configured before any module evaluation
process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isDifferentPortfolio, mergePublishingResult } from "@/components/portfolio/PublishModal";
import type { Portfolio } from "@/types/portfolio";

/**
 * Post-QA correction (Phase 11): PublishModal's success message was wiped as
 * soon as the parent echoed the updated portfolio back (dashboard and editor
 * both do this via onPortfolioUpdated). Feedback must now reset only when the
 * modal switches to a different portfolio.
 */

const draft: Portfolio = {
  id: "44444444-4444-4444-8444-444444444444",
  userId: "u-1",
  name: "Grace Hopper",
  title: "Compiler Engineer",
  about: null,
  email: null,
  phone: null,
  location: null,
  profileImageUrl: null,
  socialLinks: {},
  username: "grace",
  template: "modern",
  published: false,
  publishedAt: null,
  publicUrl: null,
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z",
  sectionCounts: { projects: 1, skills: 2, experience: 0 },
};

// Exact partial response shapes returned by the Phase 10 endpoints
const publishResponse = {
  id: draft.id,
  username: "grace",
  published: true,
  publishedAt: "2026-04-01T12:00:00.000Z",
  publicUrl: "/u/grace",
};
const unpublishResponse = { id: draft.id, username: "grace", published: false };

const source = readFileSync(
  path.join(process.cwd(), "src", "components", "portfolio", "PublishModal.tsx"),
  "utf8"
);
const syncBlock = source.slice(
  source.indexOf("const [prevPortfolio, setPrevPortfolio]"),
  source.indexOf("// Handle ESC key press")
);

test("Post-QA: PublishModal success feedback survives parent updates", async (t) => {
  await t.test("1. Publish: echoed portfolio (same id) does NOT reset the success message", () => {
    const published = mergePublishingResult(draft, publishResponse);
    assert.notEqual(published, draft, "parent receives a new object");
    assert.equal(isDifferentPortfolio(draft, published), false);
  });

  await t.test("2. Unpublish: echoed portfolio (same id) does NOT reset the success message", () => {
    const published = mergePublishingResult(draft, publishResponse);
    const unpublished = mergePublishingResult(published, unpublishResponse);
    assert.equal(isDifferentPortfolio(published, unpublished), false);
  });

  await t.test("3. Republish: echoed portfolio (same id) does NOT reset the success message", () => {
    const published = mergePublishingResult(draft, publishResponse);
    const unpublished = mergePublishingResult(published, unpublishResponse);
    const republished = mergePublishingResult(unpublished, { ...publishResponse, publishedAt: published.publishedAt });
    assert.equal(isDifferentPortfolio(unpublished, republished), false);
    // The full publish → unpublish → republish chain never looks like a switch
    for (const [a, b] of [[draft, published], [published, unpublished], [unpublished, republished]] as const) {
      assert.equal(isDifferentPortfolio(a, b), false);
    }
  });

  await t.test("4. Editor-style echo (spread copy, e.g. after a template/username save) keeps feedback", () => {
    const echoed = { ...draft, template: "minimal", updatedAt: "2026-05-01T00:00:00.000Z" };
    assert.equal(isDifferentPortfolio(draft, echoed), false);
  });

  await t.test("5. Switching to a different portfolio DOES reset feedback", () => {
    const other = { ...draft, id: "55555555-5555-4555-8555-555555555555", username: "other" };
    assert.equal(isDifferentPortfolio(draft, other), true);
  });

  await t.test("6. Sync block: data always synced; feedback reset only inside the id-switch branch", () => {
    assert.ok(syncBlock.includes("const switchedPortfolio = isDifferentPortfolio(prevPortfolio, portfolio);"));
    const guarded = syncBlock.slice(syncBlock.indexOf("if (switchedPortfolio) {"));
    const unguarded = syncBlock.slice(0, syncBlock.indexOf("if (switchedPortfolio) {"));
    // Always synced (outside the guard)
    for (const always of ["setPrevPortfolio(portfolio);", "setCurrentPortfolio(portfolio);", 'setCandidateUsername(portfolio.username || "");']) {
      assert.ok(unguarded.includes(always), `should always run: ${always}`);
    }
    // Only on switch (inside the guard, never outside)
    for (const onSwitch of [
      "setActionSuccess(null);",
      "setActionError(null);",
      "setShowUnpublishConfirm(false);",
      'setUsernameStatus("available");',
      'setUsernameMessage("");',
    ]) {
      assert.ok(guarded.includes(onSwitch), `should reset on switch: ${onSwitch}`);
      assert.ok(!unguarded.includes(onSwitch), `must not reset on same-portfolio update: ${onSwitch}`);
    }
  });

  await t.test("7. Handlers unchanged: success set after notifying the parent; messages cleared at action start", () => {
    const publish = source.slice(source.indexOf("const handlePublish = async"), source.indexOf("// Unpublish action handler"));
    assert.ok(publish.indexOf("setActionSuccess(null);") < publish.indexOf("await publishPortfolio("));
    assert.ok(publish.indexOf("onPortfolioUpdated(merged);") < publish.indexOf('setActionSuccess("Portfolio published successfully! Your site is live.");'));
    const unpublish = source.slice(source.indexOf("const handleUnpublish = async"), source.indexOf("if (!isOpen) return null;"));
    assert.ok(unpublish.indexOf("setActionSuccess(null);") < unpublish.indexOf("await unpublishPortfolio("));
    assert.ok(unpublish.includes('setActionSuccess("Portfolio has been unpublished. It is now private.");'));
  });
});
