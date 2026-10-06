import { it, expect } from 'vitest'
import { createBgm, bgmForBeat, BGM_GAIN, BED_GAIN, DUCK_GAIN } from '../../src/systems/bgm.js'
import { BGM } from '../../src/data/bgm-data.js'

const fake = () => ({ volume: 0, loop: false, paused: true, play() { this.paused = false; return Promise.resolve() }, pause() { this.paused = true } })

it('막마다 제 곡이 있고, 읽는 화면은 낮게, 침묵할 자리는 아예 없다', () => {
  expect(bgmForBeat({ kind: 'explore' }, 0)).toEqual({ track: 'act1', level: 'full' })
  expect(bgmForBeat({ kind: 'explore' }, 4)).toEqual({ track: 'act5', level: 'full' })
  expect(bgmForBeat({ kind: 'rush' }, 2).track).toBe('tension')
  expect(bgmForBeat({ kind: 'procession' }, 0).track).toBe('march')
  expect(bgmForBeat({ kind: 'council' }, 1)).toEqual({ track: 'council', level: 'bed' })
  expect(bgmForBeat({ kind: 'note' }, 1)).toEqual({ track: 'act2', level: 'bed' })
  expect(bgmForBeat({ kind: 'audience' }, 1).level).toBe('bed')
  expect(bgmForBeat({ kind: 'brush' }, 1)).toEqual({ track: 'council', level: 'bed' })
  for (const kind of ['plunder', 'hold']) expect(bgmForBeat({ kind }, 0).track, kind).toBe(null)
  expect(bgmForBeat(null)).toEqual({ track: 'theme', level: 'full' })
})

// 게임에 실제로 있는 모든 비트를 먹여 본다 — 이름 오타가 조용한 무음이 되지 않게.
it('모든 비트가 실린 곡(또는 뜻한 침묵)으로 이어진다', async () => {
  const { ACTS } = await import('../../src/data/acts.js')
  expect(bgmForBeat({ kind: 'alone' }, 2)).toEqual({ track: 'act3', level: 'bed' })
  const silent = new Set(['plunder', 'hold'])
  ACTS.forEach((act, i) => {
    const beats = act.beats.flatMap(beat => [beat, ...(beat.stops ?? []).map(stop => stop.beat).filter(Boolean)])
    for (const beat of beats) {
      const { track } = bgmForBeat(beat, i)
      if (silent.has(beat.kind)) expect(track, beat.id).toBe(null)
      else expect(BGM[track], `${beat.id}(${beat.kind})`).toBeTruthy()
    }
  })
})

it('척화비를 쓰는 동안 Suno 연주곡이 실제로 켜지고 읽기를 가리지 않는 음량을 유지한다', () => {
  const made = []
  const b = createBgm({ tracks: { council: 'suno-council' }, makeAudio: () => { const a = fake(); made.push(a); return a } })
  b.set(bgmForBeat({ kind: 'brush' }, 1))
  for (let t = 0; t <= 2000; t += 100) b.tick(t)
  expect(made).toHaveLength(1)
  expect(made[0].paused).toBe(false)
  expect(made[0].loop).toBe(true)
  expect(made[0].volume).toBeCloseTo(BED_GAIN)
})

it('소리를 끄면 배경곡과 이미 울린 종지까지 바로 멈춘다', () => {
  let muted = false
  const made = []
  const b = createBgm({ tracks: { act1: 'a', actend: 'end' }, isMuted: () => muted, makeAudio: () => { const a = fake(); made.push(a); return a } })
  b.set('act1')
  for (let t = 0; t <= 2000; t += 100) b.tick(t)
  b.sting('actend')
  expect(made.every(a => !a.paused && a.volume > 0)).toBe(true)
  muted = true; b.tick(2016)
  expect(made.every(a => a.paused && a.volume === 0)).toBe(true)
  muted = false
  for (let t = 2100; t <= 4000; t += 100) b.tick(t)
  expect(made[0].paused).toBe(false)
  expect(made[1].paused).toBe(true)
})

it('게임을 닫으면 종지와 기록 상실의 여음도 남지 않는다', () => {
  const made = []
  const b = createBgm({ tracks: { loss: 'loss' }, makeAudio: () => { const a = fake(); made.push(a); return a } })
  b.sting('loss'); b.stop()
  expect(made[0].paused).toBe(true)
  expect(made[0].volume).toBe(0)
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
