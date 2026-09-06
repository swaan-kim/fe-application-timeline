import path from 'node:path';
import type { Plugin } from 'vite';

// WebKit can retain a rejected module fetch across reloads. Expose the emitted URL
// for an explicit retry without guessing hashed filenames or duplicating the renderer.
export function detailEntryPlugin(rootDir: string): Plugin {
  const moduleId = 'virtual:detail-entry-url';
  const resolvedId = `\0${moduleId}`;
  let development = false;
  let base = '/';
  return {
    name: 'detail-entry-url',
    configResolved(config) {
      development = config.command === 'serve';
      base = config.base;
    },
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      if (development)
        return `export default ${JSON.stringify(`${base}src/features/experience-detail/ExperienceDetailPage.tsx`)};`;
      const reference = this.emitFile({
        type: 'chunk',
        id: path.resolve(rootDir, 'src/features/experience-detail/ExperienceDetailPage.tsx'),
      });
      return `export default import.meta.ROLLUP_FILE_URL_${reference};`;
    },
  };
}
