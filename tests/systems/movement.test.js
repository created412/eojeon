import { describe, it, expect } from 'vitest'
import { step, axisToward } from '../../src/systems/movement.js'
import { createState } from '../../src/core/state.js'

// step() 은 main.js 가 export 하는 순수 이동 함수다.
// ctx.player.position 은 직접 mutate 되고, 반환값은 새/같은 state 다.
function makeInput({ x = 0, z = 0, running = false } = {}) {
  return { axis: () => ({ x, z }), running: () => running }
}

describe('step() — 이동', () => {
  it('조작권이 D 면 위치가 그대로고 같은 state 객체를 돌려준다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 0 } } }
    const input = makeInput({ x: 1, z: 0 })
    const state = { ...createState(), control: 'D' }
    const result = step(ctx, input, state, 16)
    expect(result).toBe(state)
    expect(ctx.player.position).toEqual({ x: 0, y: 0, z: 0 })
  })

  // 조작권 D 장면(Task 12)은 그 자체로 「고장났나」 싶은 화면이다. 앞 비트를 잠긴 방에
  // 밀어붙인 채로 끝냈으면 blocked 가 그대로 남아, 아예 못 움직이는 그 화면 내내
  // 「임금이 갈 수 있는 곳은 정해져 있다」 배너가 되풀이된다 — 「길이 정해져 있다」와
  // 「아예 못 움직인다」가 섞인다(Task 12 리뷰 Minor 4).
  it('조작권이 D 면 앞 장면에서 남은 blocked 를 지운다 — 막힘 배너가 되풀이되지 않는다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 0 } } }
    const state = { ...createState(), control: 'D', blocked: 'daejojeon' }
    const result = step(ctx, makeInput({ x: 1, z: 0 }), state, 16)
    expect(result.blocked).toBeFalsy()
    expect(ctx.player.position).toEqual({ x: 0, y: 0, z: 0 })   // 여전히 한 걸음도 안 간다
  })

  it('조작권이 C 면 빈 마당에서 움직인다', () => {
    // 창덕궁 스폰 지점(0,46)은 어느 방에도 속하지 않는 빈 마당이다
    const ctx = { player: { position: { x: 0, y: 0, z: 46 } } }
    const input = makeInput({ x: 1, z: 0 })
    const state = { ...createState(), control: 'C' }
    step(ctx, input, state, 100)
    expect(ctx.player.position.x).toBeGreaterThan(0)
  })

  it('조작권 C 로는 바깥에서 대조전(minControl B)에 들어갈 수 없다', () => {
    // 대조전(2단계 압축 배치): x:-3, z:-24, w:16, d:12 → z 범위 [-30,-18]. z:-16 은 바깥이다.
    const ctx = { player: { position: { x: -3, y: 0, z: -16 } } }
    const input = makeInput({ x: 0, z: -1 })
    const state = { ...createState(), control: 'C' }
    const result = step(ctx, input, state, 1000)
    expect(ctx.player.position).toEqual({ x: -3, y: 0, z: -16 })
    expect(result.blocked).toBe('daejojeon')
  })

  it('잠긴 방 거절은 state.blocked 로 호출자에게 알려진다 (배너는 main.js 가 띄운다)', () => {
    const ctx = { player: { position: { x: -3, y: 0, z: -16 } } }
    const input = makeInput({ x: 0, z: -1 })
    const state = { ...createState(), control: 'C' }
    expect(state.blocked).toBeFalsy()

    const r1 = step(ctx, input, state, 1000)
    expect(r1.blocked).toBe('daejojeon')

    // 같은 방을 계속 밀면 같은 참조를 돌려준다 — 매 프레임 새 객체를 만들지 않는다
    const r2 = step(ctx, input, r1, 1000)
    expect(r2).toBe(r1)

    // 키를 떼면(무입력) blocked 가 지워진다
    const idle = makeInput({ x: 0, z: 0 })
    const r3 = step(ctx, idle, r2, 1000)
    expect(r3.blocked).toBeFalsy()

    // 이동에 성공하면 blocked 가 지워진다 — 이미 대조전 안(중심)에 있으면 같은 방
    // 안에서의 이동은 조작권과 무관하게 막히지 않는다
    const ctx2 = { player: { position: { x: -3, y: 0, z: -24 } } }
    const openState = { ...createState(), control: 'C', blocked: 'daejojeon' }
    const r4 = step(ctx2, makeInput({ x: 1, z: 0 }), openState, 16)
    expect(r4.blocked).toBeFalsy()
  })

  it('A 에서 대조전에 들어간 뒤 C 로 떨어져도 계속 움직이고 나갈 수 있다 (잠금 탈출 회귀 방지)', () => {
    // 1) A 로 대조전 안(중심)에서 살짝 움직여 state.room 을 확정한다
    const ctx = { player: { position: { x: -3, y: 0, z: -24 } } }
    let state = { ...createState(), control: 'A' }
    state = step(ctx, makeInput({ x: 1, z: 0 }), state, 16)
    expect(state.room).toBe('daejojeon')

    // 2) 조작권이 C 로 떨어진다 — 대조전은 이제 잠긴다 (RANK C(1) < B(2))
    state = { ...state, control: 'C' }

    // 3) 방 안에서는 계속 움직일 수 있어야 한다 (같은 방으로의 이동은 막히지 않는다)
    const beforeX = ctx.player.position.x
    state = step(ctx, makeInput({ x: 1, z: 0 }), state, 16)
    expect(ctx.player.position.x).toBeGreaterThan(beforeX)

    // 4) 방을 완전히 벗어나 빈 마당으로도 나갈 수 있어야 한다.
    // **문으로 나간다** — 이제 벽을 뚫지 못한다(선생님 지적 9번). 대조전의 문은
    // 앞면(+z) 가운데다. 실제 게임처럼 작은 걸음을 여러 번 밟는다 — 한 번에 2초를
    // 밟으면 방 하나를 통째로 건너뛰어 문을 지나칠 수 없다.
    ctx.player.position.x = -3          // 문 폭 가운데
    for (let i = 0; i < 200; i++) state = step(ctx, makeInput({ x: 0, z: 1 }), state, 16)
    expect(ctx.player.position.z).toBeGreaterThan(-18)   // 대조전 z 범위는 -30~-18
    expect(state.room).not.toBe('daejojeon')
  })

  it('벽으로는 나갈 수 없다 — 문이 아닌 쪽으로 밀면 방 안에 남는다', () => {
    const ctx = { player: { position: { x: -3, y: 0, z: -24 } } }
    let state = { ...createState(), control: 'A' }
    state = step(ctx, makeInput({ x: 1, z: 0 }), state, 16)
    expect(state.room).toBe('daejojeon')

    // 옆(-x)은 벽이다. 오래 밀어도 방을 못 벗어난다 — 벽까지 가서 멈춘다.
    for (let i = 0; i < 200; i++) state = step(ctx, makeInput({ x: -1, z: 0 }), state, 16)
    expect(state.room).toBe('daejojeon')
    expect(ctx.player.position.x).toBeGreaterThan(-11)   // 대조전 x 범위 안에 남아 있다
  })

  it('문 앞이 아니면 방에 들어가지도 못한다', () => {
    // 대조전 뒤쪽(-z)에서 방을 향해 밀면 뒷벽이라 못 들어간다.
    const ctx = { player: { position: { x: -3, y: 0, z: -33 } } }
    let state = { ...createState(), control: 'A' }
    for (let i = 0; i < 200; i++) state = step(ctx, makeInput({ x: 0, z: 1 }), state, 16)
    expect(ctx.player.position.z).toBeLessThan(-24-12*.72/2-.55) // 실제 뒷벽과 몸 반경
  })

  it('플레이어는 궁궐 지면 경계 안으로 클램프된다', () => {
    // 창덕궁 ground(2단계 압축 배치): w76,d80 → half = w/2-2=36, d/2-2=38
    const ctx = { player: { position: { x: 0, y: 0, z: 22.5 } } }
    const input = makeInput({ x: 1, z: 0 })
    const state = { ...createState(), control: 'C' }
    step(ctx, input, state, 1000000)
    expect(ctx.player.position.x).toBeLessThanOrEqual(36)
    expect(ctx.player.position.x).toBeGreaterThan(0)
  })
})

