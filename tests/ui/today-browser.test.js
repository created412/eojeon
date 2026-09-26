import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
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
let browser, page, script
beforeAll(async () => {
  const result = await build({ stdin: { resolveDir: process.cwd(), contents: `
    import {createRation} from './src/ui/ration.js';
    import {createDialog} from './src/ui/dialog.js';
    import {createSpeak} from './src/ui/speak.js';
    import {createNoteScreen} from './src/ui/note-screen.js';
    import {createVoicePlayer} from './src/systems/voice.js';
    import {voiceKey} from './src/data/voice-cast.js';
    import {ACTS} from './src/data/acts.js';
    import {SOURCES} from './src/data/sources.js';
    import {serialize,deserialize,createState} from './src/core/state.js';
    import {FEEDBACK_MEDIA} from './src/ui/feedback-media-data.js';
    import {createTray,TRAY_W,TRAY_H} from './src/systems/grain-tray.js';
    window.fixture={createRation,createDialog,createSpeak,createNoteScreen,createVoicePlayer,voiceKey,
      ACTS,SOURCES,serialize,deserialize,createState,FEEDBACK_MEDIA,createTray,TRAY_W,TRAY_H};
  ` }, bundle: true, write: false, format: 'iife', plugins: [{ name: 'workspace-files', setup(b) {
    b.onResolve({filter:/^\./}, args=>({path:resolve(args.importer ? dirname(args.importer) : process.cwd(),args.path),namespace:'workspace'}))
    b.onLoad({filter:/.*/,namespace:'workspace'}, async args=>({contents:await readFile(args.path,'utf8'),loader:'js'}))
  } }] })
  script = result.outputFiles[0].text
  browser = await playwright.chromium.launch({ channel: 'chrome', headless: true })
}, 60000)
beforeEach(async () => {
  await page?.close()
  page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.setContent('<style>*{box-sizing:border-box}body{margin:0}</style><div id="root"></div>')
  await page.addScriptTag({ content: script })
})
afterAll(async () => { await browser?.close() })

it('390px에서 가마·곡물 그림이 없거나 손상되어도 깨진 이미지를 숨기고 진행한다', async () => {
  await page.evaluate(() => {
    const beat=fixture.ACTS.flatMap(a=>a.beats).flatMap(b=>b.stops??[]).map(s=>s.beat).find(b=>b?.ration)
    fixture.createRation(document.querySelector('#root')).open({market:{title:'쌀값',lines:[],series:[]},ration:beat.ration})
  })
  await page.getByRole('button',{name:'무위영으로 간다'}).click()
  await page.locator('.sack img').evaluate(img=>{img.src='data:image/webp;base64,broken'})
  await page.waitForFunction(()=>{const i=document.querySelector('.sack img');return i.complete&&!i.naturalWidth})
  expect(await page.locator('.sack img').isVisible()).toBe(false)
  await page.locator('.sack').click()
  // 가마를 열면 낟알판이 먼저 나온다(2026-09-25 선생님: 「쌀에서 겨와 모래 골라내기」).
  // 이 시험이 보는 것은 깨진 그림 처리이므로, 손으로 고르는 자리는 건너뛰는 길로 지난다 —
  // 그 단추가 언제나 있다는 것 자체가 이 화면의 약속이다(갇히는 학생을 만들지 않는다).
  await page.locator('.skip').click()
  await page.locator('.to-reveal').click()
  await page.locator('.grain img').evaluate(img=>{img.src='data:image/webp;base64,broken'})
  await page.waitForFunction(()=>{const i=document.querySelector('.grain img');return i.complete&&!i.naturalWidth})
  expect(await page.locator('.grain img').isVisible()).toBe(false)
  expect(await page.locator('.grain figcaption').innerText()).toContain('모래')
  const bounds=await page.locator('.grain').boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(390)
  await page.getByRole('button',{name:'돌아간다'}).click()
  expect(await page.locator('.ration').count()).toBe(0)
})

