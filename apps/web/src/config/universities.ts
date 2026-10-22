export interface UniversityBrand {
  slug: string;
  name: string;
  code: string;
  campus: string;
  logoSrc: string;
  badgeBg: string;
  badgeColor: string;
  mode: "api_verification" | "file_and_review";
  allowedDomains: string[];
}

export const UNIVERSITY_BRANDS: UniversityBrand[] = [
  {
    slug: "unima",
    name: "University of Malawi",
    code: "UNIMA",
    campus: "Chancellor College",
    logoSrc: "/assets/logos/unima.png",
    badgeBg: "#dbeafe",
    badgeColor: "#1d4ed8",
    mode: "api_verification",
    allowedDomains: ["unima.ac.mw", "student.unima.ac.mw"],
  },
  {
    slug: "luanar",
    name: "Lilongwe University of Agriculture and Natural Resources",
    code: "LUANAR",
    campus: "City Campus & Bunda",
    logoSrc: "/assets/logos/luanar.jpg",
    badgeBg: "#dcfce7",
    badgeColor: "#15803d",
    mode: "api_verification",
    allowedDomains: ["luanar.ac.mw", "student.luanar.ac.mw"],
  },
  {
    slug: "mubas",
    name: "Malawi University of Business and Applied Sciences",
    code: "MUBAS",
    campus: "Blantyre Main Campus",
    logoSrc: "/assets/logos/mubas.jpg",
    badgeBg: "#f3e8ff",
    badgeColor: "#7e22ce",
    mode: "file_and_review",
    allowedDomains: ["mubas.ac.mw", "student.mubas.ac.mw", "poly.ac.mw"],
  },
  {
    slug: "kuhes",
    name: "Kamuzu University of Health Sciences",
    code: "KUHeS",
    campus: "Mahatma Gandhi Campus",
    logoSrc: "/assets/logos/kuhes.png",
    badgeBg: "#ffe4e6",
    badgeColor: "#be123c",
    mode: "api_verification",
    allowedDomains: ["kuhes.ac.mw", "student.kuhes.ac.mw"],
  },
  {
    slug: "must",
    name: "Malawi University of Science and Technology",
    code: "MUST",
    campus: "Thyolo Campus",
    logoSrc: "/assets/logos/must.png",
    badgeBg: "#e0f2fe",
    badgeColor: "#0284c7",
    mode: "api_verification",
    allowedDomains: ["must.ac.mw", "student.must.ac.mw"],
  },
  {
    slug: "mzuni",
    name: "Mzuzu University",
    code: "MZUNI",
    campus: "Luwinga Campus",
    logoSrc: "/assets/logos/mzuni.jpg",
    badgeBg: "#fef3c7",
    badgeColor: "#b45309",
    mode: "api_verification",
    allowedDomains: ["mzuni.ac.mw", "student.mzuni.ac.mw"],
  },
  {
    slug: "unilia",
    name: "University of Livingstonia",
    code: "UNILIA",
    campus: "Laws Campus",
    logoSrc: "/assets/logos/unilia.jpg",
    badgeBg: "#fef2f2",
    badgeColor: "#991b1b",
    mode: "file_and_review",
    allowedDomains: ["unilia.ac.mw", "student.unilia.ac.mw"],
  },
];

export const getUniversityBrand = (identifier?: string | null): UniversityBrand => {
  if (!identifier) return UNIVERSITY_BRANDS[0];
  const normalized = identifier.trim().toLowerCase();
  const match = UNIVERSITY_BRANDS.find(
    (brand) =>
      brand.slug.toLowerCase() === normalized ||
      brand.code.toLowerCase() === normalized ||
      brand.name.toLowerCase() === normalized ||
      normalized.includes(brand.slug.toLowerCase()) ||
      brand.name.toLowerCase().includes(normalized)
  );
  return match || UNIVERSITY_BRANDS[0];
};

export const universityBrandForName = (name: string): UniversityBrand | undefined => {
  return getUniversityBrand(name);
};