// 태블릿 탭 이동 — main.js 는 매 고정 스텝마다 axisToward() 로 목표를 향한
// 축을 계산해 step() 에 그대로 먹인다(두 번째 이동 경로를 만들지 않는다).
// 여기서는 그 축 계산 자체가 step() 을 통해 키보드와 똑같이 동작함을 검증한다.
function tapInput(ctx, target) {
  return { axis: () => axisToward(ctx.player.position.x, ctx.player.position.z, target), running: () => false }
}

describe('step() — 태블릿 탭 이동', () => {
  it('탭 목표를 향해 한 스텝 나아간다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 22.5 } } }
    const target = { x: 10, z: 22.5 }
    const state = { ...createState(), control: 'C' }
    step(ctx, tapInput(ctx, target), state, 500)
    expect(ctx.player.position.x).toBeGreaterThan(0)
    expect(ctx.player.position.x).toBeLessThanOrEqual(10)
  })

  it('여러 스텝에 걸쳐 목표에 다가가 도착 반경 안에서 멈춘다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 22.5 } } }
    const target = { x: 10, z: 22.5 }
    let state = { ...createState(), control: 'C' }
    for (let i = 0; i < 200; i++) {
      state = step(ctx, tapInput(ctx, target), state, 16)
    }
    const dist = Math.hypot(ctx.player.position.x - target.x, ctx.player.position.z - target.z)
    expect(dist).toBeLessThanOrEqual(1.5)
  })

  it('도착 반경 안에 이미 있으면 axisToward 가 0 벡터를 주고 step() 은 더 움직이지 않는다', () => {
    const ctx = { player: { position: { x: 9.5, y: 0, z: 22.5 } } }
    const target = { x: 10, z: 22.5 }
    const state = { ...createState(), control: 'C' }
    const result = step(ctx, tapInput(ctx, target), state, 500)
    expect(result).toBe(state)
    expect(ctx.player.position).toEqual({ x: 9.5, y: 0, z: 22.5 })
  })

  it('조작권 D 에서는 탭 목표가 있어도 전혀 움직이지 않는다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 22.5 } } }
    const target = { x: 10, z: 22.5 }
    const state = { ...createState(), control: 'D' }
    const result = step(ctx, tapInput(ctx, target), state, 500)
    expect(result).toBe(state)
    expect(ctx.player.position).toEqual({ x: 0, y: 0, z: 22.5 })
  })

  it('탭 목표가 잠긴 방 안이면 들어가지 못하고 무엇에 막혔는지 알린다', () => {
    // 잠긴 방이든 벽이든, 학생이 알아야 할 것은 「들어가지 못했다」는 사실이다.
    // 벽 판정이 생긴 뒤로는 잠긴 방에 닿기 전에 벽에 먼저 막히는 길도 있다 —
    // 그래서 막힌 까닭의 이름을 못 박지 않고, 못 들어갔다는 것만 붙든다.
    const ctx = { player: { position: { x: -3, y: 0, z: 6 } } }
    let state = { ...createState(), control: 'C' }   // C 에서 대조전(B)은 잠긴다
    const to = { x: -3, z: -24 }
    for (let i = 0; i < 400; i++) {
      state = step(ctx, makeInput(axisToward(ctx.player.position.x, ctx.player.position.z, to)), state, 16)
    }
    expect(state.room).not.toBe('daejojeon')
    expect(state.blocked).toBeTruthy()
  })
})

