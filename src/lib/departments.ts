/**
 * Department catalogue: the bridge between student ID codes, the scraped
 * teacher data (data/cu_teachers.json) and the site's URLs.
 *
 * `unit` must match a department_name in cu_teachers.json exactly — the seed
 * script fails loudly if it does not, so a rename upstream cannot silently
 * produce an empty department page.
 */

export type FacultyKey =
  | "arts"
  | "science"
  | "business"
  | "social"
  | "law"
  | "biological"
  | "engineering"
  | "education"
  | "marine";

export type Faculty = {
  key: FacultyKey;
  /** Faculty digit used in student IDs. */
  code: string;
  name: string;
  shortName: string;
};

export type Department = {
  slug: string;
  /** Three digit code as it appears in a student ID, or null for units with no intake. */
  code: string | null;
  name: string;
  /** department_name in cu_teachers.json */
  unit: string;
  faculty: FacultyKey;
  kind: "department" | "institute" | "centre";
};

export const FACULTIES: Faculty[] = [
  { key: "arts", code: "1", name: "Faculty of Arts and Humanities", shortName: "Arts & Humanities" },
  { key: "science", code: "2", name: "Faculty of Science", shortName: "Science" },
  { key: "business", code: "3", name: "Faculty of Business Administration", shortName: "Business" },
  { key: "social", code: "4", name: "Faculty of Social Sciences", shortName: "Social Sciences" },
  { key: "law", code: "5", name: "Faculty of Law", shortName: "Law" },
  { key: "biological", code: "6", name: "Faculty of Biological Sciences", shortName: "Biological Sciences" },
  { key: "engineering", code: "7", name: "Faculty of Engineering", shortName: "Engineering" },
  { key: "education", code: "8", name: "Faculty of Education", shortName: "Education" },
  { key: "marine", code: "9", name: "Faculty of Marine Sciences and Fisheries", shortName: "Marine Sciences" },
];

