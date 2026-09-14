import { it, expect } from 'vitest'
import { createBgm, bgmForBeat, BGM_GAIN, DUCK_GAIN } from '../../src/systems/bgm.js'
import { BGM } from '../../src/data/bgm-data.js'

const fake = () => ({ volume: 0, loop: false, paused: true, play() { this.paused = false; return Promise.resolve() }, pause() { this.paused = true } })

it('촉박 장면만 긴장 변주, 나머지는 메인 테마다', () => {
  expect(bgmForBeat({ kind: 'rush' })).toBe('tension')
  expect(bgmForBeat({ kind: 'audience' })).toBe('main')
  expect(bgmForBeat(null)).toBe('main')
  expect(Object.keys(BGM).sort()).toEqual(['main', 'tension'])
})

it('시간을 따라 서서히 커지고, 말하는 동안에는 줄고, 음소거면 멈춘다', () => {
  let muted = false
  const made = []
  const b = createBgm({ tracks: { main: 'a', tension: 'b' }, isMuted: () => muted, makeAudio: () => { const a = fake(); made.push(a); return a } })
  b.set('main')
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
