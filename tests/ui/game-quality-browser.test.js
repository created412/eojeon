import { beforeAll, afterAll, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs'
import { build } from 'esbuild'
import { ACTS } from '../../src/data/acts.js'
import { createState, serialize } from '../../src/core/state.js'
import { enterAct, applyBeat, applyGrant, beatsOf, isBeatActive } from '../../src/systems/scenario.js'
import { relocate } from '../../src/systems/relocate.js'
import { advancePrices } from '../../src/systems/prices.js'
import { rememberActStart } from '../../src/systems/act-restart.js'
import { SOURCES } from '../../src/data/sources.js'
import { readFor } from '../../src/systems/source-read.js'

const require=createRequire(import.meta.url)
let playwright
try { playwright=require('playwright') } catch { playwright=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')) }
let browser, dir, file
const saves=new Map()
let state=createState()
ACTS.forEach((act,ai)=>{
  state=advancePrices(enterAct(state,act,ai),ai+1)
  beatsOf(act).forEach((beat,bi)=>{
    saves.set(beat.id,serialize({...state,actIndex:ai,beatIndex:bi}))
    if(!isBeatActive(state,beat))return
    const from=state.palace
    state=applyGrant(applyBeat(state,beat),beat)
    if(beat.kind==='move')state=relocate({...state,palace:from},{year:beat.year,from,to:beat.palace,cause:beat.cause,self:beat.self})
  })
})
beforeAll(async()=>{
  dir=mkdtempSync(join(tmpdir(),'eojeon-quality-'));file=join(dir,'game.html')
  // Probe is confined to the temporary test bundle, never the shipped game.
  const source=readFileSync('src/main.js','utf8').replace('  const savedText = readSaveText()',
    '  window.qualityProbe = {ctx, flow, gameTime, bgm, audio, BGM};\n  const savedText = readSaveText()')
  const js=(await build({stdin:{contents:source,resolveDir:resolve('src')},bundle:true,write:false,format:'iife',minify:true})).outputFiles[0].text
  writeFileSync(file,readFileSync('index.html','utf8').replace('/*__BUNDLE__*/',()=>js.replace(/<\/script/gi,'<\\/script')))
  browser=await playwright.chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']})
},60000)
afterAll(async()=>{await browser?.close();if(file)unlinkSync(file);if(dir)rmdirSync(dir)})
async function open(id,options={},audioCase={}){
  const page=await browser.newPage({viewport:{width:1366,height:768},...options}),errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  const save=audioCase.save ?? saves.get(id)
  await page.addInitScript(({save,muted})=>{
    localStorage.setItem('eojeon.save.v1',save);localStorage.setItem('eojeon.muted',muted?'1':'0')
    window.qualityAudios=[]
    const NativeAudio=window.Audio
    window.Audio=new Proxy(NativeAudio,{construct(target,args){const a=new target(...args);qualityAudios.push(a);return a}})
  },{save,muted:audioCase.muted!==false})
  await page.goto(pathToFileURL(file).href)
  await page.getByRole('button',{name:'이어서 하기',exact:true}).click()
  await page.locator('.prologue').waitFor({state:'detached'})
  return {page,errors}
}

async function audible(page,track){
  await page.waitForFunction(track=>qualityAudios.some(a=>a.src===qualityProbe.BGM[track]&&!a.paused&&!a.muted&&a.volume>.1&&a.readyState>=2&&a.currentTime>.2),track)
  expect(await page.evaluate(()=>qualityProbe.bgm.wanted())).toBe(track)
}

it('친정 직후 빈 어좌 독백에서도 현재 막 음악이 계속 재생된다',async()=>{
  const {page,errors}=await open('alone-in-hall',{}, {muted:false})
  try { await audible(page,'act3'); expect(errors).toEqual([]) }
  finally { await page.close() }
},20000)

it('서계의 다른 글자를 문제 삼으면 현재 막 첫 장면으로 돌아간다',async()=>{
  const state={...createState(),actIndex:2,beatIndex:2,sources:{held:['seogye'],read:['seogye'],lost:[]},pendingCards:{actIndex:2,beatIndex:2,ids:['seogye']}}
  const {page,errors}=await open('',{}, {save:serialize(state)})
  try {
    await page.locator('.seekdoc [data-unit="ilbonguk"]').click()
    await page.locator('.seekdoc button.name').click()
    await page.locator('.missnote').waitFor()
    expect(await page.locator('.missnote h2').textContent()).toBe('틀렸습니다')
    await page.keyboard.press('Escape')   // 안내가 떠 있는 동안 Esc 는 멈춤을 열지 않고 안내도 닫지 않는다(E 는 「처음으로」를 누른 것과 같다)
    expect(await page.locator('.missnote').count()).toBe(1); expect(await page.locator('.pause').count()).toBe(0)
    await page.locator('.missnote .go').click()
    await page.locator('.actq').waitFor()
    expect(await page.evaluate(()=>qualityProbe.flow.state.actIndex)).toBe(2)
    expect(await page.evaluate(()=>qualityProbe.flow.state.beatIndex)).toBe(0)
    expect(errors).toEqual([])
  } finally { await page.close() }
},20000)

it('그림 조약 선택지에서 잘못 읽으면 3막 도입으로 돌아간다',async()=>{
  const {page,errors}=await open('treaty-study')
  try {
    await page.locator('.study .flipbtn').click()
    await page.locator('.study [data-choice="yes"]').click()
    await page.locator('.missnote').waitFor()
    expect(await page.locator('.missnote h2').textContent()).toBe('틀렸습니다')
    await page.keyboard.press('Escape')   // 안내가 떠 있는 동안 Esc 는 멈춤을 열지 않고 안내도 닫지 않는다(E 는 「처음으로」를 누른 것과 같다)
    expect(await page.locator('.missnote').count()).toBe(1); expect(await page.locator('.pause').count()).toBe(0)
    await page.locator('.missnote .go').click()
    await page.locator('.actq').waitFor()
    expect(await page.evaluate(()=>qualityProbe.flow.state.actIndex)).toBe(2)
    expect(await page.evaluate(()=>qualityProbe.flow.state.beatIndex)).toBe(0)
    expect(errors).toEqual([])
  } finally { await page.close() }
},20000)

it('임금의 저울에서 들은 말을 잘못 짚어도 현재 막 처음으로 돌아간다',async()=>{
  const {page,errors}=await open('council-treaty')
  try {
    await page.locator('.weigh .go').click()
    for(const seat of await page.locator('.weigh .seat').all())await seat.click()
    await page.locator('.weigh .aopt:not([data-a="none"])').first().click()
    await page.locator('.missnote').waitFor()
    expect(await page.locator('.missnote h2').textContent()).toBe('틀렸습니다')
    await page.keyboard.press('Escape')   // 안내가 떠 있는 동안 Esc 는 멈춤을 열지 않고 안내도 닫지 않는다(E 는 「처음으로」를 누른 것과 같다)
    expect(await page.locator('.missnote').count()).toBe(1); expect(await page.locator('.pause').count()).toBe(0)
    await page.locator('.missnote .go').click()
    await page.locator('.actq').waitFor()
    expect(await page.evaluate(()=>qualityProbe.flow.state.actIndex)).toBe(2)
    expect(errors).toEqual([])
  } finally { await page.close() }
},20000)

it.each(ACTS.map((act,ai)=>[act.id,ai]))('%s: 사료를 잘못 짚으면 해당 막 처음으로 돌아가고 앞 막 기록은 보존한다',async(_,ai)=>{
  const card=SOURCES.find(s=>s.act===ai+1&&readFor(s.id))
  const spec=readFor(card.id)
  const base=rememberActStart(enterAct({...createState(),decisions:[{actIndex:ai-1,choiceId:'prior'}]},ACTS[ai],ai))
  const state={...base,actOpening:false,beatIndex:1,beatEntered:true,
    sources:{held:[card.id],read:[card.id],lost:[]},
    pendingCards:{actIndex:ai,beatIndex:1,ids:[card.id]}}
  const {page,errors}=await open('',{}, {save:serialize(state),muted:false})
  try{
    await page.locator(`.record .part[data-part="${spec.pick===0?1:0}"]`).click()
    await page.locator('.missnote').waitFor()
    expect(await page.locator('.missnote h2').textContent()).toBe('틀렸습니다')
    await page.keyboard.press('Escape')   // 안내가 떠 있는 동안 Esc 는 멈춤을 열지 않고 안내도 닫지 않는다(E 는 「처음으로」를 누른 것과 같다)
    expect(await page.locator('.missnote').count()).toBe(1); expect(await page.locator('.pause').count()).toBe(0)
    await page.locator('.missnote .go').click()
    await page.locator('.actq').waitFor()
    expect(await page.locator('.act-restart-notice').textContent()).toContain(`${ai+1}막의 처음`)
    expect(await page.locator('.prologue').count()).toBe(0)
    expect(await page.locator('#scene').count()).toBe(1)
    expect(await page.locator('.game-sound').count()).toBe(1)
    await audible(page,`act${ai+1}`)
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('eojeon.save.v1')))
    expect(saved.actIndex).toBe(ai);expect(saved.beatIndex).toBe(0)
    expect(saved.actOpening).toBe(true);expect(saved.pendingCards).toBeUndefined()
    expect(saved.sources.held).toEqual([]);expect(saved.decisions).toEqual(base.decisions)
    // 이전 장면의 비동기 완료가 저장을 다시 덮어쓰지 않는다.
    await page.waitForTimeout(200)
    expect(await page.evaluate(()=>qualityProbe.flow.state.beatIndex)).toBe(0)
    await page.locator('.actq-go').click()
    await page.locator('.actbg').waitFor()
    expect(errors).toEqual([])
  }finally{await page.close()}
},20000)

