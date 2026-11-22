import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_TEMPLATES } from "./validation";

/**
 * Phase 13: the publish allowlist must accept exactly the nine templates in the
 * frontend registry (frontend/src/templates/registry.ts) and reject anything else.
 * Pure unit test — no database required.
 */
const EXPECTED_TEMPLATES = [
  "modern",
  "minimal",
  "professional",
  "editorial",
  "bento",
  "studio",
  "executive",
  "showcase",
  "academic",
];

test("Phase 13: SUPPORTED_TEMPLATES allowlist", async (t) => {
  await t.test("contains exactly the nine registered templates", () => {
    assert.deepEqual([...SUPPORTED_TEMPLATES].sort(), [...EXPECTED_TEMPLATES].sort());
  });

  await t.test("keeps the original three templates", () => {
    for (const id of ["modern", "minimal", "professional"]) {
      assert.ok(SUPPORTED_TEMPLATES.has(id), `${id} must remain supported`);
    }
  });

  await t.test("rejects unknown or malformed template ids", () => {
    for (const id of ["cyberpunk_neon", "creative", "", "Modern", " modern", "developer", "academic-cv"]) {
      assert.equal(SUPPORTED_TEMPLATES.has(id), false, `${JSON.stringify(id)} must be rejected`);
    }
  });
});
