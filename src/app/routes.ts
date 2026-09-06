import type { TimelineItem } from '../domain/timeline';

export type AppRoute =
  { type: 'home' } | { type: 'experience'; item: TimelineItem } | { type: 'not-found' };

function normalizeBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function getExperiencePath(id: string, basePath = '/'): string {
  return `${normalizeBasePath(basePath)}experiences/${id}`;
}

export function getHomeAnchorPath(id: string, basePath = '/'): string {
  return `${normalizeBasePath(basePath)}#experience-${id}`;
}

export function resolveAppRoute(
  pathname: string,
  items: readonly TimelineItem[],
  basePath = '/',
): AppRoute {
  const normalizedBase = normalizeBasePath(basePath);
  if (pathname === normalizedBase.slice(0, -1)) return { type: 'home' };
  if (!pathname.startsWith(normalizedBase)) return { type: 'not-found' };
  const pathWithoutBase = pathname.slice(normalizedBase.length);
  const normalizedPath = pathWithoutBase.replace(/\/+$/, '');

  if (normalizedPath === '' || normalizedPath === 'index.html') {
    return { type: 'home' };
  }

  const match = /^experiences\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(normalizedPath);
  if (!match) {
    return { type: 'not-found' };
  }

  const item = items.find((candidate) => candidate.id === match[1]);
  return item ? { type: 'experience', item } : { type: 'not-found' };
}
