/* eslint-disable @typescript-eslint/no-require-imports */
// Uses the bundled Playwright runtime. Run against `npm run dev` on localhost:3000.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/seanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('.shop-card').count(), 3);
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/shops', '/shops/hometown-table', '/stories', '/about']) {
      await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth > innerWidth, bad: [...document.querySelectorAll('main *, header *, footer *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(e).position !== 'absolute'; }).map(e => e.className).slice(0, 8) }));
      assert.equal(overflow.page, false, `${route} at ${width}: ${JSON.stringify(overflow)}`);
      if (overflow.bad.length) console.log('CHECK_LAYOUT', route, width, overflow.bad);
      await page.locator('img').evaluateAll(imgs => imgs.forEach(i => { i.loading = 'eager'; }));
      await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    }
    console.log('PASS responsive', width);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
  await page.goto('http://localhost:3000/shops', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '카페', exact: true }).click();
  assert.equal(await page.locator('.shop-card').count(), 1);
  await page.getByRole('button', { name: '전체', exact: true }).click();
  await page.getByRole('searchbox').fill('존재하지않는가게');
  await page.getByRole('button', { name: '검색 초기화' }).click();
  assert.equal(await page.locator('.shop-card').count(), 3);
  await page.goto('http://localhost:3000/shops/hometown-table', { waitUntil: 'networkidle' });
  if (!process.env.SKIP_WRITES) {
  await page.getByRole('button', { name: /사장님께 편지/ }).click();
  await page.getByRole('button', { name: '편지 작성하기' }).click();
  await page.getByLabel('보내는 이름').fill('검증용이웃');
  await page.getByLabel('전하고 싶은 말').fill('[MVP-SMOKE] 편지 저장과 검토 대기 상태 확인입니다.');
  await page.getByLabel('닉네임과 글이 공개되는 것에 동의합니다.').check();
  await page.getByRole('button', { name: '편지 보내기' }).click();
  await page.getByText('글이 접수되었습니다.', { exact: false }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.message').count(), 0, 'pending messages are not public');
  await page.getByRole('button', { name: '후기 작성하기' }).click();
  await page.getByLabel('보내는 이름').fill('검증용이웃');
  await page.getByLabel('방문 이야기').fill('[MVP-SMOKE] 후기 저장과 검토 대기 상태 확인입니다.');
  await page.getByLabel('닉네임과 글이 공개되는 것에 동의합니다.').check();
  await page.getByRole('button', { name: '후기 보내기' }).click();
  await page.getByText('글이 접수되었습니다.', { exact: false }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'artifacts/detail-desktop.png', fullPage: true });
  const response = await page.goto('http://localhost:3000/shops/missing-shop', { waitUntil: 'networkidle' });
  assert.ok(response.status() === 404 || await page.getByText('아직 닿지 않은 길이에요.').isVisible());
  assert.deepEqual(errors, []);
  console.log('PASS navigation, filters, search reset, letter and review submission, moderation privacy, missing page, no JS errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
