export const TECHNOLOGY_IDS = [
  'react',
  'typescript',
  'vitejs',
  'html5',
  'css3',
  'javascript',
  'playwright',
  'nextjs',
  'fastapi',
  'python',
] as const;

export type TechnologyId = (typeof TECHNOLOGY_IDS)[number];

export const TECHNOLOGY_LABELS: Record<TechnologyId, string> = {
  react: 'React',
  typescript: 'TypeScript',
  vitejs: 'Vite',
  html5: 'HTML',
  css3: 'CSS',
  javascript: 'JavaScript',
  playwright: 'Playwright',
  nextjs: 'Next.js',
  fastapi: 'FastAPI',
  python: 'Python',
};
