import { getExperiencePath } from '../../app/routes';
import {
  TIMELINE_CATEGORIES,
  formatCompactDate,
  formatItemDateForSpeech,
  getItemEndLabel,
  groupTimelineItemsByCategory,
  type TimelineItem,
} from '../../domain/timeline';
import { getExperienceAnchor, rememberExperience } from './experienceNavigation';
import { CATEGORY_META } from './timelinePresentation';
import styles from './ApplicationTimeline.module.css';

export function ExperienceList({
  items,
  basePath,
}: {
  items: readonly TimelineItem[];
  basePath: string;
}) {
  const groups = groupTimelineItemsByCategory(items);
  return (
    <nav
      id="experience-list"
      tabIndex={-1}
      className={styles.documentGroups}
      aria-label="경험 목록"
      data-testid="experience-sections"
    >
      {TIMELINE_CATEGORIES.map((category) => (
        <section
          key={category}
          className={`${styles.categorySection} ${styles[category]}`}
          aria-labelledby={`${category}-section-title`}
        >
          <header className={styles.categoryHeader}>
            <h3 id={`${category}-section-title`}>{CATEGORY_META[category].label}</h3>
          </header>
          <ol className={styles.experienceList} role="list">
            {groups[category].map((item) => (
              <li key={item.id}>
                <article
                  id={getExperienceAnchor(item.id)}
                  className={styles.experience}
                  aria-labelledby={`${item.id}-title`}
                >
                  <a
                    tabIndex={0}
                    href={getExperiencePath(item.id, basePath)}
                    className={styles.experienceLink}
                    data-experience-id={item.id}
                    onClick={(event) => rememberExperience(event, item.id)}
                  >
                    <p className={styles.date}>
                      <span className="sr-only">{formatItemDateForSpeech(item)}</span>
                      <span aria-hidden="true" className={styles.visibleDate}>
                        <time dateTime={item.startDate.slice(0, 7)}>
                          {formatCompactDate(item.startDate)}
                        </time>
                        {getItemEndLabel(item) ? (
                          <span className={styles.dateEnd}>
                            —{' '}
                            {item.ongoing ? (
                              '현재'
                            ) : (
                              <time dateTime={item.endDate!.slice(0, 7)}>
                                {getItemEndLabel(item)}
                              </time>
                            )}
                          </span>
                        ) : null}
                      </span>
                    </p>
                    <div className={styles.experienceBody}>
                      <h4 id={`${item.id}-title`}>{item.title}</h4>
                      <span className={styles.detailArrow} aria-hidden="true">
                        →
                      </span>
                    </div>
                  </a>
                </article>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </nav>
  );
}
