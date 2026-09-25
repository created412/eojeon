import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  TRAY_W, TRAY_H, PICK_RADIUS, DEFAULTS, MIX_NOTE, RICE_NUDGE,
  createTray, debrisLeft, isSorted, hitAt, pick, pickAll, summary, countLabel, wageLine,
} from '../../src/systems/grain-tray.js'

// 4막 무위영의 낟알판(2026-09-25 선생님: 「쌀에서 겨와 모래 골라내기」). 화면 없이
// 판정만 잰다 — 캔버스에 무엇이 그려지는지는 사람이 봐야 알지만, 「몇 알이 남았나」
// 「쌀을 눌렀을 때 무슨 일이 나는가」는 여기서 못 박을 수 있다.

const stripComments = src => src.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')
const readSrc = (...parts) => stripComments(readFileSync(join(process.cwd(), 'src', ...parts), 'utf8'))

const debrisOf = tray => tray.grains.filter(g => g.kind !== 'rice')
const riceOf = tray => tray.grains.filter(g => g.kind === 'rice')

describe('낟알판을 짓는다', () => {
  const tray = createTray()

  it('120~150 알 사이다 — 한 화면에 들어오면서 손이 몇 번은 가야 하는 수', () => {
    expect(tray.grains).toHaveLength(DEFAULTS.total)
    expect(DEFAULTS.total).toBeGreaterThanOrEqual(120)
    expect(DEFAULTS.total).toBeLessThanOrEqual(150)
  })

  it('쌀·겨·모래 세 가지뿐이고, 쌀이 가장 많다 — 급료는 쌀이다', () => {
    expect(new Set(tray.grains.map(g => g.kind))).toEqual(new Set(['rice', 'chaff', 'sand']))
    expect(riceOf(tray).length).toBeGreaterThan(debrisOf(tray).length)
  })

  it('겨와 모래의 수는 이 화면이 정한 수 그대로다 — 비율 주장이 아니므로 값이 새지 않는다', () => {
    expect(tray.grains.filter(g => g.kind === 'chaff')).toHaveLength(DEFAULTS.chaff)
    expect(tray.grains.filter(g => g.kind === 'sand')).toHaveLength(DEFAULTS.sand)
    expect(tray.debris).toBe(DEFAULTS.chaff + DEFAULTS.sand)
  })

  it('낟알은 모두 판 안에 있다', () => {
    for (const g of tray.grains) {
      expect(g.x).toBeGreaterThan(0)
      expect(g.x).toBeLessThan(TRAY_W)
      expect(g.y).toBeGreaterThan(0)
      expect(g.y).toBeLessThan(TRAY_H)
    }
  })

  it('겨와 모래가 여러 줄에 흩어져 있다 — 한 곳만 문질러서 끝나지 않는다', () => {
    const rows = new Set(debrisOf(tray).map(g => Math.floor(g.y / (TRAY_H / 9))))
    expect(rows.size).toBeGreaterThan(3)
  })

  it('같은 seed 면 같은 판, 다른 seed 면 다른 판이다', () => {
    const a = createTray({ seed: 7 })
    const b = createTray({ seed: 7 })
    const c = createTray({ seed: 8 })
    expect(a.grains.map(g => g.kind)).toEqual(b.grains.map(g => g.kind))
    expect(a.grains[0].x).toBe(b.grains[0].x)
    expect(a.grains.map(g => g.kind)).not.toEqual(c.grains.map(g => g.kind))
  })

  it('겨와 모래가 쌀보다 많은 판은 지을 수 없다', () => {
    expect(() => createTray({ total: 20, chaff: 15, sand: 10 })).toThrow()
  })
})

describe('집는다', () => {
  const tray = createTray()
  const chaff = tray.grains.find(g => g.kind === 'chaff')
  const sand = tray.grains.find(g => g.kind === 'sand')
  const rice = tray.grains.find(g => g.kind === 'rice')

  it('누른 자리에서 가장 가까운 낟알을 집는다', () => {
    expect(hitAt(tray, chaff.x, chaff.y).id).toBe(chaff.id)
    // 반지름 안에서 조금 비껴 눌러도 잡힌다 — 손가락은 낟알보다 굵다
    expect(hitAt(tray, chaff.x + PICK_RADIUS * 0.4, chaff.y).id).toBe(chaff.id)
  })

  it('낟알이 없는 자리는 빈손이다', () => {
    expect(hitAt(tray, -50, -50)).toBeNull()
  })

  it('겨와 모래는 판에서 빠진다', () => {
    const one = pick(tray, chaff.id)
    expect(one.taken).toBe(true)
    expect(one.kind).toBe('chaff')
    expect(debrisLeft(one.tray)).toBe(debrisLeft(tray) - 1)
    const two = pick(one.tray, sand.id)
    expect(two.kind).toBe('sand')
    expect(debrisLeft(two.tray)).toBe(debrisLeft(tray) - 2)
  })

  it('쌀은 집히지 않고 벌하지도 않는다 — 한 줄 알려 줄 뿐이다', () => {
    const one = pick(tray, rice.id)
    expect(one.taken).toBe(false)
    expect(one.kind).toBe('rice')
    expect(one.tray.grains).toHaveLength(tray.grains.length)
    expect(debrisLeft(one.tray)).toBe(debrisLeft(tray))
    expect(RICE_NUDGE).toContain('쌀')
  })

  it('같은 알을 두 번 집어도, 없는 알을 집어도 안전하다 — 쓸면 같은 알에 여러 번 닿는다', () => {
    const one = pick(tray, chaff.id)
    const again = pick(one.tray, chaff.id)
    expect(again.taken).toBe(false)
    expect(debrisLeft(again.tray)).toBe(debrisLeft(one.tray))
    expect(pick(tray, 'g없는것').taken).toBe(false)
  })

  it('집어낸 알은 다시 잡히지 않는다', () => {
    const one = pick(tray, chaff.id).tray
    expect(hitAt(one, chaff.x, chaff.y)?.id).not.toBe(chaff.id)
  })

  it('판은 그 자리에서 고쳐지지 않는다 — 처음 판은 그대로 남는다', () => {
    const before = debrisLeft(tray)
    pick(tray, chaff.id)
    expect(debrisLeft(tray)).toBe(before)
  })
})

