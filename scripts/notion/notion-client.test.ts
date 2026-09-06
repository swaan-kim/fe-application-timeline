// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { NotionContentClient } from './notion-client.ts';
import { fromMarkdown } from 'mdast-util-from-markdown';
import {
  parseExperienceMarkdown,
  serializeExperienceMarkdown,
} from '../../build/application-content.ts';

function richText(text: string, href: string | null = null) {
  return [
    {
      type: 'text',
      plain_text: text,
      href,
      annotations: {
        bold: false,
        italic: false,
        code: false,
        strikethrough: false,
        underline: false,
      },
    },
  ];
}

function createPage(id: string, slug: string, category: string, status = 'Draft') {
  return {
    object: 'page',
    id,
    last_edited_time: '2026-09-04T00:00:00.000Z',
    properties: {
      제목: { title: richText(`${slug} 제목`) },
      Slug: { rich_text: richText(slug) },
      Category: { select: { name: category } },
      기간: { date: { start: '2025-10-01', end: '2025-12-01' } },
      상태: { select: { name: status } },
    },
  };
}

function createBlocks() {
  return [
    { type: 'heading_2', has_children: false, heading_2: { rich_text: richText('목적') } },
    { type: 'paragraph', has_children: false, paragraph: { rich_text: richText('목적 본문') } },
    { type: 'heading_2', has_children: false, heading_2: { rich_text: richText('의도') } },
    {
      type: 'bulleted_list_item',
      has_children: false,
      bulleted_list_item: { rich_text: richText('판단 기준') },
    },
    { type: 'heading_2', has_children: false, heading_2: { rich_text: richText('성과') } },
    {
      type: 'paragraph',
      has_children: false,
      paragraph: { rich_text: richText('검증 문서', 'https://example.com') },
    },
  ];
}

