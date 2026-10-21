/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/seanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('main img').count(), 0);
    assert.equal(await page.getByRole('navigation').getByRole('link', { name: '단체 소개' }).count(), 1);
    assert.equal((await page.locator('body').innerText()).includes('뿌길'), false);
    await page.screenshot({ path: 'artifacts/revised-home.png', fullPage: true });
    for (const width of [320, 375, 414, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('http://localhost:3000/shops/hometown-table', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('dialog').isVisible(), false);
      assert.equal(await page.locator('input[type=date]').count(), 0);
      const trigger = page.getByRole('button', { name: '후기 작성하기' });
      await trigger.click();
      await page.getByRole('dialog').waitFor();
      assert.equal(await page.getByLabel('보내는 이름').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const dimensions = await page.locator('dialog').boundingBox();
      assert.ok(dimensions.width <= width && dimensions.y >= 0, 'dialog fits viewport');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').isVisible(), false);
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      await page.getByRole('button', { name: /사장님께 편지/ }).click();
      await page.getByRole('button', { name: '편지 작성하기' }).click();
      assert.equal(await page.getByLabel('전하고 싶은 말').isVisible(), true);
      await page.getByRole('button', { name: '작성 창 닫기' }).click();
      console.log('PASS dialog, escape, restored focus, no date, viewport', width);
    }
    await page.goto('http://localhost:3000/shops/hometown-table?write=letter#community', { waitUntil: 'networkidle' });
    await page.getByRole('dialog').waitFor();
    let submitted;
    await page.route('**/api/messages', async route => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: '접수되었습니다.' }) });
    });
    await page.getByLabel('보내는 이름').fill('화면검증');
    await page.getByLabel('전하고 싶은 말').fill('글쓰기 대화상자의 전송 동작을 확인합니다.');
    await page.getByLabel('닉네임과 글이 공개되는 것에 동의합니다.').check();
    await page.getByRole('button', { name: '편지 보내기' }).click();
    await page.getByRole('status').filter({ hasText: '글이 접수되었습니다.' }).waitFor();
    assert.equal(submitted.kind, 'letter');
    assert.equal('visitedOn' in submitted, false);
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const font of ['RR Gowun Batang', 'RR Pretendard']) assert.ok(await page.evaluate(f => document.fonts.check(`700 32px "${f}"`), font), font);
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('http://localhost:3000/shops/hometown-table?write=letter#community', { waitUntil: 'networkidle' });
    await page.getByRole('dialog').waitFor();
    await page.screenshot({ path: 'artifacts/dialog-mobile.png' });
    assert.deepEqual(errors, []);
    console.log('PASS real fonts loaded, letter deep link, mock submission without date, no JS errors; no database writes');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
