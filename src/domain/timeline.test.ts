import {
  testSnapshot as applicationSnapshot,
  testConfig as APPLICATION_CONFIG,
} from '../test/fixtures/application';
import {
  createMonthTicks,
  dateToPercentage,
  formatDateForSpeech,
  formatItemDate,
  formatItemDateForSpeech,
  getPublicationWarnings,
  groupTimelineItemsByCategory,
  packTimelineItems,
  sortTimelineItemsNewestFirst,
  subtractCalendarMonths,
  validateTimelineSnapshot,
  collectTimelineDiagnostics,
  getExperienceReadingOrder,
  type TimelineCategory,
  type TimelineItem,
  type TimelineSnapshot,
} from './timeline';

function createItem(overrides: Partial<TimelineItem> = {}): TimelineItem {
  return {
    id: 'item-a',
    status: 'published',
    category: 'build',
    startDate: '2025-10-01',
    endDate: '2025-10-31',
    title: '사용성 개선 경험',
    purpose: '목적',
    intent: '의도',
    outcome: '성과',
    ...overrides,
  };
}

function createSnapshot(items: readonly TimelineItem[]): TimelineSnapshot {
  return {
    startDate: '2025-09-03',
    endDate: '2026-09-03',
    items,
  };
}

describe('timeline date domain', () => {
  it('derives one calendar year from a single submission date', () => {
    expect(subtractCalendarMonths(APPLICATION_CONFIG.submissionDate, 12)).toBe('2025-09-03');
    expect(subtractCalendarMonths('2024-02-29', 12)).toBe('2023-02-28');
    expect(subtractCalendarMonths('2026-03-31', 1)).toBe('2026-02-28');
  });

  it('maps both timeline boundaries exactly and rejects invalid dates', () => {
    expect(dateToPercentage('2025-09-03', '2025-09-03', '2026-09-03')).toBe(0);
    expect(dateToPercentage('2026-09-03', '2025-09-03', '2026-09-03')).toBe(100);
    expect(() => dateToPercentage('2026-02-30', '2025-09-03', '2026-09-03')).toThrow(
      '존재하지 않는 날짜',
    );
  });

  it('creates thirteen truthful month ticks', () => {
    const ticks = createMonthTicks('2025-09-03', '2026-09-03');

    expect(ticks).toHaveLength(13);
    expect(ticks[0]).toMatchObject({ label: '25.09', position: 0 });
    expect(ticks.at(-1)).toMatchObject({ label: '09', position: 100 });
    expect(ticks.find((tick) => tick.label === '26.01')).toBeDefined();
  });

  it('derives month ticks from the visible range instead of assuming twelve months', () => {
    const ticks = createMonthTicks('2026-03-01', '2026-09-03');
    expect(ticks.map((tick) => tick.label)).toEqual(['26.03', '04', '05', '06', '07', '08', '09']);
    expect(ticks[0]?.position).toBe(0);
    expect(ticks.at(-1)?.position).toBe(100);
    expect(createMonthTicks('2026-03-01', '2026-03-31').map((tick) => tick.position)).toEqual([
      0, 100,
    ]);
    expect(() => createMonthTicks('2026-09-03', '2026-03-01')).toThrow('시작일');
  });

  it('formats visible and spoken dates consistently', () => {
    expect(formatItemDate(createItem())).toBe('2025.10');
    expect(formatItemDate(createItem({ endDate: undefined }))).toBe('2025.10');
    expect(formatDateForSpeech('2025-10-01')).toBe('2025년 10월');
    expect(formatItemDate(createItem({ endDate: '2026-03-01' }))).toBe('2025.10 — 2026.03');
    expect(formatItemDateForSpeech(createItem())).toBe('2025년 10월');
    expect(formatItemDateForSpeech(createItem({ endDate: '2026-03-01' }))).toBe(
      '2025년 10월부터 2026년 3월까지',
    );
  });

  it('distinguishes ongoing work from a completed experience in the same month', () => {
    expect(formatItemDate(createItem({ ongoing: true }))).toBe('2025.10 — 현재');
    expect(formatItemDateForSpeech(createItem({ ongoing: true }))).toBe(
      '2025년 10월부터 현재까지 진행 중',
    );
    expect(formatItemDate(createItem({ ongoing: false }))).toBe('2025.10');
    expect(() =>
      validateTimelineSnapshot(createSnapshot([createItem({ ongoing: true, endDate: undefined })])),
    ).toThrow('표시 기준일');
  });
});

