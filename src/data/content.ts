/**
 * Single source of truth for portfolio content.
 * Rule: nothing here is invented. Anything unknown is `null` and rendered as an
 * explicit placeholder so it can be confirmed before launch (see README checklist).
 */

const env = import.meta.env

export const LINKS = {
  email: 'rahulvijayan2291@gmail.com',
  github: 'https://github.com/Rahulvijayan2291',
  resume: 'https://drive.google.com/file/d/1OdCEl3TM2htlPrJMgfMmCwO22ho3dD5j/view?usp=sharing',
  resumeDownload: 'https://drive.google.com/file/d/1OdCEl3TM2htlPrJMgfMmCwO22ho3dD5j/view?usp=sharing',
  /** Set VITE_LINKEDIN_URL before launch. `null` renders a visible placeholder (no dead link). */
  linkedin: 'https://www.linkedin.com/in/rahul-vijayan-682a12194/',
} as const

export const NAV = [
  { id: 'home', label: 'HOME' },
  { id: 'about', label: 'ABOUT' },
  { id: 'experience', label: 'EXPERIENCE' },
  { id: 'skills', label: 'SKILLS' },
  { id: 'projects', label: 'PROJECTS' },
  { id: 'achievements', label: 'ACHIEVEMENTS' },
  { id: 'contact', label: 'CONTACT' },
] as const

export const HERO = {
  headline: 'ENGINEERING THE FUTURE, ONE SYSTEM AT A TIME.',
  name: 'RAHUL VIJAYAN',
  roles: ['Software Engineer', 'Full Stack Developer', 'AI Enthusiast'],
  description:
    'I build scalable backend systems, intelligent applications and meaningful developer experiences using Java, Spring Boot, React and AI.',
  experience: { value: '3.5+', label: 'Years of Engineering Experience' },
  hudLabels: ['JAVA', 'SPRING BOOT', 'REACT', 'MICROSERVICES', 'AI'],
}

export const ABOUT = {
  title: 'THE ENGINEER BEHIND THE ARMOR',
  intro:
    'Rahul Vijayan is a software engineer who enjoys building scalable applications, solving complex engineering problems, optimising systems and exploring AI-powered solutions.',
  highlights: [
    { icon: 'layers', title: 'Full-stack & backend engineering', text: 'Services and interfaces designed as one coherent system.' },
    { icon: 'network', title: 'Distributed systems & microservices', text: 'Event-driven, loosely coupled services that fail gracefully.' },
    { icon: 'bug', title: 'Application development & debugging', text: 'Root-cause analysis before fixes; fixes that stay fixed.' },
    { icon: 'gauge', title: 'Performance optimisation', text: 'Measure first, then remove the bottleneck.' },
    { icon: 'sparkles', title: 'Generative AI & prompt engineering', text: 'Structured prompting applied to real engineering work.' },
    { icon: 'users', title: 'Mentoring & technical collaboration', text: 'Raising the bar through reviews, pairing and shared ownership.' },
  ],
  identity: [
    ['OPERATOR', 'Rahul Vijayan'],
    ['CLASS', 'Software Engineer'],
    ['CURRENT POST', 'IBM ISL — Cognos Analytics'],
    ['CORE STACK', 'Java · Spring Boot · React'],
    ['FOCUS', 'Systems · AI-assisted engineering'],
  ] as Array<[string, string]>,
}

export interface Mission {
  title: string
  tag: string
  points: string[]
}
export interface Posting {
  id: string
  org: string
  role: string | null
  /** `null` => rendered as a "to confirm" placeholder. */
  period: string | null
  current?: boolean
  note?: string
  summary?: string
  missions?: Mission[]
  points?: string[]
}

export const EXPERIENCE: Posting[] = [
  {
    id: 'ibm',
    org: 'IBM ISL',
    role: 'Software Engineer',
    period: null,
    current: true,
    missions: [
      {
        title: 'Cognos Analytics',
        tag: 'CURRENT PROJECT',
        points: [
          'Cognos application development with Java, Spring Boot and React.',
          'Docker-based environments and AI-assisted development workflows.',
          'Root cause analysis, bug fixing and feature development.',
          'Prompt engineering and AI implementation to improve engineering efficiency and reduce complexity.',
        ],
      },
      {
        title: 'IBM DataStage',
        tag: 'PREVIOUS PROJECT',
        points: [
          'Led an accessibility testing workstream with 6 junior engineers.',
          'Delivered 130+ accessibility enhancement pull requests.',
          'Reviewed 100+ peer pull requests.',
          'Worked on Clearbox automation testing for the Canvas UI.',
          'Migrated legacy test suites into CI/CD pipelines.',
          'Used generative AI models through structured prompt engineering.',
        ],
      },
    ],
  },
  {
    id: 'tcs',
    org: 'Tata Consultancy Services',
    role: 'Software Developer',
    period: null,
    summary: 'Enterprise backend engineering.',
    points: [
      'Backend development with Java and Spring Boot.',
      'REST API design and integration.',
      'Debugging and issue resolution.',
      'Database work.',
      'Performance optimisation.',
      'Enterprise application development.',
    ],
  },
  {
    id: 'claysys',
    org: 'ClaySys',
    role: null,
    period: null,
    note: 'Previous experience. Role title, dates and responsibilities to be confirmed before launch.',
  },
]

