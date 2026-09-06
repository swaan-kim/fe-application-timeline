import { formatDiagnostic, type ContentDiagnostic } from './content-diagnostic.ts';
import type { TechnologyId } from './technology.ts';

export const TIMELINE_CATEGORIES = ['build', 'work', 'grow'] as const;
export const EXPERIENCE_STATUSES = ['draft', 'published', 'archived'] as const;

export type TimelineCategory = (typeof TIMELINE_CATEGORIES)[number];
export type ExperienceStatus = (typeof EXPERIENCE_STATUSES)[number];

export interface TimelineItem {
  id: string;
  status: ExperienceStatus;
  category: TimelineCategory;
  startDate: string;
  endDate?: string;
  ongoing?: boolean;
  title: string;
  technologies?: TechnologyId[];
  purpose: string;
  intent: string;
  outcome: string;
}

export interface TimelineSnapshot {
  startDate: string;
  endDate: string;
  items: readonly TimelineItem[];
}

/** Context shown only on the chart, without a detail page or reading-list entry. */
export type TimelineAnnotation = Pick<
  TimelineItem,
  'id' | 'category' | 'startDate' | 'endDate' | 'title'
> & { chartOnly: true };

export type TimelineChartItem = TimelineItem | TimelineAnnotation;
export type TimelineChartSnapshot = Omit<TimelineSnapshot, 'items'> & {
  items: readonly TimelineChartItem[];
};

export interface TimelinePlacement {
  item: TimelineItem;
  track: number;
}

export interface PackedTimeline {
  placements: readonly TimelinePlacement[];
  trackCountByCategory: Record<TimelineCategory, number>;
}

export interface MonthTick {
  id: string;
  date: string;
  label: string;
  position: number;
}

export interface ValidationPolicy {
  requirePublicationReady?: boolean;
  includeDrafts?: boolean;
  publicDraftIds?: readonly string[];
}

