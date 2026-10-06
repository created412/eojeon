import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { readFile, mkdir } from 'node:fs/promises'
import { build } from 'esbuild'
import { STUDIES, DILEMMAS } from '../../src/data/studies.js'
import { blanksOf } from '../../src/systems/doc-study.js'

const require = createRequire(import.meta.url)
let playwright
try { playwright = require('playwright') } catch {
  playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
}
let browser, page, script
beforeAll(async () => {
  const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: `
    import {createDilemma} from './src/ui/dilemma.js';
    import {createDocStudy} from './src/ui/doc-study.js';
    import {STUDIES,DILEMMAS} from './src/data/studies.js';
    window.fixture={createDilemma,createDocStudy,STUDIES,DILEMMAS};
  ` }, bundle: true, write: false, format: 'iife', plugins: [{ name: 'workspace-files', setup(b) {
    b.onResolve({filter:/^\./}, args=>({path:resolve(args.importer ? dirname(args.importer) : process.cwd(),args.path),namespace:'workspace'}))
    b.onLoad({filter:/.*/,namespace:'workspace'}, async args=>({contents:await readFile(args.path,'utf8'),loader:'js'}))
  } }] })
  script = bundle.outputFiles[0].text
  browser = await playwright.chromium.launch({ channel: 'chrome', headless: true })
  await mkdir('_tools/checks/choice-cards', { recursive: true })
}, 60000)
beforeEach(async () => {
  await page?.close()
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.setContent('<style>body{margin:0}</style><div id="root"></div>')
  await page.addScriptTag({ content: script })
})
afterAll(async () => { await browser?.close() })

async function noOverflow(selector) {
  expect(await page.locator(selector).evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true)
}
async function imagesReady(selector) {
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(i => i.complete && i.naturalWidth > 0), selector)
}

for (const viewport of [{width:1366,height:768},{width:844,height:390},{width:390,height:844}]) {
  it(`${viewport.width}×${viewport.height}: 정책 그림을 살핀 뒤 결정하면 역사 화면으로 넘어간다`, async () => {
    await page.setViewportSize(viewport)
    for (const d of Object.values(DILEMMAS)) {
      await page.evaluate(id => {
        document.querySelector('#root').innerHTML = ''
        window.picks = 0; window.result = null
        fixture.createDilemma(document.querySelector('#root')).open(fixture.DILEMMAS[id], {onPick:()=>window.picks++}).then(r => window.result=r)
      }, d.id)
      await imagesReady('.dilemma img')
      expect(await page.locator('.actual').isVisible()).toBe(false)
      expect(await page.locator('.opts img').count()).toBe(d.options.length)
      await noOverflow('.dilemma')
      if (d.id === 'seogye') await page.screenshot({path:`_tools/checks/choice-cards/dilemma-${viewport.width}.png`})
      await page.locator('.head').nth(1).click()
      expect(await page.locator('.opt.open .more').isVisible()).toBe(true)
      await page.locator('.opt.open .choose').click()
      expect(await page.locator('.opts').isVisible()).toBe(false)
      expect(await page.locator('.actual').isVisible()).toBe(true)
      expect(await page.evaluate(()=>window.picks)).toBe(1)
      await noOverflow('.dilemma')
      await page.locator('.go').click()
      expect((await page.evaluate(()=>window.result)).choiceId).toBe(d.options[1].id)
    }
  }, 45000)
}

it('사료 네 판의 모든 그림 보기를 실제로 눌러 완료한다 — 원문 펼치기와 빈칸 포함', async () => {
  for (const study of Object.values(STUDIES)) {
    await page.evaluate(id => {
      document.querySelector('#root').innerHTML=''; window.result=null
      fixture.createDocStudy(document.querySelector('#root')).open(fixture.STUDIES[id]).then(r=>window.result=r)
    }, study.id)
    for (const [i, step] of study.steps.entries()) {
      await imagesReady('.study img')
      await noOverflow('.study')
      if (study.id === 'treaty1876' && i === 0) {
        expect(await page.locator('.sec:visible').count()).toBe(1)
        await page.locator('.source-toggle').click()
        expect(await page.locator('.sec:visible').count()).toBe(3)
        await page.locator('.source-toggle').click()
        await page.screenshot({path:'_tools/checks/choice-cards/study-1366.png'})
      }
      if (step.kind === 'flip') await page.locator('.flipbtn').click()
      if (step.kind === 'fill') {
        const blanks = blanksOf(study).filter(b=>!step.blanks || step.blanks.includes(b.id))
        for (const b of blanks) await page.locator(`[data-word="${b.answer}"]`).click()
      } else {
        expect(await page.locator('.opts img').count()).toBe(step.options.length)
        await page.locator(`[data-choice="${step.answer}"]`).click()
      }
    }
    expect(await page.locator('.side.done').count()).toBe(1)
    await page.locator('.close').click()
    expect(await page.evaluate(()=>window.result!==null)).toBe(true)
  }
}, 60000)

it('작은 화면에서도 문서·보기 글씨가 줄어들지 않고 오답 재시작 콜백은 한 번만 호출한다', async () => {
  await page.setViewportSize({width:844,height:390})
  await page.evaluate(() => {
    window.misses=0
    fixture.createDocStudy(document.querySelector('#root')).open(fixture.STUDIES.reform1884, {onMiss:()=>{window.misses++;return true}})
  })
  await imagesReady('.study img')
  await noOverflow('.study')
  expect(await page.locator('.study .opt').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(20)
  expect(await page.locator('.sec.on .txt').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(21)
  await page.screenshot({path:'_tools/checks/choice-cards/study-844.png'})
  await page.locator('[data-choice="japan"]').click()
  expect(await page.evaluate(()=>window.misses)).toBe(1)
  expect(await page.locator('.study .opt.no').count()).toBe(0)
})
