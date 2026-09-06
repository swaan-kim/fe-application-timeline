import type { ContentDiagnostic } from './content-diagnostic.ts';
import {
  collectTimelineDiagnostics,
  subtractCalendarMonths,
  toEpochDay,
  type TimelineAnnotation,
} from './timeline.ts';

export interface ApplicationConfig {
  name: string;
  role: string;
  submissionDate: string;
  chartStartDate?: string;
  chartAnnotations?: readonly TimelineAnnotation[];
  githubUrl: string;
  /** Explicit consent to expose these drafts, including unfinished sections. */
  publicDraftIds?: readonly string[];
}

export interface ApplicationConfigValidationPolicy {
  requirePublicationReady?: boolean;
}

function isGitHubProfileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const segments = url.pathname.split('/').filter(Boolean);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'github.com' &&
      segments.length === 1 &&
      url.search === '' &&
      url.hash === ''
    );
  } catch {
    return false;
  }
}

export function validateApplicationConfig(
  config: ApplicationConfig,
  policy: ApplicationConfigValidationPolicy = {},
): ApplicationConfig {
  const diagnostics = collectApplicationConfigDiagnostics(config, policy);
  if (diagnostics.length) throw new Error(diagnostics.map((issue) => issue.message).join('\n'));
  return config;
}

export function collectApplicationConfigDiagnostics(
  config: ApplicationConfig,
  policy: ApplicationConfigValidationPolicy = {},
): ContentDiagnostic[] {
  const issues: ContentDiagnostic[] = [];
  const add = (field: string, message: string) =>
    issues.push({ severity: 'error', file: 'application.config.ts', field, message });
  if (!config.name.trim()) add('name', '지원자 이름이 비어 있습니다.');
  if (!config.role.trim()) add('role', '지원 분야가 비어 있습니다.');
  if (config.publicDraftIds) {
    if (
      new Set(config.publicDraftIds).size !== config.publicDraftIds.length ||
      config.publicDraftIds.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id))
    ) {
      add(
        'publicDraftIds',
        '공개 초안 ID는 중복 없이 소문자 영문·숫자·하이픈으로 지정해야 합니다.',
      );
    }
  }
  if (config.chartStartDate !== undefined) {
    try {
      const chartStart = toEpochDay(config.chartStartDate);
      const contentStart = toEpochDay(subtractCalendarMonths(config.submissionDate, 12));
      const end = toEpochDay(config.submissionDate);
      if (chartStart < contentStart || chartStart >= end)
        add('chartStartDate', '표의 시작일은 콘텐츠 범위 안이며 기준일보다 빨라야 합니다.');
    } catch {
      add('chartStartDate', '표의 시작일과 기준일은 실제 YYYY-MM-DD 날짜여야 합니다.');
    }
  }

  const githubUrl = config.githubUrl.trim();
  if (config.chartAnnotations?.length) {
    try {
      const annotations = config.chartAnnotations;
      for (const item of annotations) {
        if (item.chartOnly !== true)
          add('chartAnnotations', `${item.id}: 표 전용 항목이어야 합니다.`);
      }
      const diagnostics = collectTimelineDiagnostics({
        startDate: subtractCalendarMonths(config.submissionDate, 12),
        endDate: config.submissionDate,
        items: annotations.map((item) => ({
          ...item,
          status: 'draft',
          purpose: '',
          intent: '',
          outcome: '',
        })),
      });
      for (const issue of diagnostics) add(`chartAnnotations.${issue.field}`, issue.message);
    } catch {
      add('chartAnnotations', '표 전용 항목의 날짜와 기준일을 확인해 주세요.');
    }
  }
  if (githubUrl && !isGitHubProfileUrl(githubUrl)) {
    add('githubUrl', 'GitHub 주소는 https://github.com/<username> 형식이어야 합니다.');
  }
  if (policy.requirePublicationReady && !githubUrl) {
    add('githubUrl', '게시하려면 GitHub 프로필 주소가 필요합니다.');
  }

  return issues;
}
