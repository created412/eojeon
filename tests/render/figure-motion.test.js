import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// 선생님(2026-10-08): 「게임 속 캐릭터 움직임이 하나도 반영안되고 걷는 느낌이 안나게 올라갔어 … 갤럭시북5에서는
// 구현되어보이는데 다른 컴퓨터에서는 안되어보이네?」
//
// 그 컴퓨터는 Windows 의 「애니메이션 효과」가 꺼져 있었다. 그러면 Chrome 이 prefers-reduced-motion 을 켜고,
// scene.js 는 그 값을 인물(updateSway · palaceLife · palaceStaff · gateGuards · crisis)에게까지 넘겨 걸음·숨을
// 전부 지웠다 — 사람이 다리를 뻣뻣하게 편 채 미끄러져 다녔다. 걸음은 장식이 아니라 내용이다. 정지 선호는
// 카메라·먼지·불꽃·표식 같은 장식에만 남긴다.
const src = readFileSync(new URL('../../src/render/scene.js', import.meta.url), 'utf8')

describe('인물의 걸음은 정지 선호(prefers-reduced-motion)에 묶이지 않는다', () => {
  it('scene.js 는 figuresStill 상수를 두고, 그것은 false 다', () => {
    expect(src).toMatch(/const figuresStill = false/)
  })
  it('인물을 움직이는 호출에는 reducedMotion 대신 figuresStill 을 넘긴다', () => {
    const figureCalls = [...src.matchAll(/updateSway\([^)]*\{[^}]*\}/g)].map(m => m[0])
    expect(figureCalls.length).toBeGreaterThanOrEqual(2)          // 임금 + 신하
    for (const call of figureCalls) {
      expect(call).toMatch(/reducedMotion: figuresStill/)
      expect(call).not.toMatch(/reducedMotion[,}\s]/)
    }
    expect(src).toMatch(/gateGuards\.tick\(dt, \{ reducedMotion: figuresStill \}\)/)
    expect(src).toMatch(/palaceLife\.tick\(\{[^}]*reducedMotion: figuresStill \}\)/)
    expect(src).toMatch(/palaceStaff\.tick\([\s\S]{0,200}?reducedMotion: figuresStill,/)
    expect(src).toMatch(/crisis\.update\(crisisStage, t, figuresStill\)/)
  })
  it('장식 움직임(카메라·먼지·불꽃·표식)은 여전히 정지 선호를 따른다', () => {
    expect(src).toMatch(/fire\.update\(t, reducedMotion\)/)
    expect(src).toMatch(/atmosphere\.update\(t, player\.position, reducedMotion\)/)
    expect(src).toMatch(/\(snapCamera \|\| dragging \|\| reducedMotion\)/)
  })
})
