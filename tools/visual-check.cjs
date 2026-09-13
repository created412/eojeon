// Use a local Playwright install, or the runtime bundled with Codex on this machine.
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(process.env.PLAYWRIGHT_MODULE || require('node:path').join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const { chromium } = playwright;
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const { ACTS } = await import('../src/data/acts.js');
  const { createState, SAVE_KEY } = await import('../src/core/state.js');
  const { enterAct, applyBeat, applyGrant } = await import('../src/systems/scenario.js');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] });
  try {
  let page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) externalRequests.push(r.url()); });
  const out = path.resolve('.superpowers/cinematic-qa');
  fs.mkdirSync(out, { recursive: true });
  await page.goto(pathToFileURL(path.resolve('dist/어전.html')).href);
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('.cinema-hud').isVisible(), false, 'HUD hidden on title');
  await page.screenshot({ path: path.join(out, 'title.png') });
  await page.locator('.opening-primary').click();
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(350);
    const buttons = page.locator('.howto button, .note button, .move button');
    if (await buttons.count()) await buttons.last().click();
    else { await page.keyboard.press('KeyE'); }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(out, 'game.png') });
  const samples = [];
  function fixture(ai, bi) {
    let s = createState();
    for (let a = 0; a <= ai; a++) {
      s = enterAct(s, ACTS[a], a);
      const limit = a === ai ? bi : ACTS[a].beats.length;
      for (let b = 0; b < limit; b++) s = applyGrant(applyBeat(s, ACTS[a].beats[b]), ACTS[a].beats[b]);
    }
    return { ...s, beatIndex: bi, beatEntered: false };
  }
  async function resume(ai, bi, name) {
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: SAVE_KEY, state: fixture(ai, bi) });
    await page.reload();
    await page.locator('.opening-primary').click();
    await page.waitForTimeout(700);
    samples.push(name);
  }
  for (let ai = 0; ai < ACTS.length; ai++) {
    const act = ACTS[ai];
    const ci = act.beats.findIndex(b => b.kind === 'council');
    await resume(ai, ci, `${act.id}-council`);
    assert.equal(await page.locator('.council').isVisible(), true);
    assert.ok(await page.locator('.council button.opt, .council button.go:not(:disabled)').count(), `${act.id}: council has a choice or the historical frozen continuation`);
    assert.equal(await page.locator('.cinema-danger').isVisible(), false);
    await page.screenshot({ path: path.join(out, `${act.id}-council.png`) });
    await page.locator('.council button.opt, .council button.go:not(:disabled)').first().click();
    assert.match(await page.locator('.council .actual').innerText(), /실제로는/);
    await page.locator('.council textarea').fill('읽은 사료와 실제 결과를 비교하여 당시 선택의 제약을 생각했다.');
    await page.locator('.council .go').click();
    assert.equal(await page.locator('.council').count(), 0, 'reflection submits and advances');
    const di = act.beats.findIndex(b => b.kind === 'explore');
    if (di >= 0) {
      await resume(ai, di, `${act.id}-explore`);
      assert.equal(await page.locator('.cinema-objective').isVisible(), true);
      assert.equal(await page.locator('.cinema-danger').isVisible(), false);
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(350);
      await page.keyboard.up('KeyW');
      await page.screenshot({ path: path.join(out, `${act.id}-explore.png`) });
      await page.locator('.cinema-codex').click();
      assert.equal(await page.locator('.codex').isVisible(), true, 'HUD opens source collection');
      await page.locator('.codex .close').click();
    }
    const ri = act.beats.findIndex(b => b.kind === 'rush');
    if (ri >= 0) {
      await resume(ai, ri, `${act.id}-rush`);
      await page.locator('.note button').last().click();
      await page.waitForTimeout(900);
      assert.equal(await page.locator('.cinema-danger').isVisible(), true);
      assert.match(await page.locator('.cinema-danger').innerText(), /학습을 위한 재구성/);
      await page.screenshot({ path: path.join(out, `${act.id}-rush.png`) });
      // Accelerate only the browser's clock: exercise the real timeout and teardown.
      await page.clock.install();
      await page.clock.fastForward(180000);
      await page.clock.resume();
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.cinema-danger').isVisible(), false, 'rush HUD clears on caught branch');
    }
  }
  await resume(4, ACTS[4].beats.length, 'ending');
  await page.locator('.actend button').last().click();
  assert.equal(await page.locator('.actend.final').isVisible(), true);
  assert.equal(await page.getByRole('button', { name: '내 기록 복사' }).isVisible(), true);
  await page.screenshot({ path: path.join(out, 'ending.png') });
  await page.close();
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url())) externalRequests.push(r.url()); });
  await page.goto(pathToFileURL(path.resolve('dist/어전.html')).href);
  await resume(2, 3, 'mobile-explore-reduced-motion');
  assert.equal(await page.locator('.game-controls button').first().isVisible(), true);
  await page.touchscreen.tap(100, 640);
  await page.waitForTimeout(400);
  await page.locator('.cinema-codex').tap();
  assert.equal(await page.locator('.codex').isVisible(), true);
  await page.locator('.codex .close').tap();
  await page.screenshot({ path: path.join(out, 'mobile-explore.png') });
  await resume(2, 13, 'mobile-council');
  const bounds = await page.locator('.council button.opt').first().boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391, 'mobile choice fits viewport');
  await page.screenshot({ path: path.join(out, 'mobile-council.png') });
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  assert.deepEqual(externalRequests, [], 'single-file game makes no network requests');
  console.log(JSON.stringify({ samples, errors, externalRequests, screenshots: out }, null, 2));
  } finally {
  await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
