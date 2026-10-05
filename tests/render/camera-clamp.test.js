import { describe, it, expect } from 'vitest'
import { clampShotToGround, WALL_MARGIN, MIN_FLAT } from '../../src/render/camera-clamp.js'
import { PALACES } from '../../src/data/palaces.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// render/scene.js 는 three.js 를 부르므로 여기서 끌어오지 않는다. 대신 그 파일에
// 적힌 수를 글자로 읽어 온다 — 손으로 베껴 적으면 언젠가 어긋난다
// (tests/render/occlusion.test.js 가 실제로 한 번 그렇게 어긋났다).
const sceneSrc = readFileSync(join(process.cwd(), 'src', 'render', 'scene.js'), 'utf8')
const num = name => Number(sceneSrc.match(new RegExp('export const ' + name + ' = ([0-9.]+)'))[1])
const CAM_DIST = num('CAM_DIST'), CAM_HEIGHT = num('CAM_HEIGHT')

// 2026-10-05 전체 점검: 5막의 작은 궁 네 곳에서 카메라가 담장 밖에 서 있었다.

const shotBehind = p => ({ x: p.x + 1.6, y: CAM_HEIGHT, z: p.z + CAM_DIST, lookY: 2 })

describe('카메라가 담장 안에 선다', () => {
  it('scene.js 가 실제로 이 당김을 건다', () => {
    expect(sceneSrc).toContain("from './camera-clamp.js'")
    expect(sceneSrc).toMatch(/clampShotToGround\(/)
  })

  it('넓은 궁에서는 아무것도 바꾸지 않는다 — 같은 값을 그대로 돌려준다', () => {
    const def = PALACES.changdeok
    const shot = shotBehind(def.spawn)
    expect(clampShotToGround(shot, def.spawn, def.ground)).toBe(shot)
  })

  it('모든 궁의 시작 자리에서 카메라가 예전보다 담에 가깝거나 안에 있다', () => {
    for (const [id, def] of Object.entries(PALACES)) {
      if (!def.ground || !def.spawn) continue
      const before = shotBehind(def.spawn)
      const out = clampShotToGround(before, def.spawn, def.ground)
      expect(Math.abs(out.z), `${id} 의 카메라가 더 멀어졌다`).toBeLessThanOrEqual(Math.abs(before.z) + 1e-9)
    }
  })

  it('머리 꼭대기까지 올라가지 않는다 — 내려다보되 궁이 보인다', () => {
    // 처음 고침이 여기서 부러졌다. 담 안으로 끝까지 당기니 바로 위에서 내려다봤다.
    for (const [id, def] of Object.entries(PALACES)) {
      if (!def.ground || !def.spawn) continue
      const out = clampShotToGround(shotBehind(def.spawn), def.spawn, def.ground)
      const flat = Math.hypot(out.x - def.spawn.x, out.z - def.spawn.z)
      expect(flat, `${id} 에서 카메라가 임금 머리 위로 왔다`).toBeGreaterThanOrEqual(MIN_FLAT - 1e-6)
    }
  })

  it('작은 궁에서는 실제로 당겨진다 — 고칠 것이 있었다', () => {
    const def = PALACES.gyeongu
    const shot = shotBehind(def.spawn)
    expect(shot.z).toBeGreaterThan(def.ground.d / 2)          // 예전 자리는 담 밖 9m
    const out = clampShotToGround(shot, def.spawn, def.ground)
    expect(out.z).toBeLessThan(shot.z - 4)                     // 그만큼 당겨졌다
  })

  it('당긴 만큼 위로 올라간다 — 임금과의 거리가 줄지 않는다', () => {
    const def = PALACES.gyeongu
    const shot = shotBehind(def.spawn)
    const out = clampShotToGround(shot, def.spawn, def.ground)
    const dist = s => Math.hypot(s.x - def.spawn.x, s.y, s.z - def.spawn.z)
    expect(out.y).toBeGreaterThan(shot.y)
    expect(dist(out)).toBeCloseTo(dist(shot), 5)
  })

  it('다른 값(lookY 따위)은 건드리지 않는다', () => {
    const def = PALACES.gyeongu
    expect(clampShotToGround(shotBehind(def.spawn), def.spawn, def.ground).lookY).toBe(2)
  })

  it('궁터를 모르면 그대로 둔다 — 터지지 않는다', () => {
    const shot = { x: 0, y: 6, z: 99 }
    expect(clampShotToGround(shot, { x: 0, z: 0 }, null)).toBe(shot)
    expect(clampShotToGround(null, { x: 0, z: 0 }, { w: 10, d: 10 })).toBeNull()
  })
})