// 손으로 하는 자리를 손으로 해 본다 — 이 화면의 값은 「골라냈다」는 동작 자체이므로,
// 건너뛰기만 눌러 보는 시험으로는 지켜지지 않는다. 판은 seed 가 같으면 같은 판이라
// (systems/grain-tray.js) 겨와 모래의 자리를 그대로 셈해 눌러 볼 수 있다.
it('낟알판에서 겨와 모래를 손으로 집어내면 남은 것이 열세 달치 급료라고 말한다', async () => {
  await page.evaluate(() => {
    const f=fixture
    const beat=f.ACTS.flatMap(a=>a.beats).flatMap(b=>b.stops??[]).map(s=>s.beat).find(b=>b?.ration)
    f.createRation(document.querySelector('#root')).open({market:{title:'쌀값',lines:[],series:[]},ration:beat.ration})
  })
  await page.getByRole('button',{name:'무위영으로 간다'}).click()
  await page.locator('.open-sack').click()
  const {debris,rice}=await page.evaluate(() => {
    const t=fixture.createTray(), at=g=>({x:g.x/fixture.TRAY_W,y:g.y/fixture.TRAY_H})
    return {debris:t.grains.filter(g=>g.kind!=='rice').map(at), rice:at(t.grains.find(g=>g.kind==='rice'))}
  })
  const box=await page.locator('.tray').boundingBox()
  const press=g=>page.mouse.click(box.x+g.x*box.width, box.y+g.y*box.height)

  // 쌀을 눌러도 벌하지 않는다 — 한 줄 알려 주고 판은 그대로다
  await press(rice)
  expect(await page.locator('.nudge').innerText()).toContain('쌀')
  const before=await page.locator('.tray-count').innerText()

  for(const g of debris)await press(g)
  expect(await page.locator('.tray-count').count()).toBe(0)   // 다 골라내면 다음 화면이다
  expect(before).not.toBe('')
  const wage=await page.locator('.wage-line').innerText()
  expect(wage).toContain('열세 달')
  expect(wage).toContain('급료')
  await page.locator('.to-reveal').click()
  expect(await page.locator('.grain figcaption').innerText()).toContain('모래')
  await page.getByRole('button',{name:'돌아간다'}).click()
  expect(await page.locator('.ration').count()).toBe(0)
})

it('대사 중 음소거할 때 이미 보인 자막을 지우지 않고 빠른 E 입력 뒤 오디오·타이머가 끝난다', async () => {
  await page.clock.install()
  await page.evaluate(() => {
    const f=fixture, line='「명복아, 오늘은 옷을 단정히 하고 사랑채에 가 있거라.」'
    window.muted=false;window.made=[]
    window.voice=f.createVoicePlayer({isMuted:()=>muted,
      clips:{[f.voiceKey('mother',line)]:{src:'test',ms:6000,t:Array.from(line,(_,i)=>i*100)}},
      makeAudio:()=>{const a={currentTime:1,paused:false,play:()=>Promise.resolve(),pause(){this.paused=true},addEventListener(){}};made.push(a);return a}})
    window.speak=f.createSpeak(document.querySelector('#root'),{voice})
    speak.show({npcId:'mother',lines:[line,'다음 지문이다.']})
  })
  await page.clock.runFor(30)
  const visible=await page.locator('.line').textContent()
  expect(visible.length).toBeGreaterThan(5)
  await page.evaluate(()=>{muted=true;voice.silence()})
  await page.clock.runFor(60)
  expect((await page.locator('.line').textContent()).startsWith(visible)).toBe(true)
  await page.evaluate(()=>{for(let i=0;i<8;i++)speak.press()})
  await page.clock.runFor(10000)
  expect(await page.locator('.speak').count()).toBe(0)
  expect(await page.evaluate(()=>({playing:voice.isPlaying(),paused:made.every(a=>a.paused)}))).toEqual({playing:false,paused:true})
})

