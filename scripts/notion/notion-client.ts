import { setTimeout as delay } from 'node:timers/promises';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Root, RootContent, PhrasingContent, Paragraph, ListItem } from 'mdast';
import type {
  ExperienceStatus,
  TimelineCategory,
  TimelineItem,
} from '../../src/domain/timeline.ts';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_API_VERSION = '2026-03-11';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_LINK_PATTERN = /^(https?:|mailto:)/u;

type UnknownRecord = Record<string, unknown>;

export interface RemoteExperience {
  item: TimelineItem;
  pageId: string;
  lastEditedTime: string;
}

interface NotionClientOptions {
  token: string;
  dataSourceId: string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<unknown>;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) throw new Error(`${context} 응답 형식이 올바르지 않습니다.`);
  return value;
}

function requireString(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${context} 값이 필요합니다.`);
  }
  return value.trim();
}

function requireText(value: unknown, context: string): string {
  if (typeof value !== 'string') throw new Error(`${context} 응답 형식이 올바르지 않습니다.`);
  return value;
}

function requireArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${context} 응답 형식이 올바르지 않습니다.`);
  return value;
}

function getProperty(page: UnknownRecord, name: string): UnknownRecord {
  const properties = requireRecord(page.properties, 'Notion properties');
  return requireRecord(properties[name], `Notion 속성 '${name}'`);
}

function getRichTextPlainText(value: unknown, context: string): string {
  return requireArray(value, context)
    .map((entry) => requireText(requireRecord(entry, context).plain_text, context))
    .join('')
    .trim();
}

function getTitle(page: UnknownRecord): string {
  const property = getProperty(page, '제목');
  return requireString(getRichTextPlainText(property.title, "'제목'"), "'제목'");
}

function getSlug(page: UnknownRecord): string {
  const property = getProperty(page, 'Slug');
  return requireString(getRichTextPlainText(property.rich_text, "'Slug'"), "'Slug'");
}

function getSelect(page: UnknownRecord, name: string): string {
  const property = getProperty(page, name);
  const selected = requireRecord(property.select, `Notion 속성 '${name}'`);
  return requireString(selected.name, `Notion 속성 '${name}'`);
}

function getPeriod(page: UnknownRecord): { startDate: string; endDate?: string } {
  const property = getProperty(page, '기간');
  const date = requireRecord(property.date, "Notion 속성 '기간'");
  const startDate = requireString(date.start, "Notion 속성 '기간' 시작일");
  const endDate =
    date.end === null || date.end === undefined
      ? undefined
      : requireString(date.end, "Notion 속성 '기간' 종료일");

  if (!DATE_PATTERN.test(startDate) || (endDate && !DATE_PATTERN.test(endDate))) {
    throw new Error("Notion 속성 '기간'은 시간이 없는 YYYY-MM-DD 날짜여야 합니다.");
  }
  return { startDate, ...(endDate ? { endDate } : {}) };
}

function toCategory(value: string): TimelineCategory {
  const normalized = value.toLowerCase();
  if (normalized === 'build' || normalized === 'work' || normalized === 'grow') return normalized;
  throw new Error(`Notion Category는 Build, Work, Grow 중 하나여야 합니다: ${value}`);
}

function toStatus(value: string): ExperienceStatus {
  const normalized = value.toLowerCase();
  if (normalized === 'draft' || normalized === 'published' || normalized === 'archived') {
    return normalized;
  }
  throw new Error(`Notion 상태는 Draft, Published, Archived 중 하나여야 합니다: ${value}`);
}

function mergePhrasing(nodes: PhrasingContent[]): PhrasingContent[] {
  const merged: PhrasingContent[] = [];
  for (const node of nodes) {
    const previous = merged.at(-1);
    if (node.type === 'text' && previous?.type === 'text') previous.value += node.value;
    else if ((node.type === 'strong' || node.type === 'emphasis') && previous?.type === node.type) {
      previous.children = mergePhrasing([...previous.children, ...node.children]);
    } else if (node.type === 'link' && previous?.type === 'link' && node.url === previous.url) {
      previous.children = mergePhrasing([...previous.children, ...node.children]);
    } else merged.push(node);
  }
  return merged;
}