describe('NotionContentClient', () => {
  it('paginates page blocks without losing section boundaries', async () => {
    const blocks = createBlocks();
    const fetchImpl: typeof fetch = vi.fn((input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      return Promise.resolve(
        Response.json(
          url.includes('/data_sources/')
            ? { results: [createPage('page-a', 'a', 'Build')], has_more: false }
            : url.includes('start_cursor=blocks-next')
              ? { results: blocks.slice(2), has_more: false }
              : { results: blocks.slice(0, 2), has_more: true, next_cursor: 'blocks-next' },
        ),
      );
    });
    const [result] = await new NotionContentClient({
      token: 'test',
      dataSourceId: 'test',
      fetchImpl,
    }).getExperiences();
    expect(result.item.outcome).toBe('[검증 문서](https://example.com)');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it.each([
    '성과 &copy; 연구',
    '`literal code`',
    '## 새 목표',
    '> 인용이 아닌 원문',
    '[대괄호] \\ 역슬래시',
    '1. 일반 텍스트',
    '첫 줄\n다음 줄',
  ])('preserves plain text: %s', async (text) => {
    const blocks = createBlocks();
    blocks[1].paragraph = { rich_text: richText(text) };
    const client = new NotionContentClient({
      token: 'test',
      dataSourceId: 'test',
      fetchImpl: vi.fn((input) =>
        Promise.resolve(
          Response.json(
            String(input).includes('/data_sources/')
              ? { results: [createPage('page-a', 'project-a', 'Build')], has_more: false }
              : { results: blocks, has_more: false },
          ),
        ),
      ),
    });
    const [remote] = await client.getExperiences();
    const parsed = parseExperienceMarkdown(
      serializeExperienceMarkdown(remote.item),
      'project-a.md',
    );
    const values = fromMarkdown(parsed.purpose).children.flatMap((node) =>
      node.type === 'paragraph'
        ? node.children.map((child) =>
            child.type === 'text' ? child.value : child.type === 'break' ? '\n' : '',
          )
        : [],
    );
    expect(values.join('')).toBe(text);
  });

  it('preserves adjacent formatting, whitespace and a link destination containing Markdown punctuation', async () => {
    const blocks = createBlocks();
    const entries = [
      ...richText(' 앞 '),
      ...richText('가'),
      ...richText('나'),
      ...richText(' 다', 'https://example.com/a)b?x=&copy;'),
    ];
    entries[1].annotations.bold = true;
    entries[2].annotations.bold = true;
    entries[1].annotations.italic = true;
    entries[2].annotations.italic = true;
    blocks[1].paragraph = { rich_text: entries };
    const client = new NotionContentClient({
      token: 'test',
      dataSourceId: 'test',
      fetchImpl: vi.fn((input) =>
        Promise.resolve(
          Response.json(
            String(input).includes('/data_sources/')
              ? { results: [createPage('page-a', 'project-a', 'Build')], has_more: false }
              : { results: blocks, has_more: false },
          ),
        ),
      ),
    });
    const [remote] = await client.getExperiences();
    expect(remote.item.purpose).toContain('가나');
    const node = fromMarkdown(remote.item.purpose).children[0];
    expect(node?.type).toBe('paragraph');
    if (node?.type === 'paragraph')
      expect(node.children.find((child) => child.type === 'link')).toMatchObject({
        url: 'https://example.com/a)b?x=&copy;',
      });
  });
  it('paginates the data source and maps the supported page template', async () => {
    const fetchImpl: typeof fetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.includes('/data_sources/')) {
        const bodyText = typeof init?.body === 'string' ? init.body : '{}';
        const body = JSON.parse(bodyText) as { start_cursor?: string };
        return Promise.resolve(
          Response.json(
            body.start_cursor
              ? {
                  results: [createPage('page-b', 'project-b', 'Work')],
                  has_more: false,
                  next_cursor: null,
                }
              : {
                  results: [createPage('page-a', 'project-a', 'Build')],
                  has_more: true,
                  next_cursor: 'next',
                },
          ),
        );
      }
      return Promise.resolve(
        Response.json({ results: createBlocks(), has_more: false, next_cursor: null }),
      );
    });

    const client = new NotionContentClient({
      token: 'secret',
      dataSourceId: 'source',
      fetchImpl,
    });
    const experiences = await client.getExperiences();

    expect(experiences.map(({ item }) => item.id)).toEqual(['project-a', 'project-b']);
    expect(experiences[0]?.item).toMatchObject({
      purpose: '목적 본문',
      intent: '- 판단 기준',
      outcome: '[검증 문서](https://example.com)',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('honors Retry-After for a rate-limited request', async () => {
    let attempts = 0;
    const sleep = vi.fn(() => Promise.resolve());
    const fetchImpl: typeof fetch = vi.fn((input: string | URL | Request) => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.resolve(
          new Response('rate limited', { status: 429, headers: { 'retry-after': '2' } }),
        );
      }
      const url = input instanceof Request ? input.url : input.toString();
      if (url.includes('/data_sources/')) {
        return Promise.resolve(Response.json({ results: [], has_more: false, next_cursor: null }));
      }
      return Promise.resolve(Response.json({ results: [], has_more: false, next_cursor: null }));
    });
    const client = new NotionContentClient({
      token: 'secret',
      dataSourceId: 'source',
      fetchImpl,
      sleep,
    });

    await expect(client.getExperiences()).resolves.toEqual([]);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('maps published and archived states without changing their meaning', async () => {
    const fetchImpl: typeof fetch = vi.fn((input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.includes('/data_sources/')) {
        return Promise.resolve(
          Response.json({
            results: [
              createPage('page-a', 'published-item', 'Build', 'Published'),
              createPage('page-b', 'archived-item', 'Grow', 'Archived'),
            ],
            has_more: false,
            next_cursor: null,
          }),
        );
      }
      return Promise.resolve(
        Response.json({ results: createBlocks(), has_more: false, next_cursor: null }),
      );
    });
    const client = new NotionContentClient({
      token: 'secret',
      dataSourceId: 'source',
      fetchImpl,
    });

    const experiences = await client.getExperiences();
    expect(Object.fromEntries(experiences.map(({ item }) => [item.id, item.status]))).toEqual({
      'published-item': 'published',
      'archived-item': 'archived',
    });
  });

  it('surfaces non-rate-limit API errors', async () => {
    const fetchImpl: typeof fetch = vi.fn(() =>
      Promise.resolve(new Response('forbidden', { status: 403 })),
    );
    const client = new NotionContentClient({
      token: 'secret',
      dataSourceId: 'source',
      fetchImpl,
    });

    await expect(client.getExperiences()).rejects.toThrow(
      'Notion API 요청에 실패했습니다 (403): forbidden',
    );
  });
});
