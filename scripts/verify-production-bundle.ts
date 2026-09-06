import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadApplicationContent } from '../build/application-content.ts';
import { CONTENT_MANIFEST_FILE, verifyContentManifest } from '../build/content-manifest.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const publishedContent = await loadApplicationContent({ rootDir, includeDrafts: false });
  const manifest: unknown = JSON.parse(
    await readFile(path.join(rootDir, 'dist', CONTENT_MANIFEST_FILE), 'utf8'),
  );
  verifyContentManifest(manifest, publishedContent);
  console.log('프로덕션 번들 공개 콘텐츠 일치 확인 완료');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