it('따져 읽기도 한 번 잘못 답하면 막 처음으로 돌아간다',async()=>{
  const card=SOURCES.find(s=>s.act===2&&readFor(s.id)?.probe)
  const spec=readFor(card.id)
  const state={...createState(),actIndex:1,beatIndex:2,sources:{held:[card.id],read:[card.id],lost:[]},pendingCards:{actIndex:1,beatIndex:2,ids:[card.id]}}
  const {page,errors}=await open('',{}, {save:serialize(state)})
  try{
    await page.locator(`.part[data-part="${spec.pick}"]`).click()
    const wrong=spec.probe.options.find(o=>o.id!==spec.probe.answer)
    await page.locator(`.popt[data-opt="${wrong.id}"]`).click()
    await page.locator('.missnote').waitFor()
    expect(await page.locator('.missnote h2').textContent()).toBe('틀렸습니다')
    await page.keyboard.press('Escape')   // 안내가 떠 있는 동안 Esc 는 멈춤을 열지 않고 안내도 닫지 않는다(E 는 「처음으로」를 누른 것과 같다)
    expect(await page.locator('.missnote').count()).toBe(1); expect(await page.locator('.pause').count()).toBe(0)
    await page.locator('.missnote .go').click()
    await page.locator('.actq').waitFor()
    expect(await page.evaluate(()=>qualityProbe.flow.state.actIndex)).toBe(1)
    expect(await page.evaluate(id=>qualityProbe.flow.state.inquiries?.[id],card.id)).toBeUndefined()
    expect(errors).toEqual([])
  }finally{await page.close()}
},20000)

