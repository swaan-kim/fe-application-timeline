import { useMemo, type CSSProperties } from 'react';
import { getExperiencePath } from '../../app/routes';
import {
  TIMELINE_CATEGORIES,
  createMonthTicks,
  formatItemDateForSpeech,
  type TimelineChartSnapshot,
} from '../../domain/timeline';
import { layoutChart } from './chartLayout';
import { rememberExperience } from './experienceNavigation';
import { CATEGORY_META } from './timelinePresentation';
import styles from './ApplicationTimeline.module.css';

export function TimelineChart({
  snapshot,
  basePath,
}: {
  snapshot: TimelineChartSnapshot;
  basePath: string;
}) {
  const lanes = useMemo(() => layoutChart(snapshot), [snapshot]);
  const ticks = useMemo(
    () => createMonthTicks(snapshot.startDate, snapshot.endDate),
    [snapshot.startDate, snapshot.endDate],
  );
  return (
    <nav className={styles.desktopOverview} aria-label="경험 타임라인">
      <div className={styles.chart}>
        {TIMELINE_CATEGORIES.map((category) => {
          const placements = lanes[category];
          return (
            <div key={category} className={`${styles.lane} ${styles[category]}`}>
              <div className={styles.laneHeading}>
                <strong>{CATEGORY_META[category].label}</strong>
              </div>
              <div className={styles.lanePlot}>
                <div className={styles.laneGrid} aria-hidden="true">
                  {ticks
                    .filter((_, index) => index % 3 === 0)
                    .map((tick) => (
                      <span key={tick.id} style={{ left: `${tick.position}%` }} />
                    ))}
                </div>
                <ol
                  className={styles.chartEvents}
                  aria-label={`${CATEGORY_META[category].label} 경험`}
                  role="list"
                >
                  {placements.map(
                    ({ item, start, width, labelStart, labelWidth, hitWidth, track }) => (
                      <li
                        key={item.id}
                        className={styles.chartEvent}
                        data-chart-id={item.id}
                        style={
                          {
                            '--item-left': `${((start - labelStart) / hitWidth) * 100}%`,
                            '--item-width': `${(width / hitWidth) * 100}%`,
                            '--label-left': `${labelStart}%`,
                            '--label-width': `${(labelWidth / hitWidth) * 100}%`,
                            width: `${hitWidth}%`,
                            gridRow: track + 1,
                          } as CSSProperties
                        }
                      >
                        {'chartOnly' in item ? (
                          <div className={styles.chartAnnotation}>
                            <span className="sr-only">
                              {CATEGORY_META[category].label}, {formatItemDateForSpeech(item)},{' '}
                            </span>
                            <span className={styles.chartLabel}>{item.title}</span>
                            <span
                              className={item.endDate ? styles.chartBar : styles.chartPin}
                              data-chart-mark={item.endDate ? 'period' : 'milestone'}
                              aria-hidden="true"
                            />
                          </div>
                        ) : (
                          <a
                            tabIndex={0}
                            href={getExperiencePath(item.id, basePath)}
                            className={styles.chartLink}
                            data-experience-id={item.id}
                            aria-label={`${CATEGORY_META[category].label}, ${item.title}, ${formatItemDateForSpeech(item)} 상세 페이지 열기`}
                            onClick={(event) => rememberExperience(event, item.id)}
                          >
                            <span className={styles.chartLabel} aria-hidden="true">
                              {item.title}
                            </span>
                            <span
                              className={item.endDate ? styles.chartBar : styles.chartPin}
                              data-chart-mark={item.endDate ? 'period' : 'milestone'}
                              aria-hidden="true"
                            />
                          </a>
                        )}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            </div>
          );
        })}
        <div className={styles.axis} aria-hidden="true">
          <div className={styles.axisPlot}>
            {ticks.map((tick, index) => (
              <span
                key={tick.id}
                className={styles.monthTick}
                data-first={index === 0 || undefined}
                data-last={index === ticks.length - 1 || undefined}
                style={{ left: `${tick.position}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
