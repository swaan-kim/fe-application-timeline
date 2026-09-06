import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Build / Work / Grow 지원서', () => {
  test('shows a compact desktop timeline and three document sections', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /.+/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '경험 기록' })).toBeVisible();

    const timeline = page.getByRole('navigation', { name: '경험 타임라인' });
    await expect(timeline).toBeVisible();
    await expect(timeline.getByRole('link')).toHaveCount(9);
    await expect(page.getByRole('navigation', { name: '경험 목록' })).toBeVisible();
    await expect(
      page.getByTestId('experience-sections').getByRole('heading', { level: 3 }),
    ).toHaveText(['Build', 'Work', 'Grow']);
    await expect(page.getByText('상세 보기', { exact: true })).toHaveCount(0);
    await expect(page.getByText('목적', { exact: true })).toHaveCount(0);
    await expect(page.getByText('의도', { exact: true })).toHaveCount(0);
    await expect(page.getByText('성과', { exact: true })).toHaveCount(0);
  });

  test('loads the bundled Korean variable font', async ({ page }) => {
    const fontResponses: number[] = [];
    page.on('response', (response) => {
      if (
        response.url().toLowerCase().includes('pretendardvariable') &&
        response.url().includes('.woff2')
      ) {
        fontResponses.push(response.status());
      }
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).fontFamily.split(',')[0],
      ),
    ).toContain('Pretendard Variable');
    expect(fontResponses).toContain(200);
    expect(
      await page.evaluate(() => {
        let loaded = false;
        document.fonts.forEach((font) => {
          if (font.family.includes('Pretendard Variable')) loaded = true;
        });
        return loaded;
      }),
    ).toBe(true);
  });

  test('opens a project detail and returns to the matching home record', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');

    const timeline = page.getByRole('navigation', { name: '경험 타임라인' });
    const projectLink = timeline.getByRole('link', { name: /Build, 프로젝트 B/ });
    await projectLink.click();

    await expect(page).toHaveURL(/\/experiences\/project-b$/);
    await expect(page.getByRole('heading', { level: 1, name: '프로젝트 B' })).toBeVisible();
    await expect(page.getByText('초안 · 내용 작성 전')).toBeVisible();

    await page
      .getByRole('link', { name: /경험 기록/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/#experience-project-b$/);
    await expect(page.locator('#experience-project-b a')).toBeFocused();

    await page.goBack();
    await expect(page).toHaveURL(/\/experiences\/project-b$/);
    await expect(page.getByRole('heading', { level: 1, name: '프로젝트 B' })).toBeVisible();
  });

  test('restores a directly shared detail URL after reload', async ({ page }) => {
    await page.goto('/experiences/accessibility-study');
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: '접근성 학습·검증' })).toBeVisible();
    await expect(page.getByText('초안 · 내용 작성 전')).toBeVisible();
  });

  test('keeps the same experience focused across desktop and mobile layouts', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/#experience-peer-review-retrospective');
    const record = page.locator('#experience-peer-review-retrospective a');
    await expect(record).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(record).toBeFocused();
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(record).toBeFocused();
    await page
      .getByRole('navigation', { name: '경험 타임라인' })
      .getByRole('link', { name: /Grow, 동료 리뷰와 회고/ })
      .focus();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(record).toBeFocused();
  });

  test('keeps chart labels separated and inside their lane with enlarged text', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    const bounds = await page.locator('[data-chart-id]').evaluateAll((items) =>
      items.map((item) => {
        const link = item.querySelector('a')!.getBoundingClientRect();
        const lane = item.parentElement!.getBoundingClientRect();
        return {
          left: link.left,
          right: link.right,
          top: link.top,
          bottom: link.bottom,
          laneLeft: lane.left,
          laneRight: lane.right,
        };
      }),
    );
    for (const box of bounds) {
      expect(box.left).toBeGreaterThanOrEqual(box.laneLeft - 1);
      expect(box.right).toBeLessThanOrEqual(box.laneRight + 1);
    }
    for (let i = 0; i < bounds.length; i += 1) {
      for (let j = i + 1; j < bounds.length; j += 1) {
        const a = bounds[i],
          b = bounds[j];
        expect(
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
        ).toBe(true);
      }
    }
  });

  test('uses a keyboard-operable mobile jump list without duplicate tab stops', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: '경험 타임라인' })).toBeHidden();
    const mobileNav = page.getByRole('navigation', { name: '경험 목록' });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link')).toHaveCount(9);
    await expect(mobileNav.getByRole('heading', { level: 3 })).toHaveText([
      'Build',
      'Work',
      'Grow',
    ]);
    await expect(mobileNav.getByRole('heading', { level: 4 })).toHaveCount(9);

    const link = mobileNav.getByRole('link', { name: /동료 리뷰와 회고$/ });
    await link.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/experiences\/peer-review-retrospective$/);
    await expect(page.getByRole('heading', { level: 1, name: '동료 리뷰와 회고' })).toBeVisible();

    await page
      .getByRole('link', { name: /경험 기록/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/#experience-peer-review-retrospective$/);
    await expect(
      page
        .getByRole('navigation', { name: '경험 목록' })
        .getByRole('link', { name: /동료 리뷰와 회고$/ }),
    ).toBeFocused();
  });

  for (const viewport of [
    { name: 'desktop', width: 1024, height: 768 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`restores the selected ${viewport.name} link after browser Back`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');

      const surface =
        viewport.name === 'mobile'
          ? page.getByRole('navigation', { name: '경험 목록' })
          : page.getByTestId('experience-sections');
      const linkName = /동료 리뷰와 회고$/;
      const link = surface.getByRole('link', { name: linkName });
      await link.click();
      await expect(page).toHaveURL(/\/experiences\/peer-review-retrospective$/);

      await page.goBack();

      await expect(page).toHaveURL(/\/#experience-peer-review-retrospective$/);
      await expect(
        (viewport.name === 'mobile'
          ? page.getByRole('navigation', { name: '경험 목록' })
          : page.getByTestId('experience-sections')
        ).getByRole('link', { name: linkName }),
      ).toBeFocused();
    });
  }

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 320, height: 720 },
  ]) {
    test(`has no document overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const path of ['/', '/experiences/project-b', '/experiences/reading-example']) {
        await page.goto(path);

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      }
    });
  }

  test('reflows at 200% text size and removes motion when requested', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const transitionSeconds = await page.locator('#experience-project-b').evaluate((element) => {
      const duration = getComputedStyle(element).transitionDuration;
      return duration.endsWith('ms')
        ? Number.parseFloat(duration) / 1000
        : Number.parseFloat(duration);
    });
    expect(transitionSeconds).toBeLessThanOrEqual(0.00001);
  });

  test('renders a useful not-found page for an unknown experience', async ({ page }) => {
    await page.goto('/experiences/unknown');

    await expect(
      page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: '경험 기록으로 돌아가기' })).toBeVisible();
  });

  test('has no automatically detectable accessibility violations', async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const path of ['/', '/experiences/project-b', '/experiences/reading-example']) {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(results.violations).toEqual([]);
      }
    }
  });

  test('attaches representative visual snapshots', async ({ page }, testInfo) => {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const screenshot = await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await testInfo.attach(`application-${viewport.name}`, {
        body: screenshot,
        contentType: 'image/png',
      });
    }

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/experiences/project-b');
    const detailScreenshot = await page.screenshot({
      path: testInfo.outputPath('detail.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await testInfo.attach('application-detail', {
      body: detailScreenshot,
      contentType: 'image/png',
    });
  });
});
