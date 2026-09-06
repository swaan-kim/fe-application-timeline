import { useEffect } from 'react';
import { applicationSnapshot } from '../content/application';
import { APPLICATION_CONFIG } from '../content/application.config';
import { formatCompactDate, getExperienceReadingOrder } from '../domain/timeline';
import { ApplicationTimeline } from '../features/application-timeline/ApplicationTimeline';
import { DetailRoute } from './DetailRoute';
import { NotFoundPage } from './NotFoundPage';
import { resolveAppRoute } from './routes';
import styles from './App.module.css';

const BASE_PATH = import.meta.env.BASE_URL;

function HomePage() {
  useEffect(() => {
    document.title = `프론트엔드 경험 기록 | ${APPLICATION_CONFIG.name}`;
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.name}>{APPLICATION_CONFIG.name}</h1>
        <p className={styles.role}>{APPLICATION_CONFIG.role}</p>
        <div className={styles.metaRow}>
          <p className={styles.metaLine}>
            {formatCompactDate(APPLICATION_CONFIG.chartStartDate ?? applicationSnapshot.startDate)}{' '}
            — {formatCompactDate(applicationSnapshot.endDate)}
          </p>
          {APPLICATION_CONFIG.githubUrl ? (
            <a
              tabIndex={0}
              className={styles.githubLink}
              href={APPLICATION_CONFIG.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub <span aria-hidden="true">↗</span>
              <span className="sr-only"> 새 창에서 열림</span>
            </a>
          ) : null}
        </div>
      </header>

      <ApplicationTimeline
        snapshot={applicationSnapshot}
        chartStartDate={APPLICATION_CONFIG.chartStartDate}
        chartAnnotations={APPLICATION_CONFIG.chartAnnotations}
        basePath={BASE_PATH}
      />
    </main>
  );
}

export function App() {
  const route = resolveAppRoute(window.location.pathname, applicationSnapshot.items, BASE_PATH);

  if (route.type === 'experience') {
    const order = getExperienceReadingOrder(applicationSnapshot.items);
    const nextItem = order[order.findIndex((item) => item.id === route.item.id) + 1];
    return <DetailRoute item={route.item} nextItem={nextItem} basePath={BASE_PATH} />;
  }

  if (route.type === 'not-found') {
    return <NotFoundPage basePath={BASE_PATH} />;
  }

  return <HomePage />;
}