describe('step() — 알현 중에는 그 방 안에서만', () => {
  // 인정전: x:0, z:12, w:22, d:18 — 문은 앞면(+z) 가운데다. 방 안 (0,14)에서 문 쪽으로 오래 민다.
  it('confineRoom 이면 문밖으로 나가지 못하고 confine 으로 알린다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 14 } } }
    let s = { ...createState(), control: 'C', room: 'injeongjeon' }
    for (let i = 0; i < 40; i++) s = step(ctx, makeInput({ x: 0, z: 1 }), s, 100, { confineRoom: 'injeongjeon' })
    expect(ctx.player.position.z).toBeLessThanOrEqual(21)
    expect(s.blocked).toBe('confine:injeongjeon')
  })
  it('confineRoom 이어도 방 안에서는 움직인다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 14 } } }
    const s = { ...createState(), control: 'C', room: 'injeongjeon' }
    step(ctx, makeInput({ x: 1, z: 0 }), s, 100, { confineRoom: 'injeongjeon' })
    expect(ctx.player.position.x).toBeGreaterThan(0)
  })
  it('confineRoom 이 없으면 문으로 나간다 — 아룀이 끝난 뒤', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 14 } } }
    let s = { ...createState(), control: 'C', room: 'injeongjeon' }
    for (let i = 0; i < 40; i++) s = step(ctx, makeInput({ x: 0, z: 1 }), s, 100)
    expect(ctx.player.position.z).toBeGreaterThan(21)
  })
})
