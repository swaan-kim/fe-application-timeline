import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

describe('App route rendering', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps the home focused on experiences without a GitHub promotion link', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 2, name: '경험 기록' })).toBeVisible();
    expect(screen.queryByRole('link', { name: /GitHub|지원서 코드/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="github.com"]')).toBeNull();
  });

  it('renders a detail document from a direct path', async () => {
    window.history.replaceState(null, '', '/experiences/accessibility-study');
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: '접근성 학습·검증' }),
    ).toBeVisible();
    expect(screen.getByText('초안 · 내용 작성 전')).toBeVisible();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: /경험 기록/ })).toHaveLength(2);
    await waitFor(() => expect(document.title).toContain('접근성 학습·검증'));
  });

  it('renders a useful not-found document for an unknown experience', () => {
    window.history.replaceState(null, '', '/experiences/unknown');
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다.' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: '경험 기록으로 돌아가기' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
