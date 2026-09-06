import { useId, useState } from 'react';
import { isExperienceMediaPath } from '../../domain/experience-media';
import styles from './ExperienceDetailPage.module.css';

export function ExperienceImage({ src, alt }: { src: string; alt: string }) {
  const [playing, setPlaying] = useState(false);
  const mediaId = useId();
  if (!isExperienceMediaPath(src)) return null;
  const url = `${import.meta.env.BASE_URL}${src.slice(1)}`;
  const animated = src.endsWith('.gif');

  return (
    <span className={styles.media}>
      {animated && (
        <button
          type="button"
          className={styles.mediaToggle}
          aria-expanded={playing}
          aria-controls={mediaId}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? 'GIF 숨기기' : `${alt} · GIF 재생`}
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
            <img src={url} alt={alt} loading="lazy" decoding="async" />
          </a>
        )}
      </span>
      <span className={styles.mediaCaption}>{alt}</span>
    </span>
  );
}
