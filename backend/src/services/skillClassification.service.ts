import type {
  CategorizedSkills,
  Confidence,
  StructuredCvSkill,
} from "../types/cv.types";

export type SkillCategory =
  | "languages"
  | "frontend"
  | "backend"
  | "databases"
  | "tools"
  | "softSkills"
  | "other";

interface CatalogEntry {
  canonicalName: string;
  category: SkillCategory;
}

/**
 * Deterministic catalog of common technologies, frameworks, and proficiencies.
 * Normalizes case to canonical display format and maps to domain categories.
 */
const SKILL_CATALOG: Record<string, CatalogEntry> = {
  // Languages
  javascript: { canonicalName: "JavaScript", category: "languages" },
  js: { canonicalName: "JavaScript", category: "languages" },
  typescript: { canonicalName: "TypeScript", category: "languages" },
  ts: { canonicalName: "TypeScript", category: "languages" },
  python: { canonicalName: "Python", category: "languages" },
  python3: { canonicalName: "Python", category: "languages" },
  java: { canonicalName: "Java", category: "languages" },
  "c++": { canonicalName: "C++", category: "languages" },
  cpp: { canonicalName: "C++", category: "languages" },
  "c#": { canonicalName: "C#", category: "languages" },
  csharp: { canonicalName: "C#", category: "languages" },
  c: { canonicalName: "C", category: "languages" },
  golang: { canonicalName: "Go", category: "languages" },
  go: { canonicalName: "Go", category: "languages" },
  rust: { canonicalName: "Rust", category: "languages" },
  php: { canonicalName: "PHP", category: "languages" },
  ruby: { canonicalName: "Ruby", category: "languages" },
  kotlin: { canonicalName: "Kotlin", category: "languages" },
  swift: { canonicalName: "Swift", category: "languages" },
  dart: { canonicalName: "Dart", category: "languages" },
  sql: { canonicalName: "SQL", category: "languages" },
  html: { canonicalName: "HTML", category: "languages" },
  html5: { canonicalName: "HTML5", category: "languages" },
  css: { canonicalName: "CSS", category: "languages" },
  css3: { canonicalName: "CSS3", category: "languages" },
  bash: { canonicalName: "Bash", category: "languages" },
  shell: { canonicalName: "Shell", category: "languages" },
  r: { canonicalName: "R", category: "languages" },
  scala: { canonicalName: "Scala", category: "languages" },

  // Frontend
  react: { canonicalName: "React", category: "frontend" },
  "react.js": { canonicalName: "React", category: "frontend" },
  reactjs: { canonicalName: "React", category: "frontend" },
  "next.js": { canonicalName: "Next.js", category: "frontend" },
  nextjs: { canonicalName: "Next.js", category: "frontend" },
  vue: { canonicalName: "Vue.js", category: "frontend" },
  "vue.js": { canonicalName: "Vue.js", category: "frontend" },
  vuejs: { canonicalName: "Vue.js", category: "frontend" },
  angular: { canonicalName: "Angular", category: "frontend" },
  angularjs: { canonicalName: "Angular", category: "frontend" },
  svelte: { canonicalName: "Svelte", category: "frontend" },
  sveltekit: { canonicalName: "SvelteKit", category: "frontend" },
  "tailwind css": { canonicalName: "Tailwind CSS", category: "frontend" },
  tailwind: { canonicalName: "Tailwind CSS", category: "frontend" },
  tailwindcss: { canonicalName: "Tailwind CSS", category: "frontend" },
  redux: { canonicalName: "Redux", category: "frontend" },
  "redux toolkit": { canonicalName: "Redux Toolkit", category: "frontend" },
  sass: { canonicalName: "Sass", category: "frontend" },
  scss: { canonicalName: "SCSS", category: "frontend" },
  bootstrap: { canonicalName: "Bootstrap", category: "frontend" },
  vite: { canonicalName: "Vite", category: "frontend" },
  webpack: { canonicalName: "Webpack", category: "frontend" },
  jquery: { canonicalName: "jQuery", category: "frontend" },
  "material ui": { canonicalName: "Material UI", category: "frontend" },
  mui: { canonicalName: "MUI", category: "frontend" },
  "chakra ui": { canonicalName: "Chakra UI", category: "frontend" },
  "shadcn/ui": { canonicalName: "shadcn/ui", category: "frontend" },
  shadcn: { canonicalName: "shadcn/ui", category: "frontend" },

  // Backend
  "node.js": { canonicalName: "Node.js", category: "backend" },
  nodejs: { canonicalName: "Node.js", category: "backend" },
  node: { canonicalName: "Node.js", category: "backend" },
  express: { canonicalName: "Express", category: "backend" },
  "express.js": { canonicalName: "Express", category: "backend" },
  expressjs: { canonicalName: "Express", category: "backend" },
  nestjs: { canonicalName: "NestJS", category: "backend" },
  django: { canonicalName: "Django", category: "backend" },
  flask: { canonicalName: "Flask", category: "backend" },
  fastapi: { canonicalName: "FastAPI", category: "backend" },
  "spring boot": { canonicalName: "Spring Boot", category: "backend" },
  spring: { canonicalName: "Spring", category: "backend" },
  "asp.net": { canonicalName: "ASP.NET", category: "backend" },
  ".net": { canonicalName: ".NET", category: "backend" },
  dotnet: { canonicalName: ".NET", category: "backend" },
  "ruby on rails": { canonicalName: "Ruby on Rails", category: "backend" },
  rails: { canonicalName: "Ruby on Rails", category: "backend" },
  laravel: { canonicalName: "Laravel", category: "backend" },
  graphql: { canonicalName: "GraphQL", category: "backend" },
  "rest api": { canonicalName: "REST API", category: "backend" },
  "rest apis": { canonicalName: "REST APIs", category: "backend" },
  restful: { canonicalName: "RESTful APIs", category: "backend" },
  "restful apis": { canonicalName: "RESTful APIs", category: "backend" },
  microservices: { canonicalName: "Microservices", category: "backend" },
  grpc: { canonicalName: "gRPC", category: "backend" },
  "socket.io": { canonicalName: "Socket.io", category: "backend" },
  websockets: { canonicalName: "WebSockets", category: "backend" },

  // Databases
  postgresql: { canonicalName: "PostgreSQL", category: "databases" },
  postgres: { canonicalName: "PostgreSQL", category: "databases" },
  mongodb: { canonicalName: "MongoDB", category: "databases" },
  mysql: { canonicalName: "MySQL", category: "databases" },
  redis: { canonicalName: "Redis", category: "databases" },
  sqlite: { canonicalName: "SQLite", category: "databases" },
  supabase: { canonicalName: "Supabase", category: "databases" },
  firebase: { canonicalName: "Firebase", category: "databases" },
  oracle: { canonicalName: "Oracle", category: "databases" },
  cassandra: { canonicalName: "Cassandra", category: "databases" },
  elasticsearch: { canonicalName: "Elasticsearch", category: "databases" },
  dynamodb: { canonicalName: "DynamoDB", category: "databases" },
  mariadb: { canonicalName: "MariaDB", category: "databases" },
  prisma: { canonicalName: "Prisma", category: "databases" },
  typeorm: { canonicalName: "TypeORM", category: "databases" },
  mongoose: { canonicalName: "Mongoose", category: "databases" },

  // Tools
  git: { canonicalName: "Git", category: "tools" },
  github: { canonicalName: "GitHub", category: "tools" },
  gitlab: { canonicalName: "GitLab", category: "tools" },
  docker: { canonicalName: "Docker", category: "tools" },
  kubernetes: { canonicalName: "Kubernetes", category: "tools" },
  k8s: { canonicalName: "Kubernetes", category: "tools" },
  aws: { canonicalName: "AWS", category: "tools" },
  "amazon web services": { canonicalName: "AWS", category: "tools" },
  azure: { canonicalName: "Azure", category: "tools" },
  gcp: { canonicalName: "GCP", category: "tools" },
  "google cloud": { canonicalName: "Google Cloud", category: "tools" },
  linux: { canonicalName: "Linux", category: "tools" },
  figma: { canonicalName: "Figma", category: "tools" },
  postman: { canonicalName: "Postman", category: "tools" },
  jira: { canonicalName: "Jira", category: "tools" },
  "ci/cd": { canonicalName: "CI/CD", category: "tools" },
  nginx: { canonicalName: "Nginx", category: "tools" },
  terraform: { canonicalName: "Terraform", category: "tools" },
  jenkins: { canonicalName: "Jenkins", category: "tools" },
  vercel: { canonicalName: "Vercel", category: "tools" },
  netlify: { canonicalName: "Netlify", category: "tools" },

  // Soft Skills
  communication: { canonicalName: "Communication", category: "softSkills" },
  leadership: { canonicalName: "Leadership", category: "softSkills" },
  "problem solving": { canonicalName: "Problem Solving", category: "softSkills" },
  teamwork: { canonicalName: "Teamwork", category: "softSkills" },
  "critical thinking": { canonicalName: "Critical Thinking", category: "softSkills" },
  "time management": { canonicalName: "Time Management", category: "softSkills" },
  agile: { canonicalName: "Agile", category: "softSkills" },
  scrum: { canonicalName: "Scrum", category: "softSkills" },
  mentoring: { canonicalName: "Mentoring", category: "softSkills" },
  adaptability: { canonicalName: "Adaptability", category: "softSkills" },
  collaboration: { canonicalName: "Collaboration", category: "softSkills" },

  // Other / Hardware / Embedded
  arduino: { canonicalName: "Arduino", category: "other" },
  easyeda: { canonicalName: "EasyEDA", category: "other" },
  "raspberry pi": { canonicalName: "Raspberry Pi", category: "other" },
  iot: { canonicalName: "IoT", category: "other" },
  opencv: { canonicalName: "OpenCV", category: "other" },
  tensorflow: { canonicalName: "TensorFlow", category: "other" },
  pytorch: { canonicalName: "PyTorch", category: "other" },
};

