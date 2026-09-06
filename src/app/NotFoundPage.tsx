import { useEffect } from 'react';
import { APPLICATION_CONFIG } from '../content/application.config';
import styles from './NotFoundPage.module.css';

interface NotFoundPageProps {
  basePath?: string;
}

export function NotFoundPage({ basePath = '/' }: NotFoundPageProps) {
  useEffect(() => {
    document.title = `페이지를 찾을 수 없음 | ${APPLICATION_CONFIG.name} ${APPLICATION_CONFIG.role}`;
  }, []);

  return (
    <main className={styles.page}>
      <p className={styles.code}>404</p>
      <h1>페이지를 찾을 수 없습니다.</h1>
      <p>주소를 다시 확인하거나 경험 기록 페이지로 돌아가세요.</p>
      <a tabIndex={0} href={basePath}>
        경험 기록으로 돌아가기
      </a>
    </main>
  );
}
