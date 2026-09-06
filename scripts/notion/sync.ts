import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  link,
  open,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  hashContent,
  parseExperienceMarkdown,
  serializeExperienceMarkdown,
} from '../../build/application-content.ts';
import { APPLICATION_CONFIG } from '../../src/content/application.config.ts';
import type { ApplicationConfig } from '../../src/domain/application-config.ts';
import {
  subtractCalendarMonths,
  validateTimelineSnapshot,
  type TimelineItem,
} from '../../src/domain/timeline.ts';
import type { RemoteExperience } from './notion-client.ts';

const SYNC_STATE_SCHEMA = z.object({
  schemaVersion: z.literal(1),
  entries: z.record(
    z.string(),
    z.object({
      pageId: z.string(),
      baseHash: z.string().startsWith('sha256:'),
      remoteLastEditedTime: z.string(),
    }),
  ),
});

const SYNC_ENTRY_SCHEMA = z.object({
  id: z.string(),
  pageId: z.string(),
  remoteLastEditedTime: z.string(),
  operation: z.enum(['create', 'update', 'noop', 'local-only', 'conflict']),
  targetPath: z.string(),
  candidatePath: z.string(),
  baseHash: z.string().nullable(),
  localHashAtPreview: z.string().nullable(),
  candidateHash: z.string(),
  conflictReasons: z.array(z.string()),
});

const SYNC_RUN_SCHEMA = z.object({
  schemaVersion: z.literal(1),
  runId: z.string(),
  createdAt: z.string(),
  dataSourceFingerprint: z.string(),
  summary: z.record(z.string(), z.number()),
  entries: z.array(SYNC_ENTRY_SCHEMA),
});

export type SyncOperation = z.infer<typeof SYNC_ENTRY_SCHEMA>['operation'];
export type SyncEntry = z.infer<typeof SYNC_ENTRY_SCHEMA>;
export type SyncRun = z.infer<typeof SYNC_RUN_SCHEMA>;
export type SyncState = z.infer<typeof SYNC_STATE_SCHEMA>;

export interface LocalDocument {
  content: string;
  hash: string;
  canonicalHash: string;
  item: TimelineItem;
}

function toProjectPath(...segments: string[]): string {
  return segments.join('/');
}

function createRunId(now = new Date()): string {
  return now.toISOString().replaceAll(/[-:.]/gu, '').replace('Z', 'Z');
}

function ensureInside(parent: string, candidate: string): string {
  const resolvedParent = path.resolve(parent);
  const resolvedCandidate = path.resolve(candidate);
  if (
    resolvedCandidate !== resolvedParent &&
    !resolvedCandidate.startsWith(`${resolvedParent}${path.sep}`)
  ) {
    throw new Error(`허용되지 않은 파일 경로입니다: ${candidate}`);
  }
  return resolvedCandidate;
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, 'utf8')) as unknown;
}

