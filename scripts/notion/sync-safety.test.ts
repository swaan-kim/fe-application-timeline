// @vitest-environment node
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testConfig, testItem } from '../../src/test/fixtures/application.ts';
import { parseExperienceMarkdown } from '../../build/application-content.ts';
import { applyNotionPreview, stageNotionPreview } from './sync.ts';
import type { RemoteExperience } from './notion-client.ts';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    link: vi.fn(actual.link),
    readFile: vi.fn(actual.readFile),
    mkdtemp: vi.fn(actual.mkdtemp),
  };
});
const native = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
const roots: string[] = [];
const remote = (id: string, purpose = '원문'): RemoteExperience => ({
  item: testItem({ id, purpose }),
  pageId: `notion-${id}`,
  lastEditedTime: '2026-09-04T00:00:00Z',
});
async function setup() {
  const root = await native.mkdtemp(path.join(tmpdir(), 'fe-sync-safety-'));
  roots.push(root);
  await native.mkdir(path.join(root, 'content', 'experiences'), { recursive: true });
  return root;
}
const file = (root: string, id: string) => path.join(root, 'content', 'experiences', `${id}.md`);
const error = () => new Error('injected disk error');
afterEach(async () => {
  vi.mocked(fs.link).mockImplementation(native.link);
  vi.mocked(fs.readFile).mockImplementation(native.readFile);
  vi.mocked(fs.mkdtemp).mockImplementation(native.mkdtemp);
  await Promise.all(
    roots.splice(0).map((root) => native.rm(root, { recursive: true, force: true })),
  );
});

