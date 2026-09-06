import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EXPERIENCE_MEDIA } from '../../content/experience-media';
import { isExperienceMediaPath } from '../../domain/experience-media';
import { ExperienceImage } from './ExperienceImage';

describe('experience media', () => {
  it('reserves intrinsic dimensions and limits only registered phone captures', () => {
    const { container, rerender } = render(
      <ExperienceImage src="/media/experiences/project-b/home.png" alt="강아지 홈" />,
    );
    const image = screen.getByRole('img', { name: '강아지 홈' });
    expect(image).toHaveAttribute('width', '444');
    expect(image).toHaveAttribute('height', '960');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(container.querySelector('[data-media-layout="phone"]')).not.toBeNull();
    expect(screen.getByRole('link')).toHaveAccessibleName('강아지 홈 원본 · 새 창에서 열림');

    rerender(
      <ExperienceImage
        src="/media/experiences/product-team-collaboration/architecture.png"
        alt="아키텍처"
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('width', '1536');
    expect(screen.getByRole('img')).toHaveAttribute('height', '1024');
    expect(container.querySelector('[data-media-layout]')).toBeNull();
  });

  it('keeps unregistered images visible without inventing dimensions', () => {
    render(<ExperienceImage src="/media/experiences/new-example/screen.png" alt="새 자료" />);
    expect(screen.getByRole('img')).not.toHaveAttribute('width');
    expect(screen.getByRole('img')).not.toHaveAttribute('height');
    expect(screen.getByText('새 자료')).toBeVisible();
  });

  it('loads the GIF with intrinsic dimensions only after an explicit keyboard action', async () => {
    const user = userEvent.setup();
    render(
      <ExperienceImage src="/media/experiences/interaction-prototype/slide-demo.gif" alt="시연" />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: '시연 · GIF 재생' });
    toggle.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('img')).toHaveAttribute('width', '400');
    expect(screen.getByRole('img')).toHaveAttribute('height', '204');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard(' ');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('registers only positive intrinsic dimensions for repository media', () => {
    for (const [src, metadata] of Object.entries(EXPERIENCE_MEDIA)) {
      expect(isExperienceMediaPath(src)).toBe(true);
      expect(Number.isSafeInteger(metadata.width) && metadata.width > 0).toBe(true);
      expect(Number.isSafeInteger(metadata.height) && metadata.height > 0).toBe(true);
      if (metadata.layout === 'phone') expect(src).toMatch(/^\/media\/experiences\/project-b\//);
    }
  });
});