describe('timeline grouping and placement', () => {
  it('groups records by category and keeps newest records first', () => {
    const grouped = groupTimelineItemsByCategory(applicationSnapshot.items);

    expect(grouped.build.map((item) => item.id)).toEqual(['project-b', 'interaction-prototype']);
    expect(grouped.work.map((item) => item.id)).toEqual([
      'product-team-collaboration',
      'tradeoff-decision',
    ]);
    expect(grouped.grow.map((item) => item.id)).toEqual([
      'peer-review-retrospective',
      'accessibility-study',
    ]);
  });

  it('packs overlapping records into deterministic visual tracks', () => {
    const forward = packTimelineItems(applicationSnapshot.items);
    const reverse = packTimelineItems([...applicationSnapshot.items].reverse());
    const toTrackMap = (packed: ReturnType<typeof packTimelineItems>) =>
      Object.fromEntries(packed.placements.map(({ item, track }) => [item.id, track]));

    expect(toTrackMap(forward)).toEqual(toTrackMap(reverse));
    expect(forward.trackCountByCategory.work).toBe(2);
    expect(forward.trackCountByCategory.build).toBe(1);
  });

  it('sorts without mutating source order', () => {
    const source = [
      createItem({ id: 'old', endDate: '2025-12-01' }),
      createItem({ id: 'recent', startDate: '2026-07-18', endDate: undefined }),
    ];

    expect(sortTimelineItemsNewestFirst(source).map((item) => item.id)).toEqual(['recent', 'old']);
    expect(source.map((item) => item.id)).toEqual(['old', 'recent']);
  });
});

