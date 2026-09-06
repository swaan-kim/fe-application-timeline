import type { ApplicationConfig } from '../domain/application-config.ts';

export const APPLICATION_CONFIG = {
  name: '김승완',
  role: 'Frontend 지원서',
  submissionDate: '2026-09-03',
  chartStartDate: '2026-03-01',
  chartAnnotations: [
    {
      id: 'ncp-pt',
      category: 'work',
      title: 'NCP AI Enablement 팀 PT',
      startDate: '2026-03-01',
      endDate: '2026-06-30',
      chartOnly: true,
    },
  ],
  githubUrl: 'https://github.com/swaan-kim',
  // 2026-09-06: 현재 작성 상태 그대로 공개하도록 명시적으로 승인한 여섯 항목.
  publicDraftIds: [
    'interaction-prototype',
    'project-b',
    'product-team-collaboration',
    'tradeoff-decision',
    'accessibility-study',
    'peer-review-retrospective',
  ],
} as const satisfies ApplicationConfig;
