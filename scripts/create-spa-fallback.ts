import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await copyFile(path.join(rootDir, 'dist', 'index.html'), path.join(rootDir, 'dist', '404.html'));
console.log('정적 호스팅 상세 경로 fallback 생성 완료');
