import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const apiMock = readFileSync(
  new URL('./fixtures/youtube-api.js', import.meta.url),
  'utf8',
);
test('content, internal destinations, metadata and local assets are complete', async ({
  page,
}) => {
  const errors: string[] = [];
  const failedAssets: string[] = [];
  const remote: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('localhost') && response.status() >= 400)
      failedAssets.push(response.url());
  });
  page.on('request', (request) => {
    if (/youtube|googlevideo|ytimg/.test(request.url()))
      remote.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main > section')).toHaveCount(6);
  await expect(page.locator('himalayan-landscape')).toHaveAttribute(
    'data-state',
    'ready',
  );
  const broken = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute('href')!)
        .filter((href) => !document.querySelector(href)),
    );
  expect(broken).toEqual([]);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://guptaanish.com.np/',
  );
  const schema = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ||
      '{}',
  );
  expect(schema.name).toBe('Anish Gupta');
  await expect(
    page.locator('[href="mailto:hello@guptaanish.com.np"]').first(),
  ).toBeAttached();
  for (const path of [
    '/favicon.svg',
    '/terrain.svg',
    '/og-image.png',
    '/robots.txt',
    '/sitemap.xml',
    '/CNAME',
  ]) {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(200);
  }
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test('desktop links and case study disclosure work', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: 'Explore my work', exact: true })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await page.locator('.project-details summary').click();
  await expect(
    page.getByRole('link', { name: 'View source on GitHub' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Have an idea? Let’s talk' }).click();
  await expect(page).toHaveURL(/#contact$/);
  await page.getByRole('link', { name: 'BACK TO TOP' }).click();
  await expect(page).toHaveURL(/#home$/);
});

test('mobile navigation supports touch, Escape and focus transfer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('.menu-toggle');
  await expect(page.locator('#main-nav')).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.locator('#main-nav')).toBeHidden();
  await menu.click();
  await page
    .locator('#main-nav')
    .getByRole('link', { name: 'Work', exact: true })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator('#work')).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('responsive layout has no horizontal overflow from 320 to 2560 pixels', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const width of [320, 390, 768, 1024, 1440, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      String(width),
    ).toBe(true);
    for (const selector of [
      '#hero-title',
      '.email-link',
      '.hero-actions',
      '.contact h2',
    ]) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds!.x, selector + ' at ' + width).toBeGreaterThanOrEqual(-1);
      expect(
        bounds!.x + bounds!.width,
        selector + ' at ' + width,
      ).toBeLessThanOrEqual(width + 1);
    }
  }
});

test('reduced motion avoids loading Three.js and remains static', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('himalayan-landscape')).toHaveAttribute(
    'data-state',
    'static',
  );
  await expect(page.locator('[data-motion-toggle]')).toBeHidden();
  expect(scripts.some((url) => url.includes('three-scene'))).toBe(false);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe('auto');
  await page
    .getByRole('link', { name: 'Explore my work', exact: true })
    .click();
  await expect(page.locator('#work h2')).toBeVisible();
});

