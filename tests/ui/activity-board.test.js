import { beforeAll, afterAll, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
let playwright
try { playwright = require('playwright') } catch {
  playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))
}
let browser, script
beforeAll(async () => {
  const result = await build({ stdin: { resolveDir: process.cwd(), contents: `
    import {createActivityBoard} from './src/ui/activity-board.js';
    import {hubOptions,closeHub} from './src/systems/freedom.js';
    import {createState} from './src/core/state.js';
    import {ACTS} from './src/data/acts.js';
    import {createActEnd} from './src/ui/act-end.js';
    window.fixture={createActivityBoard,hubOptions,closeHub,createState,ACTS,createActEnd};
  ` }, bundle: true, write: false, format: 'iife', plugins: [{ name: 'workspace-files', setup(b) {
    b.onResolve({filter:/^\./}, args => ({path:resolve(args.importer ? dirname(args.importer) : process.cwd(),args.path),namespace:'workspace'}))
    b.onLoad({filter:/.*/,namespace:'workspace'}, async args => ({contents:await readFile(args.path,'utf8'),loader:'js'}))
  } }] })
  script = result.outputFiles[0].text
  browser = await playwright.chromium.launch({ channel: 'chrome', headless: true })
}, 60000)
afterAll(async () => { await browser?.close() })

it.each([{width:390,height:844},{width:1024,height:768}])('터치 화면 %j에서 실제 선택 목록·닫기·생략·엔딩 기록이 작동한다', async viewport => {
  const page = await browser.newPage({ viewport, hasTouch: true })
  try {
    await page.setContent('<div id="root"></div>')
    await page.addScriptTag({content:script})
    await page.evaluate(() => {
      const f = fixture, root = document.querySelector('#root')
      const ai = 1, act = f.ACTS[ai]
      const state = {...f.createState(), actIndex:ai, beatIndex:act.beats.findIndex(b=>b.id==='day-changdeok'), palace:'changdeok',control:'C',dayLeft:2}
      window.chosen = null; window.left = false
      const board = f.createActivityBoard(root,{onChoose:id=>chosen=id,onLeave:()=>{left=true;f.createActEnd(root).showFinal(f.closeHub(state,act))}})
      window.openBoard = () => board.show({title:'1866 · 창덕궁',dayLeft:2,free:false,options:f.hubOptions(state,act)})
      openBoard()
    })
    expect(await page.getByRole('dialog', {name:'지금 고를 일'}).isVisible()).toBe(true)
    const buttons = page.locator('.activity-board button')
    for (const box of await buttons.evaluateAll(es => es.map(e => {const r=e.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height}}))) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(viewport.width)
      expect(box.height).toBeGreaterThanOrEqual(48)
    }
    await page.locator('[data-activity="beat:garye-audience"]').tap()
    expect(await page.evaluate(()=>chosen)).toBe('beat:garye-audience')
    expect(await page.getByRole('dialog').isVisible()).toBe(false)
    await page.evaluate(()=>openBoard())
    await page.getByRole('button',{name:'닫고 자유롭게 걷기'}).tap()
    expect(await page.evaluate(()=>left)).toBe(false)
    await page.evaluate(()=>openBoard())
    await page.locator('.activity-leave').tap()
    expect(await page.evaluate(()=>left)).toBe(true)
    expect(await page.locator('.actend.final').innerText()).toContain('하지 않은 일 — 가례 뒤 하례를 듣는다 (선택하지 않음)')
  } finally { await page.close() }
}, 30000)