function renderRichText(value: unknown, context: string): PhrasingContent[] {
  const nodes = requireArray(value, context).flatMap((entryValue): PhrasingContent[] => {
    const entry = requireRecord(entryValue, context);
    if (entry.type !== 'text')
      throw new Error(`${context}에는 일반 텍스트와 링크만 사용할 수 있습니다.`);
    const annotations = requireRecord(entry.annotations, `${context} 서식`);
    if (annotations.code || annotations.strikethrough || annotations.underline) {
      throw new Error(`${context}에는 굵게와 기울임 외의 텍스트 서식을 사용할 수 없습니다.`);
    }
    const text = requireText(entry.plain_text, context);
    if (!text) return [];
    let nodes: PhrasingContent[] = text
      .replace(/\r\n?/gu, '\n')
      .split('\n')
      .flatMap((line, index): PhrasingContent[] => [
        ...(index ? [{ type: 'break' as const }] : []),
        ...(line ? [{ type: 'text' as const, value: line }] : []),
      ]);
    if (annotations.italic) nodes = [{ type: 'emphasis', children: nodes }];
    if (annotations.bold) nodes = [{ type: 'strong', children: nodes }];
    if (entry.href !== null && entry.href !== undefined) {
      const href = requireString(entry.href, `${context} 링크`);
      if (!SAFE_LINK_PATTERN.test(href))
        throw new Error(`${context} 링크는 http, https 또는 mailto 주소만 사용할 수 있습니다.`);
      nodes = [{ type: 'link', url: href, children: nodes }];
    }
    return nodes;
  });
  return mergePhrasing(nodes);
}

function getBlockRichText(block: UnknownRecord, type: string): unknown {
  return requireRecord(block[type], `Notion ${type} 블록`).rich_text;
}

// Compare readable text, block order, list kinds and URLs, not serializer whitespace/style placement.
function meaning(node: Root | RootContent | PhrasingContent): unknown[] {
  if (node.type === 'text') return node.value ? [node.value] : [];
  const children = 'children' in node ? node.children.flatMap((child) => meaning(child)) : [];
  const merged: unknown[] = [];
  for (const child of children) {
    const previous = merged.at(-1);
    if (typeof child === 'string' && typeof previous === 'string')
      merged[merged.length - 1] = previous + child;
    else merged.push(child);
  }
  if (node.type === 'strong' || node.type === 'emphasis' || node.type === 'root') return merged;
  if (node.type === 'paragraph' && !merged.length) return [];
  return [
    {
      type: node.type,
      ...(node.type === 'link' ? { url: node.url } : {}),
      ...(node.type === 'list' ? { ordered: node.ordered ?? false } : {}),
      children: merged,
    },
  ];
}

function serializeSection(children: RootContent[], pageId: string): string {
  const root: Root = { type: 'root', children };
  const markdown = toMarkdown(root, { bullet: '-', emphasis: '*', strong: '*' }).trim();
  if (JSON.stringify(meaning(root)) !== JSON.stringify(meaning(fromMarkdown(markdown)))) {
    throw new Error(
      `Notion 페이지 ${pageId}의 텍스트 또는 링크를 손실 없이 변환할 수 없습니다. 서식을 확인해주세요.`,
    );
  }
  return markdown;
}

function parsePageSections(blocks: UnknownRecord[], pageId: string) {
  const sectionOrder = ['목적', '의도', '성과'] as const;
  const sections: Record<(typeof sectionOrder)[number], RootContent[]> = {
    목적: [],
    의도: [],
    성과: [],
  };
  let currentSection: (typeof sectionOrder)[number] | undefined;
  let headingIndex = 0;
  for (const block of blocks) {
    if (block.has_children === true)
      throw new Error(`Notion 페이지 ${pageId}에는 중첩 블록을 사용할 수 없습니다.`);
    const type = requireString(block.type, `Notion 페이지 ${pageId} 블록 타입`);
    if (type === 'heading_2') {
      const heading = getRichTextPlainText(
        getBlockRichText(block, type),
        `Notion 페이지 ${pageId} 제목`,
      );
      if (heading !== sectionOrder[headingIndex])
        throw new Error(
          `Notion 페이지 ${pageId}는 목적, 의도, 성과 제목을 이 순서로 가져야 합니다.`,
        );
      currentSection = heading;
      headingIndex += 1;
      continue;
    }
    if (!currentSection)
      throw new Error(`Notion 페이지 ${pageId}에서 목적 제목 앞에는 본문을 둘 수 없습니다.`);
    if (!['paragraph', 'bulleted_list_item', 'numbered_list_item'].includes(type)) {
      throw new Error(`Notion 페이지 ${pageId}에서 지원하지 않는 블록입니다: ${type}`);
    }
    const children = renderRichText(getBlockRichText(block, type), `Notion 페이지 ${pageId} 본문`);
    const paragraph: Paragraph = { type: 'paragraph', children };
    const section = sections[currentSection];
    if (type === 'paragraph') {
      if (children.length) section.push(paragraph);
    } else {
      const ordered = type === 'numbered_list_item';
      const previous = section.at(-1);
      const listItem: ListItem = { type: 'listItem', children: [paragraph] };
      if (previous?.type === 'list' && previous.ordered === ordered)
        previous.children.push(listItem);
      else section.push({ type: 'list', ordered, children: [listItem] });
    }
  }
  if (headingIndex !== sectionOrder.length)
    throw new Error(`Notion 페이지 ${pageId}에는 목적, 의도, 성과 제목이 모두 필요합니다.`);
  return {
    purpose: serializeSection(sections.목적, pageId),
    intent: serializeSection(sections.의도, pageId),
    outcome: serializeSection(sections.성과, pageId),
  };
}

