import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect, test } from '@playwright/test';

interface ZoomApi {
  tabs: {
    query(query: { url: string }): Promise<Array<{ id?: number }>>;
    setZoom(id: number, factor: number): Promise<void>;
    getZoom(id: number): Promise<number>;
  };
}

// Native tab zoom, not CSS zoom, font-size, DPR emulation or pinch scaling.
// See https://playwright.dev/docs/chrome-extensions and chrome.tabs.setZoom.
test('real browser 200% zoom reflows the home and the long detail', async ({
  baseURL,
}, testInfo) => {
  const qaRoot = path.resolve('../../work/qa');
  await mkdir(qaRoot, { recursive: true });
  const profile = await mkdtemp(path.join(qaRoot, 'zoom-profile-'));
  const extension = path.resolve('e2e/fixtures/zoom-extension');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const page = context.pages()[0] ?? (await context.newPage());
    const captureSession = await context.newCDPSession(page);
    for (const route of ['/', '/experiences/reading-example']) {
      await page.goto(`${baseURL}${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const zoom = await worker.evaluate(async (url) => {
        const api = (globalThis as unknown as { chrome: ZoomApi }).chrome;
        const [tab] = await api.tabs.query({ url: `${url}/*` });
        if (tab?.id === undefined) throw new Error('Local QA tab not found');
        await api.tabs.setZoom(tab.id, 2);
        return api.tabs.getZoom(tab.id);
      }, baseURL!);
      expect(zoom).toBe(2);
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(720);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
        '16px',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);
      if (route === '/')
        await expect(page.getByRole('navigation', { name: '경험 타임라인' })).toBeHidden();
      else
        await expect(page.getByRole('heading', { level: 2 })).toHaveText(['목적', '의도', '성과']);
      // Native browser zoom changes CSS viewport coordinates. A full-page capture
      // can crop physical pixels in Chromium, so inspect unchanged viewport shots.
      for (const position of ['top', 'bottom'] as const) {
        await page.evaluate((edge) => {
          window.scrollTo(0, edge === 'top' ? 0 : document.documentElement.scrollHeight);
        }, position);
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
            ),
        );
        const capturePath = testInfo.outputPath(
          `zoom-${route === '/' ? 'home' : 'detail'}-${position}.png`,
        );
        await mkdir(path.dirname(capturePath), { recursive: true });
        await writeFile(
          capturePath,
          Buffer.from(
            (
              await captureSession.send('Page.captureScreenshot', {
                format: 'png',
                fromSurface: true,
                captureBeyondViewport: false,
              })
            ).data,
            'base64',
          ),
        );
        await testInfo.attach(`browser-zoom-${route === '/' ? 'home' : 'detail'}-${position}`, {
          path: capturePath,
          contentType: 'image/png',
        });
      }
    }
  } finally {
    await context.close();
  }
});
