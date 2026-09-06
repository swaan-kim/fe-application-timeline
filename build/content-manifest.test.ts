// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createContentManifest, verifyContentManifest } from './content-manifest.ts';
import type { TimelineSnapshot } from '../src/domain/timeline.ts';

const snapshot: TimelineSnapshot = {
  startDate: '2025-09-03',
  endDate: '2026-09-03',
  items: [],
};
describe('release content proof', () => {
  it('accepts the exact public snapshot and rejects a QA build', () => {
    expect(() =>
      verifyContentManifest(createContentManifest(snapshot, false), snapshot),
    ).not.toThrow();
    expect(() => verifyContentManifest(createContentManifest(snapshot, true), snapshot)).toThrow(
      '다시 빌드',
    );
  });
  it('rejects stale content even when the item ID is unchanged', () => {
    const original: TimelineSnapshot = {
      ...snapshot,
      items: [
        {
          id: 'build',
          status: 'published',
          category: 'build',
          startDate: '2026-01-01',
          title: '탐색 개선',
          purpose: '문제',
          intent: '판단',
          outcome: '결과',
        },
      ],
    };
    const changed = {
      ...original,
      items: original.items.map((item) => ({ ...item, outcome: '수정된 결과' })),
    };
    expect(() => verifyContentManifest(createContentManifest(original, false), changed)).toThrow(
      '다시 빌드',
    );
  });
});
