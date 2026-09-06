import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotionContentClient } from './notion/notion-client.ts';
import { applyNotionPreview, stageNotionPreview, type SyncRun } from './notion/sync.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env.local');
if (existsSync(envPath)) process.loadEnvFile(envPath);

function readArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function printRun(run: SyncRun, applied: boolean): void {
  const label = applied ? '반영 완료' : '미리보기 완료';
  console.log(`\n${label}: ${run.runId}`);
  console.log(
    `추가 ${run.summary.create ?? 0} · 변경 ${run.summary.update ?? 0} · 동일 ${run.summary.noop ?? 0} · 로컬만 변경 ${run.summary['local-only'] ?? 0} · 충돌 ${run.summary.conflict ?? 0}`,
  );

  const conflicts = run.entries.filter((entry) => entry.operation === 'conflict');
  for (const entry of conflicts) {
    console.error(`- ${entry.id}: ${entry.conflictReasons.join(' ')}`);
  }

  if (!applied && conflicts.length === 0) {
    console.log(`반영하려면: npm run content:notion:pull -- --apply --run ${run.runId}`);
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const requestedRunId = readArgument('--run');

  if (apply) {
    printRun(await applyNotionPreview(rootDir, requestedRunId), true);
    return;
  }

  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!token || !dataSourceId) {
    throw new Error(
      '.env.local에 NOTION_TOKEN과 NOTION_DATA_SOURCE_ID를 설정한 뒤 다시 실행해 주세요.',
    );
  }

  const client = new NotionContentClient({ token, dataSourceId });
  const run = await stageNotionPreview(rootDir, await client.getExperiences());
  printRun(run, false);
  if ((run.summary.conflict ?? 0) > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
