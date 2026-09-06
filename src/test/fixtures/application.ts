import type { ApplicationConfig } from '../../domain/application-config.ts';
import type { TimelineItem, TimelineSnapshot } from '../../domain/timeline.ts';

// Test inputs are intentionally independent from the applicant's editable Markdown.
export const testConfig: ApplicationConfig = {
  name: '테스트 지원자',
  role: 'Frontend 지원서',
  submissionDate: '2026-09-03',
  githubUrl: '',
};

export function testItem(overrides: Partial<TimelineItem> = {}): TimelineItem {
  return {
    id: 'interaction-prototype',
    status: 'draft',
    category: 'build',
    startDate: '2025-10-01',
    endDate: '2025-12-01',
    title: '인터랙션 프로토타입',
    purpose: '',
    intent: '',
    outcome: '',
    ...overrides,
  };
}

export const testSnapshot: TimelineSnapshot = {
  startDate: '2025-09-03',
  endDate: testConfig.submissionDate,
  items: [
    testItem(),
    testItem({
      id: 'project-b',
      startDate: '2026-03-01',
      endDate: '2026-08-15',
      title: '프로젝트 B',
    }),
    testItem({
      id: 'product-team-collaboration',
      category: 'work',
      startDate: '2026-01-10',
      endDate: '2026-06-30',
      title: '제품팀 협업',
    }),
    testItem({
      id: 'tradeoff-decision',
      category: 'work',
      startDate: '2026-05-20',
      endDate: undefined,
      title: '트레이드오프 결정',
    }),
    testItem({
      id: 'accessibility-study',
      category: 'grow',
      startDate: '2025-12-10',
      endDate: '2026-02-20',
      title: '접근성 학습·검증',
    }),
    testItem({
      id: 'peer-review-retrospective',
      category: 'grow',
      startDate: '2026-08-25',
      endDate: undefined,
      title: '동료 리뷰와 회고',
    }),
  ],
};

export const readingItem = testItem({
  id: 'reading-example',
  title: '긴 제목과 복잡한 본문에서도 읽는 흐름이 유지되는지 검증한 경험',
  purpose:
    '검증 전용 본문입니다. 실제 지원자의 경험이나 성과가 아닙니다.\n\n' +
    '읽는 사람이 문단의 핵심을 찾고 다음 판단으로 이동할 수 있는지 확인하는 긴 한글 문장입니다. '.repeat(
      10,
    ),
  intent:
    '- 제목과 본문의 위계를 구분했습니다.\n- **판단 기준**과 *선택의 이유*를 연결했습니다.\n\n1. 먼저 읽기 순서를 확인했습니다.\n2. 작은 화면과 키보드 이동을 확인했습니다.',
  outcome:
    '[검증용 링크](https://example.com/review)\n\n' +
    '[https://example.com/' +
    'long-readable-reference-'.repeat(12) +
    '](https://example.com/reference)',
});

export const qaSnapshot: TimelineSnapshot = {
  ...testSnapshot,
  items: [
    ...testSnapshot.items,
    readingItem,
    testItem({
      id: 'boundary-start',
      category: 'work',
      startDate: testSnapshot.startDate,
      endDate: undefined,
      title: '시작 경계의 단일 경험',
      purpose: '부분 작성 검증용 본문',
    }),
    testItem({
      id: 'boundary-end',
      category: 'grow',
      startDate: testSnapshot.endDate,
      endDate: undefined,
      title: '마지막 경계에서도 제목 전체를 읽을 수 있는지 확인한 경험',
    }),
  ],
};
