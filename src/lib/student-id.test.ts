import { describe, expect, it } from "vitest";
import { DEPARTMENTS, DEPARTMENT_BY_SLUG, rateableDepartments } from "./departments";
import { StudentIdError, parseStudentEmail, parseStudentId, sessionLabel } from "./student-id";

describe("parseStudentId", () => {
  it("reads the example ID from the brief", () => {
    const parsed = parseStudentId("24304043");
    expect(parsed).toMatchObject({
      sessionCode: 24,
      session: "2023-2024",
      facultyCode: "3",
      deptCode: "304",
      serial: "043",
      deptSlug: "marketing",
    });
  });

  it("maps session codes to their academic year", () => {
    expect(sessionLabel(24)).toBe("2023-2024");
    expect(sessionLabel(19)).toBe("2018-2019");
    expect(sessionLabel(26)).toBe("2025-2026");
  });

  // Verified against the CUCSU voter lists and the March 2025 hall result:
  // the two departments swapped codes from session 2022-2023 onwards.
  it("applies the Philosophy / Islamic History swap from session 2022-2023", () => {
    expect(parseStudentId("24104012").deptSlug).toBe("philosophy");
    expect(parseStudentId("23104090").deptSlug).toBe("philosophy");
    expect(parseStudentId("22104065").deptSlug).toBe("islamic-history");
    expect(parseStudentId("21104123").deptSlug).toBe("islamic-history");

    expect(parseStudentId("24105021").deptSlug).toBe("islamic-history");
    expect(parseStudentId("23105030").deptSlug).toBe("islamic-history");
    expect(parseStudentId("22105051").deptSlug).toBe("philosophy");
    expect(parseStudentId("19105045").deptSlug).toBe("philosophy");
  });

  it("uses 902 for Oceanography, not the 901 shown on the website", () => {
    expect(parseStudentId("24902001").deptSlug).toBe("oceanography");
    expect(parseStudentId("21901007").deptSlug).toBe("marine-sciences");
    expect(parseStudentId("22903015").deptSlug).toBe("fisheries");
  });

  it("asks legacy 207 students which marine unit they belong to", () => {
    const parsed = parseStudentId("18207036");
    expect(parsed.deptSlug).toBeNull();
    expect(parsed.ambiguousChoices).toEqual(["marine-sciences", "oceanography", "fisheries"]);
  });

  it("rejects 207 for sessions after the marine faculty was split out", () => {
    expect(() => parseStudentId("24207001")).toThrow(StudentIdError);
  });

  it("keeps IER on the Arts faculty code used by its student IDs", () => {
    expect(parseStudentId("22113114").deptSlug).toBe("ier");
    expect(DEPARTMENT_BY_SLUG.ier.faculty).toBe("education");
  });

  it("resolves every department that has an ID code", () => {
    for (const dept of DEPARTMENTS) {
      if (!dept.code) continue;
      // 207 is legacy-only and 104/105 are session dependent; both are covered above.
      if (["104", "105"].includes(dept.code)) continue;
      const parsed = parseStudentId(`24${dept.code}001`);
      expect(parsed.deptSlug, `code ${dept.code}`).toBe(dept.slug);
    }
  });

  it("rejects malformed IDs and unknown departments", () => {
    expect(() => parseStudentId("1234567")).toThrow(/8 digits/);
    expect(() => parseStudentId("24abc001")).toThrow(/8 digits/);
    expect(() => parseStudentId("24099001")).toThrow(/Faculty code/);
    expect(() => parseStudentId("24299001")).toThrow(/not recognised/);
    // 109, 205-206 and 307-308 have no current students.
    expect(() => parseStudentId("24109001")).toThrow(/not recognised/);
    expect(() => parseStudentId("24307001")).toThrow(/not recognised/);
  });
});

describe("parseStudentEmail", () => {
  it("accepts a student address and ignores case", () => {
    expect(parseStudentEmail("24304043@std.cu.ac.bd").deptSlug).toBe("marketing");
    expect(parseStudentEmail("24304043@STD.CU.AC.BD").studentId).toBe("24304043");
  });

  it("rejects other domains and staff style addresses", () => {
    expect(() => parseStudentEmail("24304043@cu.ac.bd")).toThrow(StudentIdError);
    expect(() => parseStudentEmail("someone@gmail.com")).toThrow(StudentIdError);
    expect(() => parseStudentEmail("teacher@std.cu.ac.bd")).toThrow(StudentIdError);
  });
});

describe("rateableDepartments", () => {
  it("includes the student's own department and the faculty English teachers", () => {
    const slugs = rateableDepartments("bangla").map((d) => d.slug);
    expect(slugs).toContain("bangla");
    expect(slugs).toContain("english-teachers-arts");
  });

  it("leaves out a shared unit that has no teachers", () => {
    // Business lists an English-teachers unit on cu.ac.bd, but nobody is in it.
    expect(rateableDepartments("marketing").map((d) => d.slug)).toEqual(["marketing"]);
  });

  it("returns just the department when the faculty has no shared unit", () => {
    expect(rateableDepartments("law").map((d) => d.slug)).toEqual(["law"]);
  });
});
