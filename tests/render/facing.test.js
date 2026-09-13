import { describe, it, expect } from 'vitest'
import { wrapAngle, viewForRelYaw, uvForFrame, billboardAngles } from '../../src/render/facing.js'

const deg = d => (d * Math.PI) / 180

describe('wrapAngle', () => {
  it('-π..π 로 접는다', () => {
    expect(wrapAngle(0)).toBeCloseTo(0)
    expect(wrapAngle(deg(370))).toBeCloseTo(deg(10))
    expect(wrapAngle(deg(-370))).toBeCloseTo(deg(-10))
    expect(wrapAngle(deg(200))).toBeCloseTo(deg(-160))
  })
  it('여러 바퀴를 돌아도 같은 각을 낸다', () => {
    for (const turns of [-3, -1, 1, 4]) {
      expect(wrapAngle(deg(37) + turns * Math.PI * 2)).toBeCloseTo(deg(37))
    }
  })
})

describe('viewForRelYaw — 카메라가 어디 있느냐로 그림을 고른다', () => {
  it('정면이면 앞모습, 뒤집지 않는다', () => {
    for (const d of [-29, -10, 0, 10, 29]) {
      expect(viewForRelYaw(deg(d))).toEqual({ view: 'front', mirror: false })
    }
  })

  it('등 뒤면 뒷모습, 뒤집지 않는다', () => {
    for (const d of [136, 170, 180, -170, -136]) {
      expect(viewForRelYaw(deg(d)).view).toBe('back')
      expect(viewForRelYaw(deg(d)).mirror).toBe(false)
    }
  })

  it('비스듬·옆모습은 좌우로 갈리고, 한쪽만 뒤집는다', () => {
    expect(viewForRelYaw(deg(50))).toEqual({ view: 'three_q', mirror: true })
    expect(viewForRelYaw(deg(-50))).toEqual({ view: 'three_q', mirror: false })
    expect(viewForRelYaw(deg(100))).toEqual({ view: 'side', mirror: true })
    expect(viewForRelYaw(deg(-100))).toEqual({ view: 'side', mirror: false })
  })

  it('한 바퀴를 돌면 여섯 가지가 다 나오고, 되돌아오면 처음과 같다', () => {
    const seen = new Set()
    for (let d = -180; d < 180; d += 3) {
      const { view, mirror } = viewForRelYaw(deg(d))
      seen.add(`${view}${mirror ? '-m' : ''}`)
    }
    expect([...seen].sort()).toEqual(
      ['back', 'front', 'side', 'side-m', 'three_q', 'three_q-m'].sort()
    )
    expect(viewForRelYaw(deg(20))).toEqual(viewForRelYaw(deg(20) + Math.PI * 2))
  })

  // 경계에서 그림이 두 칸씩 건너뛰면 인물이 홱홱 튄다.
  it('각이 조금 변하면 그림도 한 단계씩만 변한다', () => {
    const order = ['front', 'three_q', 'side', 'back']
    let prev = viewForRelYaw(deg(-180))
    for (let d = -180; d <= 180; d += 1) {
      const cur = viewForRelYaw(deg(d))
      const gap = Math.abs(order.indexOf(cur.view) - order.indexOf(prev.view))
      expect(gap).toBeLessThanOrEqual(1)
      prev = cur
    }
  })
})

describe('uvForFrame', () => {
  const frame = [128, 256, 128, 256]   // 둘째 열·둘째 행 (실제 아틀라스 규격)

  it('아틀라스 화소 좌표를 0..1 로 옮기고, v 를 뒤집는다', () => {
    const uv = uvForFrame(frame, 512, 1536)
    // Float32Array 라 값이 정확히 같지는 않다 — 자릿수로 견준다.
    const want = [
      0.25, 1 - 256 / 1536,
      0.5,  1 - 256 / 1536,
      0.25, 1 - 512 / 1536,
      0.5,  1 - 512 / 1536,
    ]
    expect(uv).toHaveLength(8)
    want.forEach((n, i) => expect(uv[i]).toBeCloseTo(n, 6))
  })

  it('뒤집으면 u 두 개만 자리를 바꾼다 — v 는 그대로다', () => {
    const a = uvForFrame(frame, 512, 1536, false)
    const b = uvForFrame(frame, 512, 1536, true)
    expect(b[0]).toBe(a[2]); expect(b[2]).toBe(a[0])
    expect(b[4]).toBe(a[6]); expect(b[6]).toBe(a[4])
    expect(b[1]).toBe(a[1]); expect(b[7]).toBe(a[7])
  })

  it('모든 좌표가 0..1 안에 있다', () => {
    for (const f of [[0, 0, 128, 256], [384, 1280, 128, 256]]) {
      for (const n of uvForFrame(f, 512, 1536, true)) {
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('billboardAngles — 눕혀서 발을 바닥에 붙인다', () => {
  const at = { x: 0, y: 0, z: 0 }

  it('카메라가 +Z 쪽 위에 있으면 판이 그쪽으로 돌고 뒤로 눕는다', () => {
    const { yaw, pitch } = billboardAngles({ x: 0, y: 30, z: 34 }, at)
    expect(yaw).toBeCloseTo(0)
    expect(pitch).toBeCloseTo(-Math.atan2(30, 34))
    expect(pitch).toBeLessThan(0)          // 뒤로 눕는다
  })

  it('카메라가 옆으로 돌면 yaw 가 따라 돈다', () => {
    expect(billboardAngles({ x: 34, y: 30, z: 0 }, at).yaw).toBeCloseTo(Math.PI / 2)
    expect(billboardAngles({ x: 0, y: 30, z: -34 }, at).yaw).toBeCloseTo(Math.PI)
  })

  it('눈높이에서 보면 눕지 않는다', () => {
    expect(billboardAngles({ x: 0, y: 0, z: 34 }, at).pitch).toBeCloseTo(0)
  })

  it('바로 위에서 내려다봐도 터지지 않는다', () => {
    const { pitch } = billboardAngles({ x: 0, y: 30, z: 0 }, at)
    expect(Number.isFinite(pitch)).toBe(true)
    expect(pitch).toBeCloseTo(-Math.PI / 2)
  })

  // 이 게임의 카메라는 인물을 늘 같은 각도에서 본다(scene.js: 높이 30, 거리 34).
  // 그 각도에서 판이 카메라를 정면으로 마주 보는지 — 안 그러면 그림이 눌려 보인다.
  it('이 게임의 카메라 각(약 41도)에서 판이 카메라를 마주 본다', () => {
    const { pitch } = billboardAngles({ x: 5, y: 30, z: 5 + 34 }, { x: 5, y: 0, z: 5 })
    expect((-pitch * 180) / Math.PI).toBeCloseTo(41.4, 1)
  })
})