it('짧은 가로 화면에서 글을 스크롤하면 안내 띠만 가리고 여백은 유지한다',async()=>{
  const {page,errors}=await open('cheokhwabi-brush',{viewport:{width:844,height:390},hasTouch:true,isMobile:true})
  try{
    await page.locator('.note-next').click();await page.locator('.brush').waitFor()
    const before=await page.locator('.brush').evaluate(el=>getComputedStyle(el).paddingTop)
    await page.locator('.brush').evaluate(el=>{el.scrollTop=120})
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.guide-strip')).visibility==='hidden')
    expect(await page.locator('.brush').evaluate(el=>getComputedStyle(el).paddingTop)).toBe(before)
    await page.locator('.brush').evaluate(el=>{el.scrollTop=0})
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.guide-strip')).visibility==='visible')
    await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click()
    expect(await page.locator('.guide-strip').evaluate(el=>getComputedStyle(el).visibility)).toBe('hidden')
    await page.keyboard.press('Escape')
    expect(await page.locator('.guide-strip').evaluate(el=>getComputedStyle(el).visibility)).toBe('visible')
    expect(errors).toEqual([])
  }finally{await page.close()}
},20000)

it('사초함을 스크롤한 뒤 Q로 닫으면 궁의 안내가 다시 보인다',async()=>{
  const {page,errors}=await open('gapsin-day',{viewport:{width:844,height:390}})
  try{
    await page.keyboard.press('q');await page.locator('.veil .card').waitFor()
    await page.locator('.veil .card').evaluate(el=>{el.scrollTop=120})
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.guide-strip')).visibility==='hidden')
    await page.keyboard.press('q');await page.locator('.veil').waitFor({state:'detached'})
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.guide-strip')).visibility==='visible')
    expect(errors).toEqual([])
  }finally{await page.close()}
},15000)

