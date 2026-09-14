import { it, expect, vi } from 'vitest'
import { createVoicePlayer } from '../../src/systems/voice.js'
import { voiceKey } from '../../src/data/voice-cast.js'
import { ACTS } from '../../src/data/acts.js'
import { NPCS } from '../../src/data/npcs.js'
import { NARRATION } from '../../src/data/narration-data.js'

it('고종 독백 음성은 행렬 장면의 줄에만 있고, 글 화면·지문 같은 안내 문장에는 없다', () => {
  const monologue = [], guide = []
  for (const act of ACTS) for (const b of act.beats) {
    if (b.kind === 'procession') monologue.push(...(b.lines ?? []))
    if (b.kind === 'note') guide.push(...(b.lines ?? []), ...(b.afterLines ?? []))
    for (const v of b.visitors ?? []) guide.push(...(v.lines ?? []).filter(l => !l.includes('「')))
  }
  for (const n of NPCS) guide.push(...(n.lines ?? []).filter(l => !l.includes('「')))
  expect(monologue).toContain('그 집안의 세도가 오늘로 저문다는 것을, 그는 알고 왔을까.')
  for (const line of monologue.filter(Boolean)) {
    const clip = NARRATION[voiceKey('gojong-narrator', line)]
    expect(clip, line).toBeTruthy()
    expect(clip.t).toHaveLength(line.length)
  }
  for (const line of guide.filter(l => l && !monologue.includes(l))) {
    expect(NARRATION[voiceKey('gojong-narrator', line)], line).toBeUndefined()
  }
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
