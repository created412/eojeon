import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BOX, MAP_W, MAP_H, PLACES, project, drawGanghwa, CAPTION } from '../../src/ui/ganghwa-map.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

// 캔버스가 없는 Node 에서도 그리기를 통째로 돌려 본다 — 무엇을 그렸는지 받아 적는
// 가짜 2D 문맥이다. 「터지지 않는다」와 「없는 자리에 점을 찍지 않는다」를 본다.
function fakeCtx() {
  const calls = []
  const rec = (name) => (...args) => calls.push([name, ...args])
  return {
    calls,
    set fillStyle(v) { calls.push(['fillStyle', v]) },
    set strokeStyle(v) { calls.push(['strokeStyle', v]) },
    set lineWidth(v) { calls.push(['lineWidth', v]) },
    set lineJoin(v) {}, set lineCap(v) {}, set font(v) {},
    clearRect: rec('clearRect'), fillRect: rec('fillRect'),
    beginPath: rec('beginPath'), closePath: rec('closePath'),
    moveTo: rec('moveTo'), lineTo: rec('lineTo'), arc: rec('arc'),
    fill: rec('fill'), stroke: rec('stroke'), fillText: rec('fillText'),
  }
}

const texts = (c) => c.calls.filter(x => x[0] === 'fillText').map(x => x[1])
const arcs = (c) => c.calls.filter(x => x[0] === 'arc').map(x => ({ x: x[1], y: x[2], r: x[3] }))

describe('강화도 지도 — 좌표', () => {
  it('지도의 네 귀퉁이가 화면의 네 귀퉁이다', () => {
    const nw = project(BOX.lon0, BOX.lat1)
    const se = project(BOX.lon1, BOX.lat0)
    expect(nw.x).toBeCloseTo(0, 6)
    expect(nw.y).toBeCloseTo(0, 6)
    expect(se.x).toBeCloseTo(MAP_W, 6)
    expect(se.y).toBeCloseTo(MAP_H, 6)
  })

  it('북쪽이 위다 — 위도가 높을수록 y 가 작다', () => {
    expect(project(126.5, 37.80).y).toBeLessThan(project(126.5, 37.50).y)
  })

  it('가로세로 비가 실제와 맞는다 — 섬이 옆으로 늘어나지 않는다', () => {
    const lonKm = (BOX.lon1 - BOX.lon0) * 111 * Math.cos((37.64 * Math.PI) / 180)
    const latKm = (BOX.lat1 - BOX.lat0) * 111
    expect(MAP_H / MAP_W).toBeCloseTo(latKm / lonKm, 2)
  })

  it('지도 위의 모든 자리가 화면 안에 있다', () => {
    for (const [id, pl] of Object.entries(PLACES)) {
      if (pl.offmap) continue
      const p = project(pl.lon, pl.lat)
      expect(p.x, `${id}.x`).toBeGreaterThan(0)
      expect(p.x, `${id}.x`).toBeLessThan(MAP_W)
      expect(p.y, `${id}.y`).toBeGreaterThan(0)
      expect(p.y, `${id}.y`).toBeLessThan(MAP_H)
    }
  })

  it('한양은 강화도의 동쪽이고, 초지진은 강화부의 남쪽이다', () => {
    const gb = project(PLACES.ganghwabu.lon, PLACES.ganghwabu.lat)
    const hy = project(PLACES.hanyang.lon, PLACES.hanyang.lat)
    const cj = project(PLACES.chojijin.lon, PLACES.chojijin.lat)
    expect(hy.x).toBeGreaterThan(gb.x)
    expect(cj.y).toBeGreaterThan(gb.y)
  })

  it('평양은 이 지도 밖이라고 스스로 밝힌다 — 경위도를 갖지 않는다', () => {
    expect(PLACES.pyeongyang.offmap).toBeTruthy()
    expect(PLACES.pyeongyang.lon).toBeUndefined()
  })
})

describe('강화도 지도 — 그리기', () => {
  it('표지 없이도 그려지고, 섬 이름과 한양이 적힌다', () => {
    const c = fakeCtx()
    drawGanghwa(c, MAP_W, MAP_H, [])
    const t = texts(c)
    expect(t).toContain('강화도')
    expect(t).toContain('한양')
    expect(t).toContain('한강')
    // 아래 두 줄은 캔버스가 아니라 화면(ui/dispatch-map.js)이 글로 붙인다 —
    // 360px 안에 한 줄로 그리면 잘린다. 그래서 그린 글자 목록에는 없어야 한다.
    expect(t).not.toContain(CAPTION)
  })

  it('지도가 하는 말이 화면에 실제로 붙어 있다 — 캔버스 밖으로 옮기며 잃지 않았다', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'ui', 'dispatch-map.js'), 'utf8')
    expect(src).toContain('CAPTION')
    expect(src).toContain('APPROX')
  })

  it('도착한 장계의 자리에 표지를 찍는다', () => {
    const c = fakeCtx()
    drawGanghwa(c, MAP_W, MAP_H, [{ at: 'chojijin' }])
    expect(texts(c)).toContain('초지진')
    const p = project(PLACES.chojijin.lon, PLACES.chojijin.lat)
    expect(arcs(c).some(a => Math.abs(a.x - p.x) < 0.5 && Math.abs(a.y - p.y) < 0.5)).toBe(true)
  })

  // 없는 자리에 점을 찍으면 「평양이 강화도 옆에 있다」를 가르치게 된다.
  it('지도 밖의 평양은 점이 아니라 위쪽 화살표로만 선다', () => {
    const c = fakeCtx()
    drawGanghwa(c, MAP_W, MAP_H, [{ at: 'pyeongyang' }])
    expect(texts(c).some(s => s.startsWith('평양'))).toBe(true)
    // 표지 원은 반지름 5·11 짜리 둘이다 — 평양만 있으면 그 원이 하나도 없어야 한다
    expect(arcs(c).filter(a => a.r === 5 || a.r === 11)).toHaveLength(0)
  })

  it('모르는 이름은 조용히 지나간다 — 지도가 터지지 않는다', () => {
    const c = fakeCtx()
    expect(() => drawGanghwa(c, MAP_W, MAP_H, [{ at: '없는곳' }])).not.toThrow()
  })
})

describe('장계 데이터와 지도가 같은 이름을 쓴다', () => {
  it('모든 장계의 at 이 지도 위(또는 밖)에 이름으로 실재한다', () => {
    const all = ACTS.flatMap(a => beatsOf(a))
      .filter(b => b.kind === 'dispatch')
      .flatMap(b => b.dispatches ?? [])
    expect(all.length).toBeGreaterThan(0)
    for (const d of all) expect(Object.keys(PLACES), d.id).toContain(d.at)
  })

  it('장계가 부르는 이름과 지도가 아는 이름이 어긋나지 않는다', () => {
    const all = ACTS.flatMap(a => beatsOf(a))
      .filter(b => b.kind === 'dispatch')
      .flatMap(b => b.dispatches ?? [])
    for (const d of all) {
      expect(PLACES[d.at].name, `${d.id} — 장계는 "${d.placeName}", 지도는 "${PLACES[d.at].name}"`)
        .toBe(d.placeName)
    }
  })
})