it('저장한 조선책략 빈칸·해석을 사초함에서 다시 열고 수정할 수 있다', async () => {
  await page.evaluate(() => {
    const f=fixture
    window.state={...f.createState(),sources:{held:['joseon-chaeryak'],read:['joseon-chaeryak'],lost:[]}}
    window.openInquiry=()=>{
      document.querySelector('#root').replaceChildren()
      const dialog=f.createDialog(document.querySelector('#root'),{
        getInquiry:id=>state.inquiries?.[id]??{},
        onInquirySave:(id,record)=>{state=f.deserialize(f.serialize({...state,inquiries:{[id]:record}}));return true}})
      dialog.showCodex(state)
    }
    openInquiry()
  })
  await page.getByRole('button',{name:'황준헌 『조선책략』'}).click()
  const answers=['러시아','러시아','중국(청)','일본']
  for(let i=0;i<4;i++)await page.locator(`[data-blank="${i}"]`).selectOption(answers[i])
  await page.locator('.inquiry-answer').fill('청의 외교관은 러시아의 남하를 막으려 하였다.')
  await page.locator('.inquiry-compare').click()
  await page.locator('.inquiry-revision').fill('청의 이익도 함께 고려한다.')
  await page.locator('.close').click()
  await page.evaluate(()=>openInquiry())
  await page.getByRole('button',{name:'황준헌 『조선책략』'}).click()
  expect(await page.locator('.cloze-blank').evaluateAll(es=>es.map(e=>e.value))).toEqual(answers)
  expect(await page.locator('.inquiry-answer').inputValue()).toContain('러시아의 남하')
  expect(await page.locator('.inquiry-revision').inputValue()).toBe('청의 이익도 함께 고려한다.')
  expect(await page.locator('.close').isEnabled()).toBe(true)
  await page.locator('[data-blank="2"]').selectOption('일본')
  expect(await page.locator('.close').isEnabled()).toBe(false)
})

it('글 화면을 넘기면 음소거 자막 타이머와 이전 음성이 다음 화면에 남지 않는다', async () => {
  await page.clock.install()
  const result=await page.evaluate(async () => {
    const f=fixture, voice=f.createVoicePlayer({isMuted:()=>true})
    const note=f.createNoteScreen(document.querySelector('#root'),{voice})
    const done=note.show({lines:['첫 지문','두 번째 지문']})
    document.querySelector('.note-next').click()
    await done
    return voice.isPlaying()
  })
  expect(result).toBe(false)
  await page.clock.runFor(20000)
  expect(await page.locator('.note').count()).toBe(0)
})

it.each([true,false])('390px에서 그림 유무(%s)와 무관하게 가마·곡물·대화재 선택 영역이 화면 안에 놓인다', async present => {
  await page.evaluate(present=>{
    const f=fixture
    if(!present){f.FEEDBACK_MEDIA.sack='';f.FEEDBACK_MEDIA.grain=''}
    const beat=f.ACTS.flatMap(a=>a.beats).flatMap(b=>b.stops??[]).map(s=>s.beat).find(b=>b?.ration)
    f.createRation(document.querySelector('#root')).open({market:{title:'쌀값',lines:[],series:[]},ration:beat.ration})
  },present)
  const checkBounds=async selector=>{
    const boxes=await page.locator(selector).evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}}))
    expect(boxes.length).toBeGreaterThan(0)
    for(const box of boxes){expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(390)}
  }
  await page.getByRole('button',{name:'무위영으로 간다'}).click()
  expect(await page.locator('.sack img').count()).toBe(present?1:0)
  if(present)await page.locator('.sack img').evaluate(i=>i.decode())
  await checkBounds('.sack,.sack span,.open-sack')
  await page.locator('.open-sack').click()
  // 낟알판과 그 단추들도 390px 안에 들어와야 한다 — 판이 화면을 넘으면 학생은
  // 오른쪽 끝의 겨를 영원히 집을 수 없다. 그림 파일과 무관한 화면이므로 present 와
  // 상관없이 같은 검사를 받는다.
  await checkBounds('.tray-wrap,.tray,.tray-count,.skip')
  await page.locator('.skip').click()
  await checkBounds('.tray-wrap,.wage-line,.to-reveal')
  await page.locator('.to-reveal').click()
  expect(await page.locator('.grain img').count()).toBe(present?1:0)
  if(present)await page.locator('.grain img').evaluate(i=>i.decode())
  await checkBounds('.grain,.grain figcaption div')
  await page.getByRole('button',{name:'돌아간다'}).click()
})
