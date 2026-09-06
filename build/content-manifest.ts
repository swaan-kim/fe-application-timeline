import { createHash } from 'node:crypto';
import type { TimelineSnapshot } from '../src/domain/timeline.ts';

export const CONTENT_MANIFEST_FILE = 'content-manifest.json';

export function createContentManifest(snapshot: TimelineSnapshot, includeDrafts: boolean) {
  return {
    version: 1,
    includeDrafts,
    contentHash: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
    items: snapshot.items.map(({ id, status }) => ({ id, status })),
  };
}

export function verifyContentManifest(manifest: unknown, expected: TimelineSnapshot): void {
  const expectedManifest = createContentManifest(expected, false);
  if (JSON.stringify(manifest) !== JSON.stringify(expectedManifest)) {
    throw new Error('공개 콘텐츠와 빌드 결과가 다릅니다. npm run build로 다시 빌드하세요.');
  }
}