export interface SkillGroup {
  id: string
  code: string
  label: string
  blurb: string
  items: string[]
}

export const SKILLS: SkillGroup[] = [
  { id: 'languages', code: 'SYS-01', label: 'Languages', blurb: 'The languages behind services, interfaces and automation.', items: ['Java', 'JavaScript', 'TypeScript', 'C', 'SQL', 'Python'] },
  { id: 'backend', code: 'SYS-02', label: 'Backend', blurb: 'Service design, secure APIs and event-driven integration.', items: ['Spring Boot', 'Spring Security', 'REST APIs', 'Microservices', 'Kafka', 'JWT'] },
  { id: 'frontend', code: 'SYS-03', label: 'Frontend', blurb: 'Responsive interfaces assembled from reusable components.', items: ['React', 'HTML', 'CSS', 'Tailwind CSS'] },
  { id: 'databases', code: 'SYS-04', label: 'Databases', blurb: 'Relational modelling, queries and the data layer.', items: ['PostgreSQL', 'Oracle SQL'] },
  { id: 'devops', code: 'SYS-05', label: 'DevOps & Tools', blurb: 'Containers, pipelines and version control that keep delivery repeatable.', items: ['Docker', 'Git', 'GitLab', 'CI/CD', 'AWS'] },
  { id: 'ai', code: 'SYS-06', label: 'AI', blurb: 'Structured prompting and AI-assisted workflows applied to everyday engineering.', items: ['Generative AI', 'Prompt Engineering', 'GitHub Copilot', 'AI-assisted development'] },
]

export interface ProjectLink {
  label: string
  /** `null` => rendered as a visible, non-clickable placeholder. */
  href: string | null
  placeholder?: string
}
export interface Project {
  id: string
  code: string
  name: string
  type: string
  summary: string
  features: string[]
  tech: string[]
  links: ProjectLink[]
}

export const PROJECTS: Project[] = [
  {
    id: 'vervue',
    code: 'MISSION 01',
    name: 'VERVUE',
    type: 'AI-powered Interview Coach and Career Intelligence platform',
    summary: 'Prepares candidates with realistic AI-led interviews and turns the results into a clear picture of career readiness.',
    features: [
      'AI-powered mock interviews',
      'Technical and behavioural interview preparation',
      'Intelligent question generation',
      'Personalised interview feedback',
      'Performance evaluation',
      'Skill-gap analysis',
      'Career readiness tracking',
    ],
    tech: ['React', 'TypeScript', 'Java', 'Spring Boot', 'PostgreSQL', 'AI integration'],
    links: [{ label: 'Live project', href: null, placeholder: 'LIVE URL — PENDING VERIFIED LINK' }],
  },
  {
    id: 'jobtrack',
    code: 'MISSION 02',
    name: 'JOBTRACK',
    type: 'Job application tracking platform',
    summary: 'A platform for managing job applications and monitoring application progress.',
    features: ['Manage job applications in one place', 'Monitor application progress'],
    tech: ['Java', 'Spring Boot', 'React', 'PostgreSQL'],
    links: [{ label: 'GitHub', href: LINKS.github }],
  },
  {
    id: 'dsa',
    code: 'MISSION 03',
    name: 'DSA VISUALIZERS',
    type: 'Interactive algorithm learning and problem-solving tools',
    summary: 'Visual, step-by-step tools and curated practice for understanding core algorithm patterns.',
    features: [
      'Sliding Window visualizer',
      'Binary Search visualizer',
      'DFS visualizer',
      '349 DFS problems in Java',
      'BFS and Prefix Sum learning resources',
    ],
    tech: [],
    links: [{ label: 'Repository / demo', href: null, placeholder: 'LINKS — ADD ONLY VERIFIED URLS' }],
  },
]

export interface Achievement {
  id: string
  kind: 'count' | 'compare'
  value?: number
  prefix?: string
  suffix?: string
  label: string
  detail: string
  /** Shown only when the claim has been verified against the latest profile. */
  verified: boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'lc', kind: 'count', value: 2221, label: 'LeetCode Guardian rating', detail: 'Competitive problem-solving rating.', verified: true },
  { id: 'batch', kind: 'compare', label: 'Batch job: 10+ hours to ~10 seconds', detail: 'Optimised a critical batch job.', verified: true },
  { id: 'pipeline', kind: 'count', value: 60, suffix: '%', label: 'Pipeline throughput and fault tolerance', detail: 'Improvement, per supplied resume details.', verified: true },
  { id: 'lead', kind: 'count', value: 6, label: 'Engineers led', detail: 'Accessibility testing workstream.', verified: true },
  { id: 'prs', kind: 'count', value: 130, suffix: '+', label: 'Accessibility pull requests delivered', detail: 'IBM DataStage.', verified: true },
  { id: 'reviews', kind: 'count', value: 100, suffix: '+', label: 'Peer pull requests reviewed', detail: 'IBM DataStage.', verified: true },
  // Held back until the latest LeetCode profile confirms it. Flip `verified` to publish.
  { id: 'top1', kind: 'count', value: 1, prefix: 'Top ', suffix: '%', label: 'Global LeetCode ranking (previous resume claim)', detail: 'Unconfirmed.', verified: false },
]

export const MANIFESTO = "I don't just write code. I engineer systems that move ideas into reality."
