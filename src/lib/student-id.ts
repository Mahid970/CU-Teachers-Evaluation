/**
 * University of Chittagong student ID parsing.
 *
 * Format: SS F DD NNN (8 digits)
 *   SS  session code  = last two digits of the session's ending year (2023-2024 -> 24)
 *   F   faculty code  = 1..9
 *   DD  department code within the faculty
 *   NNN student serial
 *
 * Codes were verified against the CUCSU 2025 department voter lists and the
 * March 2025 hall seat allotment result, not just the cu.ac.bd website. Three
 * facts the website gets wrong or omits are encoded below:
 *   - Philosophy (104) and Islamic History & Culture (105) swapped codes from
 *     session 2022-2023 onwards; before that IHC was 104 and Philosophy 105.
 *   - Oceanography is 902. The website shows 901, which is Marine Sciences.
 *   - 207 is a legacy code covering Marine Sciences / Oceanography / Fisheries
 *     for students admitted up to session 2017-2018, before those units moved
 *     to their own faculty. It cannot be resolved from the ID alone.
 */

export const STUDENT_EMAIL_DOMAIN = "std.cu.ac.bd";
export const STUDENT_ID_RE = /^\d{8}$/;
export const STUDENT_EMAIL_RE = /^(\d{8})@std\.cu\.ac\.bd$/i;

/** Session code from which Philosophy/IHC use their current codes. */
const SWAP_FROM_SESSION = 23;
/** Last session code that used the combined marine-sciences code 207. */
const LEGACY_MARINE_UNTIL_SESSION = 18;

export type ParsedStudentId = {
  studentId: string;
  sessionCode: number;
  /** Human readable session, e.g. "2023-2024". */
  session: string;
  facultyCode: string;
  /** Full three digit department code as it appears in the ID, e.g. "304". */
  deptCode: string;
  serial: string;
  /** Slug of the resolved department, or null when a choice is required. */
  deptSlug: string | null;
  /**
   * Set when the ID alone cannot identify the department (legacy code 207).
   * The student picks one of these; the choice is stored in their browser only.
   */
  ambiguousChoices?: string[];
};

export class StudentIdError extends Error {
  code: "format" | "unknown_department";
  constructor(code: StudentIdError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "StudentIdError";
  }
}

/**
 * Department code -> slug, for the codes that are stable across all sessions.
 * Session-dependent codes (104/105, 207) are handled in resolveDepartment.
 */
const DEPT_BY_CODE: Record<string, string> = {
  // Faculty of Arts and Humanities
  "101": "bangla",
  "102": "english",
  "103": "history",
  "106": "fine-arts",
  "107": "arabic",
  "108": "pali",
  "110": "islamic-studies",
  "111": "dramatics",
  "112": "persian",
  "113": "ier",
  "114": "modern-languages",
  "115": "sanskrit",
  "116": "music",
  "117": "bangladesh-studies",
  // Faculty of Science
  "201": "physics",
  "202": "chemistry",
  "203": "mathematics",
  "204": "statistics",
  "208": "ifes",
  "209": "acce",
  "210": "jnicar",
  // Faculty of Business Administration
  "301": "accounting",
  "302": "management",
  "303": "finance",
  "304": "marketing",
  "305": "hrm",
  "306": "banking-insurance",
  // Faculty of Social Sciences
  "401": "economics",
  "402": "political-science",
  "403": "sociology",
  "404": "public-administration",
  "405": "anthropology",
  "406": "international-relations",
  "407": "communication-journalism",
  "408": "development-studies",
  "409": "criminology",
  // Faculty of Law
  "501": "law",
  // Faculty of Biological Sciences
  "601": "zoology",
  "602": "botany",
  "603": "geography",
  "604": "biochemistry",
  "605": "microbiology",
  "606": "soil-science",
  "607": "geb",
  "608": "psychology",
  "609": "pharmacy",
  // Faculty of Engineering
  "701": "cse",
  "702": "eee",
  // Faculty of Education
  "801": "pess",
  // Faculty of Marine Sciences and Fisheries
  "901": "marine-sciences",
  "902": "oceanography",
  "903": "fisheries",
};

/** Units that used code 207 before the marine faculty was split out. */
const LEGACY_MARINE_CHOICES = ["marine-sciences", "oceanography", "fisheries"];

function resolveDepartment(
  deptCode: string,
  sessionCode: number,
): { slug: string | null; choices?: string[] } {
  // Philosophy / Islamic History & Culture swapped codes from session 2022-2023.
  if (deptCode === "104") {
    return { slug: sessionCode >= SWAP_FROM_SESSION ? "philosophy" : "islamic-history" };
  }
  if (deptCode === "105") {
    return { slug: sessionCode >= SWAP_FROM_SESSION ? "islamic-history" : "philosophy" };
  }

  // Legacy combined marine code: only valid for older sessions, needs a choice.
  if (deptCode === "207") {
    if (sessionCode <= LEGACY_MARINE_UNTIL_SESSION) {
      return { slug: null, choices: LEGACY_MARINE_CHOICES };
    }
    throw new StudentIdError(
      "unknown_department",
      `Code 207 is not used for session code ${sessionCode}.`,
    );
  }

  const slug = DEPT_BY_CODE[deptCode];
  if (!slug) {
    throw new StudentIdError(
      "unknown_department",
      `Department code ${deptCode} is not recognised.`,
    );
  }
  return { slug };
}

/** Session code 24 -> "2023-2024". */
export function sessionLabel(sessionCode: number): string {
  const endYear = 2000 + sessionCode;
  return `${endYear - 1}-${endYear}`;
}

export function parseStudentId(rawId: string): ParsedStudentId {
  const studentId = rawId.trim();
  if (!STUDENT_ID_RE.test(studentId)) {
    throw new StudentIdError("format", "A student ID must be exactly 8 digits.");
  }

  const sessionCode = Number(studentId.slice(0, 2));
  const facultyCode = studentId.slice(2, 3);
  const deptCode = studentId.slice(2, 5);
  const serial = studentId.slice(5);

  if (facultyCode === "0") {
    throw new StudentIdError("unknown_department", "Faculty code cannot be 0.");
  }

  const { slug, choices } = resolveDepartment(deptCode, sessionCode);

  return {
    studentId,
    sessionCode,
    session: sessionLabel(sessionCode),
    facultyCode,
    deptCode,
    serial,
    deptSlug: slug,
    ...(choices ? { ambiguousChoices: choices } : {}),
  };
}

/** Parses "24304043@std.cu.ac.bd". Throws for any other domain. */
export function parseStudentEmail(email: string): ParsedStudentId {
  const match = STUDENT_EMAIL_RE.exec(email.trim());
  if (!match) {
    throw new StudentIdError(
      "format",
      `Use your university address, which looks like 24304043@${STUDENT_EMAIL_DOMAIN}.`,
    );
  }
  return parseStudentId(match[1]);
}
