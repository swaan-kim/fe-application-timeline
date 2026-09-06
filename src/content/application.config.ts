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
      // ‘6월 초’를 타임라인에 근사해서 표시하는 기준일.
      endDate: '2026-06-05',
      chartOnly: true,
    },
    {
      id: 'ncp-guide-chatbot',
      category: 'build',
      title: 'NCP 가이드 챗봇 구현',
      startDate: '2026-04-01',
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