describe('timeline validation', () => {
  it('validates archived dates structurally without applying the current display range', () => {
    const archived = createItem({
      status: 'archived',
      startDate: '2024-01-01',
      endDate: '2024-03-01',
    });
    expect(() => validateTimelineSnapshot(createSnapshot([archived]))).not.toThrow();
    expect(() =>
      validateTimelineSnapshot(createSnapshot([{ ...archived, endDate: '2023-01-01' }])),
    ).toThrow('종료일');
    expect(() =>
      validateTimelineSnapshot(createSnapshot([{ ...archived, startDate: '2024-02-30' }])),
    ).toThrow('존재하지 않는 날짜');
    const draft = { ...archived, status: 'draft' as const };
    expect(() =>
      validateTimelineSnapshot(createSnapshot([draft]), { includeDrafts: false }),
    ).not.toThrow();
    expect(() => validateTimelineSnapshot(createSnapshot([draft]))).toThrow('범위를 벗어났습니다');
  });

  it('reports all missing published fields and derives one shared reading order', () => {
    const errors = collectTimelineDiagnostics(
      createSnapshot([createItem({ purpose: '', intent: '', outcome: '' })]),
    );
    expect(errors.map((issue) => issue.field)).toEqual(['목적', '의도', '성과']);
    expect(getExperienceReadingOrder(applicationSnapshot.items).map((item) => item.id)).toEqual([
      'project-b',
      'interaction-prototype',
      'product-team-collaboration',
      'tradeoff-decision',
      'peer-review-retrospective',
      'accessibility-study',
    ]);
  });
  it('keeps the mock to a truthful range, six records, and three categories', () => {
    expect(applicationSnapshot.startDate).toBe('2025-09-03');
    expect(applicationSnapshot.endDate).toBe('2026-09-03');
    expect(applicationSnapshot.items).toHaveLength(6);
    expect(new Set(applicationSnapshot.items.map((item) => item.category))).toEqual(
      new Set(['build', 'work', 'grow']),
    );
    expect(applicationSnapshot.items.every((item) => item.status === 'draft')).toBe(true);
  });

  it('rejects duplicate ids, invalid categories, periods, and ranges', () => {
    const duplicate = createItem();
    expect(() => validateTimelineSnapshot(createSnapshot([duplicate, duplicate]))).toThrow(
      '중복된 경험 ID',
    );

    expect(() =>
      validateTimelineSnapshot(
        createSnapshot([createItem({ category: 'other' as TimelineCategory })]),
      ),
    ).toThrow('분류가 올바르지 않습니다');

    expect(() =>
      validateTimelineSnapshot(createSnapshot([createItem({ endDate: '2025-09-30' })])),
    ).toThrow('종료일은 시작일보다 늦어야');

    expect(() =>
      validateTimelineSnapshot(
        createSnapshot([createItem({ startDate: '2024-10-01', endDate: undefined })]),
      ),
    ).toThrow('범위를 벗어났습니다');
  });

  it('requires purpose, intent, and outcome copy for published records', () => {
    expect(() =>
      validateTimelineSnapshot(createSnapshot([createItem({ purpose: '   ' })])),
    ).toThrow('목적 값이 비어 있습니다');

    expect(() => validateTimelineSnapshot(createSnapshot([createItem({ intent: '   ' })]))).toThrow(
      '의도 값이 비어 있습니다',
    );

    expect(() =>
      validateTimelineSnapshot(createSnapshot([createItem({ outcome: '   ' })])),
    ).toThrow('성과 값이 비어 있습니다');

    expect(() =>
      validateTimelineSnapshot(createSnapshot([createItem({ outcome: '[성과를 작성합니다.]' })])),
    ).toThrow('목업 문구가 남아 있습니다');

    expect(() =>
      validateTimelineSnapshot(
        createSnapshot([createItem({ status: 'draft', purpose: '', intent: '', outcome: '' })]),
      ),
    ).not.toThrow();
  });

  it('rejects generic and overly long published titles', () => {
    expect(() =>
      validateTimelineSnapshot(createSnapshot([createItem({ title: '프로젝트 B' })])),
    ).toThrow('문제나 기여 내용');
    expect(() =>
      validateTimelineSnapshot(createSnapshot([createItem({ title: '긴'.repeat(37) })])),
    ).toThrow('36자 이하');
  });

  it('requires at least one published record per category only at the publish gate', () => {
    const buildOnly = createSnapshot([createItem()]);
    expect(() => validateTimelineSnapshot(buildOnly)).not.toThrow();
    expect(() => validateTimelineSnapshot(buildOnly, { requirePublicationReady: true })).toThrow(
      'work 분류',
    );

    const publicationReady = createSnapshot([
      createItem({ id: 'build-item', title: '탐색 흐름 개선 경험' }),
      createItem({ id: 'work-item', title: '협업 기준 정리 경험', category: 'work' }),
      createItem({ id: 'grow-item', title: '접근성 검증 개선 경험', category: 'grow' }),
    ]);
    expect(() =>
      validateTimelineSnapshot(publicationReady, { requirePublicationReady: true }),
    ).not.toThrow();

    const crowded = createSnapshot(
      Array.from({ length: 10 }, (_, index) =>
        createItem({ id: `item-${index}`, startDate: '2025-10-01' }),
      ),
    );
    expect(getPublicationWarnings(crowded)).toHaveLength(1);

    expect(getPublicationWarnings(createSnapshot([createItem({ title: '짧음' })]))).toContain(
      'item-a의 제목은 8–24자를 권장합니다.',
    );
  });
});
