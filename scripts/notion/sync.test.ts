// @vitest-environment node

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  hashContent,
  parseExperienceMarkdown,
  serializeExperienceMarkdown,
} from '../../build/application-content.ts';
import type { TimelineItem } from '../../src/domain/timeline.ts';
import type { RemoteExperience } from './notion-client.ts';
import {
  applyNotionPreview,
  createSyncPlan,
  stageNotionPreview,
  type LocalDocument,
  type SyncState,
} from './sync.ts';

const temporaryDirectories: string[] = [];

function createItem(overrides: Partial<TimelineItem> = {}): TimelineItem {
  return {
    id: 'project-a',
    status: 'draft',
    category: 'build',
    startDate: '2025-10-01',
    endDate: '2025-12-01',
    title: '프로젝트 A',
    purpose: '목적',
    intent: '의도',
    outcome: '성과',
    ...overrides,
  };
}

function createRemote(item = createItem()): RemoteExperience {
  return { item, pageId: `page-${item.id}`, lastEditedTime: '2026-09-04T00:00:00.000Z' };
}

function createLocal(item = createItem()): LocalDocument {
  const content = serializeExperienceMarkdown(item);
  return {
    content,
    hash: hashContent(content),
    canonicalHash: hashContent(content),
    item,
  };
}

function createState(local: LocalDocument, item = local.item): SyncState {
  return {
    schemaVersion: 1,
    entries: {
      [item.id]: {
        pageId: `page-${item.id}`,
        baseHash: local.hash,
        remoteLastEditedTime: '2026-09-03T00:00:00.000Z',
      },
    },
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('Notion sync planning', () => {
  it('classifies create, noop, safe update, local-only, and conflict deterministically', () => {
    const base = createLocal();
    const changedRemote = createRemote(createItem({ outcome: 'Notion 변경' }));
    const changedLocal = createLocal(createItem({ purpose: 'Markdown 변경' }));

    expect(
      createSyncPlan(new Map(), [createRemote()], { schemaVersion: 1, entries: {} }, 'run')
        .entries[0]?.operation,
    ).toBe('create');
    expect(
      createSyncPlan(new Map([['project-a', base]]), [createRemote()], createState(base), 'run')
        .entries[0]?.operation,
    ).toBe('noop');
    expect(
      createSyncPlan(new Map([['project-a', base]]), [changedRemote], createState(base), 'run')
        .entries[0]?.operation,
    ).toBe('update');
    expect(
      createSyncPlan(
        new Map([['project-a', changedLocal]]),
        [createRemote()],
        createState(base),
        'run',
      ).entries[0]?.operation,
    ).toBe('local-only');
    expect(
      createSyncPlan(
        new Map([['project-a', changedLocal]]),
        [changedRemote],
        createState(base),
        'run',
      ).entries[0]?.operation,
    ).toBe('conflict');
  });

  it('rejects duplicate Notion slugs', () => {
    expect(() =>
      createSyncPlan(
        new Map(),
        [createRemote(), createRemote()],
        { schemaVersion: 1, entries: {} },
        'run',
      ),
    ).toThrow('중복된 Slug');
  });
});

describe('Notion preview and apply', () => {
  it('preserves local technologies when applying a Notion body update', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'fe-notion-technologies-'));
    temporaryDirectories.push(rootDir);
    const contentDir = path.join(rootDir, 'content', 'experiences');
    await mkdir(contentDir, { recursive: true });
    const local = createLocal(createItem({ technologies: ['react', 'typescript'] }));
    await writeFile(path.join(contentDir, 'project-a.md'), local.content, 'utf8');
    await writeFile(
      path.join(rootDir, 'content', 'notion-sync-state.json'),
      JSON.stringify(createState(local)),
      'utf8',
    );
    const run = await stageNotionPreview(rootDir, [
      createRemote(createItem({ outcome: '수정한 성과' })),
    ]);
    expect(run.entries[0]?.operation).toBe('update');
    await applyNotionPreview(rootDir, run.runId);
    const result = parseExperienceMarkdown(
      await readFile(path.join(contentDir, 'project-a.md'), 'utf8'),
      'project-a.md',
    );
    expect(result.technologies).toEqual(['react', 'typescript']);
    expect(result.outcome).toBe('수정한 성과');
  });

  it('keeps canonical files untouched during preview, then applies the reviewed candidate', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'fe-notion-sync-'));
    temporaryDirectories.push(rootDir);
    await mkdir(path.join(rootDir, 'content', 'experiences'), { recursive: true });

    const run = await stageNotionPreview(rootDir, [createRemote()]);
    await expect(
      readFile(path.join(rootDir, 'content', 'experiences', 'project-a.md'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });

    await applyNotionPreview(rootDir, run.runId);
    const written = await readFile(
      path.join(rootDir, 'content', 'experiences', 'project-a.md'),
      'utf8',
    );
    expect(parseExperienceMarkdown(written, 'project-a.md')).toEqual(createItem());
    expect(
      JSON.parse(await readFile(path.join(rootDir, 'content', 'notion-sync-state.json'), 'utf8')),
    ).toMatchObject({
      entries: { 'project-a': { pageId: 'page-project-a' } },
    });
  });

  it('refuses apply when a reviewed candidate changes', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'fe-notion-sync-'));
    temporaryDirectories.push(rootDir);
    await mkdir(path.join(rootDir, 'content', 'experiences'), { recursive: true });

    const run = await stageNotionPreview(rootDir, [createRemote()]);
    const candidatePath = path.join(
      rootDir,
      '.content-sync',
      'runs',
      run.runId,
      'candidates',
      'project-a.md',
    );
    await writeFile(candidatePath, `${await readFile(candidatePath, 'utf8')}변조`, 'utf8');

    await expect(applyNotionPreview(rootDir, run.runId)).rejects.toThrow(
      '후보 파일이 미리보기 이후 변경',
    );
  });
});