describe('Notion apply ownership and recovery', () => {
  it('rejects a changed page connection even when its base content hash is unchanged', async () => {
    const root = await setup();
    const initial = await stageNotionPreview(root, [remote('a')], testConfig);
    await applyNotionPreview(root, initial.runId, testConfig);
    const run = await stageNotionPreview(root, [remote('a', 'updated')], testConfig);
    const statePath = path.join(root, 'content', 'notion-sync-state.json');
    const state = JSON.parse(await native.readFile(statePath, 'utf8')) as {
      entries: Record<string, { pageId: string }>;
    };
    state.entries.a.pageId = 'different-page';
    await native.writeFile(statePath, JSON.stringify(state));
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toThrow('페이지 연결');
    expect(
      parseExperienceMarkdown(await native.readFile(file(root, 'a'), 'utf8'), 'a.md').purpose,
    ).toBe('원문');
  });

  it('detects an edit to an existing file immediately before committing it', async () => {
    const root = await setup();
    const initial = await stageNotionPreview(root, [remote('a')], testConfig);
    await applyNotionPreview(root, initial.runId, testConfig);
    const run = await stageNotionPreview(root, [remote('a', 'updated')], testConfig);
    vi.mocked(fs.mkdtemp).mockImplementation(async (...args: Parameters<typeof native.mkdtemp>) => {
      await native.writeFile(file(root, 'a'), 'editor changed after validation');
      return native.mkdtemp(...args);
    });
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toThrow(
      '반영 직전에 변경',
    );
    expect(await native.readFile(file(root, 'a'), 'utf8')).toBe('editor changed after validation');
  });
  it('rejects malformed generated Markdown before creating preview files', async () => {
    const root = await setup();
    await expect(
      stageNotionPreview(root, [remote('a', '## 잘못된 추가 제목')], testConfig),
    ).rejects.toThrow('이 순서로');
    await expect(native.stat(path.join(root, '.content-sync'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('archives old dates before moving the submission window', async () => {
    const root = await setup();
    const archived = remote('old');
    archived.item = {
      ...archived.item,
      status: 'archived',
      startDate: '2020-01-01',
      endDate: '2020-06-01',
    };
    const run = await stageNotionPreview(root, [archived], testConfig);
    await applyNotionPreview(root, run.runId, testConfig);
    expect(
      parseExperienceMarkdown(await native.readFile(file(root, 'old'), 'utf8'), 'old.md').status,
    ).toBe('archived');
  });

  it('does not modify files or remove another run lock while locked', async () => {
    const root = await setup();
    const run = await stageNotionPreview(root, [remote('a')], testConfig);
    const lock = path.join(root, '.content-sync', 'apply.lock');
    await native.writeFile(lock, 'owned by another run');
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toMatchObject({
      code: 'EEXIST',
    });
    expect(await native.readFile(lock, 'utf8')).toBe('owned by another run');
    await expect(native.stat(file(root, 'a'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('uses reviewed bytes even if the candidate changes after being read', async () => {
    const root = await setup();
    const run = await stageNotionPreview(root, [remote('a')], testConfig);
    const candidate = path.join(root, '.content-sync', 'runs', run.runId, 'candidates', 'a.md');
    vi.mocked(fs.mkdtemp).mockImplementation(async (...args: Parameters<typeof native.mkdtemp>) => {
      await native.writeFile(candidate, 'changed after validation');
      return native.mkdtemp(...args);
    });
    await applyNotionPreview(root, run.runId, testConfig);
    expect(
      parseExperienceMarkdown(await native.readFile(file(root, 'a'), 'utf8'), 'a.md').purpose,
    ).toBe('원문');
  });

  it('preserves a new file created by the editor between validation and creation', async () => {
    const root = await setup();
    const run = await stageNotionPreview(root, [remote('a')], testConfig);
    vi.mocked(fs.link).mockImplementation(async (source, target) => {
      if (String(target) === file(root, 'a')) await native.writeFile(target, 'editor content');
      return native.link(source, target);
    });
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toMatchObject({
      code: 'EEXIST',
    });
    expect(await native.readFile(file(root, 'a'), 'utf8')).toBe('editor content');
  });

  it('restores earlier completed writes when a later file cannot be created', async () => {
    const root = await setup();
    const run = await stageNotionPreview(root, [remote('a'), remote('b')], testConfig);
    vi.mocked(fs.link).mockImplementation(async (source, target) => {
      if (String(target) === file(root, 'b')) throw error();
      return native.link(source, target);
    });
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toThrow(
      'injected disk error',
    );
    await expect(native.stat(file(root, 'a'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(native.stat(file(root, 'b'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(native.stat(path.join(root, '.content-sync', 'apply.lock'))).rejects.toMatchObject(
      { code: 'ENOENT' },
    );
  });

  it('preserves edits made after an earlier write instead of overwriting them during rollback', async () => {
    const root = await setup();
    const run = await stageNotionPreview(root, [remote('a'), remote('b')], testConfig);
    vi.mocked(fs.link).mockImplementation(async (source, target) => {
      if (String(target) === file(root, 'b')) {
        await native.writeFile(file(root, 'a'), 'new editor revision');
        throw error();
      }
      return native.link(source, target);
    });
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toThrow('복구 자료:');
    expect(await native.readFile(file(root, 'a'), 'utf8')).toBe('new editor revision');
  });

  it('restores an updated original on state-save failure and releases its lock', async () => {
    const root = await setup();
    const initial = await stageNotionPreview(root, [remote('a')], testConfig);
    await applyNotionPreview(root, initial.runId, testConfig);
    const original = await native.readFile(file(root, 'a'), 'utf8');
    const run = await stageNotionPreview(root, [remote('a', 'changed')], testConfig);
    // Removing the state after preview must fail validation, not silently start a new history.
    const state = path.join(root, 'content', 'notion-sync-state.json');
    const previousState = await native.readFile(state, 'utf8');
    vi.mocked(fs.readFile).mockImplementation(
      async (...args: Parameters<typeof native.readFile>) => {
        if (args[0] === state && (await native.readFile(file(root, 'a'), 'utf8')) !== original)
          throw error();
        return native.readFile(...args);
      },
    );
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toThrow(
      'injected disk error',
    );
    expect(await native.readFile(file(root, 'a'), 'utf8')).toBe(original);
    expect(await native.readFile(state, 'utf8')).toBe(previousState);
    await expect(native.stat(path.join(root, '.content-sync', 'apply.lock'))).rejects.toMatchObject(
      { code: 'ENOENT' },
    );
  });

  it('releases the lock when backup creation fails', async () => {
    const root = await setup();
    const run = await stageNotionPreview(root, [remote('a')], testConfig);
    vi.mocked(fs.mkdtemp).mockRejectedValueOnce(error());
    await expect(applyNotionPreview(root, run.runId, testConfig)).rejects.toThrow(
      'injected disk error',
    );
    await expect(native.stat(path.join(root, '.content-sync', 'apply.lock'))).rejects.toMatchObject(
      { code: 'ENOENT' },
    );
  });
});
