import path from 'node:path';
import type { Plugin } from 'vite';
import { loadApplicationContent } from './application-content.ts';
import { CONTENT_MANIFEST_FILE, createContentManifest } from './content-manifest.ts';
import type { TimelineSnapshot } from '../src/domain/timeline.ts';
import type { ApplicationConfig } from '../src/domain/application-config.ts';

const VIRTUAL_MODULE_ID = 'virtual:application-content';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

interface ApplicationContentPluginOptions {
  rootDir: string;
  includeDrafts: boolean;
  snapshot?: TimelineSnapshot;
  config?: ApplicationConfig;
}

export function applicationContentPlugin({
  rootDir,
  includeDrafts,
  snapshot: fixture,
  config,
}: ApplicationContentPluginOptions): Plugin {
  const contentDir = path.resolve(rootDir, 'content', 'experiences');
  let emittedSnapshot: TimelineSnapshot | undefined;

  return {
    name: 'application-content',
    resolveId(id) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined;
      const snapshot =
        fixture ?? (await loadApplicationContent({ rootDir, includeDrafts, config }));
      emittedSnapshot = snapshot;
      return `export default ${JSON.stringify(snapshot)};`;
    },
    generateBundle() {
      if (!emittedSnapshot) this.error('경험 콘텐츠가 빌드에 포함되지 않았습니다.');
      this.emitFile({
        type: 'asset',
        fileName: CONTENT_MANIFEST_FILE,
        source: JSON.stringify(createContentManifest(emittedSnapshot, includeDrafts)),
      });
    },
    configureServer(server) {
      server.watcher.add(contentDir);
    },
    hotUpdate({ file }) {
      if (!file.endsWith('.md') || !path.resolve(file).startsWith(`${contentDir}${path.sep}`))
        return;
      const module = this.environment.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
      if (module) this.environment.moduleGraph.invalidateModule(module);
      this.environment.hot.send({ type: 'full-reload' });
      return [];
    },
  };
}