it('척화비의 실제 음원이 재생되고 멈춤과 음소거·복귀 후에도 정상 연결된다',async()=>{
  const {page,errors}=await open('cheokhwabi-brush',{}, {muted:false})
  try{
    await page.locator('.note-next').click()
    await page.locator('.brush').waitFor()
    await audible(page,'council')
    const sound=page.getByRole('button',{name:'게임 소리',exact:true})
    await sound.click()
    expect(await sound.getAttribute('aria-pressed')).toBe('false')
    expect(await page.evaluate(()=>qualityAudios.filter(a=>a.loop).every(a=>a.paused&&a.volume===0))).toBe(true)
    await sound.click();await audible(page,'council')
    await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click()
    const before=await page.evaluate(()=>qualityAudios.find(a=>a.src===qualityProbe.BGM.council).currentTime)
    await page.waitForTimeout(350)
    expect(await page.evaluate(()=>qualityAudios.find(a=>a.src===qualityProbe.BGM.council).currentTime)).toBeGreaterThan(before)
    await page.keyboard.press('Escape')
    expect(errors).toEqual([])
  }finally{await page.close()}
},20000)

it('2막 탐색 복귀에서 1막 곡으로 바뀌지 않는다',async()=>{
  const {page,errors}=await open('day-gyeongbok',{}, {muted:false})
  try{await audible(page,'act2');expect(errors).toEqual([])}finally{await page.close()}
},15000)

it('복원된 사료를 읽는 동안에도 현재 막의 음악과 소리 단추를 쓴다',async()=>{
  const state=JSON.parse(saves.get('day-changdeok'))
  state.sources.held=[...new Set([...state.sources.held,'bellonet'])]
  state.pendingCards={actIndex:state.actIndex,beatIndex:state.beatIndex,ids:['bellonet']}
  state.beatEntered=true
  const {page,errors}=await open('day-changdeok',{}, {muted:false,save:JSON.stringify(state)})
  try{
    await page.locator('.veil').waitFor()
    await audible(page,'act2')
    await page.getByRole('button',{name:'게임 소리',exact:true}).click()
    expect(await page.evaluate(()=>qualityAudios.filter(a=>a.loop).every(a=>a.paused))).toBe(true)
    expect(await page.locator('.veil').count()).toBe(1)
    expect(errors).toEqual([])
  }finally{await page.close()}
},15000)

