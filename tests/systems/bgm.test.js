import { it, expect } from 'vitest'
import { createBgm, bgmForBeat, BGM_GAIN, DUCK_GAIN } from '../../src/systems/bgm.js'
import { BGM } from '../../src/data/bgm-data.js'

const fake = () => ({ volume: 0, loop: false, paused: true, play() { this.paused = false; return Promise.resolve() }, pause() { this.paused = true } })

it('막마다 제 곡이 있고, 읽는 화면은 낮게, 침묵할 자리는 아예 없다', () => {
  expect(bgmForBeat({ kind: 'explore' }, 0)).toEqual({ track: 'act1', level: 'full' })
  expect(bgmForBeat({ kind: 'explore' }, 4)).toEqual({ track: 'act5', level: 'full' })
  expect(bgmForBeat({ kind: 'rush' }, 2).track).toBe('tension')
  expect(bgmForBeat({ kind: 'escape' }, 3).track).toBe('tension')
  expect(bgmForBeat({ kind: 'procession' }, 0).track).toBe('march')
  expect(bgmForBeat({ kind: 'council' }, 1)).toEqual({ track: 'council', level: 'bed' })
  expect(bgmForBeat({ kind: 'note' }, 1)).toEqual({ track: 'act2', level: 'bed' })
  expect(bgmForBeat({ kind: 'audience' }, 1).level).toBe('bed')
  for (const kind of ['brush', 'plunder', 'hold']) expect(bgmForBeat({ kind }, 0).track, kind).toBe(null)
  expect(bgmForBeat(null)).toEqual({ track: 'theme', level: 'full' })
})

// 게임에 실제로 있는 모든 비트를 먹여 본다 — 이름 오타가 조용한 무음이 되지 않게.
it('모든 비트가 실린 곡(또는 뜻한 침묵)으로 이어진다', async () => {
  const { ACTS } = await import('../../src/data/acts.js')
  const silent = new Set(['brush', 'plunder', 'hold'])
  ACTS.forEach((act, i) => {
    for (const beat of act.beats) {
      const { track } = bgmForBeat(beat, i)
      if (silent.has(beat.kind)) expect(track, beat.id).toBe(null)
      else expect(BGM[track], `${beat.id}(${beat.kind})`).toBeTruthy()
    }
  })
})

it('시간을 따라 서서히 커지고, 말하는 동안에는 줄고, 음소거면 멈춘다', () => {
  let muted = false
  const made = []
  const b = createBgm({ tracks: { act1: 'a', tension: 'b' }, isMuted: () => muted, makeAudio: () => { const a = fake(); made.push(a); return a } })
  b.set('act1')
  b.tick(0); for (let t = 100; t <= 3000; t += 100) b.tick(t)
  expect(made[0].volume).toBeCloseTo(BGM_GAIN, 5)
  expect(made[0].loop).toBe(true)
  b.duck(true); for (let t = 3100; t <= 6000; t += 100) b.tick(t)
  expect(made[0].volume).toBeCloseTo(DUCK_GAIN, 5)
  b.set('tension'); for (let t = 6100; t <= 9000; t += 100) b.tick(t)
  expect(made[0].volume).toBe(0)
  expect(made[0].paused).toBe(true)
  muted = true; for (let t = 9100; t <= 12000; t += 100) b.tick(t)
  expect(made[1].volume).toBe(0)
})
