import { useEffect, type MouseEvent } from 'react';
import type { TimelineItem } from '../../domain/timeline';

export function getExperienceAnchor(id: string): string {
  return `experience-${id}`;
}

export function rememberExperience(event: MouseEvent<HTMLAnchorElement>, id: string): void {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const current = new URL(window.location.href);
  current.hash = getExperienceAnchor(id);
  window.history.replaceState(window.history.state, '', current);
}

export function useReturnAnchorFocus(items: readonly TimelineItem[]): void {
  useEffect(() => {
    let timer: number | undefined;
    let focusedLink: HTMLAnchorElement | null = null;
    const rememberFocus = (event: FocusEvent) => {
      focusedLink =
        event.target instanceof HTMLAnchorElement && event.target.dataset.experienceId
          ? event.target
          : null;
    };
    const restoreAfterResize = () => {
      if (!focusedLink || focusedLink.getClientRects().length > 0) return;
      const id = focusedLink.dataset.experienceId;
      const link = id ? document.getElementById(getExperienceAnchor(id))?.querySelector('a') : null;
      link?.scrollIntoView?.({ block: 'nearest' });
      link?.focus({ preventScroll: true });
    };
    const restore = () => {
      window.clearTimeout(timer);
      const id = items.find(
        (item) => `#${getExperienceAnchor(item.id)}` === window.location.hash,
      )?.id;
      if (!id) return;
      timer = window.setTimeout(() => {
        const link = document.getElementById(getExperienceAnchor(id))?.querySelector('a');
        if (link instanceof HTMLElement) {
          link.scrollIntoView?.({ block: 'nearest' });
          link.focus({ preventScroll: true });
        }
      }, 0);
    };
    restore();
    window.addEventListener('hashchange', restore);
    window.addEventListener('pageshow', restore);
    document.addEventListener('focusin', rememberFocus);
    window.addEventListener('resize', restoreAfterResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', restore);
      window.removeEventListener('pageshow', restore);
      document.removeEventListener('focusin', rememberFocus);
      window.removeEventListener('resize', restoreAfterResize);
    };
  }, [items]);
}
