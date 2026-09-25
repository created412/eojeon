// node build.mjs 후 실행. 배포하지 않고 로컬 단일 HTML의 실제 3D 조립을 검사한다.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readdir } from 'node:fs/promises'
import { ACTS } from '../src/data/acts.js'
import { createState, serialize, SAVE_KEY } from '../src/core/state.js'
import { applyBeat, enterAct } from '../src/systems/scenario.js'

const require = createRequire(import.meta.url)
let playwright
try { playwright = require('playwright') } catch {
  playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
}
const act = ACTS[2]
let state = enterAct(createState(), act, 2)
for (const [i, beat] of act.beats.entries()) {
  state = { ...applyBeat(state, beat), beatIndex: i, beatEntered: true }
  if (beat.id === 'day-1875') break
}
const file = (await readdir('dist')).find(f => f.endsWith('.html'))
const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, hasTouch: true })
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack) })
  await page.addInitScript(({key, json}) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, json)
  }, { key: SAVE_KEY, json: serialize(state) })
  await page.goto(pathToFileURL(resolve('dist', file)).href)
  assert.equal(await page.locator('.opening-primary').textContent(), '이어서 하기')
  await page.locator('.opening-primary').click()
  await page.locator('.activity-board:not([hidden])').waitFor()
  assert.match(await page.locator('.activity-board').innerText(), /1876/)
  await page.locator('[data-activity="beat:axe-sangso"]').tap()
  // 선택한 사정전까지 실제 렌더 루프와 이동 판정을 거쳐 간다.
  await page.waitForFunction(() => document.querySelector('.interaction-hint')?.textContent === 'E — 최익현의 상소를 듣는다', null, { timeout: 30000 })
  await page.getByRole('button', {name:'E 대화', exact:true}).tap()
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.freedom?.hubs?.['chinjeong/day-1875']?.pending === 'beat:axe-sangso', SAVE_KEY)
  const paid = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)
  assert.equal(paid.dayLeft, 0)
  await page.reload()
  await page.locator('.opening-primary').click()
  await page.locator('.speak').waitFor({ state: 'visible', timeout: 30000 })
  const resumed = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY)
  assert.equal(resumed.dayLeft, 0)
  assert.equal(resumed.freedom.hubs['chinjeong/day-1875'].pending, 'beat:axe-sangso')
  // 거점을 이미 지나 보고 시작 직전에 멈춘 구형 저장도 원래 보고부터 잇는다.
  const legacy = { ...state, beatIndex: act.beats.findIndex(b => b.id === 'axe-sangso'), beatEntered: false, dayLeft: 0 }
  delete legacy.freedom
  await page.evaluate(({key,json}) => localStorage.setItem(key,json), {key:SAVE_KEY,json:serialize(legacy)})
  await page.reload()
  await page.locator('.opening-primary').click()
  await page.locator('.speak').waitFor({state:'visible',timeout:30000})
  assert.match(await page.locator('.speak').innerText(), /최익현/)
  assert.deepEqual(errors, [])
  console.log('PASS: local HTML / 1024x768 touch / board / actual walk / report / paid-save reload / legacy pre-report resume; no page errors')
} finally {
  await browser.close()
}
