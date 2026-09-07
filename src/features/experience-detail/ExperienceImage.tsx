import { useId, useState, type CSSProperties } from 'react';
import { isExperienceMediaPath } from '../../domain/experience-media';
import { EXPERIENCE_MEDIA } from '../../content/experience-media';
import styles from './ExperienceDetailPage.module.css';

export function ExperienceImage({ src, alt }: { src: string; alt: string }) {
  const [playing, setPlaying] = useState(false);
  const mediaId = useId();
  if (!isExperienceMediaPath(src)) return null;
  const url = `${import.meta.env.BASE_URL}${src.slice(1)}`;
  const animated = src.endsWith('.gif');
  const metadata = EXPERIENCE_MEDIA[src];

  return (
    <span
      className={styles.media}
      data-media-layout={metadata?.layout}
      style={
        metadata
          ? ({ '--media-ratio': metadata.width / metadata.height } as CSSProperties)
          : undefined
      }
    >
      {animated && (
        <button
          type="button"
          className={styles.mediaToggle}
          aria-expanded={playing}
          aria-controls={mediaId}
          onClick={() => setPlaying(!playing)}
        >
          {alt} · {playing ? 'GIF 숨기기' : 'GIF 재생'}
        </button>
      )}
      <span id={mediaId}>
        {(!animated || playing) && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${alt} 원본 · 새 창에서 열림`}
          >
            <img
              src={url}
              alt={alt}
              width={metadata?.width}
              height={metadata?.height}
              loading="lazy"
              decoding="async"
            />
          </a>
        )}
      </span>
      {!animated && <span className={styles.mediaCaption}>{alt}</span>}
    </span>
  );
}
