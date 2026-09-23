import test from "node:test";
import assert from "node:assert/strict";
import {
  createEducationSchema,
  updateEducationSchema,
} from "./validation";
import type {
  CreateEducationDto,
  UpdateEducationDto,
} from "../types/education.types";

test("EDU-03: Education Types & Validation Suite", async (t) => {
  await t.test("1. createEducationSchema accepts valid full payload", () => {
    const payload: CreateEducationDto = {
      institution: "University of Colombo",
      degree: "B.Sc. (Hons)",
      field: "Computer Science",
      startDate: "2020-01-15",
      endDate: "2024-06-30",
      description: "Specialized in Distributed Systems and Cloud Computing.",
    };

    const result = createEducationSchema.safeParse(payload);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.institution, "University of Colombo");
      assert.equal(result.data.degree, "B.Sc. (Hons)");
      assert.equal(result.data.field, "Computer Science");
      assert.equal(result.data.startDate, "2020-01-15");
      assert.equal(result.data.endDate, "2024-06-30");
      assert.equal(result.data.description, "Specialized in Distributed Systems and Cloud Computing.");
    }
  });

  await t.test("2. createEducationSchema accepts minimal payload with omitted or null endDate and description", () => {
    const minimal: CreateEducationDto = {
      institution: "Harvard University",
      degree: "Master of Science",
      field: "Data Science",
      startDate: "2024-09-01",
    };

    const result = createEducationSchema.safeParse(minimal);
    assert.equal(result.success, true);

    const withNulls: CreateEducationDto = {
      institution: "Harvard University",
      degree: "Master of Science",
      field: "Data Science",
      startDate: "2024-09-01",
      endDate: null,
      description: null,
    };

    const resultNulls = createEducationSchema.safeParse(withNulls);
    assert.equal(resultNulls.success, true);

    const withEmptyStrings = {
      institution: "Harvard University",
      degree: "Master of Science",
      field: "Data Science",
      startDate: "2024-09-01",
      endDate: "",
      description: "",
    };

    const resultEmpty = createEducationSchema.safeParse(withEmptyStrings);
    assert.equal(resultEmpty.success, true);
  });

  await t.test("3. createEducationSchema trims leading and trailing whitespace from string fields", () => {
    const payload = {
      institution: "   MIT   ",
      degree: "   B.S.   ",
      field: "   Electrical Engineering   ",
      startDate: "   2021-09-01   ",
      endDate: "   2025-05-30   ",
      description: "   Coursework in Microelectronics   ",
    };

    const result = createEducationSchema.safeParse(payload);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.institution, "MIT");
      assert.equal(result.data.degree, "B.S.");
      assert.equal(result.data.field, "Electrical Engineering");
      assert.equal(result.data.startDate, "2021-09-01");
      assert.equal(result.data.endDate, "2025-05-30");
      assert.equal(result.data.description, "Coursework in Microelectronics");
    }
  });

  await t.test("4. createEducationSchema rejects missing or empty institution", () => {
    // Missing institution
    const missing = createEducationSchema.safeParse({
      degree: "B.Sc.",
      field: "Physics",
      startDate: "2020-01-01",
    });
    assert.equal(missing.success, false);
    assert.equal(missing.error?.issues[0]?.message, "Institution is required");

    // Empty institution
    const empty = createEducationSchema.safeParse({
      institution: "   ",
      degree: "B.Sc.",
      field: "Physics",
      startDate: "2020-01-01",
    });
    assert.equal(empty.success, false);
    assert.equal(empty.error?.issues[0]?.message, "Institution is required");
  });

  await t.test("5. createEducationSchema rejects institution exceeding 255 characters", () => {
    const tooLong = createEducationSchema.safeParse({
      institution: "A".repeat(256),
      degree: "B.Sc.",
      field: "Physics",
      startDate: "2020-01-01",
    });
    assert.equal(tooLong.success, false);
    assert.equal(tooLong.error?.issues[0]?.message, "Institution cannot exceed 255 characters");
  });

  await t.test("6. createEducationSchema rejects missing or empty degree", () => {
    const missing = createEducationSchema.safeParse({
      institution: "Oxford",
      field: "Mathematics",
      startDate: "2020-01-01",
    });
    assert.equal(missing.success, false);
    assert.equal(missing.error?.issues[0]?.message, "Degree is required");

    const empty = createEducationSchema.safeParse({
      institution: "Oxford",
      degree: "   ",
      field: "Mathematics",
      startDate: "2020-01-01",
    });
    assert.equal(empty.success, false);
    assert.equal(empty.error?.issues[0]?.message, "Degree is required");
  });

  await t.test("7. createEducationSchema rejects degree exceeding 255 characters", () => {
    const tooLong = createEducationSchema.safeParse({
      institution: "Oxford",
      degree: "D".repeat(256),
      field: "Mathematics",
      startDate: "2020-01-01",
    });
    assert.equal(tooLong.success, false);
    assert.equal(tooLong.error?.issues[0]?.message, "Degree cannot exceed 255 characters");
  });

  await t.test("8. createEducationSchema rejects missing or empty field of study", () => {
    const missing = createEducationSchema.safeParse({
      institution: "Oxford",
      degree: "Ph.D.",
      startDate: "2020-01-01",
    });
    assert.equal(missing.success, false);
    assert.equal(missing.error?.issues[0]?.message, "Field of study is required");

    const empty = createEducationSchema.safeParse({
      institution: "Oxford",
      degree: "Ph.D.",
      field: "   ",
      startDate: "2020-01-01",
    });
    assert.equal(empty.success, false);
    assert.equal(empty.error?.issues[0]?.message, "Field of study is required");
  });

  await t.test("9. createEducationSchema rejects field exceeding 255 characters", () => {
    const tooLong = createEducationSchema.safeParse({
      institution: "Oxford",
      degree: "Ph.D.",
      field: "F".repeat(256),
      startDate: "2020-01-01",
    });
    assert.equal(tooLong.success, false);
    assert.equal(tooLong.error?.issues[0]?.message, "Field of study cannot exceed 255 characters");
  });

  await t.test("10. createEducationSchema validates startDate format and calendar validity", () => {
    // Missing startDate
    const missing = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
    });
    assert.equal(missing.success, false);
    assert.equal(missing.error?.issues[0]?.message, "Start date is required");

    // Invalid format (e.g. DD-MM-YYYY)
    const badFormat = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "15-01-2020",
    });
    assert.equal(badFormat.success, false);
    assert.equal(badFormat.error?.issues[0]?.message, "Start date must be in YYYY-MM-DD format");

    // Invalid calendar date (e.g. month 13)
    const badMonth = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2020-13-45",
    });
    assert.equal(badMonth.success, false);
    assert.equal(badMonth.error?.issues[0]?.message, "Invalid calendar start date");

    // Invalid calendar date with overflow (e.g. Feb 31st which Date.parse rolls over)
    const feb31 = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2024-02-31",
    });
    assert.equal(feb31.success, false);
    assert.equal(feb31.error?.issues[0]?.message, "Invalid calendar start date");

    // Non-leap year Feb 29th
    const nonLeapFeb29 = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2023-02-29",
    });
    assert.equal(nonLeapFeb29.success, false);
    assert.equal(nonLeapFeb29.error?.issues[0]?.message, "Invalid calendar start date");

    // Leap year Feb 29th (valid)
    const leapFeb29 = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2024-02-29",
    });
    assert.equal(leapFeb29.success, true);

    // April 31st (April has 30 days)
    const april31 = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2024-04-31",
    });
    assert.equal(april31.success, false);
    assert.equal(april31.error?.issues[0]?.message, "Invalid calendar start date");
  });

  await t.test("11. createEducationSchema validates endDate format and calendar validity", () => {
    // Invalid format
    const badFormat = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2020-01-01",
      endDate: "invalid-date",
    });
    assert.equal(badFormat.success, false);
    assert.equal(badFormat.error?.issues[0]?.message, "End date must be in YYYY-MM-DD format");

    // Invalid calendar date
    const badDate = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2020-01-01",
      endDate: "2024-02-30",
    });
    assert.equal(badDate.success, false);
    assert.equal(badDate.error?.issues[0]?.message, "Invalid calendar end date");
  });


  await t.test("12. createEducationSchema enforces endDate >= startDate when endDate is provided", () => {
    // endDate before startDate
    const inverted = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.A.",
      field: "History",
      startDate: "2024-01-01",
      endDate: "2022-01-01",
    });
    assert.equal(inverted.success, false);
    assert.equal(inverted.error?.issues[0]?.message, "End date must be on or after start date");

    // endDate equal to startDate (allowed, e.g. 1-day certificate/diploma)
    const sameDate = createEducationSchema.safeParse({
      institution: "University",
      degree: "Certificate",
      field: "Design",
      startDate: "2023-05-15",
      endDate: "2023-05-15",
    });
    assert.equal(sameDate.success, true);

    // endDate after startDate (standard)
    const valid = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.Sc.",
      field: "Biology",
      startDate: "2019-09-01",
      endDate: "2023-06-30",
    });
    assert.equal(valid.success, true);
  });

  await t.test("13. createEducationSchema rejects description exceeding 2000 characters", () => {
    const tooLongDesc = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.Sc.",
      field: "Chemistry",
      startDate: "2020-01-01",
      description: "X".repeat(2001),
    });
    assert.equal(tooLongDesc.success, false);
    assert.equal(tooLongDesc.error?.issues[0]?.message, "Description cannot exceed 2000 characters");

    // Description of exactly 2000 chars is accepted
    const maxDesc = createEducationSchema.safeParse({
      institution: "University",
      degree: "B.Sc.",
      field: "Chemistry",
      startDate: "2020-01-01",
      description: "X".repeat(2000),
    });
    assert.equal(maxDesc.success, true);
  });

  await t.test("14. updateEducationSchema accepts valid partial payloads", () => {
    const partial1: UpdateEducationDto = {
      institution: "New University Name",
    };
    const res1 = updateEducationSchema.safeParse(partial1);
    assert.equal(res1.success, true);

    const partial2: UpdateEducationDto = {
      degree: "M.Eng.",
      field: "Robotics",
    };
    const res2 = updateEducationSchema.safeParse(partial2);
    assert.equal(res2.success, true);

    const partial3: UpdateEducationDto = {
      endDate: null, // Switching to ongoing
    };
    const res3 = updateEducationSchema.safeParse(partial3);
    assert.equal(res3.success, true);

    const partialDates: UpdateEducationDto = {
      startDate: "2021-01-01",
      endDate: "2025-01-01",
    };
    const resDates = updateEducationSchema.safeParse(partialDates);
    assert.equal(resDates.success, true);
  });

  await t.test("15. updateEducationSchema rejects invalid partial values", () => {
    // Blank institution
    const blankInst = updateEducationSchema.safeParse({ institution: "   " });
    assert.equal(blankInst.success, false);
    assert.equal(blankInst.error?.issues[0]?.message, "Institution cannot be empty");

    // Blank degree
    const blankDeg = updateEducationSchema.safeParse({ degree: "" });
    assert.equal(blankDeg.success, false);
    assert.equal(blankDeg.error?.issues[0]?.message, "Degree cannot be empty");

    // Blank field
    const blankField = updateEducationSchema.safeParse({ field: "  " });
    assert.equal(blankField.success, false);
    assert.equal(blankField.error?.issues[0]?.message, "Field of study cannot be empty");

    // Bad startDate format
    const badDate = updateEducationSchema.safeParse({ startDate: "2020/01/01" });
    assert.equal(badDate.success, false);
    assert.equal(badDate.error?.issues[0]?.message, "Start date must be in YYYY-MM-DD format");

    // Inverted dates when both supplied
    const inverted = updateEducationSchema.safeParse({
      startDate: "2025-01-01",
      endDate: "2020-01-01",
    });
    // Empty object {} must be rejected
    const emptyObj = updateEducationSchema.safeParse({});
    assert.equal(emptyObj.success, false);
    assert.equal(emptyObj.error?.issues[0]?.message, "No fields provided for update");
  });
});

