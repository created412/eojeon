import { it, expect, vi } from 'vitest'
import { createVoicePlayer } from '../../src/systems/voice.js'
import { voiceKey } from '../../src/data/voice-cast.js'
import { ACTS } from '../../src/data/acts.js'
import { NPCS } from '../../src/data/npcs.js'

// 2026-09-26 선생님: 「목소리 나레이션은 하나도 안 빠졌고」 — 이제 게임에 음성 파일이 하나도 없다.
// 대사는 자막으로만 나간다. 아래 시험들은 자막 타이밍 장치(systems/voice.js)가 그대로 도는지를 본다.
it('게임에 실린 음성이 하나도 없다', async () => {
  const fs = await import('node:fs')
  expect(fs.existsSync('src/data/voice-data.js')).toBe(false)
  const main = fs.readFileSync('src/main.js', 'utf8')
  expect(main).not.toMatch(/voice-data/)
})

it('서사 음성을 줄 순서대로 재생하고 화면이 닫히면 다음 줄을 시작하지 않는다', () => {
  const made = []
  const clips = Object.fromEntries(['하나','둘','셋'].map(t => [voiceKey('gojong-narrator', t), { src: t, ms: 1000, t: [0] }]))
  const player = createVoicePlayer({ clips, makeAudio: src => {
    const listeners = {}
    const audio = { src, currentTime: 0, play: () => Promise.resolve(), pause() {}, addEventListener: (event, fn) => { listeners[event] = fn }, end: () => listeners.ended() }
    made.push(audio)
    return audio
  } })
  const shown = []
  const sequence = player.narrate(['하나','둘','셋'], { onLine: text => shown.push(text) })
  expect(made.map(a=>a.src)).toEqual(['하나'])
  made[0].end()
  expect(made.map(a=>a.src)).toEqual(['하나','둘'])
  sequence.stop()
  made[1].end()
  expect(shown).toEqual(['하나','둘'])
})

it('음성 재생이 차단되어도 각 자막을 읽을 시간을 둔다', async () => {
  vi.useFakeTimers()
  try {
    const clips=Object.fromEntries(['하나','둘'].map(t=>[voiceKey('gojong-narrator',t),{src:t,ms:1000,t:[0]}]))
    const player=createVoicePlayer({clips,makeAudio:()=>({play:()=>Promise.reject(new Error('blocked')),pause(){},addEventListener(){}})})
    const shown=[]
    const sequence=player.narrate(['하나','둘'],{onLine:t=>shown.push(t)})
    await vi.advanceTimersByTimeAsync(0)
    expect(shown).toEqual(['하나'])
    await vi.advanceTimersByTimeAsync(2399)
    expect(shown).toEqual(['하나'])
    await vi.advanceTimersByTimeAsync(1)
    expect(shown).toEqual(['하나','둘'])
    sequence.stop()
  } finally { vi.useRealTimers() }
})

it('중간에 음소거해도 남은 자막은 이어지고 정지한 대사 손잡이는 글자 대체 표시로 넘어간다', async () => {
  vi.useFakeTimers()
  try {
    let muted=false
    const clips=Object.fromEntries(['하나','둘'].map(t=>[voiceKey('gojong-narrator',t),{src:t,ms:1000,t:[0]}]))
    const player=createVoicePlayer({clips,isMuted:()=>muted,makeAudio:()=>({play:()=>Promise.resolve(),pause(){},addEventListener(){}})})
    const shown=[]
    const sequence=player.narrate(['하나','둘'],{onLine:t=>shown.push(t)})
    await vi.advanceTimersByTimeAsync(500)
    muted=true;player.silence()
    expect(player.isPlaying()).toBe(false)
    await vi.advanceTimersByTimeAsync(1900)
    expect(shown).toEqual(['하나','둘'])
    sequence.stop()
    muted=false
    const handle=player.play({src:'대사',ms:1000,t:[0]})
    player.silence()
    expect(handle.failed).toBe(true)
  } finally { vi.useRealTimers() }
})