export function isPublicTimelineItem(
  item: TimelineItem,
  publicDraftIds: readonly string[] = [],
): boolean {
  return (
    item.status === 'published' || (item.status === 'draft' && publicDraftIds.includes(item.id))
  );
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SAFE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER_PATTERNS = [/^\s*\[[\s\S]+\]\s*$/, /작성합니다/u, /입력하세요/u, /내용 정리 중/u];
const GENERIC_TITLE_PATTERNS = [/^프로젝트(?:\s+[a-z0-9가-힣])?$/iu, /^(협업|학습)$/u];
const MAX_PUBLISHED_TITLE_LENGTH = 36;
const RECOMMENDED_TITLE_LENGTH = { min: 8, max: 24 } as const;

function toDateParts(value: string): { year: number; month: number; day: number } {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    throw new Error(`날짜는 YYYY-MM-DD 형식이어야 합니다: ${value}`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utc = new Date(Date.UTC(year, month - 1, day));

  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new Error(`존재하지 않는 날짜입니다: ${value}`);
  }

  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function assertText(value: string, field: string, itemId: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${itemId}의 ${field} 값이 비어 있습니다.`);
  }
}

function assertPublishableText(value: string, field: string, itemId: string): void {
  assertText(value, field, itemId);

  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error(`${itemId}의 ${field}에 목업 문구가 남아 있습니다.`);
  }
}

function assertPublishableTitle(value: string, itemId: string): void {
  assertPublishableText(value, '제목', itemId);
  const title = value.trim();
  if (Array.from(title).length > MAX_PUBLISHED_TITLE_LENGTH) {
    throw new Error(`${itemId}의 제목은 ${MAX_PUBLISHED_TITLE_LENGTH}자 이하여야 합니다.`);
  }
  if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    throw new Error(`${itemId}의 제목에서 문제나 기여 내용을 알 수 없습니다.`);
  }
}

function getEffectiveDate(item: TimelineItem): string {
  return item.endDate ?? item.startDate;
}

function compareTimelineItemsAscending(left: TimelineItem, right: TimelineItem): number {
  return (
    toEpochDay(left.startDate) - toEpochDay(right.startDate) ||
    toEpochDay(getEffectiveDate(left)) - toEpochDay(getEffectiveDate(right)) ||
    left.id.localeCompare(right.id)
  );
}

export function toEpochDay(value: string): number {
  const { year, month, day } = toDateParts(value);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

export function subtractCalendarMonths(value: string, amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('개월 수는 0 이상의 정수여야 합니다.');
  }

  const { year, month, day } = toDateParts(value);
  const zeroBasedTargetMonth = year * 12 + (month - 1) - amount;
  const targetYear = Math.floor(zeroBasedTargetMonth / 12);
  const targetMonthIndex = ((zeroBasedTargetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();

  return toIsoDate(targetYear, targetMonthIndex + 1, Math.min(day, lastDay));
}

export function dateToPercentage(value: string, startDate: string, endDate: string): number {
  const start = toEpochDay(startDate);
  const end = toEpochDay(endDate);
  const current = toEpochDay(value);

  if (start >= end) {
    throw new Error('타임라인 시작일은 종료일보다 빨라야 합니다.');
  }

  if (current < start || current > end) {
    throw new Error(`날짜가 타임라인 범위를 벗어났습니다: ${value}`);
  }

  return ((current - start) / (end - start)) * 100;
}

export function createMonthTicks(startDate: string, endDate: string): MonthTick[] {
  if (toEpochDay(startDate) >= toEpochDay(endDate))
    throw new Error('타임라인 시작일은 종료일보다 빨라야 합니다.');
  const start = toDateParts(startDate);
  const end = toDateParts(endDate);
  const monthCount = (end.year - start.year) * 12 + end.month - start.month;
  const dates =
    monthCount === 0
      ? [startDate, endDate]
      : Array.from({ length: monthCount + 1 }, (_, index) =>
          subtractCalendarMonths(endDate, monthCount - index),
        );
  dates[0] = startDate;
  dates[dates.length - 1] = endDate;

  return dates.map((date, index) => {
    const { year, month } = toDateParts(date);
    const showYear = index === 0 || month === 1;

    return {
      id: `${date}-${index}`,
      date,
      label: showYear
        ? `${String(year).slice(-2)}.${String(month).padStart(2, '0')}`
        : String(month).padStart(2, '0'),
      position: dateToPercentage(date, startDate, endDate),
    };
  });
}

export function sortTimelineItemsNewestFirst(items: readonly TimelineItem[]): TimelineItem[] {
  return [...items].sort((left, right) => {
    return (
      toEpochDay(getEffectiveDate(right)) - toEpochDay(getEffectiveDate(left)) ||
      toEpochDay(right.startDate) - toEpochDay(left.startDate) ||
      left.id.localeCompare(right.id)
    );
  });
}

export function sortTimelineItemsOldestFirst(items: readonly TimelineItem[]): TimelineItem[] {
  return [...items].sort(compareTimelineItemsAscending);
}

export function groupTimelineItemsByCategory(
  items: readonly TimelineItem[],
): Record<TimelineCategory, TimelineItem[]> {
  const grouped: Record<TimelineCategory, TimelineItem[]> = {
    build: [],
    work: [],
    grow: [],
  };

  for (const item of sortTimelineItemsNewestFirst(items)) {
    grouped[item.category].push(item);
  }

  return grouped;
}

export function getExperienceReadingOrder(items: readonly TimelineItem[]): TimelineItem[] {
  const groups = groupTimelineItemsByCategory(items);
  return TIMELINE_CATEGORIES.flatMap((category) => groups[category]);
}

export function packTimelineItems(items: readonly TimelineItem[]): PackedTimeline {
  const tracksById = new Map<string, number>();
  const trackCountByCategory: Record<TimelineCategory, number> = {
    build: 1,
    work: 1,
    grow: 1,
  };

  for (const category of TIMELINE_CATEGORIES) {
    const categoryItems = items
      .filter((item) => item.category === category)
      .sort(compareTimelineItemsAscending);
    const trackEndDays: number[] = [];

    for (const item of categoryItems) {
      const startDay = toEpochDay(item.startDate);
      const endDay = toEpochDay(getEffectiveDate(item));
      let track = trackEndDays.findIndex((trackEnd) => trackEnd < startDay);

      if (track === -1) {
        track = trackEndDays.length;
      }

      trackEndDays[track] = endDay;
      tracksById.set(item.id, track);
    }

    trackCountByCategory[category] = Math.max(1, trackEndDays.length);
  }

  return {
    placements: items.map((item) => ({ item, track: tracksById.get(item.id) ?? 0 })),
    trackCountByCategory,
  };
}

export function collectTimelineDiagnostics(
  snapshot: TimelineSnapshot,
  policy: ValidationPolicy = {},
): ContentDiagnostic[] {
  const issues: ContentDiagnostic[] = [];
  const check = (field: string, action: () => unknown, file?: string) => {
    try {
      action();
    } catch (error) {
      issues.push({
        severity: 'error',
        field,
        file,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  let start: number | undefined;
  let end: number | undefined;
  check('startDate', () => {
    start = toEpochDay(snapshot.startDate);
  });
  check('endDate', () => {
    end = toEpochDay(snapshot.endDate);
  });
  if (start !== undefined && end !== undefined && start >= end) {
    issues.push({
      severity: 'error',
      field: '기간',
      message: '타임라인 시작일은 종료일보다 빨라야 합니다.',
    });
  }
  const ids = new Set<string>();
  for (const item of snapshot.items) {
    const file = `${item.id}.md`;
    const fail = (field: string, message: string) =>
      issues.push({ severity: 'error', file, field, message });
    if (!SAFE_ID_PATTERN.test(item.id))
      fail('id', `경험 ID는 소문자 영문·숫자·하이픈만 사용할 수 있습니다: ${item.id}`);
    if (ids.has(item.id)) fail('id', `중복된 경험 ID입니다: ${item.id}`);
    ids.add(item.id);
    if (!TIMELINE_CATEGORIES.includes(item.category))
      fail('category', `${item.id}의 분류가 올바르지 않습니다.`);
    if (!EXPERIENCE_STATUSES.includes(item.status))
      fail('status', `${item.id}의 상태가 올바르지 않습니다.`);
    if (item.ongoing !== undefined && typeof item.ongoing !== 'boolean')
      fail('ongoing', `${item.id}의 진행 중 여부는 true 또는 false여야 합니다.`);
    if (item.ongoing && !item.endDate)
      fail(
        'endDate',
        `${item.id}의 진행 중 기간에는 타임라인 표시 기준일까지의 endDate가 필요합니다.`,
      );
    let itemStart: number | undefined;
    let itemEnd: number | undefined;
    check(
      'startDate',
      () => {
        itemStart = toEpochDay(item.startDate);
      },
      file,
    );
    if (item.endDate !== undefined)
      check(
        'endDate',
        () => {
          itemEnd = toEpochDay(item.endDate!);
        },
        file,
      );
    if (itemStart !== undefined && itemEnd !== undefined && itemStart >= itemEnd) {
      fail('endDate', `${item.id}의 종료일은 시작일보다 늦어야 합니다.`);
    }
    const visible =
      isPublicTimelineItem(item, policy.publicDraftIds) ||
      (item.status === 'draft' && policy.includeDrafts !== false);
    if (visible && start !== undefined && end !== undefined) {
      if (itemStart !== undefined && (itemStart < start || itemStart > end))
        fail('startDate', `${item.id}의 시작일이 타임라인 범위를 벗어났습니다.`);
      if (itemEnd !== undefined && (itemEnd < start || itemEnd > end))
        fail('endDate', `${item.id}의 종료일이 타임라인 범위를 벗어났습니다.`);
    }
    if (item.status === 'published') {
      check('title', () => assertPublishableTitle(item.title, item.id), file);
      check('목적', () => assertPublishableText(item.purpose, '목적', item.id), file);
      check('의도', () => assertPublishableText(item.intent, '의도', item.id), file);
      check('성과', () => assertPublishableText(item.outcome, '성과', item.id), file);
    } else {
      check('title', () => assertText(item.title, '제목', item.id), file);
    }
  }
  if (policy.requirePublicationReady) {
    for (const category of TIMELINE_CATEGORIES) {
      if (
        !snapshot.items.some(
          (item) => isPublicTimelineItem(item, policy.publicDraftIds) && item.category === category,
        )
      ) {
        issues.push({
          severity: 'error',
          field: category,
          message: `게시하려면 ${category} 분류에 공개 경험이 1개 이상 있어야 합니다.`,
        });
      }
    }
  }
  return issues;
}

export function validateTimelineSnapshot(
  snapshot: TimelineSnapshot,
  policy: ValidationPolicy = {},
): TimelineSnapshot {
  const issues = collectTimelineDiagnostics(snapshot, policy);
  if (issues.length) throw new Error(issues.map(formatDiagnostic).join('\n'));
  return snapshot;
}

export function getPublicationWarnings(snapshot: TimelineSnapshot): string[] {
  const publishedCount = snapshot.items.filter((item) => item.status === 'published').length;
  const warnings =
    publishedCount > 9
      ? [`공개 경험이 ${publishedCount}개입니다. 첫 화면 탐색성을 위해 9개 이하를 권장합니다.`]
      : [];

  for (const item of snapshot.items.filter((candidate) => candidate.status === 'published')) {
    const length = Array.from(item.title.trim()).length;
    if (length < RECOMMENDED_TITLE_LENGTH.min || length > RECOMMENDED_TITLE_LENGTH.max) {
      warnings.push(
        `${item.id}의 제목은 ${RECOMMENDED_TITLE_LENGTH.min}–${RECOMMENDED_TITLE_LENGTH.max}자를 권장합니다.`,
      );
    }
  }

  return warnings;
}

export function formatCompactDate(value: string): string {
  const { year, month } = toDateParts(value);
  return `${year}.${String(month).padStart(2, '0')}`;
}

export function formatDateForSpeech(value: string): string {
  const { year, month } = toDateParts(value);
  return `${year}년 ${month}월`;
}

export function getItemEndLabel(
  item: Pick<TimelineItem, 'startDate' | 'endDate' | 'ongoing'>,
): string | undefined {
  if (item.ongoing) return '현재';
  if (!item.endDate) return undefined;
  const end = formatCompactDate(item.endDate);
  return end === formatCompactDate(item.startDate) ? undefined : end;
}

export function formatItemDate(item: TimelineItem): string {
  const start = formatCompactDate(item.startDate);
  const end = getItemEndLabel(item);
  return end ? `${start} — ${end}` : start;
}

export function formatItemDateForSpeech(
  item: Pick<TimelineItem, 'startDate' | 'endDate' | 'ongoing'>,
): string {
  const start = formatDateForSpeech(item.startDate);
  if (item.ongoing) return `${start}부터 현재까지 진행 중`;
  return item.endDate && getItemEndLabel(item)
    ? `${start}부터 ${formatDateForSpeech(item.endDate)}까지`
    : start;
}
