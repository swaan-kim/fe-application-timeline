import { describe, expect, it } from 'vitest';
import { dateToPercentage, type TimelineItem, type TimelineSnapshot } from '../../domain/timeline';
import { layoutChart } from './chartLayout';

const item = (id: string, startDate: string, endDate?: string): TimelineItem => ({
  id,
  startDate,
  endDate,
  title: id,
  category: 'build',
  status: 'draft',
  purpose: '',
  intent: '',
  outcome: '',
});
const snapshot = (items: TimelineItem[]): TimelineSnapshot => ({
  startDate: '2025-09-03',
  endDate: '2026-09-03',
  items,
});

describe('chart label layout', () => {
  it('packs chart-only context with experiences using the same date scale', () => {
    const context = {
      id: 'work-context',
      category: 'work' as const,
      title: '표 전용 활동',
      startDate: '2026-03-01',
      endDate: '2026-06-30',
      chartOnly: true as const,
    };
    const experience = {
      ...item('work-experience', '2026-04-01', '2026-07-01'),
      category: 'work' as const,
    };
    const data = { startDate: '2026-03-01', endDate: '2026-09-03', items: [context, experience] };
    const placements = layoutChart(data).work;
    expect(placements[0]).toMatchObject({ item: context, start: 0, track: 0 });
    expect(placements[0]!.width).toBeCloseTo(
      dateToPercentage(context.endDate, data.startDate, data.endDate),
    );
    expect(placements[1]!.track).toBe(1);
    expect(layoutChart({ ...data, items: [...data.items].reverse() }).work).toEqual(placements);
  });
  it('clips only intersecting chart bars while retaining original item dates', () => {
    const items = [
      item('long-running', '2025-10-01', '2026-09-03'),
      item('finished-before', '2025-10-01', '2026-02-28'),
      item('starts-after', '2026-10-01'),
      item('continues-after', '2026-08-01', '2026-10-01'),
      item('boundary', '2026-03-01'),
    ];
    const before = structuredClone(items);
    const placements = layoutChart({ ...snapshot(items), startDate: '2026-03-01' }).build;
    expect(placements.map(({ item }) => item.id).sort()).toEqual([
      'boundary',
      'continues-after',
      'long-running',
    ]);
    expect(placements.find(({ item }) => item.id === 'long-running')).toMatchObject({
      start: 0,
      width: 100,
    });
    const continuation = placements.find(({ item }) => item.id === 'continues-after')!;
    expect(continuation.start + continuation.width).toBe(100);
    expect(items).toEqual(before);
    expect(placements.find(({ item }) => item.id === 'long-running')?.item).toBe(items[0]);
  });
  it('covers the full bar and full label with a single non-overlapping hit region', () => {
    const data = snapshot([
      item('full-year', '2025-09-03', '2026-09-03'),
      item('other', '2025-09-04'),
    ]);
    const placements = layoutChart(data).build;
    expect(placements[0]?.hitWidth).toBe(100);
    expect(placements[1]?.track).toBe(1);
    for (const placement of placements) {
      expect(placement.labelStart + placement.hitWidth).toBeGreaterThanOrEqual(
        placement.start + placement.width,
      );
    }
  });

  it.each([0, 1, 9])(
    'handles %i events without changing input or placing events outside the plot',
    (count) => {
      const items = Array.from({ length: count }, (_, index) =>
        item(`dense-${index}`, '2026-09-02', '2026-09-03'),
      );
      const before = structuredClone(items);
      const placements = layoutChart(snapshot(items)).build;
      expect(placements).toHaveLength(count);
      expect(new Set(placements.map((placement) => placement.track)).size).toBe(count);
      expect(items).toEqual(before);
      for (const placement of placements)
        expect(placement.labelStart + placement.hitWidth).toBeLessThanOrEqual(100);
    },
  );
  it('keeps a one-day period exact and its link inside the right boundary', () => {
    const data = snapshot([item('last-day', '2026-09-02', '2026-09-03')]);
    const placement = layoutChart(data).build[0]!;
    expect(placement.width).toBeCloseTo(100 / 365);
    expect(placement.start).toBe(dateToPercentage('2026-09-02', data.startDate, data.endDate));
    expect(placement.labelStart + placement.labelWidth).toBeLessThanOrEqual(100);
  });

  it('separates adjacent milestone labels deterministically and reuses free tracks', () => {
    const items = [
      item('one', '2025-09-03'),
      item('two', '2025-09-04'),
      item('three', '2026-06-01'),
    ];
    const first = layoutChart(snapshot(items)).build;
    expect(first.map(({ track }) => track)).toEqual([0, 1, 0]);
    expect(layoutChart(snapshot([...items].reverse())).build).toEqual(first);
  });

  it('keeps boundary milestones and period labels reachable', () => {
    const placements = layoutChart(
      snapshot([item('start', '2025-09-03'), item('end', '2026-09-03')]),
    ).build;
    expect(placements[0]?.start).toBe(0);
    expect(placements[1]?.start).toBe(100);
    for (const placement of placements) {
      expect(placement.labelStart).toBeGreaterThanOrEqual(0);
      expect(placement.labelWidth).toBeGreaterThan(0);
      expect(placement.labelStart + placement.labelWidth).toBeLessThanOrEqual(100);
    }
  });
});
