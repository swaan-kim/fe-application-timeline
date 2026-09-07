import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('bar endpoints open the same detail without enlarging its date geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const edge of ['left', 'right'] as const) {
    await page.goto('/');
    const mark = page.locator('[data-chart-id="project-b"] [data-chart-mark]');
    const rect = await mark.boundingBox();
    expect(rect).not.toBeNull();
    await mark.click({ position: { x: edge === 'left' ? 1 : rect!.width - 1, y: 1 } });
    await expect(page).toHaveURL(/\/experiences\/project-b$/);
    await expect(page.getByRole('heading', { level: 1, name: '프로젝트 B' })).toBeVisible();
  }
});

test('skip link moves keyboard reading directly to the document list', async ({ page }) => {
  await page.goto('/');
  const skip = page.getByRole('link', { name: '경험 목록으로 건너뛰기' });
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: '경험 목록' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#experience-project-b a')).toBeFocused();
});

test('long content, continued reading, direct reload and Back stay connected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/experiences/reading-example');
  await page.reload();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['목적', '의도', '성과']);
  const next = page.getByRole('link', { name: /^다음 경험:/ });
  await expect(next.getByText('다음 경험', { exact: false })).toBeVisible();
  await next.scrollIntoViewIfNeeded();
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/experiences\/product-team-collaboration$/);
  await expect(page.getByRole('heading', { level: 1, name: '제품팀 협업' })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/experiences\/reading-example$/);
  await page
    .getByRole('navigation', { name: '경험 이어 읽기' })
    .getByRole('link', { name: /경험 기록/ })
    .click();
  await expect(page.locator('#experience-reading-example a')).toBeFocused();
  await page.goto('/experiences/accessibility-study');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /^다음 경험:/ })).toHaveCount(0);
});

test('all nine titles remain visible and non-overlapping at the graph breakpoint', async ({
  page,
}) => {
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const links = page.locator('[data-chart-id] a');
    await expect(links).toHaveCount(9);
    const boxes = await links.evaluateAll((elements) =>
      elements.map((link) => {
        const label = link.querySelector('span')!;
        const rect = link.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          clipped:
            label.scrollHeight > label.clientHeight + 1 ||
            label.scrollWidth > label.clientWidth + 1,
        };
      }),
    );
    for (const box of boxes) expect(box.clipped).toBe(false);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        expect(
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
        ).toBe(true);
      }
  }
});

test('long detail supports 200% text, reduced motion, keyboard links and accessibility', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/experiences/reading-example');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(3);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
  const external = page.getByRole('link', { name: /검증용 링크/ });
  await external.focus();
  await expect(external).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

test('home does not request the Markdown renderer and a failed detail load can retry', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: '경험 기록' })).toBeVisible();
  expect(requests.some((url) => /ExperienceDetailPage.*\.js/u.test(url))).toBe(false);
  await page.route('**/assets/ExperienceDetailPage-*.js', (route) =>
    route.fulfill({
      status: 503,
      headers: { 'cache-control': 'no-store' },
      body: 'Temporarily unavailable',
    }),
  );
  await page.goto('/experiences/reading-example');
  await expect(page.getByRole('heading', { name: '경험을 불러오지 못했습니다.' })).toBeVisible();
  const back = page.getByRole('link', { name: '경험 기록', exact: false }).first();
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await back.focus();
  await expect(back).toBeFocused();
  await page.unroute('**/assets/ExperienceDetailPage-*.js');
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['목적', '의도', '성과']);
});

for (const width of [1440, 320]) {
  test(`detail loading keeps the same paper and focused back link at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/assets/ExperienceDetailPage-*.js', async (route) => {
      await pending;
      await route.continue();
    });
    try {
      await page.goto('/experiences/reading-example', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('status')).toHaveText('경험을 불러오는 중…');
      await page.evaluate(() => document.fonts.ready);
      const paper = page.getByRole('main');
      const back = page.getByRole('link', { name: '경험 기록', exact: false }).first();
      const before = { paper: await paper.boundingBox(), back: await back.boundingBox() };
      expect(before.paper!.width).toBe(Math.min(width, 768));
      expect(before.back!.height).toBeGreaterThanOrEqual(44);
      await back.focus();
      const focusedLink = await back.elementHandle();
      release();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('status')).toHaveCount(0);
      expect(await focusedLink.evaluate((element) => element === document.activeElement)).toBe(
        true,
      );
      await expect(back).toBeFocused();
      expect(await paper.boundingBox()).toMatchObject({
        x: before.paper!.x,
        width: before.paper!.width,
      });
      expect(await back.boundingBox()).toEqual(before.back);
      await page.keyboard.press('Enter');
      await expect(page.locator('#experience-reading-example a')).toBeFocused();
      await expect(page.locator('#experience-reading-example a')).toBeInViewport({ ratio: 1 });
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
}