it('끝난 막을 이어할 때 마무리 질문에서도 음악과 소리 단추를 쓴다',async()=>{
  const state=JSON.parse(saves.get('funding'));state.beatIndex=ACTS[0].beats.length;state.beatEntered=false
  const {page,errors}=await open('funding',{}, {muted:false,save:JSON.stringify(state)})
  try{
    await page.locator('.cquiz,.actq').first().waitFor()
    await audible(page,'act1')
    await page.getByRole('button',{name:'게임 소리',exact:true}).click()
    expect(await page.evaluate(()=>qualityAudios.filter(a=>a.loop).every(a=>a.paused))).toBe(true)
    expect(errors).toEqual([])
  }finally{await page.close()}
},15000)
it('행렬을 멈추면 사람·장면·시계가 서고 다시 닫으면 그 자리에서 잇는다',async()=>{
  const {page,errors}=await open('move-1868-out')
  try {
    await page.keyboard.press('Escape')
    await page.locator('.pause').waitFor()
    const snapshot=()=>page.evaluate(()=>({position:qualityProbe.ctx.player.position.toArray(),time:qualityProbe.gameTime.now(),beat:qualityProbe.flow.state.beatIndex}))
    const before=await snapshot();await page.waitForTimeout(1800)
    expect(await snapshot()).toEqual(before)
    await page.getByRole('button',{name:'닫는다',exact:true}).click();await page.waitForTimeout(400)
    expect((await snapshot()).time).toBeGreaterThan(before.time)
    expect((await snapshot()).position).not.toEqual(before.position)
    expect(errors).toEqual([])
  } finally {await page.close()}
},20000)
it('멈춤은 초점을 가두고 다시 시작 취소는 저장을 지우지 않는다',async()=>{
  const {page,errors}=await open('day-gyeongbok')
  try {
    await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click()
    for(let n=0;n<14;n++){
      await page.keyboard.press(n%3===0?'Shift+Tab':'Tab')
      expect(await page.evaluate(()=>!!document.activeElement.closest('.pause'))).toBe(true)
    }
    const before=await page.evaluate(()=>localStorage.getItem('eojeon.save.v1'))
    await page.getByRole('button',{name:'처음부터 다시',exact:true}).click()
    expect(await page.getByRole('button',{name:'기록을 지우고 다시 시작',exact:true}).isVisible()).toBe(true)
    await page.getByRole('button',{name:'아니요, 계속할게요',exact:true}).click()
    expect(await page.evaluate(()=>localStorage.getItem('eojeon.save.v1'))).toBe(before)
    await page.keyboard.press('Escape');expect(await page.locator('.pause').count()).toBe(0)
    expect(errors).toEqual([])
  } finally {await page.close()}
},20000)
it('멈춤 중 기기를 세로·가로로 돌려도 시계와 초점이 뒤의 게임으로 새지 않는다',async()=>{
  const {page,errors}=await open('jeongjok-battle',{hasTouch:true,isMobile:true})
  try {
    await page.locator('.jeongjok .start').click()
    await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click()
    const before=await page.evaluate(()=>qualityProbe.gameTime.now())
    await page.setViewportSize({width:390,height:844});await page.locator('.orient').waitFor()
    await page.setViewportSize({width:844,height:390});await page.locator('.orient').waitFor({state:'detached'})
    await page.keyboard.press('Tab')
    expect(await page.evaluate(()=>!!document.activeElement.closest('.pause'))).toBe(true)
    expect(await page.evaluate(()=>qualityProbe.gameTime.now())).toBe(before)
    expect(errors).toEqual([])
  } finally {await page.close()}
},20000)
for(const [id,selector] of [['jeongjok-battle','.jeongjok'],['funding','.rebuild'],['gwangseong-stand','.gwangseong']]){
  it(`${id}: 불투명 판 뒤 궁 렌더를 쉬고 멈춤 중 판·입력도 멎는다`,async()=>{
    const {page,errors}=await open(id)
    try {
      await page.locator(selector).waitFor({state:'visible'})
      await page.waitForTimeout(50)
      const frame=()=>page.evaluate(()=>qualityProbe.ctx.renderer.info.render.frame)
      const before=await frame();await page.waitForTimeout(250);expect(await frame()).toBe(before)
      await page.locator(`${selector} .start`).click();await page.waitForTimeout(300)
      await page.getByRole('button',{name:'잠시 멈춤',exact:true}).click()
      await page.locator('.pause').waitFor()
      const sample=()=>page.locator(selector).evaluate(el=>({text:el.innerText,
        canvas:[...el.querySelectorAll('canvas')].map(c=>{let hash=0;for(const ch of c.toDataURL())hash=(hash*31+ch.charCodeAt(0))|0;return hash}),
        moving:[...el.querySelectorAll('[style]')].map(n=>n.getAttribute('style'))}))
      const stopped=await sample();const gameNow=await page.evaluate(()=>qualityProbe.gameTime.now())
      await page.keyboard.press('w');await page.keyboard.press('s');await page.waitForTimeout(800)
      expect(await sample()).toEqual(stopped)
      expect(await page.evaluate(()=>qualityProbe.gameTime.now())).toBe(gameNow)
      await page.keyboard.press('Escape');await page.waitForTimeout(200)
      expect(await page.evaluate(()=>qualityProbe.gameTime.now())).toBeGreaterThan(gameNow)
      expect(errors).toEqual([])
    } finally {await page.close()}
  },20000)
}
