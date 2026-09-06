import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { applicationContentPlugin } from '../build/application-content-plugin.ts';
import { detailEntryPlugin } from '../build/detail-entry-plugin.ts';
import {
  loadApplicationContent,
  serializeExperienceMarkdown,
} from '../build/application-content.ts';
import { verifyContentManifest, CONTENT_MANIFEST_FILE } from '../build/content-manifest.ts';
import { validateApplicationConfig } from '../src/domain/application-config.ts';
import { TIMELINE_CATEGORIES, validateTimelineSnapshot } from '../src/domain/timeline.ts';
import { testConfig, testItem } from '../src/test/fixtures/application.ts';

// Builds the real application with isolated, publication-ready inputs; never writes release dist/.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qaRoot = path.resolve(rootDir, '../../work/qa');
await mkdir(qaRoot, { recursive: true });
const fixtureRoot = await mkdtemp(path.join(qaRoot, 'release-fixture-'));
const contentDir = path.join(fixtureRoot, 'content', 'experiences');
const outDir = path.join(fixtureRoot, 'built');
await mkdir(contentDir, { recursive: true });
const config = { ...testConfig, githubUrl: 'https://github.com/example' };
const sentinels = ['DRAFT_ONLY_QA_SENTINEL_20260905', 'ARCHIVED_ONLY_QA_SENTINEL_20260905'];
const published = TIMELINE_CATEGORIES.map((category) =>
  testItem({
    id: `qa-${category}`,
    category,
    title: `검증 전용 ${category} 경험`,
    status: 'published',
    purpose: '공개 빌드 검증 전용 본문입니다.',
    intent: '사용자 원본과 검증 데이터를 분리했습니다.',
    outcome: '세 분류와 상세 경로의 빌드 결과를 검사했습니다.',
  }),
);
const privateItems = [
  testItem({ id: 'qa-draft', purpose: sentinels[0] }),
  testItem({
    id: 'qa-archived',
    status: 'archived',
    startDate: '2020-01-01',
    endDate: '2020-02-01',
    purpose: sentinels[1],
  }),
];
for (const item of [...published, ...privateItems])
  await writeFile(path.join(contentDir, `${item.id}.md`), serializeExperienceMarkdown(item));
const configPath = path.join(fixtureRoot, 'config.ts');
await writeFile(configPath, `export const APPLICATION_CONFIG = ${JSON.stringify(config)};`);
validateApplicationConfig(config, { requirePublicationReady: true });
const snapshot = await loadApplicationContent({
  rootDir: fixtureRoot,
  includeDrafts: false,
  config,
  requirePublicationReady: true,
});
validateTimelineSnapshot(snapshot, { requirePublicationReady: true });
await build({
  root: rootDir,
  configFile: false,
  logLevel: 'warn',
  plugins: [
    applicationContentPlugin({ rootDir: fixtureRoot, includeDrafts: false, config }),
    detailEntryPlugin(rootDir),
    react(),
  ],
  resolve: {
    alias: [{ find: /.*\/content\/application\.config(?:\.ts)?$/u, replacement: configPath }],
  },
  build: { outDir, sourcemap: true, emptyOutDir: false },
});
verifyContentManifest(
  JSON.parse(await readFile(path.join(outDir, CONTENT_MANIFEST_FILE), 'utf8')) as unknown,
  snapshot,
);
async function inspect(directory: string): Promise<number> {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await inspect(file);
    else if (/\.(?:js|html|map)$/u.test(entry.name)) {
      const content = await readFile(file, 'utf8');
      if (sentinels.some((sentinel) => content.includes(sentinel)))
        throw new Error(`비공개 본문이 포함되었습니다: ${file}`);
      count += 1;
    }
  }
  return count;
}
console.log(
  `공개 fixture 빌드·게시 규칙·manifest 통과. JS/HTML/map ${await inspect(outDir)}개에서 초안·보관 본문 미포함 확인.`,
);
console.log(`QA 결과: ${outDir}`);
