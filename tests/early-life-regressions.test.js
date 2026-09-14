import { it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { bodyOf, blockAt } from './helpers/body-of.js'
import { PALACES, roomAt, baseOf } from '../src/data/palaces.js'
import { ACTS } from '../src/data/acts.js'
import { createState } from '../src/core/state.js'
import { isDusk } from '../src/core/clock.js'
import { step, axisToward } from '../src/systems/movement.js'
import * as audience from '../src/systems/audience.js'
import { npcById, npcCardIds, npcsAt } from '../src/data/npcs.js'
import { yearAtBeat } from '../src/systems/scenario.js'
import { kingLookAt, kingAttireAt } from '../src/systems/king-age.js'
import { palaceDoor } from '../src/main.js'
import { createVoicePlayer } from '../src/systems/voice.js'
import { voiceKey } from '../src/data/voice-cast.js'
import { banner } from '../src/ui/banner.js'

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
// 실제 main의 함수·프레임 블록을 실행한다. DOM과 시계만 대신하며 이동 판정은 그대로 쓴다.
function runFunction(name, env, arg) {
  return new Function('env', 'arg', `with (env) { return (async function(${name === 'bindPalaceAndSpawn' ? 'quiet = false' : 'beat'}) {${bodyOf(source, name)}})(arg) }`)(env, arg)
}
function runBlock(prefix, env) {
  const start = source.indexOf(prefix)
  const open = source.indexOf('{', start)
  const condition = source.slice(start, open)
  new Function('env', `with (env) { ${condition} {${blockAt(source, open)}} }`)(env)
}
function environment() {
  const position = {x: 0, y: 1.9, z: 0, set(x,y,z) { Object.assign(this,{x,y,z}) }}
  return {
    ...audience, PALACES, roomAt, npcById, npcCardIds, isDusk,
    flow: {state: {...createState(), palace: 'changdeok', control: 'C', blocked: null}, phase: 'audience',
      setPhase(phase) { this.phase = phase }, actIndex: 0, taken: new Set()},
    ctx: {player: {position}, setProps() {}, setNpcs() {}, setPickupMarkers() {}, placeNpc() {}, pickGround: p => p},
    input: {tap: () => null, axis: () => ({x:0,z:1})},
    inputForStep: () => ({axis: () => ({x:0,z:1}), running: () => false}), step,
    audienceBeat: {kind:'audience',room:'injeongjeon',visitors:[]}, procession: null, audienceWalk: null,
    audienceExitOpen: false, audienceWasWalking: false, resolveAudience: null, lastRebukeAt: -Infinity,
    speak: {isOpen: () => false}, dialog: {isOpen: () => false, close() {}}, pause: {isOpen: () => false},
    hint: {}, audio: {play() {}}, currentNpcs: () => [],
    acc: 12, tapTarget: {x:9,z:9}, dt: 17, FIXED_MS: 16, MAX_STEPS: 5, now: 5000,
    rebuke() {}, lastRoom: null, lastBlockedBannerAt: 0, BLOCKED_BANNER_MS: 3000,
    banner() {}, root: {}, updateHint() {}, resolveExplore: vi.fn(), activeBeat: {free:true},
  }
}

it('행렬 도착 뒤 E를 기다릴 때에도 키와 탭으로 임금을 움직일 수 없다', () => {
  const env = environment()
  env.audienceBeat.kind = 'procession'
  env.ctx.player.position.set(0,1.9,19)
  const before = {...env.ctx.player.position}
  runBlock("if (flow.phase === 'audience' && audienceBeat &&", env)
  expect(env.ctx.player.position).toEqual(before)
  expect(env.flow.state.blocked).toBeNull()
})

it('신하가 걸어 들어오는 동안에는 임금이 걷고, 신하는 따라온다', () => {
  const env = environment()
  const room = PALACES.changdeok.rooms.find(r => r.id === 'injeongjeon')
  const king = audience.kingSpot(room)
  env.ctx.player.position.set(king.x, 1.9, king.z)
  env.tapTarget = null
  env.audienceWalk = {id:'hojo', followRoom: room}
  runBlock("if (flow.phase === 'audience' && audienceBeat &&", env)
  expect(env.ctx.player.position.z).toBeGreaterThan(king.z)
})

it('신하가 물러나는 동안에는 키·이전 탭·막힘을 멈춘다', () => {
  const env = environment()
  env.audienceWalk = {id:'hojo'}
  env.flow.state.blocked = 'confine:injeongjeon'
  runBlock("if (flow.phase === 'audience' && audienceBeat &&", env)
  expect(env.ctx.player.position.z).toBe(0)
  expect(env.tapTarget).toBeNull()
  expect(env.acc).toBe(0)
  expect(env.flow.state.blocked).toBeNull()
})

it('알현을 마친 뒤 누적 걸음·탭 목표·막힘이 다음 비트에 남지 않는다', async () => {
  const env = environment()
  const done = runFunction('playAudience', env, env.audienceBeat)
  expect(env.audienceExitOpen).toBe(true)
  env.flow.state.blocked = 'confine:injeongjeon'
  env.resolveAudience()
  await done
  expect(env.acc).toBe(0)
  expect(env.tapTarget).toBeNull()
  expect(env.flow.state.blocked).toBeNull()
})

it('문으로 알현을 나간 뒤 회의는 어좌 앞으로 돌아와 열린다', async () => {
  const env = environment()
  env.ctx.player.position.set(0,1.9,32)
  env.flow.state.room = null
  env.saveGame = () => {}
  env.council = {open() {}}
  runFunction('playCouncil', env, {kind:'council'})
  const spot = audience.kingSpot(PALACES.changdeok.rooms.find(r => r.id === 'injeongjeon'))
  expect(env.ctx.player.position).toMatchObject(spot)
  expect(env.flow.state.room).toBe('injeongjeon')
})

it('free 낮은 남은 아룀이 0인 저장을 이어받아도 저절로 끝나지 않는다', () => {
  const env = environment()
  env.flow.phase = 'day'
  env.flow.state.dayLeft = 0
  runBlock("if (flow.phase === 'day' || flow.phase === 'rush')", env)
  expect(env.resolveExplore).not.toHaveBeenCalled()
  env.activeBeat.free = false
  runBlock("if (flow.phase === 'day' || flow.phase === 'rush')", env)
  expect(env.resolveExplore).toHaveBeenCalledOnce()
})

it('어머니 캐릭터에게 갈 자리를 인물 표식과 미니맵에 남긴다', async () => {
  const env = environment()
  env.currentNpcs = () => npcsAt(baseOf, 'unhyeon', 0)
  const points = await runFunction('peopleRemaining', env)
  expect(points).toContainEqual(expect.objectContaining({x: npcById('mother').x, z: npcById('mother').z, kind:'person'}))
})

it('여흥부대부인은 운현궁 밖의 궁·화재 변형에서 인물과 대화 대상으로 새지 않는다', () => {
  expect(npcsAt(baseOf,'unhyeon',0).some(n=>n.id==='mother')).toBe(true)
  for(const palace of Object.keys(PALACES).filter(id=>id!=='unhyeon')) {
    expect(npcsAt(baseOf,palace,0).some(n=>n.id==='mother'),palace).toBe(false)
  }
})

it.each(['muted','blocked','audible'])('행렬 %s 재생 중 빠르게 E를 눌러 끝내도 음성·자막 배너·타이머를 남기지 않는다', async mode => {
  vi.useFakeTimers()
  const elements=new Set(), made=[]
  vi.stubGlobal('document',{createElement:()=>({style:{},remove(){elements.delete(this)}})})
  try {
    const env=environment(), lines=['첫 번째 지문','두 번째 지문']
    const clips=Object.fromEntries(lines.map(line=>[voiceKey('gojong-narrator',line),{src:line,ms:5000,t:[0]}]))
    Object.assign(env,{root:{appendChild:el=>elements.add(el)},banner,ROOM_DOOR_GAIN:0.75,
      voice:createVoicePlayer({clips,isMuted:()=>mode==='muted',makeAudio:()=>{
        const listeners={}
        const audio={paused:false,play:()=>mode==='blocked'?Promise.reject(new Error('blocked')):Promise.resolve(),
          pause(){this.paused=true},addEventListener:(event,fn)=>{listeners[event]=fn},end:()=>listeners.ended()}
        made.push(audio);return audio
      }})})
    env.speak.press=()=>false
    const beat={...ACTS[0].beats.find(b=>b.kind==='procession'),lines}
    env.flow.state.palace='unhyeon'
    const done=runFunction('playProcession',env,beat)
    await vi.advanceTimersByTimeAsync(0)
    // 행렬이 도착하기 전 E는 장면을 넘기지 않는다.
    for(let i=0;i<5;i++)await runFunction('onAudienceE',env)
    expect(env.flow.phase).toBe('audience')
    expect(elements.size).toBe(1)
    env.procession.resolve()
    await Promise.resolve()
    for(let i=0;i<5;i++)await runFunction('onAudienceE',env)
    await done
    made.forEach(a=>a.end())
    expect(env.voice.isPlaying()).toBe(false)
    expect(elements.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(env.hint.hidden).toBe(true)
    await vi.advanceTimersByTimeAsync(20000)
    expect(elements.size).toBe(0)
  } finally { vi.unstubAllGlobals();vi.useRealTimers() }
})

it.each([[1,'wanhwa',1868],[1,'wonja',1871],[2,'sunjong',1874]])('%s막 %s의 몸은 장면의 해에 맞게 자란다', (a,id,year) => {
  expect(yearAtBeat(ACTS[a], ACTS[a].beats.findIndex(b => b.id === id))).toBe(year)
})

it('궁을 바꾸거나 이어받은 직후 걷지 않아도 방 이름과 복장이 새 궁에 맞는다', async () => {
  const env = environment()
  Object.assign(env, {markerPoints: () => [], lastPalace: 'unhyeon', palaceDoor, kingLookAt, kingAttireAt, yearAtBeat})
  env.ctx.setKingAge = vi.fn()
  env.flow.syncPalace = () => {}
  env.flow.act = () => ACTS[0]
  env.flow.state.beatIndex = ACTS[0].beats.findIndex(b => b.id === 'throne')
  env.flow.state.room = 'sarang'
  await runFunction('bindPalaceAndSpawn', env)
  const spawn = PALACES.changdeok.spawn
  expect(env.flow.state.room).toBe(roomAt(PALACES.changdeok, spawn.x, spawn.z)?.id ?? null)
  expect(env.ctx.setKingAge).toHaveBeenCalledWith(expect.objectContaining({attire:'royal'}))
})

it('태블릿 탭도 같은 이동 함수로 알현 방 안을 걷는다', () => {
  const env = environment()
  const room = PALACES.changdeok.rooms.find(r => r.id === 'injeongjeon')
  const king = audience.kingSpot(room)
  env.ctx.player.position.set(king.x, 1.9, king.z)
  env.input.axis = () => ({x:0,z:0})
  env.input.running = () => false
  env.input.tap = () => ({x:king.x + 4, y:king.z})
  env.ctx.pickGround = (x,z) => ({x,z})
  env.axisToward = axisToward
  env.inputForStep = new Function('env', `with(env) { return function() {${bodyOf(source,'inputForStep')}} }`)(env)
  runBlock("if (flow.phase === 'audience' && audienceBeat &&", env)
  expect(env.ctx.player.position.x).toBeGreaterThan(king.x)
  expect(env.flow.state.room).toBe(room.id)
})

it('알현의 문이 열린 뒤에도 멈춤 화면 뒤에서 걸어나가지 않는다', () => {
  const env = environment()
  const king = audience.kingSpot(PALACES.changdeok.rooms.find(r => r.id === 'injeongjeon'))
  env.ctx.player.position.set(king.x,1.9,king.z)
  env.audienceExitOpen = true
  env.pause.isOpen = () => true
  runBlock("if (flow.phase === 'audience' && audienceBeat &&", env)
  expect(env.ctx.player.position).toMatchObject(king)
  expect(env.tapTarget).toBeNull()
})
