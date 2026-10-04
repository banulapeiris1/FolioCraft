/**
 * Golden Synthetic CV Fixtures for FolioCraft Regression and Hybrid Parser Suite.
 * (All data is synthetic and anonymized).
 */

export interface GoldenCvFixture {
  id: string;
  name: string;
  description: string;
  layoutType: "single-column" | "two-column" | "multi-column";
  rawText: string;
  expected: {
    sectionsPresent: string[];
    projectsCount: number;
    extracurricularCount?: number;
    achievementsCount?: number;
    leadershipCount?: number;
    experienceCount?: number;
    sampleProjectTitles?: string[];
    sampleExtracurricularActivities?: string[];
  };
}

export const GOLDEN_CV_FIXTURES: GoldenCvFixture[] = [
  {
    id: "standard-single-column",
    name: "Standard Single-Column Software Engineer CV",
    description: "Standard top-to-bottom layout with explicit canonical headings.",
    layoutType: "single-column",
    rawText: `
Dilshan Silva
Full Stack Developer
dilshan@example.com | +94 77 123 4567 | Colombo, Sri Lanka
https://github.com/dilshans | https://dilshan.dev

SUMMARY
Passionate full-stack developer with 4 years building scalable web services.

TECHNICAL SKILLS
TypeScript, React, Node.js, Express, PostgreSQL, Redis, Docker

WORK EXPERIENCE
Software Engineer
Lanka Byte Technologies
Jan 2022 - Present
- Architected resilient event-driven microservices.
- Optimized database queries cutting 95th percentile response times by 30%.

Junior Web Developer
Apex Digital
Mar 2020 - Dec 2021
- Built responsive UI components with React.

EDUCATION
BSc (Hons) in Software Engineering
University of Westminster
2016 - 2020

PROJECTS
FolioCraft App
Collaborative portfolio management platform for creatives.
Technologies: TypeScript, React, PostgreSQL
https://github.com/dilshans/foliocraft
https://foliocraft.dev

Cloud Metrics Monitor
Lightweight system resource dashboard.
Technologies: Node.js, Docker
https://github.com/dilshans/metrics-monitor
`,
    expected: {
      sectionsPresent: ["summary", "skills", "experience", "education", "projects"],
      projectsCount: 2,
      experienceCount: 2,
      sampleProjectTitles: ["FolioCraft App", "Cloud Metrics Monitor"],
    },
  },

  {
    id: "projects-vs-extracurricular",
    name: "Projects and Extracurricular Activities Mix",
    description: "Direct reproduction of the primary issue: Projects immediately adjacent to Extracurricular Activities.",
    layoutType: "single-column",
    rawText: `
Sanduni Fernando
sanduni.fernando@example.com | Colombo, Sri Lanka

EDUCATION
BSc in Computer Science
University of Moratuwa
2020 - 2024

PROJECTS
Intelligent Shipment Alerting System
Automated tracking system with real-time push notifications.
Technologies: React, Node.js, RabbitMQ
https://github.com/sanduni/shipment-alerts

Portfolio Website
Personal responsive showcase built using Next.js and Tailwind CSS.
https://sanduni.me

EXTRACURRICULAR ACTIVITIES
University Cricket Team
Vice Captain (2022 - 2023)
Led inter-faculty tournament teams and coordinated weekly practice.

IEEE Student Branch
Active Member
Assisted in organizing national robotics symposium.

Event Organizer
TechFest 2023
Managed stage logistics for 500+ attendees.
`,
    expected: {
      sectionsPresent: ["education", "projects", "extracurricular"],
      projectsCount: 2,
      extracurricularCount: 3,
      sampleProjectTitles: [
        "Intelligent Shipment Alerting System",
        "Portfolio Website",
      ],
      sampleExtracurricularActivities: [
        "University Cricket Team",
        "IEEE Student Branch",
        "Event Organizer",
      ],
    },
  },

  {
    id: "projects-achievements-leadership",
    name: "Projects, Leadership and Achievements Mixed",
    description: "Evaluates separation between technical projects, competitive achievements, and leadership roles.",
    layoutType: "single-column",
    rawText: `
Kamal Perera
kamal@example.com

PROJECTS
Smart Health Diagnostics Engine
AI-assisted medical symptom analyzer.
Technologies: Python, PyTorch, FastAPI
https://github.com/kamalp/health-diagnostics

ACHIEVEMENTS
1st Place - National Hackathon 2023
Dean's List - Faculty of Information Technology (2021, 2022)
Finalist - Imagine Cup 2022

LEADERSHIP
President
Computer Society
2023 - Present
Directed executive committee of 15 members and hosted tech bootcamps.

Vice Chair
IEEE WIE Affinity Group
2022 - 2023
Coordinated outreach workshops for high school students.
`,
    expected: {
      sectionsPresent: ["projects", "achievements", "leadership"],
      projectsCount: 1,
      achievementsCount: 3,
      leadershipCount: 2,
      sampleProjectTitles: ["Smart Health Diagnostics Engine"],
    },
  },

  {
    id: "two-column-sidebar-layout",
    name: "Two-Column Layout with Skills in Sidebar",
    description: "Visual layout where contact and skills occupy a left column and experience/projects occupy main column.",
    layoutType: "two-column",
    rawText: `
Nuwan Wickramasinghe
nuwan@example.com | Colombo, Sri Lanka
github.com/nuwanw

CORE COMPETENCIES
React, TypeScript, Go, PostgreSQL, Docker, Kubernetes, AWS

EDUCATION
BSc Information Systems
University of Kelaniya
2018 - 2022

WORK HISTORY
Software Engineer
CodeGen International
2022 - Present
- Core booking engine development.

PROJECT WORK
Distributed Task Queue
High-throughput task dispatcher with retry mechanism.
Technologies: Go, Redis
https://github.com/nuwanw/task-queue

CAMPUS INVOLVEMENT
Rotaract Club
Director of Community Service (2020 - 2021)
Organized blood donation and digital literacy drives.
`,
    expected: {
      sectionsPresent: ["skills", "education", "experience", "projects", "extracurricular"],
      projectsCount: 1,
      experienceCount: 1,
      extracurricularCount: 1,
      sampleProjectTitles: ["Distributed Task Queue"],
      sampleExtracurricularActivities: ["Rotaract Club"],
    },
  },
];
