import { useEffect } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { APPLICATION_CONFIG } from '../../content/application.config';
import {
  formatCompactDate,
  formatDateForSpeech,
  getItemEndLabel,
  type TimelineItem,
} from '../../domain/timeline';
import { getHomeAnchorPath, getExperiencePath } from '../../app/routes';
import { CATEGORY_META } from '../application-timeline/timelinePresentation';
import styles from './ExperienceDetailPage.module.css';

interface ExperienceDetailPageProps {
  item: TimelineItem;
  basePath?: string;
  nextItem?: TimelineItem;
}

const MARKDOWN_COMPONENTS: Components = {
  a({ href, children, ...props }) {
    const external = href?.startsWith('http');
    return (
      <a
        tabIndex={0}
        {...props}
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer noopener' : undefined}
      >
        {children}
        {external ? (
          <>
            <span className={styles.externalMark} aria-hidden="true">
              {' '}
              ↗
            </span>
            <span className="sr-only"> 새 창에서 열림</span>
          </>
        ) : null}
      </a>
    );
  },
};

const ALLOWED_ELEMENTS = ['p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br'] as const;

function safeUrlTransform(url: string): string {
  return /^(https?:|mailto:)/u.test(url) ? url : '';
}

function ItemPeriod({ item }: { item: TimelineItem }) {
  return (
    <>
      <time dateTime={item.startDate.slice(0, 7)}>
        <span aria-hidden="true">{formatCompactDate(item.startDate)}</span>
        <span className="sr-only">{formatDateForSpeech(item.startDate)}</span>
      </time>
      {getItemEndLabel(item) ? (
        <>
          <span aria-hidden="true">—</span>
          <span className="sr-only">부터</span>
          {item.ongoing ? (
            <>
              <span aria-hidden="true">현재</span>
              <span className="sr-only">현재까지 진행 중</span>
            </>
          ) : item.endDate ? (
            <time dateTime={item.endDate.slice(0, 7)}>
              <span aria-hidden="true">{formatCompactDate(item.endDate)}</span>
              <span className="sr-only">{formatDateForSpeech(item.endDate)}</span>
            </time>
          ) : null}
          {!item.ongoing && <span className="sr-only">까지</span>}
        </>
      ) : null}
    </>
  );
}

interface MarkdownSectionProps {
  id: string;
  title: string;
  content: string;
}

function MarkdownSection({ id, title, content }: MarkdownSectionProps) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {content.trim() ? (
        <div className={styles.markdown}>
          <ReactMarkdown
            allowedElements={[...ALLOWED_ELEMENTS]}
            components={MARKDOWN_COMPONENTS}
            skipHtml
            urlTransform={safeUrlTransform}
          >
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <p className={styles.draftEmpty}>(미작성)</p>
      )}
    </section>
  );
}

export function ExperienceDetailPage({
  item,
  basePath = '/',
  nextItem,
}: ExperienceDetailPageProps) {
  const category = CATEGORY_META[item.category];
  const sections = [item.purpose, item.intent, item.outcome];
  const isEmptyDraft = item.status === 'draft' && sections.every((content) => !content.trim());

  useEffect(() => {
    document.title = `${item.title} | ${APPLICATION_CONFIG.name} ${APPLICATION_CONFIG.role}`;
    const url = new URL(window.location.href);
    if (url.searchParams.has('_retry')) {
      url.searchParams.delete('_retry');
      window.history.replaceState(window.history.state, '', url);
    }
  }, [item.title]);

  return (
    <main className={`${styles.page} ${styles[item.category]}`}>
      <a tabIndex={0} className={styles.backLink} href={getHomeAnchorPath(item.id, basePath)}>
        <span aria-hidden="true">←</span> 경험 기록
      </a>

      <article aria-labelledby="experience-title">
        <header className={styles.header}>
          <p className={styles.meta}>
            <span className={styles.category}>{category.label}</span>
            <span aria-hidden="true">·</span>
            <span className={styles.date}>
              <ItemPeriod item={item} />
            </span>
          </p>
          <h1 id="experience-title">{item.title}</h1>
        </header>

        {isEmptyDraft ? (
          <p className={styles.draftNotice}>초안 · 내용 작성 전</p>
        ) : (
          <div className={styles.body}>
            <MarkdownSection id="purpose-title" title="목적" content={item.purpose} />
            <MarkdownSection id="intent-title" title="의도" content={item.intent} />
            <MarkdownSection id="outcome-title" title="성과" content={item.outcome} />
          </div>
        )}
      </article>
      <nav className={styles.readingNavigation} aria-label="경험 이어 읽기">
        <a tabIndex={0} className={styles.backLink} href={getHomeAnchorPath(item.id, basePath)}>
          <span aria-hidden="true">←</span> 경험 기록
        </a>
        {nextItem ? (
          <a
            tabIndex={0}
            className={styles.nextLink}
            href={getExperiencePath(nextItem.id, basePath)}
          >
            <span className="sr-only">다음 경험: </span>
            <span>{nextItem.title}</span>
            <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </nav>
    </main>
  );
}
