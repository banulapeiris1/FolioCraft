import test from "node:test";
import assert from "node:assert/strict";
import {
  createExperienceSchema,
  updateExperienceSchema,
  isValidCalendarDate,
} from "./validation";

test("EXP-03: Experience Types & Validation Suite", async (t) => {
  await t.test("1. createExperienceSchema accepts valid full payload", () => {
    const payload = {
      company: "Acme Corporation",
      position: "Lead Software Architect",
      description: "Spearheading distributed systems design and engineering.",
      startDate: "2022-03-01",
      endDate: "2024-01-15",
      isCurrent: false,
    };

    const result = createExperienceSchema.safeParse(payload);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.company, "Acme Corporation");
      assert.equal(result.data.position, "Lead Software Architect");
      assert.equal(
        result.data.description,
        "Spearheading distributed systems design and engineering."
      );
      assert.equal(result.data.startDate, "2022-03-01");
      assert.equal(result.data.endDate, "2024-01-15");
      assert.equal(result.data.isCurrent, false);
    }
  });

  await t.test(
    "2. createExperienceSchema accepts minimal payload with omitted or null endDate and description",
    () => {
      const payload = {
        company: "Open Source Contributor",
        position: "Core Maintainer",
        startDate: "2023-05-01",
      };

      const result = createExperienceSchema.safeParse(payload);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.company, "Open Source Contributor");
        assert.equal(result.data.position, "Core Maintainer");
        assert.equal(result.data.startDate, "2023-05-01");
        assert.equal(result.data.endDate, undefined);
        assert.equal(result.data.description, undefined);
        assert.equal(result.data.isCurrent, false);
      }

      // Explicit null endDate & description
      const payloadWithNulls = {
        company: "Startup Co",
        position: "Founding Engineer",
        startDate: "2024-01-01",
        endDate: null,
        description: null,
        isCurrent: true,
      };

      const resultWithNulls = createExperienceSchema.safeParse(payloadWithNulls);
      assert.equal(resultWithNulls.success, true);
      if (resultWithNulls.success) {
        assert.equal(resultWithNulls.data.endDate, null);
        assert.equal(resultWithNulls.data.description, null);
        assert.equal(resultWithNulls.data.isCurrent, true);
      }
    }
  );

  await t.test("3. createExperienceSchema trims whitespace from string fields", () => {
    const payload = {
      company: "   Tech Innovations   ",
      position: "   Senior Developer   ",
      description: "   Wrote high throughput APIs.   ",
      startDate: "2022-01-01",
      endDate: "   2023-01-01   ",
    };

    const result = createExperienceSchema.safeParse(payload);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.company, "Tech Innovations");
      assert.equal(result.data.position, "Senior Developer");
      assert.equal(result.data.description, "Wrote high throughput APIs.");
      assert.equal(result.data.endDate, "2023-01-01");
    }
  });

  await t.test("4. Company validation: missing, empty, whitespace-only, and > 255 chars", () => {
    // Missing
    const missingRes = createExperienceSchema.safeParse({
      position: "Developer",
      startDate: "2023-01-01",
    });
    assert.equal(missingRes.success, false);
    if (!missingRes.success) {
      assert.ok(
        missingRes.error.issues.some((i) => i.message.includes("Company is required"))
      );
    }

    // Empty string
    const emptyRes = createExperienceSchema.safeParse({
      company: "",
      position: "Developer",
      startDate: "2023-01-01",
    });
    assert.equal(emptyRes.success, false);
    if (!emptyRes.success) {
      assert.ok(
        emptyRes.error.issues.some((i) => i.message.includes("Company is required"))
      );
    }

    // Whitespace only
    const wsRes = createExperienceSchema.safeParse({
      company: "     ",
      position: "Developer",
      startDate: "2023-01-01",
    });
    assert.equal(wsRes.success, false);
    if (!wsRes.success) {
      assert.ok(
        wsRes.error.issues.some((i) => i.message.includes("Company is required"))
      );
    }

    // > 255 chars
    const longCompany = "A".repeat(256);
    const longRes = createExperienceSchema.safeParse({
      company: longCompany,
      position: "Developer",
      startDate: "2023-01-01",
    });
    assert.equal(longRes.success, false);
    if (!longRes.success) {
      assert.ok(
        longRes.error.issues.some((i) =>
          i.message.includes("Company cannot exceed 255 characters")
        )
      );
    }
  });

  await t.test("5. Position validation: missing, empty, whitespace-only, and > 255 chars", () => {
    // Missing
    const missingRes = createExperienceSchema.safeParse({
      company: "Google",
      startDate: "2023-01-01",
    });
    assert.equal(missingRes.success, false);
    if (!missingRes.success) {
      assert.ok(
        missingRes.error.issues.some((i) => i.message.includes("Position is required"))
      );
    }

    // Empty string
    const emptyRes = createExperienceSchema.safeParse({
      company: "Google",
      position: "",
      startDate: "2023-01-01",
    });
    assert.equal(emptyRes.success, false);
    if (!emptyRes.success) {
      assert.ok(
        emptyRes.error.issues.some((i) => i.message.includes("Position is required"))
      );
    }

    // Whitespace only
    const wsRes = createExperienceSchema.safeParse({
      company: "Google",
      position: "   \t  ",
      startDate: "2023-01-01",
    });
    assert.equal(wsRes.success, false);
    if (!wsRes.success) {
      assert.ok(
        wsRes.error.issues.some((i) => i.message.includes("Position is required"))
      );
    }

    // > 255 chars
    const longPosition = "P".repeat(256);
    const longRes = createExperienceSchema.safeParse({
      company: "Google",
      position: longPosition,
      startDate: "2023-01-01",
    });
    assert.equal(longRes.success, false);
    if (!longRes.success) {
      assert.ok(
        longRes.error.issues.some((i) =>
          i.message.includes("Position cannot exceed 255 characters")
        )
      );
    }
  });

  await t.test("6. Description validation: valid, optional, null, and > 2000 chars", () => {
    // Exactly 2000 chars is valid
    const maxDesc = "D".repeat(2000);
    const validRes = createExperienceSchema.safeParse({
      company: "Acme",
      position: "Dev",
      description: maxDesc,
      startDate: "2023-01-01",
    });
    assert.equal(validRes.success, true);

    // 2001 chars is rejected
    const overDesc = "D".repeat(2001);
    const overRes = createExperienceSchema.safeParse({
      company: "Acme",
      position: "Dev",
      description: overDesc,
      startDate: "2023-01-01",
    });
    assert.equal(overRes.success, false);
    if (!overRes.success) {
      assert.ok(
        overRes.error.issues.some((i) =>
          i.message.includes("Description cannot exceed 2000 characters")
        )
      );
    }
  });

  await t.test(
    "7. Start date validation: valid, missing, malformed format, and invalid calendar date",
    () => {
      const base = { company: "Acme", position: "Dev" };

      // Missing
      const missing = createExperienceSchema.safeParse({ ...base });
      assert.equal(missing.success, false);

      // Malformed formats
      const badFormats = ["2023/02/20", "20-02-2023", "2023-2-2", "invalid-date", "20230101"];
      for (const fmt of badFormats) {
        const res = createExperienceSchema.safeParse({ ...base, startDate: fmt });
        assert.equal(res.success, false, `Expected ${fmt} to be rejected by format regex`);
      }

      // Invalid calendar dates (impossible month or day)
      const impossibleDates = ["2023-02-30", "2024-13-01", "2024-00-10", "2023-02-29"];
      for (const date of impossibleDates) {
        const res = createExperienceSchema.safeParse({ ...base, startDate: date });
        assert.equal(res.success, false, `Expected ${date} to be rejected by isValidCalendarDate`);
      }

      // Valid leap year date
      const leapYearRes = createExperienceSchema.safeParse({
        ...base,
        startDate: "2024-02-29",
      });
      assert.equal(leapYearRes.success, true, "2024-02-29 is a valid leap year date");
    }
  );

  await t.test(
    "8. End date validation: valid, omitted, null, malformed format, and invalid calendar date",
    () => {
      const base = { company: "Acme", position: "Dev", startDate: "2020-01-01" };

      // Valid
      const validRes = createExperienceSchema.safeParse({
        ...base,
        endDate: "2022-06-30",
      });
      assert.equal(validRes.success, true);

      // Empty string is accepted as omitted/null equivalent
      const emptyStrRes = createExperienceSchema.safeParse({
        ...base,
        endDate: "",
      });
      assert.equal(emptyStrRes.success, true);

      // Malformed
      const badFormats = ["2022/06/30", "30-06-2022", "2022-6-30"];
      for (const fmt of badFormats) {
        const res = createExperienceSchema.safeParse({ ...base, endDate: fmt });
        assert.equal(res.success, false, `Expected endDate ${fmt} to fail`);
      }

      // Invalid calendar date
      const badCalendar = ["2023-04-31", "2023-02-30", "2023-11-31"];
      for (const date of badCalendar) {
        const res = createExperienceSchema.safeParse({ ...base, endDate: date });
        assert.equal(res.success, false, `Expected endDate ${date} to fail`);
      }
    }
  );

  await t.test("9. Date range validation: enforces endDate >= startDate", () => {
    const base = { company: "Acme", position: "Dev" };

    // Valid: endDate > startDate
    const resGreater = createExperienceSchema.safeParse({
      ...base,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    assert.equal(resGreater.success, true);

    // Valid: endDate === startDate
    const resSame = createExperienceSchema.safeParse({
      ...base,
      startDate: "2024-01-01",
      endDate: "2024-01-01",
    });
    assert.equal(resSame.success, true);

    // Invalid: endDate < startDate
    const resLesser = createExperienceSchema.safeParse({
      ...base,
      startDate: "2024-12-31",
      endDate: "2024-01-01",
    });
    assert.equal(resLesser.success, false);
    if (!resLesser.success) {
      assert.ok(
        resLesser.error.issues.some(
          (i) =>
            i.message === "End date must be on or after start date" &&
            i.path.includes("endDate")
        )
      );
    }
  });

  await t.test("10. isCurrent validation: true, false, omitted default, and non-boolean", () => {
    const base = { company: "Acme", position: "Dev", startDate: "2024-01-01" };

    // isCurrent: true
    const trueRes = createExperienceSchema.safeParse({ ...base, isCurrent: true });
    assert.equal(trueRes.success, true);
    if (trueRes.success) {
      assert.equal(trueRes.data.isCurrent, true);
    }

    // isCurrent: false
    const falseRes = createExperienceSchema.safeParse({ ...base, isCurrent: false });
    assert.equal(falseRes.success, true);
    if (falseRes.success) {
      assert.equal(falseRes.data.isCurrent, false);
    }

    // isCurrent: omitted (defaults to false)
    const omittedRes = createExperienceSchema.safeParse({ ...base });
    assert.equal(omittedRes.success, true);
    if (omittedRes.success) {
      assert.equal(omittedRes.data.isCurrent, false);
    }

    // Invalid non-boolean value
    const invalidRes = createExperienceSchema.safeParse({
      ...base,
      isCurrent: "yes" as unknown as boolean,
    });
    assert.equal(invalidRes.success, false);
  });

  await t.test("11. isValidCalendarDate helper direct unit testing", () => {
    assert.equal(isValidCalendarDate("2024-02-29"), true, "Leap year Feb 29");
    assert.equal(isValidCalendarDate("2023-02-29"), false, "Non leap year Feb 29");
    assert.equal(isValidCalendarDate("2023-02-30"), false, "Impossible Feb 30");
    assert.equal(isValidCalendarDate("2023-04-31"), false, "April has only 30 days");
    assert.equal(isValidCalendarDate("2023-12-31"), true, "Dec 31 is valid");
    assert.equal(isValidCalendarDate("2024-01-01"), true, "Jan 01 is valid");
    assert.equal(isValidCalendarDate("2024-13-01"), false, "Month 13 is invalid");
    assert.equal(isValidCalendarDate("2024-00-01"), false, "Month 00 is invalid");
    assert.equal(isValidCalendarDate("2024-01-00"), false, "Day 00 is invalid");
    assert.equal(isValidCalendarDate("2024-01-32"), false, "Day 32 is invalid");
    assert.equal(isValidCalendarDate("not-a-date"), false);
  });

  await t.test("12. updateExperienceSchema accepts valid partial payloads", () => {
    // Only company
    const compRes = updateExperienceSchema.safeParse({ company: "New Co" });
    assert.equal(compRes.success, true);

    // Only position
    const posRes = updateExperienceSchema.safeParse({ position: "Staff Engineer" });
    assert.equal(posRes.success, true);

    // Only description
    const descRes = updateExperienceSchema.safeParse({
      description: "Updated responsibilities",
    });
    assert.equal(descRes.success, true);

    // Null description
    const nullDescRes = updateExperienceSchema.safeParse({ description: null });
    assert.equal(nullDescRes.success, true);

    // Only isCurrent
    const currRes = updateExperienceSchema.safeParse({ isCurrent: true });
    assert.equal(currRes.success, true);

    // Only startDate
    const startRes = updateExperienceSchema.safeParse({ startDate: "2023-01-01" });
    assert.equal(startRes.success, true);

    // Only endDate
    const endRes = updateExperienceSchema.safeParse({ endDate: "2025-01-01" });
    assert.equal(endRes.success, true);

    // Null endDate
    const nullEndRes = updateExperienceSchema.safeParse({ endDate: null });
    assert.equal(nullEndRes.success, true);
  });

  await t.test("13. updateExperienceSchema rejects empty body with no fields", () => {
    const emptyRes = updateExperienceSchema.safeParse({});
    assert.equal(emptyRes.success, false);
    if (!emptyRes.success) {
      assert.ok(
        emptyRes.error.issues.some((i) =>
          i.message.includes("No fields provided for update")
        )
      );
    }
  });

  await t.test(
    "14. updateExperienceSchema validates date range when both dates are provided in update payload",
    () => {
      // Valid range in update
      const validRange = updateExperienceSchema.safeParse({
        startDate: "2023-01-01",
        endDate: "2023-12-31",
      });
      assert.equal(validRange.success, true);

      // Same day in update
      const sameDay = updateExperienceSchema.safeParse({
        startDate: "2023-06-01",
        endDate: "2023-06-01",
      });
      assert.equal(sameDay.success, true);

      // Invalid range in update
      const invalidRange = updateExperienceSchema.safeParse({
        startDate: "2023-12-31",
        endDate: "2023-01-01",
      });
      assert.equal(invalidRange.success, false);
      if (!invalidRange.success) {
        assert.ok(
          invalidRange.error.issues.some((i) =>
            i.message.includes("End date must be on or after start date")
          )
        );
      }
    }
  );

  await t.test("15. updateExperienceSchema rejects invalid partial values", () => {
    // Empty company
    const emptyComp = updateExperienceSchema.safeParse({ company: "" });
    assert.equal(emptyComp.success, false);

    // Empty position
    const emptyPos = updateExperienceSchema.safeParse({ position: "" });
    assert.equal(emptyPos.success, false);

    // Malformed startDate
    const badStart = updateExperienceSchema.safeParse({ startDate: "bad-date" });
    assert.equal(badStart.success, false);

    // Impossible calendar endDate
    const badEnd = updateExperienceSchema.safeParse({ endDate: "2023-02-30" });
    assert.equal(badEnd.success, false);

    // Non-boolean isCurrent
    const badCurr = updateExperienceSchema.safeParse({
      isCurrent: 123 as unknown as boolean,
    });
    assert.equal(badCurr.success, false);
  });
});
