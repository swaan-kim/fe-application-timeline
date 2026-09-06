import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { testSnapshot as applicationSnapshot } from '../../test/fixtures/application';
import { ExperienceDetailPage } from './ExperienceDetailPage';

describe('ExperienceDetailPage', () => {
  it('shows static evidence and plays GIFs only after a keyboard action', async () => {
    const user = userEvent.setup();
    render(
      <ExperienceDetailPage
        item={{
          ...applicationSnapshot.items[0]!,
          outcome:
            '![정적 슬라이드](/media/experiences/sample/slide.png)\n\n![전환 시연](/media/experiences/sample/demo.gif)',
        }}
      />,
    );
    expect(screen.getByRole('img', { name: '정적 슬라이드' })).toHaveAttribute('loading', 'lazy');
    expect(
      screen.getByRole('link', { name: '정적 슬라이드 원본 · 새 창에서 열림' }),
    ).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('img', { name: '전환 시연' })).not.toBeInTheDocument();
    const play = screen.getByRole('button', { name: '전환 시연 · GIF 재생' });
    play.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('img', { name: '전환 시연' })).toBeVisible();
    expect(play).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(screen.queryByRole('img', { name: '전환 시연' })).not.toBeInTheDocument();
  });
  it('shows month-only periods and keeps ongoing work distinct from completed work', () => {
    const item = {
      ...applicationSnapshot.items[0]!,
      startDate: '2026-08-01',
      endDate: '2026-09-03',
      ongoing: true,
    };
    const { container, rerender } = render(<ExperienceDetailPage item={item} />);
    expect(screen.getByText('현재')).toBeVisible();
    expect(screen.getByText('현재까지 진행 중')).toBeInTheDocument();
    expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-08');
    expect(screen.queryByText('2026.08.01')).not.toBeInTheDocument();
    rerender(<ExperienceDetailPage item={{ ...item, endDate: '2026-08-25', ongoing: false }} />);
    expect(container.querySelectorAll('time')).toHaveLength(1);
    expect(screen.queryByText('현재')).not.toBeInTheDocument();
  });
  it('adds only list navigation and the next experience, without wrapping the final item', () => {
    const [item, nextItem] = applicationSnapshot.items;
    const { rerender } = render(<ExperienceDetailPage item={item!} nextItem={nextItem} />);
    expect(screen.getByRole('link', { name: /다음 경험:\s*프로젝트 B/ })).toHaveAttribute(
      'href',
      '/experiences/project-b',
    );
    rerender(<ExperienceDetailPage item={item!} />);
    expect(screen.queryByRole('link', { name: /다음 경험:/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /경험 기록/ })).toHaveLength(2);
  });
  it('collapses a completely empty draft into one quiet status line', () => {
    const item = applicationSnapshot.items.find((candidate) => candidate.id === 'project-b');
    expect(item).toBeDefined();
    if (!item) return;

    render(<ExperienceDetailPage item={item} />);

    expect(screen.getByRole('heading', { level: 1, name: '프로젝트 B' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /경험 기록/ })[0]).toHaveAttribute(
      'href',
      '/#experience-project-b',
    );
    expect(screen.getByText('초안 · 내용 작성 전')).toBeVisible();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByText('(미작성)')).not.toBeInTheDocument();
    expect(screen.queryByText('고민한 점')).not.toBeInTheDocument();
    expect(screen.queryByText('배운 점')).not.toBeInTheDocument();
  });

  it('renders the supported Markdown subset and protects external links', () => {
    const item = applicationSnapshot.items[0];
    expect(item).toBeDefined();
    if (!item) return;

    render(
      <ExperienceDetailPage
        item={{
          ...item,
          purpose: '사용자의 **핵심 문제**를 확인합니다.',
          intent: '- 판단 기준을 정합니다.',
          outcome: '[검증 문서](https://example.com)를 남깁니다.',
        }}
      />,
    );

    expect(screen.getByText('핵심 문제').tagName).toBe('STRONG');
    expect(screen.getByText('판단 기준을 정합니다.').closest('li')).toBeVisible();
    expect(screen.getByRole('link', { name: /검증 문서 새 창에서 열림/ })).toHaveAttribute(
      'rel',
      'noreferrer noopener',
    );
    expect(screen.getByRole('link', { name: /검증 문서 새 창에서 열림/ })).toHaveAttribute(
      'target',
      '_blank',
    );
  });

  it('keeps all three sections when only part of a draft is empty', () => {
    const item = applicationSnapshot.items[0];
    expect(item).toBeDefined();
    if (!item) return;

    render(<ExperienceDetailPage item={{ ...item, purpose: '해결할 문제' }} />);

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['목적', '의도', '성과']);
    expect(screen.getAllByText('(미작성)')).toHaveLength(2);
  });
});
