import { it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { SCENE_ART } from '../../src/ui/scene-art-data.js'

// 2026-09-17 — 장계의 배(이양선·미국 함대·운요호), 외규장각 약탈, 종로 쌀가게를 그림으로 본다.
// 모두 Higgsfield 로 그린 재구성 그림이다. 그 사실을 캡션이 반드시 말해야 한다.

function allArtKeys() {
  const keys = []
  const walk = v => {
    if (Array.isArray(v)) return v.forEach(walk)
    if (v && typeof v === 'object') {
      if (typeof v.art === 'string') keys.push(v.art)
      Object.values(v).forEach(walk)
    }
  }
  walk(ACTS)
  return keys
}

it('대본이 부르는 그림은 모두 실려 있다', () => {
  const keys = allArtKeys()
  expect(keys).toEqual(expect.arrayContaining(['fleet-1866', 'plunder-1866', 'fleet-1871', 'unyo-1875']))
  for (const k of keys) expect(SCENE_ART[k], k).toBeTruthy()
  expect(SCENE_ART.market).toBeTruthy()          // 4막 종로 — ui/ration.js 가 직접 부른다
})

it('그림마다 재구성이라고 캡션에 적고, 대체 글이 있다', () => {
  for (const [k, art] of Object.entries(SCENE_ART)) {
    expect(art.src.startsWith('data:image/webp;base64,'), k).toBe(true)
    expect(art.caption, k).toContain('재구성')
    expect(art.alt.length, k).toBeGreaterThan(8)
  }
})

it('배 그림은 그 해의 장계에 붙는다 — 1866 프랑스, 1871 미국, 1875 운요호', () => {
  const dispatches = ACTS.flatMap(a => a.beats).filter(b => b.kind === 'dispatch').flatMap(b => b.dispatches)
  const art = id => dispatches.find(d => d.id === id)?.art
  expect(art('by1')).toBe('fleet-1866')
  expect(art('sn1')).toBe('fleet-1871')
  expect(art('un1')).toBe('unyo-1875')
})