export class NotionContentClient {
  readonly #token: string;
  readonly #dataSourceId: string;
  readonly #fetch: typeof fetch;
  readonly #sleep: (milliseconds: number) => Promise<unknown>;

  constructor({ token, dataSourceId, fetchImpl = fetch, sleep = delay }: NotionClientOptions) {
    this.#token = token;
    this.#dataSourceId = dataSourceId;
    this.#fetch = fetchImpl;
    this.#sleep = sleep;
  }

  async #request(pathname: string, init: RequestInit = {}): Promise<UnknownRecord> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.#fetch(`${NOTION_API_BASE}${pathname}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.#token}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_API_VERSION,
          ...init.headers,
        },
      });

      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get('retry-after') ?? '1');
        await this.#sleep(Math.max(1, retryAfter) * 1000);
        continue;
      }

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 300);
        throw new Error(`Notion API 요청에 실패했습니다 (${response.status}): ${detail}`);
      }
      return requireRecord(await response.json(), 'Notion API');
    }
    throw new Error('Notion API 재시도 횟수를 초과했습니다.');
  }

  async #queryPages(): Promise<UnknownRecord[]> {
    const pages: UnknownRecord[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.#request(`/data_sources/${this.#dataSourceId}/query`, {
        method: 'POST',
        body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
      });
      pages.push(
        ...requireArray(response.results, 'Notion data source 결과').map((page) =>
          requireRecord(page, 'Notion page'),
        ),
      );
      cursor =
        response.has_more === true
          ? requireString(response.next_cursor, 'Notion next_cursor')
          : undefined;
    } while (cursor);

    return pages;
  }

  async #getBlocks(pageId: string): Promise<UnknownRecord[]> {
    const blocks: UnknownRecord[] = [];
    let cursor: string | undefined;

    do {
      const query = new URLSearchParams({ page_size: '100' });
      if (cursor) query.set('start_cursor', cursor);
      const response = await this.#request(`/blocks/${pageId}/children?${query.toString()}`);
      blocks.push(
        ...requireArray(response.results, `Notion 페이지 ${pageId} 블록`).map((block) =>
          requireRecord(block, 'Notion block'),
        ),
      );
      cursor =
        response.has_more === true
          ? requireString(response.next_cursor, 'Notion next_cursor')
          : undefined;
    } while (cursor);

    return blocks;
  }

  async getExperiences(): Promise<RemoteExperience[]> {
    const pages = await this.#queryPages();
    const experiences = await Promise.all(
      pages.map(async (page) => {
        const pageId = requireString(page.id, 'Notion page id');
        const item: TimelineItem = {
          id: getSlug(page),
          title: getTitle(page),
          category: toCategory(getSelect(page, 'Category')),
          status: toStatus(getSelect(page, '상태')),
          ...getPeriod(page),
          ...parsePageSections(await this.#getBlocks(pageId), pageId),
        };
        return {
          item,
          pageId,
          lastEditedTime: requireString(page.last_edited_time, 'Notion last_edited_time'),
        };
      }),
    );

    return experiences.sort((left, right) => left.item.id.localeCompare(right.item.id));
  }
}
