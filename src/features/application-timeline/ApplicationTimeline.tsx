import type { TimelineSnapshot, TimelineAnnotation } from '../../domain/timeline';
import { ExperienceList } from './ExperienceList';
import { TimelineChart } from './TimelineChart';
import { useReturnAnchorFocus } from './experienceNavigation';
import styles from './ApplicationTimeline.module.css';

export function ApplicationTimeline({
  snapshot,
  basePath = '/',
  chartStartDate = snapshot.startDate,
  chartAnnotations = [],
}: {
  snapshot: TimelineSnapshot;
  basePath?: string;
  chartStartDate?: string;
  chartAnnotations?: readonly TimelineAnnotation[];
}) {
  useReturnAnchorFocus(snapshot.items);
  return (
    <section className={styles.timelineSection} aria-labelledby="timeline-title">
      <h2 id="timeline-title">경험 기록</h2>
      <a
        tabIndex={0}
        className={styles.skipLink}
        href="#experience-list"
        onClick={() => document.getElementById('experience-list')?.focus()}
      >
        경험 목록으로 건너뛰기
      </a>
      <TimelineChart
        snapshot={{
          ...snapshot,
          startDate: chartStartDate,
          items: [...snapshot.items, ...chartAnnotations],
        }}
        basePath={basePath}
      />
      <ExperienceList items={snapshot.items} basePath={basePath} />
    </section>
  );
}