export const DEPARTMENTS: Department[] = [
  // Arts and Humanities
  { slug: "bangla", code: "101", name: "Bangla", unit: "Bangla", faculty: "arts", kind: "department" },
  { slug: "english", code: "102", name: "English", unit: "English", faculty: "arts", kind: "department" },
  { slug: "history", code: "103", name: "History", unit: "History", faculty: "arts", kind: "department" },
  { slug: "philosophy", code: "104", name: "Philosophy", unit: "Philosophy", faculty: "arts", kind: "department" },
  { slug: "islamic-history", code: "105", name: "Islamic History and Culture", unit: "Islamic History and Culture", faculty: "arts", kind: "department" },
  { slug: "fine-arts", code: "106", name: "Fine Arts", unit: "Fine Arts", faculty: "arts", kind: "institute" },
  { slug: "arabic", code: "107", name: "Arabic", unit: "Arabic", faculty: "arts", kind: "department" },
  { slug: "pali", code: "108", name: "Pali", unit: "Pali", faculty: "arts", kind: "department" },
  { slug: "islamic-studies", code: "110", name: "Islamic Studies", unit: "Islamic Studies", faculty: "arts", kind: "department" },
  { slug: "dramatics", code: "111", name: "Dramatics", unit: "Dramatics", faculty: "arts", kind: "department" },
  { slug: "persian", code: "112", name: "Persian Language & Literature", unit: "Persian Language & Literature", faculty: "arts", kind: "department" },
  { slug: "modern-languages", code: "114", name: "Modern Languages", unit: "Modern Languages", faculty: "arts", kind: "institute" },
  { slug: "sanskrit", code: "115", name: "Sanskrit", unit: "Sanskrit", faculty: "arts", kind: "department" },
  { slug: "music", code: "116", name: "Music", unit: "Music", faculty: "arts", kind: "department" },
  { slug: "bangladesh-studies", code: "117", name: "Bangladesh Studies", unit: "Bangladesh Studies", faculty: "arts", kind: "department" },
  { slug: "english-teachers-arts", code: null, name: "English Teachers (Arts & Humanities)", unit: "English Teachers of Arts and Humanities Faculty", faculty: "arts", kind: "centre" },

  // Science
  { slug: "physics", code: "201", name: "Physics", unit: "Physics", faculty: "science", kind: "department" },
  { slug: "chemistry", code: "202", name: "Chemistry", unit: "Chemistry", faculty: "science", kind: "department" },
  { slug: "mathematics", code: "203", name: "Mathematics", unit: "Mathematics", faculty: "science", kind: "department" },
  { slug: "statistics", code: "204", name: "Statistics", unit: "Statistics", faculty: "science", kind: "department" },
  { slug: "ifes", code: "208", name: "Forestry and Environmental Sciences", unit: "Forestry and Environmental Sciences", faculty: "science", kind: "institute" },
  { slug: "acce", code: "209", name: "Applied Chemistry and Chemical Engineering", unit: "Applied Chemistry and Chemical Engineering", faculty: "science", kind: "department" },
  { slug: "jnicar", code: "210", name: "Jamal Nazrul Islam Centre for Advanced Research", unit: "Jamal Nazrul Islam Center for Advanced Research (JNICAR)", faculty: "science", kind: "centre" },
  { slug: "english-teachers-science", code: null, name: "English Teachers (Science)", unit: "English Teachers of Science Faculty", faculty: "science", kind: "centre" },

  // Business Administration
  { slug: "accounting", code: "301", name: "Accounting", unit: "Accounting", faculty: "business", kind: "department" },
  { slug: "management", code: "302", name: "Management", unit: "Management", faculty: "business", kind: "department" },
  { slug: "finance", code: "303", name: "Finance", unit: "Finance", faculty: "business", kind: "department" },
  { slug: "marketing", code: "304", name: "Marketing", unit: "Marketing", faculty: "business", kind: "department" },
  { slug: "hrm", code: "305", name: "Human Resource Management", unit: "Human Resource Management", faculty: "business", kind: "department" },
  { slug: "banking-insurance", code: "306", name: "Banking and Insurance", unit: "Banking and Insurance", faculty: "business", kind: "department" },

  // Social Sciences
  { slug: "economics", code: "401", name: "Economics", unit: "Economics", faculty: "social", kind: "department" },
  { slug: "political-science", code: "402", name: "Political Science", unit: "Political Science", faculty: "social", kind: "department" },
  { slug: "sociology", code: "403", name: "Sociology", unit: "Sociology", faculty: "social", kind: "department" },
  { slug: "public-administration", code: "404", name: "Public Administration", unit: "Public Administration", faculty: "social", kind: "department" },
  { slug: "anthropology", code: "405", name: "Anthropology", unit: "Anthropology", faculty: "social", kind: "department" },
  { slug: "international-relations", code: "406", name: "International Relations", unit: "International Relations", faculty: "social", kind: "department" },
  { slug: "communication-journalism", code: "407", name: "Communication and Journalism", unit: "Communication and Journalism", faculty: "social", kind: "department" },
  { slug: "development-studies", code: "408", name: "Development Studies", unit: "Development Studies", faculty: "social", kind: "department" },
  { slug: "criminology", code: "409", name: "Criminology and Police Science", unit: "Criminology and Police Science", faculty: "social", kind: "department" },
  { slug: "english-teachers-social", code: null, name: "English Teachers (Social Sciences)", unit: "English Teachers of Social Sciences Faculty", faculty: "social", kind: "centre" },

  // Law
  { slug: "law", code: "501", name: "Law", unit: "Law", faculty: "law", kind: "department" },

  // Biological Sciences
  { slug: "zoology", code: "601", name: "Zoology", unit: "Zoology", faculty: "biological", kind: "department" },
  { slug: "botany", code: "602", name: "Botany", unit: "Botany", faculty: "biological", kind: "department" },
  { slug: "geography", code: "603", name: "Geography and Environmental Studies", unit: "Geography and Environmental Studies", faculty: "biological", kind: "department" },
  { slug: "biochemistry", code: "604", name: "Biochemistry and Molecular Biology", unit: "Biochemistry and Molecular Biology", faculty: "biological", kind: "department" },
  { slug: "microbiology", code: "605", name: "Microbiology", unit: "Microbiology", faculty: "biological", kind: "department" },
  { slug: "soil-science", code: "606", name: "Soil Science", unit: "Soil Science", faculty: "biological", kind: "department" },
  { slug: "geb", code: "607", name: "Genetic Engineering and Biotechnology", unit: "Genetic Engineering and Biotechnology", faculty: "biological", kind: "department" },
  { slug: "psychology", code: "608", name: "Psychology", unit: "Psychology", faculty: "biological", kind: "department" },
  { slug: "pharmacy", code: "609", name: "Pharmacy", unit: "Pharmacy", faculty: "biological", kind: "department" },
  { slug: "english-teachers-biological", code: null, name: "English Teachers (Biological Sciences)", unit: "English Teachers of Biological Sciences Faculty", faculty: "biological", kind: "centre" },

  // Engineering
  { slug: "cse", code: "701", name: "Computer Science & Engineering", unit: "Computer Science & Engineering", faculty: "engineering", kind: "department" },
  { slug: "eee", code: "702", name: "Electrical and Electronic Engineering", unit: "Electrical and Electronic Engineering", faculty: "engineering", kind: "department" },

  // Education
  { slug: "pess", code: "801", name: "Physical Education and Sports Science", unit: "Physical Education and Sports Science", faculty: "education", kind: "department" },
  // IER sits under the Faculty of Education, but its student IDs use the Arts
  // faculty code 113. The ID code is what matters for verification.
  { slug: "ier", code: "113", name: "Education and Research", unit: "Education And Research", faculty: "education", kind: "institute" },

  // Marine Sciences and Fisheries
  { slug: "marine-sciences", code: "901", name: "Marine Sciences", unit: "Marine Sciences", faculty: "marine", kind: "institute" },
  { slug: "oceanography", code: "902", name: "Oceanography", unit: "Oceanography", faculty: "marine", kind: "department" },
  { slug: "fisheries", code: "903", name: "Fisheries", unit: "Fisheries", faculty: "marine", kind: "department" },
];

export const FACULTY_BY_KEY: Record<FacultyKey, Faculty> = Object.fromEntries(
  FACULTIES.map((f) => [f.key, f]),
) as Record<FacultyKey, Faculty>;

export const DEPARTMENT_BY_SLUG: Record<string, Department> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.slug, d]),
);

export function departmentsOfFaculty(key: FacultyKey): Department[] {
  return DEPARTMENTS.filter((d) => d.faculty === key);
}

/**
 * The shared "English Teachers of <faculty>" unit a student may also rate,
 * since those teachers take classes across the whole faculty.
 */
export function sharedUnitsFor(deptSlug: string): Department[] {
  const dept = DEPARTMENT_BY_SLUG[deptSlug];
  if (!dept) return [];
  return DEPARTMENTS.filter(
    (d) => d.faculty === dept.faculty && d.kind === "centre" && d.slug.startsWith("english-teachers"),
  );
}

/** Departments a student of `deptSlug` is allowed to rate. */
export function rateableDepartments(deptSlug: string): Department[] {
  const dept = DEPARTMENT_BY_SLUG[deptSlug];
  if (!dept) return [];
  return [dept, ...sharedUnitsFor(deptSlug).filter((d) => d.slug !== dept.slug)];
}