test('WebGL pauses offscreen, on user request and after a motion preference change', async ({
  page,
}) => {
  await page.goto('/');
  const scene = page.locator('himalayan-landscape');
  await expect(scene).toHaveAttribute('data-state', 'ready');
  await expect(scene).toHaveAttribute('data-rendering', 'true');
  await page.getByRole('button', { name: 'Pause landscape animation' }).click();
  await expect(scene).toHaveAttribute('data-rendering', 'false');
  await page
    .getByRole('button', { name: 'Resume landscape animation' })
    .click();
  await expect(scene).toHaveAttribute('data-rendering', 'true');
  await page
    .getByRole('link', { name: 'Explore my work', exact: true })
    .click();
  await expect(scene).toHaveAttribute('data-rendering', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(scene).toHaveAttribute('data-state', 'static');
  await page.getByRole('link', { name: 'BACK TO TOP' }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(scene).toHaveAttribute('data-state', 'ready');
  await expect(scene).toHaveAttribute('data-rendering', 'true');
});

test('unavailable WebGL falls back without breaking content', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: unknown[]
    ) {
      if (String(args[0]).startsWith('webgl')) return null;
      return Reflect.apply(original, this, args);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('himalayan-landscape')).toHaveAttribute(
    'data-state',
    'fallback',
  );
  await expect(page.locator('.terrain-fallback')).toHaveCSS('opacity', '1');
  await page.getByRole('link', { name: 'Contact me', exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
});

test('GPU context loss recovers and page restoration creates one fresh scene', async ({
  page,
}) => {
  await page.goto('/');
  const scene = page.locator('himalayan-landscape');
  await expect(scene).toHaveAttribute('data-state', 'ready');
  const extension = await page.evaluateHandle(() =>
    document
      .querySelector('canvas')!
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!,
  );
  await extension.evaluate((extension) => extension.loseContext());
  await expect(scene).toHaveAttribute('data-state', 'fallback');
  await extension.evaluate((extension) => extension.restoreContext());
  await extension.dispose();
  await expect(scene).toHaveAttribute('data-state', 'ready');
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    ),
  );
  await expect(scene).toHaveAttribute('data-rendering', 'false');
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect(scene).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('YouTube controls load on play and synchronize pause, mute, volume and close', async ({
  page,
}) => {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: apiMock }),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Open Nepali soundtrack controls' })
    .click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Play Nepali soundtrack', exact: true })
    .click();
  await expect(page.locator('nepali-soundtrack')).toHaveAttribute(
    'data-playing',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Pause Nepali soundtrack', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Mute soundtrack', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Unmute soundtrack', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('output')).toHaveText('0%');
  await page
    .getByRole('button', { name: 'Unmute soundtrack', exact: true })
    .click();
  await expect(page.locator('output')).toHaveText('35%');
  await page.getByRole('slider', { name: 'Soundtrack volume' }).fill('60');
  await expect(page.locator('output')).toHaveText('60%');
  await page
    .getByRole('button', { name: 'Pause Nepali soundtrack', exact: true })
    .click();
  await expect(page.locator('nepali-soundtrack')).toHaveAttribute(
    'data-playing',
    'false',
  );
  await page
    .getByRole('button', { name: 'Play Nepali soundtrack', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Close and pause soundtrack' })
    .click();
  await expect(page.locator('nepali-soundtrack')).toHaveAttribute(
    'data-playing',
    'false',
  );
  await expect(page.locator('#soundtrack-panel')).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Open Nepali soundtrack controls' }),
  ).toBeFocused();
});

test('blocked YouTube API leaves a usable retry and source link', async ({
  page,
}) => {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Open Nepali soundtrack controls' })
    .click();
  await page
    .getByRole('button', { name: 'Play Nepali soundtrack', exact: true })
    .click();
  await expect(page.locator('[data-audio-status]')).toContainText(
    'unavailable',
  );
  await expect(
    page.getByRole('link', { name: 'Listen on YouTube' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Play Nepali soundtrack', exact: true }),
  ).toBeEnabled();
  await page.unroute('https://www.youtube.com/iframe_api');
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: apiMock }),
  );
  await page
    .getByRole('button', { name: 'Play Nepali soundtrack', exact: true })
    .click();
  await expect(page.locator('nepali-soundtrack')).toHaveAttribute(
    'data-playing',
    'true',
  );
});

test('content and navigation remain usable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4322');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('#main-nav')).toBeVisible();
  await expect(page.locator('.terrain-fallback')).toBeVisible();
  await page
    .locator('#main-nav')
    .getByRole('link', { name: 'Work', exact: true })
    .click();
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator('#work h2')).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: 'Listen to the Nepali soundtrack on YouTube',
    }),
  ).toBeVisible();
  await context.close();
});

test('video errors can retry and native player volume stays synchronized', async ({
  page,
}) => {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: apiMock }),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Open Nepali soundtrack controls' })
    .click();
  await page
    .getByRole('button', { name: 'Play Nepali soundtrack', exact: true })
    .click();
  await expect(page.locator('nepali-soundtrack')).toHaveAttribute(
    'data-playing',
    'true',
  );
  await page.evaluate(() =>
    (window as unknown as { __youtube: { fail(): void } }).__youtube.fail(),
  );
  await expect(page.locator('[data-audio-status]')).toContainText(
    'unavailable',
  );
  await expect(page.locator('iframe')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Play Nepali soundtrack', exact: true })
    .click();
  await expect(page.locator('nepali-soundtrack')).toHaveAttribute(
    'data-playing',
    'true',
  );
  await page.evaluate(() =>
    (
      window as unknown as { __youtube: { setVolume(v: number): void } }
    ).__youtube.setVolume(73),
  );
  await expect(page.locator('output')).toHaveText('73%');
});

test('closing the panel while YouTube initializes cancels the playback request', async ({
  page,
}) => {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: apiMock.replace(
        'setTimeout(() => options.events.onReady(), 0);',
        'this.finishReady = () => options.events.onReady();',
      ),
    }),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Open Nepali soundtrack controls' })
    .click();
  await page
    .getByRole('button', { name: 'Play Nepali soundtrack', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Close and pause soundtrack' })
    .click();
  await expect(page.locator('iframe')).toHaveCount(1);
  await page.evaluate(() =>
    (
      window as unknown as { __youtube: { finishReady(): void } }
    ).__youtube.finishReady(),
  );
  await expect(page.locator('[data-audio-status]')).toHaveText(
    'Ready. Use play to listen.',
  );
  await expect(page.locator('nepali-soundtrack')).toHaveAttribute(
    'data-playing',
    'false',
  );
  await expect(page.locator('#soundtrack-panel')).toBeHidden();
});

test('desktop and mobile pass automated WCAG AA checks with visible keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
