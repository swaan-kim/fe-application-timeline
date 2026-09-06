import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { EXPERIENCE_MEDIA } from '../src/content/experience-media';

test('registered dimensions match the actual assets, including GIF and JPEG-encoded captures', async ({
  page,
}) => {
  await page.goto('/');
  const sizes = await page.evaluate(async (sources) => {
    return Promise.all(
      sources.map(async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return { src, width: image.naturalWidth, height: image.naturalHeight };
      }),
    );
  }, Object.keys(EXPERIENCE_MEDIA));
  for (const { src, width, height } of sizes) {
    expect({ width, height }, src).toEqual({
      width: EXPERIENCE_MEDIA[src].width,
      height: EXPERIENCE_MEDIA[src].height,
    });
  }
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`detail media and technology names stay readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/experiences/reading-example');
    const title = page.getByRole('heading', { level: 1 });
    const technologies = page.getByRole('list', { name: '기술 스택' });
    await expect(title).toBeVisible();
    await expect(technologies).toBeVisible();
    const [titleBox, technologyBox] = await Promise.all([
      title.boundingBox(),
      technologies.boundingBox(),
    ]);
    expect(titleBox && technologyBox).toBeTruthy();
    expect(
      technologyBox!.y >= titleBox!.y + titleBox!.height ||
        technologyBox!.x >= titleBox!.x + titleBox!.width,
    ).toBe(true);

    for (const label of ['테스트 홈', '테스트 꾸미기', '테스트 문서']) {
      const image = page.getByRole('img', { name: label, exact: true });
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      const rect = await image.boundingBox();
      const ratio = await image.evaluate((element) => {
        const img = element as HTMLImageElement;
        return img.naturalWidth / img.naturalHeight;
      });
      expect(Math.abs(rect!.width / rect!.height - ratio)).toBeLessThan(0.01);
      if (label !== '테스트 문서') expect(rect!.height).toBeLessThanOrEqual(36 * 16 + 1);
    }
    const phone = await page.getByRole('img', { name: '테스트 홈', exact: true }).boundingBox();
    const second = await page
      .getByRole('img', { name: '테스트 꾸미기', exact: true })
      .boundingBox();
    expect(width <= 480 ? second!.y > phone!.y : Math.abs(second!.y - phone!.y) < 1).toBe(true);
    expect((await page.getByText('테스트 홈', { exact: true }).boundingBox())!.height).toBeLessThan(
      44,
    );
    const gif = page.getByRole('button', { name: '테스트 GIF · GIF 재생' });
    expect((await gif.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
    await expect(page.getByText('원본 보기', { exact: true })).toHaveCount(0);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  });
}

test('lazy image space is reserved while the network request is delayed', async ({ page }) => {
  let releaseImage!: () => void;
  const delay = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route('**/media/experiences/project-b/home.png', async (route) => {
    await delay;
    await route.continue();
  });
  try {
    await page.goto('/experiences/reading-example', { waitUntil: 'domcontentloaded' });
    const image = page.getByRole('img', { name: '테스트 홈', exact: true });
    await image.scrollIntoViewIfNeeded();
    const before = await image.boundingBox();
    expect(before!.width).toBeGreaterThan(0);
    expect(before!.height).toBeGreaterThan(0);
    releaseImage();
    await expect
      .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBe(444);
    const after = await image.boundingBox();
    expect(Math.abs(before!.width - after!.width)).toBeLessThan(1);
    expect(Math.abs(before!.height - after!.height)).toBeLessThan(1);
  } finally {
    releaseImage();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
