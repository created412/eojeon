import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
let playwright
try { playwright = require('playwright') } catch { playwright = require(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')) }
let browser, page, script
const movie = readFileSync(resolve('assets/video/eojeon-prologue-v23.mp4'))
const music = readFileSync(resolve('assets/video/eojeon-prologue-continuous.m4a'))
beforeAll(async () => {
  const result = await build({ stdin: { resolveDir: process.cwd(), contents: `
    import {createTitle} from './src/ui/title.js';
    import {createAudio} from './src/systems/audio.js';
    const audio=createAudio({engine:{resume(){},ambient(){},setGain(){},oneShot(){}},storage:{getItem(){return '1'},setItem(){}}});
    const title=createTitle(document.querySelector('#root'));
    window.fixture={title,audio,fresh:0,resume:0,started:0,open(extra={}){
      title.show({hasSave:false,audio,onFresh(){fixture.fresh++},onResume(){fixture.resume++},
      onPrologueStart(){fixture.started++},...extra});
    }};
    fixture.open();
  ` }, bundle: true, write: false, format: 'iife',
  // 영상은 HTML 에 실려 있지만(ui/prologue-media-data.js) 이 시험은 **파일 경로 길**(404·지연·range)을 본다 —
  // 자료 모듈을 비워 끼워 그 길로 가게 한다. 실린 영상이 실제로 도는지는 tests/ui/game-quality-browser 가 본다.
  plugins: [{ name: 'empty-prologue-media', setup(b) {
    b.onResolve({ filter: /prologue-media-data\.js$/ }, args => ({ path: args.path, namespace: 'empty-media' }))
    b.onLoad({ filter: /.*/, namespace: 'empty-media' }, () => ({ contents:
      "export const PROLOGUE_VIDEO_B64='';export const PROLOGUE_AUDIO_B64='';export const PROLOGUE_VIDEO_MIME='video/mp4';export const PROLOGUE_AUDIO_MIME='audio/mp4';export const PROLOGUE_VIDEO_BYTES=0;export const PROLOGUE_AUDIO_BYTES=0", loader: 'js' }))
  } }] })
  script=result.outputFiles[0].text
  browser=await playwright.chromium.launch({channel:'chrome',headless:true})
},60000)
beforeEach(async()=>{
  await page?.close();page=await browser.newPage({viewport:{width:1024,height:768}})
  await page.route('http://eojeon.test/**',route=>{
    const isMusic = route.request().url().endsWith('.m4a')
    if (!isMusic && !route.request().url().endsWith('.mp4')) return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'})
    const bytes = isMusic ? music : movie
    const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/)
    const start = Number(range?.[1] ?? 0), end = range?.[2] ? Number(range[2]) : bytes.length - 1
    return route.fulfill({status:range?206:200,contentType:isMusic?'audio/mp4':'video/mp4',body:bytes.subarray(start,end+1),
      headers:{'accept-ranges':'bytes',...(range?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})}})
  })
  await page.goto('http://eojeon.test/');await page.addScriptTag({content:script})
})
afterAll(async()=>{await browser?.close()},20000)
const playing=()=>page.waitForFunction(()=>document.querySelector('video')?.currentTime>0)
it('메뉴판 없이 영상부터 자동 재생하고 시작 버튼은 아직 숨긴다',async()=>{
  await playing()
  expect(await page.locator('.opening').count()).toBe(0)
  expect(await page.getByRole('button',{name:'게임 시작',exact:true}).isVisible()).toBe(false)
  expect(await page.evaluate(()=>[fixture.fresh,fixture.resume,fixture.started])).toEqual([0,0,1])
})
it('마지막 구간은 계속 반복하고 시작을 눌러야 게임을 한 번 연다',async()=>{
  await playing();await page.evaluate(()=>{document.querySelector('audio').currentTime=54.7;document.querySelector('video').currentTime=54.7})
  const start=page.getByRole('button',{name:'게임 시작',exact:true})
  await start.waitFor({state:'visible'})
  await page.waitForFunction(()=>{const v=document.querySelector('video');return v.currentTime>=49&&v.currentTime<51&&!v.paused})
  const musicBefore = await page.locator('audio').evaluate(a=>a.currentTime)
  await page.locator('video').evaluate(v=>v.currentTime=54.8)
  await page.waitForFunction(()=>document.querySelector('video').currentTime<51)
  expect(await page.locator('audio').evaluate(a=>a.currentTime)).toBeGreaterThan(musicBefore)
  expect(await page.locator('audio').evaluate(a=>a.paused)).toBe(false)
  await page.locator('video').evaluate(v=>v.dispatchEvent(new Event('waiting')))
  expect(await page.locator('.prologue-status').isVisible()).toBe(false)
  expect(await page.locator('.prologue').innerText()).not.toContain('영상을 불러오고 있습니다')
  expect(await page.evaluate(()=>fixture.fresh)).toBe(0)
  await start.click();await page.waitForFunction(()=>fixture.fresh===1)
  await page.locator('.prologue').waitFor({state:'detached'})
  expect(await page.evaluate(()=>fixture.fresh)).toBe(1)
})
it('긴 음악이 끝나도 대사 없이 음악만 이어서 반복한다',async()=>{
  await page.getByRole('button',{name:'영상 건너뛰기'}).click();await playing()
  await page.locator('audio').evaluate(a=>a.currentTime=127.8)
  await page.waitForFunction(()=>{const a=document.querySelector('audio');return a.currentTime>=59&&a.currentTime<61&&!a.paused})
  expect(await page.evaluate(()=>fixture.fresh)).toBe(0)
})
it('게임 시작 때 음악을 즉시 자르지 않고 서서히 줄인 뒤 정리한다',async()=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.getByRole('button',{name:'영상 건너뛰기'}).click();await playing()
  await page.getByRole('button',{name:'게임 시작',exact:true}).click()
  await page.waitForFunction(()=>{const a=document.querySelector('audio');return a&&a.volume>0&&a.volume<1})
  const state=await page.locator('audio').evaluate(a=>({paused:a.paused,volume:a.volume}))
  expect(state.paused).toBe(false);expect(state.volume).toBeGreaterThan(0);expect(state.volume).toBeLessThan(1)
  await page.locator('.prologue').waitFor({state:'detached'})
  expect(errors).toEqual([])
})
it('건너뛰기는 마지막 영상과 시작 버튼을 보여 주며 새 게임을 시작하지 않는다',async()=>{
  await page.getByRole('button',{name:'영상 건너뛰기'}).click()
  await page.getByRole('button',{name:'게임 시작',exact:true}).waitFor({state:'visible'})
  await page.waitForFunction(()=>document.querySelector('video').currentTime>=49)
  expect(await page.evaluate(()=>fixture.fresh)).toBe(0)
})
it('이어서 하기는 영상 끝을 기다리지 않고 기존 저장으로 들어간다',async()=>{
  await page.evaluate(()=>fixture.open({hasSave:true}))
  await page.getByRole('button',{name:'이어서 하기',exact:true}).click()
  expect(await page.evaluate(()=>[fixture.fresh,fixture.resume])).toEqual([0,1])
  await page.locator('video').waitFor({state:'detached'})
})
it('기존 저장이 있으면 새 게임을 누른 뒤에도 삭제 확인 전까지 기록을 유지한다',async()=>{
  await page.evaluate(()=>fixture.open({hasSave:true}))
  await page.getByRole('button',{name:'영상 건너뛰기'}).click()
  await page.getByRole('button',{name:'게임 시작',exact:true}).click()
  expect(await page.evaluate(()=>[fixture.fresh,fixture.resume])).toEqual([0,0])
  await page.getByRole('button',{name:'기록을 지우고 새로 시작',exact:true}).click()
  expect(await page.evaluate(()=>[fixture.fresh,fixture.resume])).toEqual([1,0])
})
// 선생님(2026-10-06): 「기록유지해도 유지한 상태에서 시작이 안돼.」
it('「기록을 유지하고 이어서 하기」는 저장된 기록으로 바로 들어간다 — 단추로 되돌아가지 않는다',async()=>{
  await page.evaluate(()=>fixture.open({hasSave:true}))
  await page.getByRole('button',{name:'영상 건너뛰기'}).click()
  await page.getByRole('button',{name:'게임 시작',exact:true}).click()
  await page.getByRole('button',{name:'기록을 유지하고 이어서 하기',exact:true}).click()
  expect(await page.evaluate(()=>[fixture.fresh,fixture.resume])).toEqual([0,1])
  await page.locator('video').waitFor({state:'detached'})
})
it('영상이 없어도 명시적으로 시작하기 전에는 저장을 지우거나 게임을 시작하지 않는다',async()=>{
  await page.route('**/*.mp4',route=>route.fulfill({status:404,body:''}))
  await page.evaluate(()=>fixture.open({hasSave:false,notice:'이전 판의 저장입니다.'}))
  const start=page.getByRole('button',{name:'게임 시작',exact:true});await start.waitFor({state:'visible'})
  expect(await page.evaluate(()=>fixture.fresh)).toBe(0)
  expect(await page.locator('.prologue-notice:visible').innerText()).toBe('이전 판의 저장입니다.')
  await start.click();expect(await page.evaluate(()=>fixture.fresh)).toBe(1)
})
it('무음 설정과 소리 켜기 조작을 영상·게임이 공유한다',async()=>{
  await playing();expect(await page.locator('audio').evaluate(v=>v.muted)).toBe(true)
  await page.getByRole('button',{name:'소리 켜기'}).click()
  expect(await page.locator('audio').evaluate(v=>v.muted)).toBe(false)
  expect(await page.evaluate(()=>[fixture.audio.isMuted(),fixture.audio.isReady()])).toEqual([false,true])
})
it('소리 있는 자동 재생이 거부되어도 무음으로 넘기지 않고 재생 버튼을 기다린다',async()=>{
  await page.evaluate(()=>{
    fixture.audio.toggleMuted();const original=HTMLMediaElement.prototype.play
    window.allowAudio=()=>HTMLMediaElement.prototype.play=original
    HTMLMediaElement.prototype.play=function(){if(!this.muted)return Promise.reject(new DOMException('gesture','NotAllowedError'));return original.call(this)}
    fixture.open()
  })
  await page.getByRole('button',{name:'소리와 함께 재생',exact:true}).waitFor({state:'visible'})
  expect(await page.locator('audio').evaluate(v=>v.muted)).toBe(false)
  expect(await page.locator('video').evaluate(v=>v.paused)).toBe(true)
  expect(await page.evaluate(()=>fixture.audio.isMuted())).toBe(false)
  await page.evaluate(()=>allowAudio());await page.getByRole('button',{name:'소리와 함께 재생',exact:true}).click();await playing()
})
it('무음 자동 재생까지 막히면 영상 위 재생 버튼으로 복구한다',async()=>{
  await page.evaluate(()=>{
    const original=HTMLMediaElement.prototype.play;let denied=true
    HTMLMediaElement.prototype.play=function(){if(denied){denied=false;return Promise.reject(new DOMException('gesture','NotAllowedError'))}return original.call(this)}
    fixture.open()
  })
  await page.getByRole('button',{name:'영상 재생',exact:true}).click();await playing()
  expect(await page.evaluate(()=>fixture.fresh)).toBe(0)
})
it('닫힌 영상의 늦은 종료·오류 이벤트는 아무것도 시작하지 않는다',async()=>{
  await playing();await page.evaluate(()=>{const v=document.querySelector('video');fixture.title.close();v.dispatchEvent(new Event('ended'));v.dispatchEvent(new Event('error'))})
  expect(await page.locator('video').count()).toBe(0)
  expect(await page.evaluate(()=>[fixture.fresh,fixture.title.isOpen()])).toEqual([0,false])
})
it('로딩 중 일시 정지해도 게임이 시작되지 않고 다시 재생할 수 있다',async()=>{
  let pending
  await page.route('**/*.mp4',route=>{pending=route})
  await page.evaluate(()=>fixture.open())
  await page.getByRole('button',{name:'일시 정지'}).click()
  await page.waitForFunction(()=>document.querySelector('video').paused)
  expect(await page.evaluate(()=>fixture.fresh)).toBe(0)
  await pending.fulfill({path:resolve('assets/video/eojeon-prologue-v23.mp4'),contentType:'video/mp4'})
  await page.getByRole('button',{name:'계속 재생'}).click();await playing()
})
it('안내를 열면 영상이 숨고 멈추며 닫으면 제자리에서 재생한다',async()=>{
  await page.evaluate(()=>fixture.open({onHelp:()=>new Promise(resolve=>fixture.closeHelp=resolve)}))
  await playing();await page.getByRole('button',{name:'조작 안내',exact:true}).click()
  expect(await page.locator('.prologue').isVisible()).toBe(false)
  expect(await page.locator('video').evaluate(v=>v.paused)).toBe(true)
  await page.evaluate(()=>fixture.closeHelp());await page.locator('.prologue').waitFor({state:'visible'})
  await page.waitForFunction(()=>!document.querySelector('video').paused)
})
it('우측 아래 시작 버튼이 작은 세로·가로 화면에서 잘리지 않는다',async()=>{
  await page.getByRole('button',{name:'영상 건너뛰기'}).click()
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){
    await page.setViewportSize(size)
    const box=await page.getByRole('button',{name:'게임 시작',exact:true}).boundingBox()
    expect(box.x+box.width).toBeLessThanOrEqual(size.width)
    expect(box.y+box.height).toBeLessThanOrEqual(size.height)
    expect(box.x+box.width/2).toBeGreaterThan(size.width/2)
    expect(box.y+box.height/2).toBeGreaterThan(size.height/2)
  }
  await page.locator('.prologue-info summary').click()
  expect(await page.locator('.prologue-info').innerText()).toContain('SIL Open Font License 1.1')
})
