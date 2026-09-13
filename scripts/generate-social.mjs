import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const font = (path) => readFileSync(path).toString('base64');
const latin = font(
  'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
);
const nepali = font(
  'node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-700-normal.woff2',
);
const terrain = readFileSync('public/terrain.svg').toString('base64');
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(`<!doctype html><html><head><style>
  @font-face{font-family:Space;src:url(data:font/woff2;base64,${latin})}
  @font-face{font-family:Nepali;src:url(data:font/woff2;base64,${nepali});font-weight:700}
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#111213;color:#eee9df;font-family:Space;overflow:hidden}
  .art{position:absolute;left:490px;top:40px;width:820px;height:656px}.sun{position:absolute;width:150px;height:150px;right:205px;top:97px;border:1px solid #ac5143;border-radius:50%;background:repeating-linear-gradient(0deg,transparent 0 2px,#73352d 2px 3px)}
  header,footer{position:absolute;left:54px;right:54px;display:flex;justify-content:space-between;font-size:11px;letter-spacing:2px}header{top:37px;padding-bottom:23px;border-bottom:1px solid #383934}footer{bottom:30px;padding-top:22px;border-top:1px solid #383934;color:#aaa79e;font-size:10px}
  .name{position:absolute;left:43px;top:135px;font-family:Nepali;font-size:203px;font-weight:700;letter-spacing:-12px;line-height:1.3}
  h1{position:absolute;top:390px;left:54px;font-size:38px;font-weight:500;letter-spacing:-1px;margin:0}p{position:absolute;left:54px;top:441px;font-size:14px;color:#aaa79e}.accent{color:#ed796b}
  </style></head><body><div class="sun"></div><img class="art" src="data:image/svg+xml;base64,${terrain}"/><header><span>ANISH GUPTA</span><span class="accent">ROOTED IN NEPAL. REACHING BEYOND.</span></header><div class="name" lang="ne">अनिष</div><h1>Anish Gupta<span class="accent">.</span></h1><p>Creative Developer / AI &amp; ML Enthusiast</p><footer><span>GUPTAANISH.COM.NP</span><span>KATHMANDU, NEPAL</span></footer></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/og-image.png' });
} finally {
  await browser.close();
}
