import {
  TIMELINE_CATEGORIES,
  dateToPercentage,
  toEpochDay,
  type TimelineCategory,
  type TimelineChartItem,
  type TimelineChartSnapshot,
} from '../../domain/timeline';

// Reserve label space independently so short periods keep their true duration.
const LABEL_WIDTH = 27;
const TRACK_GAP = 1;

export interface ChartPlacement {
  item: TimelineChartItem;
  start: number;
  width: number;
  labelStart: number;
  labelWidth: number;
  hitWidth: number;
  track: number;
}

export function layoutChart(
  snapshot: TimelineChartSnapshot,
): Record<TimelineCategory, ChartPlacement[]> {
  const result: Record<TimelineCategory, ChartPlacement[]> = { build: [], work: [], grow: [] };
  const windowStart = toEpochDay(snapshot.startDate);
  const windowEnd = toEpochDay(snapshot.endDate);
  for (const category of TIMELINE_CATEGORIES) {
    const placements = snapshot.items
      .filter((item) => item.category === category)
      .filter(
        (item) =>
          toEpochDay(item.endDate ?? item.startDate) >= windowStart &&
          toEpochDay(item.startDate) <= windowEnd,
      )
      .map((item) => {
        // Clip only chart geometry; labels and detail pages retain the actual dates.
        const visibleStart =
          item.startDate < snapshot.startDate ? snapshot.startDate : item.startDate;
        const actualEnd = item.endDate ?? item.startDate;
        const visibleEnd = actualEnd > snapshot.endDate ? snapshot.endDate : actualEnd;
        const start = dateToPercentage(visibleStart, snapshot.startDate, snapshot.endDate);
        const end = dateToPercentage(visibleEnd, snapshot.startDate, snapshot.endDate);
        const labelStart = Math.min(start, 100 - LABEL_WIDTH);
        return {
          item,
          start,
          width: end - start,
          labelStart,
          labelWidth: LABEL_WIDTH,
          hitWidth: Math.max(end, labelStart + LABEL_WIDTH) - labelStart,
          track: 0,
        };
      })
      .sort(
        (a, b) =>
          a.labelStart - b.labelStart ||
          a.start - b.start ||
          a.width - b.width ||
          a.item.id.localeCompare(b.item.id),
      );
    const trackEnds: number[] = [];
    for (const placement of placements) {
      const firstFree = trackEnds.findIndex((end) => end + TRACK_GAP < placement.labelStart);
      placement.track = firstFree === -1 ? trackEnds.length : firstFree;
      trackEnds[placement.track] = Math.max(
        placement.start + placement.width,
        placement.labelStart + placement.labelWidth,
      );
    }
    result[category] = placements;
  }
  return result;
}
