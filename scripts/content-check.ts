import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectApplicationContent } from '../build/application-content.ts';
import { APPLICATION_CONFIG } from '../src/content/application.config.ts';
import { collectApplicationConfigDiagnostics } from '../src/domain/application-config.ts';
import { formatDiagnostic } from '../src/domain/content-diagnostic.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publish = process.argv.includes('--publish');

try {
  const configIssues = collectApplicationConfigDiagnostics(APPLICATION_CONFIG, {
    requirePublicationReady: publish,
  });
  const { snapshot, diagnostics } = await inspectApplicationContent({
    rootDir,
    includeDrafts: !publish,
    requirePublicationReady: publish,
  });
  const issues = [...configIssues, ...diagnostics];
  for (const issue of issues)
    console[issue.severity === 'error' ? 'error' : 'warn'](
      `${issue.severity === 'error' ? '오류' : '주의'}: ${formatDiagnostic(issue)}`,
    );
  if (issues.some((issue) => issue.severity === 'error')) process.exitCode = 1;
  else console.log(`콘텐츠 검사 완료: ${snapshot.items.length}개 경험`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
