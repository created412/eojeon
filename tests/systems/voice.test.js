import { describe, it, expect } from 'vitest'
import { revealCount, createVoicePlayer } from '../../src/systems/voice.js'
import { spokenText } from '../../src/data/voice-cast.js'
import { ACTS } from '../../src/data/acts.js'
import { NPCS } from '../../src/data/npcs.js'

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

// 2026-09-26 — 게임에서 음성을 모두 뺐다(선생님 요청). 남은 것은 자막의 시계뿐이라
// 「녹음이 다 있는가」를 보던 시험은 지웠다. 대신 음성 없이도 자막이 도는지를 본다.
describe('음성 없이도 자막은 돈다', () => {
  it('녹음이 없으면 재생할 것이 없다 — 화면은 글자만 찍는 길로 간다', () => {
    const p = createVoicePlayer({ clips: {}, makeAudio: () => ({ play: () => Promise.resolve(), pause() {}, addEventListener() {} }) })
    expect(p.clipFor('heungseon', '「가거라.」')).toBeFalsy()
    expect(p.play(undefined)).toBeNull()
  })

  it('줄마다 읽을 시간을 두고 다음 줄로 넘어간다', async () => {
    const shown = []
    const p = createVoicePlayer({ clips: {} })
    const run = p.narrate(['첫 줄', '둘째 줄'], { onLine: t => shown.push(t) })
    expect(shown).toEqual(['첫 줄'])
    await new Promise(r => setTimeout(r, 3600))   // 읽을 시간(기본 3초)이 지나면 다음 줄로
    expect(shown).toEqual(['첫 줄', '둘째 줄'])
    run.stop()
  })
})
