import { describe, it, expect } from 'vitest'
import { revealCount, createVoicePlayer } from '../../src/systems/voice.js'
import { spokenText, voiceKey, CAST, VOICES } from '../../src/data/voice-cast.js'
import { ACTS } from '../../src/data/acts.js'
import { NPCS } from '../../src/data/npcs.js'
import { VOICE } from '../../src/data/voice-data.js'

describe('대사 음성 — 글자와 말의 시계', () => {
  it('revealCount 는 그 시각까지 나타날 글자 수다', () => {
    const t = [0, 0, 120, 240, 240, 600]
    expect(revealCount(t, -1)).toBe(0)
    expect(revealCount(t, 0)).toBe(2)
    expect(revealCount(t, 239)).toBe(3)
    expect(revealCount(t, 240)).toBe(5)
    expect(revealCount(t, 9999)).toBe(6)
  })

  it('「」 안의 말만 읽는다 — 지문은 소리 내지 않는다', () => {
    expect(spokenText('아버지가 명복의 어깨에 손을 얹는다.')).toBe('')
    expect(spokenText('「가거라.」')).toBe('가거라.')
  })

  it('음소거면 틀지 않는다 — 대화판은 글자만 찍는 길로 간다', () => {
    const p = createVoicePlayer({ clips: {}, isMuted: () => true, makeAudio: () => ({ play: () => Promise.resolve() }) })
    expect(p.play({ src: 'x', ms: 1, t: [0] })).toBeNull()
  })

  it('새 줄을 틀면 앞 줄의 말은 멈춘다', () => {
    const paused = []
    const make = src => ({ src, currentTime: 0, play: () => Promise.resolve(), pause() { paused.push(src) }, addEventListener() {} })
    const p = createVoicePlayer({ makeAudio: make })
    p.play({ src: 'a', ms: 1, t: [0] })
    p.play({ src: 'b', ms: 1, t: [0] })
    expect(paused).toEqual(['a'])
  })
})

describe('대사 음성 — 빠진 줄이 없다', () => {
  const spoken = []
  for (const a of ACTS) for (const b of a.beats) for (const v of b.visitors ?? []) {
    for (const line of v.lines ?? NPCS.find(n => n.id === v.npc)?.lines ?? []) if (spokenText(line)) spoken.push([v.npc, line])
  }
  for (const n of NPCS) for (const line of n.lines ?? []) if (spokenText(line)) spoken.push([n.id, line])

  it('대화판에 뜨는 「」 대사마다 목소리가 정해져 있다', () => {
    for (const [npc] of spoken) expect(VOICES[CAST[npc]], npc).toBeTruthy()
  })

  it('대화판에 뜨는 「」 대사마다 녹음과 글자 시각이 있다 — 대사를 고치면 다시 녹음해야 한다', () => {
    for (const [npc, line] of spoken) {
      const clip = VOICE[voiceKey(npc, line)]
      expect(clip, `${npc}: ${line}`).toBeTruthy()
      expect(clip.t).toHaveLength(line.length)
      expect(clip.src.startsWith('data:audio/mpeg;base64,')).toBe(true)
    }
  })
})
