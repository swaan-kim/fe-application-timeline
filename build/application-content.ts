import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { APPLICATION_CONFIG } from '../src/content/application.config.ts';
import { isExperienceMediaPath } from '../src/domain/experience-media.ts';
import { TECHNOLOGY_IDS } from '../src/domain/technology.ts';
import type { ApplicationConfig } from '../src/domain/application-config.ts';
import { formatDiagnostic, type ContentDiagnostic } from '../src/domain/content-diagnostic.ts';
import {
  EXPERIENCE_STATUSES,
  TIMELINE_CATEGORIES,
  subtractCalendarMonths,
  collectTimelineDiagnostics,
  getPublicationWarnings,
  isPublicTimelineItem,
  type TimelineItem,
  type TimelineSnapshot,
} from '../src/domain/timeline.ts';

const SECTION_NAMES = ['목적', '의도', '성과'] as const;
const SAFE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRONTMATTER_SCHEMA = z
  .object({
    title: z.string().trim().min(1),
    technologies: z
      .array(z.enum(TECHNOLOGY_IDS))
      .max(4, '핵심 기술은 최대 4개만 표시합니다.')
      .refine((values) => new Set(values).size === values.length, '중복 기술은 제거합니다.')
      .optional(),
    category: z.enum(TIMELINE_CATEGORIES),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    status: z.enum(EXPERIENCE_STATUSES),
    ongoing: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .strict();
const ALLOWED_MARKDOWN_NODES = new Set([
  'root',
  'heading',
  'paragraph',
  'text',
  'strong',
  'emphasis',
  'link',
  'list',
  'listItem',
  'break',
  'image',
]);

interface LoadApplicationContentOptions {
  rootDir: string;
  includeDrafts: boolean;
  includeArchived?: boolean;
  config?: ApplicationConfig;
  requirePublicationReady?: boolean;
}

function describeFile(fileName: string, message: string): Error {
  return new Error(`${fileName}: ${message}`);
}

function splitFrontmatter(source: string, fileName: string) {
  const normalized = source.replace(/\r\n?/gu, '\n');
  const lines = normalized.split('\n');
  if (lines[0] !== '---') {
    throw describeFile(fileName, '파일 첫 줄에 frontmatter 여는 `---`가 필요합니다.');
  }
  const closingIndex = lines.indexOf('---', 1);
  if (closingIndex === -1) {
    throw describeFile(fileName, 'frontmatter 닫는 `---`가 필요합니다.');
  }

  return {
    yaml: lines.slice(1, closingIndex).join('\n'),
    body: lines.slice(closingIndex + 1).join('\n'),
  };
}

function parseFrontmatter(source: string, fileName: string) {
  const document = parseDocument(source, {
    schema: 'failsafe',
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw describeFile(fileName, `frontmatter를 읽을 수 없습니다: ${document.errors[0]?.message}`);
  }

  const result = FRONTMATTER_SCHEMA.safeParse(document.toJS({ maxAliasCount: 0 }));
  if (!result.success) {
    throw describeFile(
      fileName,
      result.error.issues
        .map(
          (issue) =>
            `frontmatter의 ${issue.path.join('.') || '값'}이 올바르지 않습니다: ${issue.message}`,
        )
        .join('\n'),
    );
  }
  return result.data;
}

interface MarkdownNode {
  type: string;
  alt?: string | null;
  depth?: number;
  url?: string;
  value?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

function getPlainText(node: MarkdownNode): string {
  if (typeof node.value === 'string') return node.value;
  return node.children?.map(getPlainText).join('') ?? '';
}

function getSemanticText(markdown: string): string {
  return getPlainText(fromMarkdown(markdown)).replace(/\s+/gu, ' ').trim();
}

function validateMarkdownNode(node: MarkdownNode, fileName: string, parent?: MarkdownNode): void {
  if (!ALLOWED_MARKDOWN_NODES.has(node.type)) {
    throw describeFile(fileName, `지원하지 않는 Markdown 요소입니다: ${node.type}`);
  }
  if (node.type === 'heading' && node.depth !== 2) {
    throw describeFile(fileName, '본문 제목은 목적·의도·성과를 나타내는 H2만 사용할 수 있습니다.');
  }
  if (node.type === 'link') {
    const url = node.url ?? '';
    if (!/^(https?:|mailto:)/u.test(url)) {
      throw describeFile(fileName, `링크는 https 또는 mailto 주소만 사용할 수 있습니다: ${url}`);
    }
  }
  if (node.type === 'image') {
    if (parent?.type !== 'paragraph' || parent.children?.length !== 1) {
      throw describeFile(fileName, '이미지는 다른 글이나 링크 없이 독립된 문단으로 작성합니다.');
    }
    if (!node.alt?.trim() || !isExperienceMediaPath(node.url ?? '')) {
      throw describeFile(
        fileName,
        '이미지는 설명과 /media/experiences/<id>/<파일명> 경로가 필요합니다.',
      );
    }
  }
  node.children?.forEach((child) => validateMarkdownNode(child, fileName, node));
}

function parseSections(
  content: string,
  fileName: string,
): Pick<TimelineItem, 'purpose' | 'intent' | 'outcome'> & { semanticText: string[] } {
  const tree = fromMarkdown(content) as MarkdownNode;
  validateMarkdownNode(tree, fileName);
  const headings = (tree.children ?? []).filter((node) => node.type === 'heading');
  const names = headings.map(getPlainText);

  if (
    names.length !== SECTION_NAMES.length ||
    !SECTION_NAMES.every((section, index) => names[index] === section)
  ) {
    throw describeFile(
      fileName,
      '`## 목적`, `## 의도`, `## 성과`를 이 순서로 한 번씩 작성해야 합니다.',
    );
  }

  const firstHeadingOffset = headings[0]?.position?.start.offset;
  if (typeof firstHeadingOffset !== 'number' || content.slice(0, firstHeadingOffset).trim()) {
    throw describeFile(fileName, '`## 목적` 앞에는 본문을 작성할 수 없습니다.');
  }

  const values = headings.map((heading, index) => {
    const start = heading.position?.end.offset;
    const end = headings[index + 1]?.position?.start.offset ?? content.length;
    if (typeof start !== 'number' || typeof end !== 'number') {
      throw describeFile(fileName, 'Markdown 위치를 확인할 수 없습니다.');
    }
    return content.slice(start, end).trim();
  });

  return {
    purpose: values[0] ?? '',
    intent: values[1] ?? '',
    outcome: values[2] ?? '',
    semanticText: values.map(getSemanticText),
  };
}

export function parseExperienceMarkdown(source: string, fileName: string): TimelineItem {
  const id = path.basename(fileName, path.extname(fileName));
  if (!SAFE_ID_PATTERN.test(id)) {
    throw describeFile(fileName, '파일명은 소문자 영문·숫자·하이픈만 사용할 수 있습니다.');
  }

  const sourceParts = splitFrontmatter(source, fileName);
  const data = parseFrontmatter(sourceParts.yaml, fileName);
  const sections = parseSections(sourceParts.body, fileName);

  if (data.status === 'published') {
    const empty = SECTION_NAMES.filter((_, index) => !sections.semanticText[index]);
    if (empty.length)
      throw describeFile(
        fileName,
        empty.map((name) => `게시할 ${name} 섹션에 실제 내용이 필요합니다.`).join('\n'),
      );
  }

  return {
    id,
    ...data,
    purpose: sections.purpose,
    intent: sections.intent,
    outcome: sections.outcome,
  };
}

function quoteYaml(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function serializeExperienceMarkdown(item: TimelineItem): string {
  const frontmatter = [
    '---',
    `title: ${quoteYaml(item.title)}`,
    ...(item.technologies ? [`technologies: [${item.technologies.join(', ')}]`] : []),
    `category: ${item.category}`,
    `startDate: ${quoteYaml(item.startDate)}`,
    ...(item.endDate ? [`endDate: ${quoteYaml(item.endDate)}`] : []),
    ...(item.ongoing !== undefined ? [`ongoing: ${item.ongoing}`] : []),
    `status: ${item.status}`,
    '---',
  ];
  const section = (title: (typeof SECTION_NAMES)[number], value: string) =>
    `## ${title}\n\n${value.trim()}`.trimEnd();

  return `${frontmatter.join('\n')}\n\n${section('목적', item.purpose)}\n\n${section('의도', item.intent)}\n\n${section('성과', item.outcome)}\n`;
}

export function hashContent(content: string): string {
  const normalized = content.replace(/\r\n?/gu, '\n').replace(/\s*$/u, '\n');
  return `sha256:${createHash('sha256').update(normalized, 'utf8').digest('hex')}`;
}

export async function inspectApplicationContent({
  rootDir,
  includeDrafts,
  includeArchived = false,
  config = APPLICATION_CONFIG,
  requirePublicationReady = false,
}: LoadApplicationContentOptions): Promise<{
  snapshot: TimelineSnapshot;
  diagnostics: ContentDiagnostic[];
}> {
  const contentDir = path.join(rootDir, 'content', 'experiences');
  const fileNames = (await readdir(contentDir))
    .filter((fileName) => fileName.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right));

  const diagnostics: ContentDiagnostic[] = [];
  const items: TimelineItem[] = [];
  for (const fileName of fileNames) {
    try {
      items.push(
        parseExperienceMarkdown(await readFile(path.join(contentDir, fileName), 'utf8'), fileName),
      );
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        file: fileName,
        field: 'Markdown',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  let startDate = config.submissionDate;
  try {
    startDate = subtractCalendarMonths(config.submissionDate, 12);
  } catch {
    diagnostics.push({
      severity: 'error',
      file: 'application.config.ts',
      field: 'submissionDate',
      message: '기준일은 실제 YYYY-MM-DD 날짜여야 합니다.',
    });
  }
  const snapshot = { startDate, endDate: config.submissionDate, items };
  diagnostics.push(
    ...collectTimelineDiagnostics(snapshot, {
      includeDrafts,
      requirePublicationReady,
      publicDraftIds: config.publicDraftIds,
    }),
  );
  diagnostics.push(
    ...getPublicationWarnings(snapshot).map((message): ContentDiagnostic => ({
      severity: 'warning',
      field: '게시',
      message,
    })),
  );

  return {
    diagnostics,
    snapshot: {
      ...snapshot,
      items: snapshot.items.filter((item) => {
        if (includeArchived) return true;
        return includeDrafts
          ? item.status !== 'archived'
          : isPublicTimelineItem(item, config.publicDraftIds);
      }),
    },
  };
}

export async function loadApplicationContent(
  options: LoadApplicationContentOptions,
): Promise<TimelineSnapshot> {
  const { snapshot, diagnostics } = await inspectApplicationContent(options);
  const errors = diagnostics.filter((issue) => issue.severity === 'error');
  if (errors.length) throw new Error(errors.map(formatDiagnostic).join('\n'));
  return snapshot;
}
