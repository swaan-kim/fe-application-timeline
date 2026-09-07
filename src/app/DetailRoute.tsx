import { Component, lazy, Suspense, type ReactNode } from 'react';
import type { TimelineItem } from '../domain/timeline';
import { getHomeAnchorPath } from './routes';
import styles from './App.module.css';
import layout from './DetailLayout.module.css';
import detailEntryUrl from 'virtual:detail-entry-url';

const DetailPage = lazy(async () => {
  let detail: typeof import('../features/experience-detail/ExperienceDetailPage');
  try {
    detail = await import('../features/experience-detail/ExperienceDetailPage');
  } catch (error) {
    const retry = new URL(window.location.href).searchParams.get('_retry');
    if (
      !retry ||
      !/^\d+$/u.test(retry) ||
      (error instanceof Error && error.message.startsWith('Unable to preload CSS'))
    )
      throw error;
    const url = new URL(detailEntryUrl, window.location.href);
    url.searchParams.set('retry', retry);
    detail = (await import(/* @vite-ignore */ url.href)) as typeof detail;
  }
  return { default: detail.ExperienceDetailPage };
});

class DetailErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className={layout.status} aria-labelledby="detail-error-title">
        <h1 id="detail-error-title">경험을 불러오지 못했습니다.</h1>
        <button
          className={styles.retryButton}
          onClick={() => {
            const retryUrl = new URL(window.location.href);
            retryUrl.searchParams.set('_retry', Date.now().toString());
            window.location.replace(retryUrl);
          }}
        >
          다시 시도
        </button>
      </section>
    );
  }
}

export function DetailRoute({
  item,
  nextItem,
  basePath,
}: {
  item: TimelineItem;
  nextItem?: TimelineItem;
  basePath: string;
}) {
  const homePath = getHomeAnchorPath(item.id, basePath);
  return (
    <main className={`${layout.page} ${layout[item.category]}`}>
      <a className={layout.backLink} href={homePath}>
        <span aria-hidden="true">←</span> 경험 기록
      </a>
      <DetailErrorBoundary>
        <Suspense
          fallback={
            <p className={layout.status} role="status">
              경험을 불러오는 중…
            </p>
          }
        >
          <DetailPage item={item} nextItem={nextItem} basePath={basePath} />
        </Suspense>
      </DetailErrorBoundary>
    </main>
  );
}