describe('다 골라냈는가', () => {
  it('처음에는 겨와 모래만큼 남아 있고, 다 집으면 끝난다', () => {
    let tray = createTray()
    expect(debrisLeft(tray)).toBe(tray.debris)
    expect(isSorted(tray)).toBe(false)
    for (const g of tray.grains.filter(x => x.kind !== 'rice')) tray = pick(tray, g.id).tray
    expect(debrisLeft(tray)).toBe(0)
    expect(isSorted(tray)).toBe(true)
  })

  it('쌀을 다 눌러도 끝나지 않는다 — 끝나는 조건은 겨와 모래뿐이다', () => {
    let tray = createTray()
    for (const g of tray.grains.filter(x => x.kind === 'rice')) tray = pick(tray, g.id).tray
    expect(isSorted(tray)).toBe(false)
  })

  // 손가락이 마음대로 움직이지 않는 학생이 이 화면에서 갇히면 그 자리에서 수업이 멈춘다.
  it('건너뛰면 겨와 모래가 한 번에 빠지고, 쌀은 한 알도 잃지 않는다', () => {
    const tray = createTray()
    const skipped = pickAll(tray)
    expect(isSorted(skipped)).toBe(true)
    expect(skipped.grains.filter(g => !g.removed)).toHaveLength(tray.total - tray.debris)
    expect(skipped.grains.filter(g => !g.removed).every(g => g.kind === 'rice')).toBe(true)
  })

  it('판은 시작보다 눈에 띄게 비어야 한다 — 남은 알이 처음보다 적다', () => {
    const tray = createTray()
    expect(summary(pickAll(tray)).left).toBeLessThan(tray.total)
    expect(summary(pickAll(tray)).left).toBe(tray.total - tray.debris)
  })
})

describe('화면에 나가는 말', () => {
  it('남은 수를 센다 — 시간이 아니라 알 수다', () => {
    const tray = createTray()
    expect(countLabel(tray)).toContain(`${tray.debris}`)
    expect(countLabel(pickAll(tray))).toBe('겨와 모래를 다 골라냈다')
    expect(countLabel(tray)).not.toMatch(/초|분|남은 시간/)
  })

  it('남은 것이 「쌀」이 아니라 「열세 달치 급료」라고 말한다 — 이 화면의 전부다', () => {
    const tray = pickAll(createTray())
    const line = wageLine(tray)
    expect(line).toContain('열세 달')
    expect(line).toContain('급료')
    expect(line).toContain(`${summary(tray).chaff}`)
  })

  it('건너뛴 학생에게 「네가 골라냈다」고 하지 않는다', () => {
    const tray = pickAll(createTray())
    expect(wageLine(tray, false)).not.toBe(wageLine(tray, true))
    expect(wageLine(tray, false)).toContain('열세 달')
  })

  // ⚠ 이 줄이 무너지면 재구성이 사실로 읽힌다(prices.js 의 절대 쌀값 금지와 같은 자리).
  it('비율을 주장하지 않는다고 화면이 직접 적는다', () => {
    expect(MIX_NOTE).toContain('비율을 나타낸 것은 아닙니다')
    expect(MIX_NOTE).toContain('재구성')
  })
})

describe('이 파일에는 시계가 없다 — 촉박은 C1·C2·C3 세 번뿐이다', () => {
  it('시간을 재는 것이 한 줄도 없다', () => {
    const src = readSrc('systems', 'grain-tray.js')
    expect(src).not.toMatch(/setTimeout|setInterval|Date\.now|performance\.now|requestAnimationFrame/)
  })

  it('절대 쌀값을 다루지 않는다 — 값은 알 수뿐이다', () => {
    expect(readSrc('systems', 'grain-tray.js')).not.toMatch(/냥|섬당|쌀값/)
  })
})
