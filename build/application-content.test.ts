// @vitest-environment node

import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  hashContent,
  loadApplicationContent,
  inspectApplicationContent,
  parseExperienceMarkdown,
  serializeExperienceMarkdown,
} from './application-content.ts';

const temporaryDirectories: string[] = [];

function createMarkdown(overrides: { frontmatter?: string; body?: string } = {}): string {
  return `---
title: '테스트 경험'
category: build
startDate: '2025-10-01'
endDate: '2025-10-31'
status: draft
${overrides.frontmatter ?? ''}---

${overrides.body ?? '## 목적\n\n목적 본문\n\n## 의도\n\n**의도 본문**\n\n## 성과\n\n- [성과 링크](https://example.com)'}
`;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('experience Markdown contract', () => {
  it('preserves local media and rejects unsafe, remote, or undescribed images', () => {
    const image = '![슬라이드 예시](/media/experiences/sample-item/slide.png)';
    const source = createMarkdown({
      body: `## 목적\n\n목적\n\n## 의도\n\n의도\n\n## 성과\n\n성과\n\n${image}`,
    });
    const item = parseExperienceMarkdown(source, 'sample-item.md');
    expect(item.outcome).toContain(image);
    expect(parseExperienceMarkdown(serializeExperienceMarkdown(item), 'sample-item.md')).toEqual(
      item,
    );
    for (const replacement of [
      '![설명](https://example.com/image.png)',
      '![](/media/experiences/sample-item/slide.png)',
      '![설명](/media/experiences/sample-item/../slide.png)',
      '![설명](/media/experiences/sample-item/slide.svg)',
      `[${image}](https://example.com)`,
    ]) {
      expect(() =>
        parseExperienceMarkdown(source.replace(image, replacement), 'sample-item.md'),
      ).toThrow('이미지');
    }
  });
  it('exposes only explicitly approved drafts and never resurrects archived content', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'fe-public-drafts-'));
    temporaryDirectories.push(rootDir);
    const directory = path.join(rootDir, 'content', 'experiences');
    await mkdir(directory, { recursive: true });
    for (const category of ['build', 'work', 'grow']) {
      await writeFile(
        path.join(directory, `${category}-approved.md`),
        createMarkdown({ body: '## 목적\n\n## 의도\n\n## 성과' }).replace(
          'category: build',
          `category: ${category}`,
        ),
      );
    }
    await writeFile(path.join(directory, 'new-draft.md'), createMarkdown());
    await writeFile(
      path.join(directory, 'archived.md'),
      createMarkdown().replace('status: draft', 'status: archived'),
    );
    const config = {
      name: '테스트',
      role: 'Frontend',
      submissionDate: '2026-09-03',
      githubUrl: '',
      publicDraftIds: ['build-approved', 'work-approved', 'grow-approved', 'archived'],
    };
    const snapshot = await loadApplicationContent({
      rootDir,
      includeDrafts: false,
      requirePublicationReady: true,
      config,
    });
    expect(snapshot.items.map((item) => item.id)).toEqual([
      'build-approved',
      'grow-approved',
      'work-approved',
    ]);
    expect(snapshot.items.every((item) => item.status === 'draft' && item.purpose === '')).toBe(
      true,
    );
    expect(
      (
        await loadApplicationContent({
          rootDir,
          includeDrafts: false,
          config: { ...config, publicDraftIds: [] },
        })
      ).items,
    ).toEqual([]);
    await writeFile(
      path.join(directory, 'build-approved.md'),
      createMarkdown().replace('2025-10-01', '2025-02-01'),
    );
    await expect(loadApplicationContent({ rootDir, includeDrafts: false, config })).rejects.toThrow(
      '범위',
    );
  });
  it('preserves an explicit ongoing flag without confusing it with publication status', () => {
    for (const ongoing of [true, false]) {
      const item = parseExperienceMarkdown(
        createMarkdown({ frontmatter: `ongoing: ${ongoing}\n` }),
        'ongoing-item.md',
      );
      expect(item.ongoing).toBe(ongoing);
      expect(item.status).toBe('draft');
      expect(parseExperienceMarkdown(serializeExperienceMarkdown(item), 'ongoing-item.md')).toEqual(
        item,
      );
    }
    expect(() =>
      parseExperienceMarkdown(createMarkdown({ frontmatter: 'ongoing: yes\n' }), 'invalid-item.md'),
    ).toThrow('ongoing');
  });
  it('collects errors across files and publication categories even when content cannot be parsed', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'fe-content-diagnostics-'));
    temporaryDirectories.push(rootDir);
    const directory = path.join(rootDir, 'content', 'experiences');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'bad-a.md'), createMarkdown({ body: '잘못된 본문' }));
    await writeFile(
      path.join(directory, 'bad-b.md'),
      createMarkdown()
        .replace('category: build', 'category: invalid')
        .replace('status: draft', 'status: invalid'),
    );
    const result = await inspectApplicationContent({
      rootDir,
      includeDrafts: false,
      requirePublicationReady: true,
    });
    expect(result.diagnostics.filter((issue) => issue.severity === 'error')).toHaveLength(5);
    expect(result.diagnostics.map((issue) => issue.file)).toContain('bad-a.md');
    expect(result.diagnostics.find((issue) => issue.file === 'bad-b.md')?.message).toContain(
      'status',
    );
  });
  it('parses the exact metadata and purpose, intent, outcome sections', () => {
    const item = parseExperienceMarkdown(createMarkdown(), 'sample-item.md');

    expect(item).toMatchObject({
      id: 'sample-item',
      status: 'draft',
      category: 'build',
      purpose: '목적 본문',
      intent: '**의도 본문**',
      outcome: '- [성과 링크](https://example.com)',
    });
    expect(parseExperienceMarkdown(serializeExperienceMarkdown(item), 'sample-item.md')).toEqual(
      item,
    );
    expect(hashContent('한 줄\r\n')).toBe(hashContent('한 줄\n\n'));
  });

  it('rejects duplicate or unknown frontmatter and unsafe filenames', () => {
    expect(() =>
      parseExperienceMarkdown(createMarkdown({ frontmatter: "title: '중복'\n" }), 'sample.md'),
    ).toThrow('frontmatter를 읽을 수 없습니다');
    expect(() =>
      parseExperienceMarkdown(createMarkdown({ frontmatter: "unknown: '값'\n" }), 'sample.md'),
    ).toThrow('Unrecognized key');
    expect(() => parseExperienceMarkdown(createMarkdown(), 'Unsafe Name.md')).toThrow(
      '파일명은 소문자',
    );
  });

  it('rejects missing, reordered, extra, or unsupported Markdown structures', () => {
    expect(() =>
      parseExperienceMarkdown(
        createMarkdown({ body: '## 의도\n\n본문\n\n## 목적\n\n본문\n\n## 성과\n\n본문' }),
        'sample.md',
      ),
    ).toThrow('이 순서로');
    expect(() =>
      parseExperienceMarkdown(
        createMarkdown({
          body: '## 목적\n\n본문\n\n## 의도\n\n![이미지](https://example.com/a.png)\n\n## 성과\n\n본문',
        }),
        'sample.md',
      ),
    ).toThrow('이미지는 설명과');
    expect(() =>
      parseExperienceMarkdown(
        createMarkdown({
          body: '# 큰 제목\n\n## 목적\n\n본문\n\n## 의도\n\n본문\n\n## 성과\n\n본문',
        }),
        'sample.md',
      ),
    ).toThrow('H2만');
  });

  it('rejects Markdown-only empty sections when an experience is published', () => {
    const published = createMarkdown({
      body: '## 목적\n\n[ ](https://example.com)\n\n## 의도\n\n의도 본문\n\n## 성과\n\n성과 본문',
    }).replace('status: draft', 'status: published');

    expect(() => parseExperienceMarkdown(published, 'sample.md')).toThrow(
      '게시할 목적 섹션에 실제 내용',
    );
  });

  it('loads added files, observes deletion, and excludes drafts from production content', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'fe-content-'));
    temporaryDirectories.push(rootDir);
    const experiencesDir = path.join(rootDir, 'content', 'experiences');
    await mkdir(experiencesDir, { recursive: true });
    await writeFile(path.join(experiencesDir, 'first.md'), createMarkdown(), 'utf8');
    await writeFile(
      path.join(experiencesDir, 'second.md'),
      createMarkdown().replace('status: draft', 'status: published'),
      'utf8',
    );
    await writeFile(
      path.join(experiencesDir, 'archived.md'),
      createMarkdown().replace('status: draft', 'status: archived'),
      'utf8',
    );

    expect((await loadApplicationContent({ rootDir, includeDrafts: true })).items).toHaveLength(2);
    expect(
      (await loadApplicationContent({ rootDir, includeDrafts: true, includeArchived: true })).items,
    ).toHaveLength(3);
    expect(
      (await loadApplicationContent({ rootDir, includeDrafts: false })).items.map(
        (item) => item.id,
      ),
    ).toEqual(['second']);

    await unlink(path.join(experiencesDir, 'second.md'));
    expect((await loadApplicationContent({ rootDir, includeDrafts: true })).items).toHaveLength(1);
  });
});
