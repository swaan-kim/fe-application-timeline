import type { TimelineCategory } from '../../domain/timeline';

export const CATEGORY_META: Record<TimelineCategory, { label: string }> = {
  build: { label: 'Build' },
  work: { label: 'Work' },
  grow: { label: 'Grow' },
};
