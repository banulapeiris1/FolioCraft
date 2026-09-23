import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";

test("SKILL-05: Global Skill Catalog API Routes Suite (GET /api/skills/catalog)", async (t) => {
  let server: Server;
  let baseUrl = "";

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  t.after(async () => {
    server.close();
  });

  await t.test("1. GET /api/skills/catalog returns 200 with catalog skills array", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.length >= 30, `Expected at least 30 catalog items, got ${body.skills.length}`);

    const first = body.skills[0];
    assert.ok(first.id, "Item must have id");
    assert.ok(first.name, "Item must have name");
    assert.ok(first.category, "Item must have category");
    assert.ok(first.createdAt, "Item must have createdAt");
  });

  await t.test("2. GET /api/skills/catalog returns predictable ordering (category ASC, name ASC)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog`);
    assert.equal(res.status, 200);

    const body = await res.json();
    const skills = body.skills as Array<{ category: string; name: string }>;

    for (let i = 0; i < skills.length - 1; i++) {
      const current = skills[i]!;
      const next = skills[i + 1]!;

      if (current.category === next.category) {
        assert.ok(
          current.name.localeCompare(next.name) <= 0,
          `Expected ${current.name} <= ${next.name} within category ${current.category}`
        );
      } else {
        assert.ok(
          current.category.localeCompare(next.category) <= 0,
          `Expected category ${current.category} <= ${next.category}`
        );
      }
    }
  });

  await t.test("3. Search query filters by skill name (?search=react)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog?search=react`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.length >= 1);
    assert.ok(body.skills.some((s: any) => s.name === "React"));
    for (const skill of body.skills) {
      assert.match(skill.name, /react/i);
    }
  });

  await t.test("4. Search query is case-insensitive (?search=REACT)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog?search=REACT`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.some((s: any) => s.name === "React"));
  });

  await t.test("5. Category query filters by category (?category=Frontend)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog?category=Frontend`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.length >= 5);
    for (const skill of body.skills) {
      assert.equal(skill.category, "Frontend");
    }
  });

  await t.test("6. Category query is case-insensitive (?category=frontend)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog?category=frontend`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.length >= 5);
    for (const skill of body.skills) {
      assert.equal(skill.category, "Frontend");
    }
  });

  await t.test("7. Search + Category query combined (?search=react&category=Frontend)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog?search=react&category=Frontend`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.some((s: any) => s.name === "React" && s.category === "Frontend"));
  });

  await t.test("8. Search + Category query combined mismatch returns empty list", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog?search=react&category=Backend`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.equal(body.skills.length, 0);
  });

  await t.test("9. Empty search query (?search=) returns catalog normally", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog?search=`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.length >= 30);
  });

  await t.test("10. Invalid search query (> 100 chars) returns 400 validation error", async () => {
    const longSearch = "a".repeat(101);
    const res = await fetch(`${baseUrl}/api/skills/catalog?search=${longSearch}`);
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.message, /cannot exceed 100 characters/i);
  });

  await t.test("11. Invalid category query (> 50 chars) returns 400 validation error", async () => {
    const longCat = "c".repeat(51);
    const res = await fetch(`${baseUrl}/api/skills/catalog?category=${longCat}`);
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.match(body.message, /cannot exceed 50 characters/i);
  });

  await t.test("12. Works with Authorization header without breaking", async () => {
    const res = await fetch(`${baseUrl}/api/skills/catalog`, {
      headers: {
        Authorization: "Bearer dummy_token_value",
      },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.length >= 30);
  });
});