/**
 * Heuristics to reject phrases that are definitely NOT technical or professional skills:
 * - Achievements, hackathon awards, competition rankings (e.g. "HackX 9.0 Semifinalist", "Winner")
 * - Job title or section heading phrases (e.g. "Leadership Experience", "Work History")
 * - Full sentences or lengthy explanatory clauses
 */
export function isInvalidSkillCandidate(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 45) {
    return true;
  }

  // Reject sentences ending with sentence punctuation
  if (/[.?!;]$/.test(trimmed)) {
    return true;
  }

  // Reject if contains more than 4 words
  const words = trimmed.split(/\s+/);
  if (words.length > 4) {
    return true;
  }

  const lower = trimmed.toLowerCase();

  // Reject achievement / competition / honor phrases
  if (
    /\b(?:semifinalist|finalist|winner|champion|runner-up|place|medal|award|scholarship|hackathon|dean's\s+list|honor|prize)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  // Reject section headings and narrative experience phrases
  if (
    /^(?:leadership\s+experience|work\s+experience|employment\s+history|academic\s+qualifications|professional\s+summary|education|projects)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  // Reject pronouns and narrative openers
  if (
    /^(?:i|we|my|our|worked|responsible|managed|developed|building|demonstrated)\b/i.test(
      lower
    )
  ) {
    return true;
  }

  // Reject dates or date ranges (e.g. "2024 - 2025")
  if (/\b\d{4}\s*[-–—]\s*\d{4}\b/.test(trimmed) || /^\d{4}$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Classifies a single raw skill name against the deterministic catalog.
 */
export function classifySkill(rawName: string): {
  name: string;
  category: SkillCategory;
  confidence: Confidence;
} {
  const normalizedKey = rawName
    .toLowerCase()
    .replace(/[^\w+#.-]+/g, " ")
    .trim();

  const entry = SKILL_CATALOG[normalizedKey];
  if (entry) {
    return {
      name: entry.canonicalName,
      category: entry.category,
      confidence: "high",
    };
  }

  // Check direct lookup with raw lower
  const direct = SKILL_CATALOG[rawName.toLowerCase().trim()];
  if (direct) {
    return {
      name: direct.canonicalName,
      category: direct.category,
      confidence: "high",
    };
  }

  // If not found in catalog, return as "other" with medium confidence
  return {
    name: rawName.trim(),
    category: "other",
    confidence: "medium",
  };
}

/**
 * Classifies a list of skill names, deduplicates case-insensitively,
 * and groups them into domain categories.
 */
export function classifySkills(rawSkills: StructuredCvSkill[]): {
  flatSkills: StructuredCvSkill[];
  categorizedSkills: CategorizedSkills;
} {
  const categorized: CategorizedSkills = {
    languages: [],
    frontend: [],
    backend: [],
    databases: [],
    tools: [],
    softSkills: [],
    other: [],
  };

  const flatSkills: StructuredCvSkill[] = [];
  const seenLower = new Set<string>();

  for (const skill of rawSkills) {
    const rawName = skill.name?.trim();
    if (!rawName || isInvalidSkillCandidate(rawName)) {
      continue;
    }

    const { name, category, confidence } = classifySkill(rawName);
    const key = name.toLowerCase();

    if (!seenLower.has(key)) {
      seenLower.add(key);

      const skillItem: StructuredCvSkill = {
        name,
        category,
        confidence,
      };

      flatSkills.push(skillItem);
      categorized[category].push(skillItem);
    }
  }

  return { flatSkills, categorizedSkills: categorized };
}
