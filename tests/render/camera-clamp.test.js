import { describe, it, expect } from 'vitest'
import { PALACES } from '../../src/data/palaces.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// render/scene.js 는 three.js 를 부르므로 여기서 끌어오지 않는다. 대신 그 파일에
// 적힌 수를 글자로 읽어 온다 — 손으로 베껴 적으면 언젠가 어긋난다
// (tests/render/occlusion.test.js 가 실제로 한 번 그렇게 어긋났다).
const sceneSrc = readFileSync(join(process.cwd(), 'src', 'render', 'scene.js'), 'utf8')
const num = name => Number(sceneSrc.match(new RegExp('export const ' + name + ' = ([0-9.]+)'))[1])
const CAM_DIST = num('CAM_DIST')

// 담에서 이만큼은 떨어뜨린다. 담 위 기와가 카메라에 닿지 않을 만큼.
const WALL_MARGIN = 2.2

// ── 카메라를 당기는 장치는 걷어냈다(2026-10-06) ─────────────────────────────
// 10월 5일에 「카메라를 담 안으로 당기기」를 넣었다가 하루 만에 뺐다. 작은 궁의 시작
// 화면을 고치려던 것인데 모든 궁의 대문 앞에서도 걸려, 임금이 대문에 다가가면 화면이
// 머리 꼭대기에서 내려다보는 각으로 뒤집혔다. 이 시험은 그것이 되살아나지 않게 본다.
describe('카메라를 담 안으로 당기지 않는다', () => {
  it('scene.js 에 당기는 장치가 없다', () => {
    // 주석은 걷어 내고 본다 — 주석은 왜 뺐는지를 그 이름으로 설명한다.
    const NL = String.fromCharCode(10)
    const code = sceneSrc.split(NL).filter(l => !l.trim().startsWith('//')).join(NL)
    expect(code).not.toContain('clampShotToGround')
    expect(code).not.toContain('camera-clamp')
  })
})

// ── 시작 자리 자체를 옮겼다(2026-10-05) ────────────────────────────────────
// 근본은 시작 자리가 대문에서 3m 였다는 것 — 그래서 임금을 마당 안쪽에 세우고,
// 아주 작은 터는 카메라 배율도 줄였다(camZoom). 시작 자리에서 카메라가 처음부터 담 안이다.
describe('시작 자리에서 카메라가 처음부터 담 안에 선다', () => {
  for (const [id, def] of Object.entries(PALACES)) {
    if (!def.ground || !def.spawn) continue
    it(`${def.name ?? id}`, () => {
      const scale = def.camZoom ?? 1
      const camZ = def.spawn.z + CAM_DIST * scale
      expect(camZ, `${id}: 시작 자리 + 카메라 거리가 담을 넘는다`)
        .toBeLessThanOrEqual(def.ground.d / 2 - WALL_MARGIN + 1e-9)
    })
  }

  it('배율을 줄인 곳은 작은 터뿐이다 — 큰 궁의 카메라는 건드리지 않았다', () => {
    expect(PALACES.changdeok.camZoom).toBeUndefined()
    expect(PALACES.gyeongbok.camZoom).toBeUndefined()
    expect(PALACES.gyeongu.camZoom).toBeLessThan(1)
  })

  it('scene.js 가 궁의 배율을 실제로 쓴다', () => {
    expect(sceneSrc).toMatch(/activePalace\?\.camZoom/)
  })
})

