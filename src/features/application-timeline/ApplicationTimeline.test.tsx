import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { testSnapshot as applicationSnapshot } from '../../test/fixtures/application';
import { ApplicationTimeline } from './ApplicationTimeline';

describe('ApplicationTimeline', () => {
  it('shows chart-only context without adding a detail link or reading-list entry', () => {
    render(
      <ApplicationTimeline
        snapshot={applicationSnapshot}
        chartStartDate="2026-03-01"
        chartAnnotations={[
          {
            id: 'test-work-context',
            category: 'work',
            title: '표 전용 활동',
            startDate: '2026-03-01',
            endDate: '2026-06-30',
            chartOnly: true,
          },
          {
            id: 'test-build-context',
            category: 'build',
            title: '표 전용 구현 활동',
            startDate: '2026-04-01',
            endDate: '2026-06-30',
            chartOnly: true,
          },
        ]}
      />,
    );
    const chart = screen.getByRole('navigation', { name: '경험 타임라인' });
    const workLane = within(chart).getByRole('list', { name: 'Work 경험' });
    const label = within(workLane).getByText('표 전용 활동');
    expect(label.closest('a')).toBeNull();
    expect(label.parentElement).not.toHaveAttribute('tabindex');
    expect(label.closest('li')?.querySelector('[data-chart-mark="period"]')).toBeInTheDocument();
    expect(within(workLane).getByText('Work, 2026년 3월부터 2026년 6월까지,')).toBeInTheDocument();
    const list = screen.getByRole('navigation', { name: '경험 목록' });
    expect(within(list).queryByText('표 전용 활동')).not.toBeInTheDocument();
    const buildLane = within(chart).getByRole('list', { name: 'Build 경험' });
    expect(within(buildLane).getByText('표 전용 구현 활동').closest('a')).toBeNull();
    expect(within(list).queryByText('표 전용 구현 활동')).not.toBeInTheDocument();
    expect(within(list).getAllByRole('link')).toHaveLength(applicationSnapshot.items.length);
  });
  it('narrows the chart without changing actual dates or hiding records from the list', () => {
    const items = [
      {
        ...applicationSnapshot.items[0]!,
        startDate: '2025-10-01',
        endDate: '2026-09-03',
        ongoing: true,
      },
      { ...applicationSnapshot.items[1]!, startDate: '2025-11-01', endDate: '2026-02-28' },
    ];
    render(
      <ApplicationTimeline
        snapshot={{ ...applicationSnapshot, items }}
        chartStartDate="2026-03-01"
      />,
    );
    const chart = screen.getByRole('navigation', { name: '경험 타임라인' });
    expect(within(chart).getAllByRole('link')).toHaveLength(1);
    expect(within(chart).getByText('26.03')).toBeInTheDocument();
    expect(within(chart).queryByText('25.09')).not.toBeInTheDocument();
    expect(
      within(chart).getByRole('link', { name: /2025년 10월부터 현재까지 진행 중/ }),
    ).toBeInTheDocument();
    const list = screen.getByRole('navigation', { name: '경험 목록' });
    expect(within(list).getAllByRole('link')).toHaveLength(2);
    expect(within(list).getByText('2025.10')).toBeInTheDocument();
  });
  it('shows month precision and an ongoing end label in both navigation surfaces', () => {
    const item = {
      ...applicationSnapshot.items[0]!,
      startDate: '2026-08-01',
      endDate: '2026-09-03',
      ongoing: true,
    };
    render(<ApplicationTimeline snapshot={{ ...applicationSnapshot, items: [item] }} />);
    const list = screen.getByRole('navigation', { name: '경험 목록' });
    expect(within(list).getByText('2026.08')).toHaveAttribute('datetime', '2026-08');
    expect(within(list).getByText(/— 현재/)).toBeVisible();
    expect(within(list).queryByText('2026.08.01')).not.toBeInTheDocument();
    const chart = screen.getByRole('navigation', { name: '경험 타임라인' });
    expect(
      within(chart).getByRole('link', { name: /2026년 8월부터 현재까지 진행 중/ }),
    ).toBeInTheDocument();
  });
  it.each([0, 1])('renders %i experiences without inventing empty-state copy', (count) => {
    render(
      <ApplicationTimeline
        snapshot={{ ...applicationSnapshot, items: applicationSnapshot.items.slice(0, count) }}
      />,
    );
    const nav = screen.getByRole('navigation', { name: '경험 목록' });
    expect(within(nav).queryAllByRole('link')).toHaveLength(count);
    expect(within(nav).getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('renders both responsive navigation surfaces with the same six detail routes', () => {
    render(<ApplicationTimeline snapshot={applicationSnapshot} />);

    const desktopNav = screen.getByRole('navigation', {
      name: '경험 타임라인',
    });
    const experienceList = screen.getByRole('navigation', { name: '경험 목록' });

    expect(within(desktopNav).getAllByRole('link')).toHaveLength(6);
    expect(within(experienceList).getAllByRole('link')).toHaveLength(6);
    expect(within(desktopNav).getByRole('link', { name: /Build, 프로젝트 B/ })).toHaveAttribute(
      'href',
      '/experiences/project-b',
    );
  });

  it('groups the document as Build, Work, Grow without duplicating detail copy', () => {
    render(<ApplicationTimeline snapshot={applicationSnapshot} />);

    const document = screen.getByTestId('experience-sections');
    expect(
      within(document)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Build', 'Work', 'Grow']);
    expect(within(document).queryByText('목적')).not.toBeInTheDocument();
    expect(within(document).queryByText('의도')).not.toBeInTheDocument();
    expect(within(document).queryByText('성과')).not.toBeInTheDocument();
    expect(document.querySelectorAll('article[id^="experience-"]')).toHaveLength(6);
    expect(within(document).getAllByRole('heading', { level: 4 })).toHaveLength(6);
    expect(within(document).queryByText('상세 보기')).not.toBeInTheDocument();
  });

  it('restores a return hash and focuses the matching home record', async () => {
    window.history.replaceState(null, '', '#experience-project-b');
    render(<ApplicationTimeline snapshot={applicationSnapshot} />);

    const target = document.querySelector('#experience-project-b a');
    expect(target).toBeInstanceOf(HTMLAnchorElement);

    await waitFor(() => expect(target).toHaveFocus());
  });

  it('stores the selected experience on the home history entry before navigation', () => {
    render(<ApplicationTimeline snapshot={applicationSnapshot} />);
    const document = screen.getByTestId('experience-sections');
    const projectLink = within(document).getByRole('link', { name: /프로젝트 B$/ });
    window.addEventListener('click', (event) => event.preventDefault(), { once: true });

    fireEvent.click(projectLink);

    expect(window.location.hash).toBe('#experience-project-b');
  });

  it('does not restore removed representative or detail-panel UI', () => {
    render(<ApplicationTimeline snapshot={applicationSnapshot} />);

    expect(screen.queryByText('대표')).not.toBeInTheDocument();
    expect(screen.queryByText('항목을 선택하면')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