async function readSyncState(rootDir: string): Promise<SyncState> {
  const statePath = path.join(rootDir, 'content', 'notion-sync-state.json');
  try {
    return SYNC_STATE_SCHEMA.parse(await readJsonFile(statePath));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { schemaVersion: 1, entries: {} };
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function readLocalDocuments(rootDir: string): Promise<Map<string, LocalDocument>> {
  const contentDir = path.join(rootDir, 'content', 'experiences');
  const fileNames = (await readdir(contentDir)).filter((name) => name.endsWith('.md')).sort();
  const documents = new Map<string, LocalDocument>();

  for (const fileName of fileNames) {
    const content = await readFile(path.join(contentDir, fileName), 'utf8');
    const item = parseExperienceMarkdown(content, fileName);
    documents.set(item.id, {
      content,
      hash: hashContent(content),
      canonicalHash: hashContent(serializeExperienceMarkdown(item)),
      item,
    });
  }
  return documents;
}

function getOperation(
  local: LocalDocument | undefined,
  remote: RemoteExperience,
  state: SyncState,
  candidateHash: string,
): { operation: SyncOperation; reasons: string[] } {
  const previous = state.entries[remote.item.id];
  const reasons: string[] = [];

  if (previous && previous.pageId !== remote.pageId) {
    return {
      operation: 'conflict',
      reasons: ['같은 Slug가 이전과 다른 Notion 페이지를 가리킵니다.'],
    };
  }

  if (!local) {
    if (previous) {
      return {
        operation: 'conflict',
        reasons: ['이전에 동기화한 Markdown 파일이 로컬에서 삭제되었습니다.'],
      };
    }
    return { operation: 'create', reasons };
  }

  if (local.hash === candidateHash) return { operation: 'noop', reasons };
  if (!previous) {
    return local.canonicalHash === candidateHash
      ? { operation: 'update', reasons }
      : {
          operation: 'conflict',
          reasons: ['기존 Markdown과 처음 연결하는 Notion 내용이 다릅니다.'],
        };
  }
  if (local.hash === previous.baseHash) return { operation: 'update', reasons };
  if (candidateHash === previous.baseHash) return { operation: 'local-only', reasons };
  return {
    operation: 'conflict',
    reasons: ['Markdown과 Notion이 마지막 동기화 이후 모두 변경되었습니다.'],
  };
}

export function createSyncPlan(
  localDocuments: Map<string, LocalDocument>,
  remoteExperiences: readonly RemoteExperience[],
  state: SyncState,
  runId: string,
): SyncRun {
  const seenIds = new Set<string>();
  const entries = remoteExperiences.map((remote): SyncEntry => {
    if (seenIds.has(remote.item.id)) {
      throw new Error(`Notion에 중복된 Slug가 있습니다: ${remote.item.id}`);
    }
    seenIds.add(remote.item.id);

    const candidateContent = serializeExperienceMarkdown(remote.item);
    const candidateHash = hashContent(candidateContent);
    const local = localDocuments.get(remote.item.id);
    const result = getOperation(local, remote, state, candidateHash);

    return {
      id: remote.item.id,
      pageId: remote.pageId,
      remoteLastEditedTime: remote.lastEditedTime,
      operation: result.operation,
      targetPath: toProjectPath('content', 'experiences', `${remote.item.id}.md`),
      candidatePath: toProjectPath('candidates', `${remote.item.id}.md`),
      baseHash: state.entries[remote.item.id]?.baseHash ?? null,
      localHashAtPreview: local?.hash ?? null,
      candidateHash,
      conflictReasons: result.reasons,
    };
  });
  const summary = Object.fromEntries(
    ['create', 'update', 'noop', 'local-only', 'conflict'].map((operation) => [
      operation,
      entries.filter((entry) => entry.operation === operation).length,
    ]),
  );

  return {
    schemaVersion: 1,
    runId,
    createdAt: new Date().toISOString(),
    dataSourceFingerprint: `sha256:${createHash('sha256')
      .update(
        remoteExperiences
          .map((remote) => remote.pageId)
          .sort()
          .join('\n'),
      )
      .digest('hex')}`,
    summary,
    entries,
  };
}

function validateProjectedSnapshot(
  localDocuments: Map<string, LocalDocument>,
  remoteExperiences: readonly RemoteExperience[],
  run: SyncRun,
  config: ApplicationConfig,
): void {
  const projected = new Map(
    [...localDocuments.entries()].map(([id, document]) => [id, document.item] as const),
  );
  const remoteById = new Map(remoteExperiences.map((remote) => [remote.item.id, remote.item]));

  for (const entry of run.entries) {
    if (
      entry.operation === 'create' ||
      entry.operation === 'update' ||
      entry.operation === 'noop'
    ) {
      const item = remoteById.get(entry.id);
      if (item) projected.set(entry.id, item);
    }
  }

  validateTimelineSnapshot({
    startDate: subtractCalendarMonths(config.submissionDate, 12),
    endDate: config.submissionDate,
    items: [...projected.values()],
  });
}

export async function stageNotionPreview(
  rootDir: string,
  remoteExperiences: readonly RemoteExperience[],
  config: ApplicationConfig = APPLICATION_CONFIG,
): Promise<SyncRun> {
  const localDocuments = await readLocalDocuments(rootDir);
  const state = await readSyncState(rootDir);
  const runId = createRunId();
  const run = createSyncPlan(localDocuments, remoteExperiences, state, runId);
  const candidates = new Map(
    remoteExperiences.map(({ item }) => {
      const content = serializeExperienceMarkdown(item);
      const parsed = parseExperienceMarkdown(content, `${item.id}.md`);
      const canonical = serializeExperienceMarkdown(parsed);
      if (canonical !== content || parsed.id !== item.id)
        throw new Error(`${item.id} Markdown 왕복 검증에 실패했습니다.`);
      return [item.id, content] as const;
    }),
  );
  validateProjectedSnapshot(localDocuments, remoteExperiences, run, config);

  const runDir = path.join(rootDir, '.content-sync', 'runs', runId);
  const candidatesDir = path.join(runDir, 'candidates');
  await mkdir(candidatesDir, { recursive: true });

  for (const remote of remoteExperiences) {
    const candidatePath = ensureInside(
      candidatesDir,
      path.join(candidatesDir, `${remote.item.id}.md`),
    );
    await writeFile(candidatePath, candidates.get(remote.item.id)!, 'utf8');
  }
  await writeFile(path.join(runDir, 'manifest.json'), `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  await writeFile(path.join(rootDir, '.content-sync', 'latest-run.txt'), `${runId}\n`, 'utf8');
  return run;
}

async function resolveRunId(rootDir: string, requestedRunId?: string): Promise<string> {
  if (requestedRunId) return requestedRunId;
  return (await readFile(path.join(rootDir, '.content-sync', 'latest-run.txt'), 'utf8')).trim();
}

async function readOptional(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeOwnedTemporary(
  filePath: string,
  content: string,
  owned: Set<string>,
): Promise<void> {
  const handle = await open(filePath, 'wx');
  owned.add(filePath);
  try {
    await handle.writeFile(content, 'utf8');
  } finally {
    await handle.close();
  }
}

export async function applyNotionPreview(
  rootDir: string,
  requestedRunId?: string,
  config: ApplicationConfig = APPLICATION_CONFIG,
): Promise<SyncRun> {
  const syncRoot = path.join(rootDir, '.content-sync');
  await mkdir(syncRoot, { recursive: true });
  const lockPath = path.join(syncRoot, 'apply.lock');
  const lock = await open(lockPath, 'wx');
  const written: Array<{ target: string; content: string; original: string | null }> = [];
  const tempPaths = new Set<string>();
  let backupDir = syncRoot;
  try {
    const runId = await resolveRunId(rootDir, requestedRunId);
    if (!/^[0-9TZ]+$/u.test(runId)) throw new Error('동기화 run ID가 올바르지 않습니다.');
    const runDir = ensureInside(path.join(syncRoot, 'runs'), path.join(syncRoot, 'runs', runId));
    const run = SYNC_RUN_SCHEMA.parse(await readJsonFile(path.join(runDir, 'manifest.json')));
    if (run.runId !== runId) throw new Error('동기화 manifest의 run ID가 일치하지 않습니다.');
    if (run.entries.some((entry) => entry.operation === 'conflict'))
      throw new Error('충돌이 남아 있어 Markdown에 반영할 수 없습니다.');

    const statePath = path.join(rootDir, 'content', 'notion-sync-state.json');
    const originalState = await readOptional(statePath);
    const previousState =
      originalState === null
        ? { schemaVersion: 1 as const, entries: {} }
        : SYNC_STATE_SCHEMA.parse(JSON.parse(originalState));
    const localDocuments = await readLocalDocuments(rootDir);
    const candidates = new Map<string, { content: string; item: TimelineItem }>();
    const seen = new Set<string>();
    for (const entry of run.entries) {
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.id) ||
        seen.has(entry.id) ||
        entry.targetPath !== `content/experiences/${entry.id}.md` ||
        entry.candidatePath !== `candidates/${entry.id}.md`
      ) {
        throw new Error('동기화 항목 ID 또는 파일 경로가 올바르지 않습니다.');
      }
      seen.add(entry.id);
      const candidate = await readFile(path.join(runDir, entry.candidatePath), 'utf8');
      if (hashContent(candidate) !== entry.candidateHash)
        throw new Error(`${entry.id} 후보 파일이 미리보기 이후 변경되었습니다.`);
      if ((localDocuments.get(entry.id)?.hash ?? null) !== entry.localHashAtPreview) {
        throw new Error(`${entry.id} Markdown이 미리보기 이후 변경되었습니다.`);
      }
      if ((previousState.entries[entry.id]?.baseHash ?? null) !== entry.baseHash) {
        throw new Error(`${entry.id} 동기화 상태가 미리보기 이후 변경되었습니다.`);
      }
      if (
        previousState.entries[entry.id] &&
        previousState.entries[entry.id]?.pageId !== entry.pageId
      ) {
        throw new Error(`${entry.id} Notion 페이지 연결이 미리보기 이후 변경되었습니다.`);
      }
      candidates.set(entry.id, {
        content: candidate,
        item: parseExperienceMarkdown(candidate, `${entry.id}.md`),
      });
    }
    const projected = new Map([...localDocuments].map(([id, value]) => [id, value.item]));
    for (const entry of run.entries) {
      if (entry.operation === 'create' || entry.operation === 'update')
        projected.set(entry.id, candidates.get(entry.id)!.item);
    }
    validateTimelineSnapshot({
      startDate: subtractCalendarMonths(config.submissionDate, 12),
      endDate: config.submissionDate,
      items: [...projected.values()],
    });

    backupDir = await mkdtemp(path.join(runDir, 'backups-'));
    for (const entry of run.entries) {
      if (entry.operation !== 'create' && entry.operation !== 'update') continue;
      const target = path.join(rootDir, entry.targetPath);
      const candidate = candidates.get(entry.id)!.content;
      const original = localDocuments.get(entry.id)?.content ?? null;
      if ((await readOptional(target)) !== original)
        throw new Error(`${entry.id} Markdown이 반영 직전에 변경되었습니다.`);
      const temp = path.join(backupDir, `${entry.id}.tmp`);
      await writeOwnedTemporary(temp, candidate, tempPaths);
      if (original !== null) {
        await writeFile(path.join(backupDir, `${entry.id}.md`), original, {
          encoding: 'utf8',
          flag: 'wx',
        });
        if ((await readOptional(target)) !== original)
          throw new Error(`${entry.id} Markdown이 반영 직전에 변경되었습니다.`);
        await rename(temp, target);
        tempPaths.delete(temp);
      } else {
        // A hard link atomically creates the complete file and fails if the editor already created it.
        await link(temp, target);
      }
      written.push({ target, content: candidate, original });
    }

    const nextState: SyncState = { schemaVersion: 1, entries: { ...previousState.entries } };
    for (const entry of run.entries) {
      if (entry.operation === 'local-only') continue;
      nextState.entries[entry.id] = {
        pageId: entry.pageId,
        baseHash: entry.candidateHash,
        remoteLastEditedTime: entry.remoteLastEditedTime,
      };
    }
    const tempState = path.join(backupDir, 'sync-state.tmp');
    await writeOwnedTemporary(tempState, `${JSON.stringify(nextState, null, 2)}\n`, tempPaths);
    if ((await readOptional(statePath)) !== originalState)
      throw new Error('동기화 상태가 반영 중 변경되었습니다.');
    if (originalState === null) await link(tempState, statePath);
    else {
      await rename(tempState, statePath);
      tempPaths.delete(tempState);
    }
    return run;
  } catch (error) {
    const recoveryIssues: string[] = [];
    for (const record of [...written].reverse()) {
      try {
        if ((await readOptional(record.target)) !== record.content) {
          recoveryIssues.push(
            `${path.basename(record.target)}: 이후 수정이 있어 자동 복구하지 않았습니다.`,
          );
          continue;
        }
        if (record.original === null) await unlink(record.target);
        else await writeFile(record.target, record.original, 'utf8');
      } catch {
        recoveryIssues.push(`${path.basename(record.target)}: 자동 복구에 실패했습니다.`);
      }
    }
    if (recoveryIssues.length)
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\n${recoveryIssues.join('\n')}\n복구 자료: ${backupDir}`,
        { cause: error },
      );
    throw error;
  } finally {
    await Promise.all(
      [...tempPaths].map((filePath) => rm(filePath, { force: true }).catch(() => undefined)),
    );
    await lock.close().finally(() => unlink(lockPath).catch(() => undefined));
  }
}
