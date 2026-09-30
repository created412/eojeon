import { describe, it, expect } from 'vitest'
import {
  initialBoard, levy, mint, raise, price, canLevy, canRaise, isDone,
  levyYield, villageState, emptyVillages, priceTimes, levyLeft, nudgeFor, summaryLine,
  BAYS, VILLAGES, LEVY_YIELDS, MINT_COIN, PRICE_BASE, PRICE_PER_MINT,
  LEVY_TOTAL, BASE_TOTAL, FIRST_MINT_LINE, FIRST_LEVY_LINE, EMPTY_LINE, PRICE_UP_LINE,
} from '../../src/systems/rebuild.js'

// 선생님(2026-09-30): 「전혀 재미없고 … 무슨 게임 하는 건지도 모르겠어.
// 더 직관적으로 게임을 다시 만들어 봐 새롭게.」

describe('하는 일이 한 문장이다 — 걷거나 찍어서, 한 채씩 올린다', () => {
  it('처음에는 아무것도 없다', () => {
    const b = initialBoard()
    expect(b.coin).toBe(0)
    expect(b.bays).toBe(0)
    expect(b.mints).toBe(0)
    expect(b.levies).toHaveLength(VILLAGES)
  })

  it('고을에서 걷으면 돈이 들어온다', () => {
    const b = levy(initialBoard(), 0)
    expect(b.coin).toBe(LEVY_YIELDS[0])
  })

  it('찍으면 돈이 들어온다', () => {
    expect(mint(initialBoard()).coin).toBe(MINT_COIN)
  })

  it('돈이 모이면 한 채를 올린다 — 그만큼 돈이 나간다', () => {
    let b = initialBoard()
    while (b.coin < price(b)) b = mint(b)
    const before = b.coin, p = price(b)
    b = raise(b)
    expect(b.bays).toBe(1)
    expect(b.coin).toBe(before - p)
  })

  it('돈이 모자라면 올릴 수 없다 — 조용히 넘어가지 않는다', () => {
    const b = initialBoard()
    expect(canRaise(b)).toBe(false)
    expect(raise(b)).toEqual(b)
  })

  it('열 채를 올리면 끝난다', () => {
    let b = initialBoard()
    for (let i = 0; i < 400 && !isDone(b); i++) b = canRaise(b) ? raise(b) : mint(b)
    expect(isDone(b)).toBe(true)
    expect(b.bays).toBe(BAYS)
  })
})

describe('고을은 다시 차지 않는다', () => {
  it('두 번째는 적게 낸다', () => {
    const b = initialBoard()
    expect(levyYield(b, 0)).toBe(LEVY_YIELDS[0])
    expect(levyYield(levy(b, 0), 0)).toBe(LEVY_YIELDS[1])
    expect(LEVY_YIELDS[1]).toBeLessThan(LEVY_YIELDS[0])
  })

  it('다 걷은 고을에서는 아무것도 안 나온다', () => {
    let b = initialBoard()
    for (let i = 0; i < LEVY_YIELDS.length; i++) b = levy(b, 0)
    expect(canLevy(b, 0)).toBe(false)
    const after = levy(b, 0)
    expect(after.coin).toBe(b.coin)
  })

  it('걷을수록 고을의 꼴이 바뀐다 — 그림이 말해 준다', () => {
    let b = initialBoard()
    expect(villageState(b, 0)).toBe('calm')
    b = levy(b, 0); expect(villageState(b, 0)).toBe('levied')
    b = levy(b, 0); expect(villageState(b, 0)).toBe('empty')
  })

  it('비어 버린 고을을 센다', () => {
    let b = initialBoard()
    for (let i = 0; i < LEVY_YIELDS.length; i++) b = levy(b, 3)
    expect(emptyVillages(b)).toBe(1)
    expect(levyLeft(b)).toBe(VILLAGES - 1)
  })
})

describe('찍으면 값이 오른다 — 이 한 줄이 이 판의 전부다', () => {
  it('찍기 전에는 값이 그대로다', () => {
    let b = initialBoard()
    b = levy(b, 0); b = levy(b, 1)
    expect(price(b)).toBe(PRICE_BASE)
  })

  it('한 번 찍을 때마다 값이 오른다', () => {
    let b = initialBoard()
    for (let n = 1; n <= 5; n++) {
      b = mint(b)
      expect(price(b)).toBe(PRICE_BASE + PRICE_PER_MINT * n)
    }
  })

  it('이미 올린 채를 도로 빼앗지 않는다 — 값이 올라도 공사는 그대로다', () => {
    // 예전 판이 여기서 부러졌다. 물가가 오르자 **이미 채운 칸이 줄었다** —
    // 겪는 일로 치면 「내 돈이 사라졌다」이고, 그런 일은 일어나지 않는다.
    let b = initialBoard()
    while (!canRaise(b)) b = mint(b)
    b = raise(b)
    const bays = b.bays
    for (let i = 0; i < 6; i++) b = mint(b)
    expect(b.bays).toBe(bays)
  })

  it('처음의 몇 배가 되었는지 셀 수 있다', () => {
    let b = initialBoard()
    expect(priceTimes(b)).toBe(1)
    b = mint(b)
    expect(priceTimes(b)).toBeCloseTo((PRICE_BASE + PRICE_PER_MINT) / PRICE_BASE, 6)
  })
})

describe('다 걷어도 모자란다 — 반드시 찍게 된다', () => {
  it('고을에서 걷을 수 있는 것을 다 걷어도 열 채를 못 올린다', () => {
    expect(LEVY_TOTAL).toBeLessThan(BASE_TOTAL)
  })

  it('실제로 다 걷고 나서 세어 보면 모자란다', () => {
    let b = initialBoard()
    for (let i = 0; i < VILLAGES; i++) for (let k = 0; k < LEVY_YIELDS.length; k++) b = levy(b, i)
    expect(levyLeft(b)).toBe(0)
    let built = 0
    while (canRaise(b)) { b = raise(b); built++ }
    expect(built).toBeLessThan(BAYS)
    expect(isDone(b)).toBe(false)
  })
})

describe('아무도 갇히지 않는다', () => {
  // 가로막는 판을 두는 이상 이것이 가장 중요하다. 못 끝내는 판이면 학생이 영영 갇힌다.
  it('한 번 찍어 들어오는 것이 그때 오르는 값보다 크다', () => {
    expect(MINT_COIN).toBeGreaterThan(PRICE_PER_MINT)
  })

  it('고을을 하나도 안 건드려도 찍기만으로 끝낼 수 있다', () => {
    let b = initialBoard()
    for (let i = 0; i < 2000 && !isDone(b); i++) b = canRaise(b) ? raise(b) : mint(b)
    expect(isDone(b), '찍기만으로는 못 끝낸다 — 학생이 갇힐 수 있다').toBe(true)
  })

  it('어떤 상태에서 시작해도 끝낼 수 있다 — 되돌릴 수 없는 한 수가 없다', () => {
    // 고을을 아무렇게나 비워 둔 판 스물다섯 가지에서 모두 끝나는지 본다.
    for (let seed = 0; seed < 25; seed++) {
      let b = initialBoard()
      for (let i = 0; i < VILLAGES; i++) {
        const times = (seed * 7 + i * 3) % (LEVY_YIELDS.length + 1)
        for (let k = 0; k < times; k++) b = levy(b, i)
      }
      for (let i = 0; i < 2000 && !isDone(b); i++) b = canRaise(b) ? raise(b) : mint(b)
      expect(isDone(b), `seed ${seed} 에서 못 끝낸다`).toBe(true)
    }
  })
})

describe('한 수를 둔 뒤 판이 내미는 줄', () => {
  it('처음 걷을 때 원납전이 무엇인지 말한다', () => {
    const b = initialBoard()
    expect(nudgeFor(b, levy(b, 0))).toBe(FIRST_LEVY_LINE)
  })

  it('처음 찍을 때 당백전이 무엇인지 말한다', () => {
    const b = initialBoard()
    expect(nudgeFor(b, mint(b))).toBe(FIRST_MINT_LINE)
  })

  it('두 번째부터는 값이 올랐다고 말한다', () => {
    const b = mint(initialBoard())
    expect(nudgeFor(b, mint(b))).toBe(PRICE_UP_LINE)
  })

  it('고을이 비면 그렇게 말한다', () => {
    let b = levy(initialBoard(), 0)
    b = levy(b, 1)                       // 처음 걷기는 이미 지났다
    const before = b
    let after = before
    for (let k = 0; k < LEVY_YIELDS.length; k++) after = levy(after, 2)
    expect(nudgeFor(levy(before, 2), levy(levy(before, 2), 2))).toBe(EMPTY_LINE)
  })

  it('아무 일도 없으면 아무 말도 안 한다', () => {
    const b = initialBoard()
    expect(nudgeFor(b, b)).toBeNull()
    expect(nudgeFor(null, b)).toBeNull()
  })
})

describe('이 게임은 시험이 아니다', () => {
  it('깎는 낱말도, 액수도 쓰지 않는다', () => {
    let b = initialBoard()
    for (let i = 0; i < VILLAGES; i++) b = levy(b, i)
    for (let i = 0; i < 4; i++) b = mint(b)
    while (!isDone(b)) b = canRaise(b) ? raise(b) : mint(b)
    const spoken = [summaryLine(b), FIRST_LEVY_LINE, FIRST_MINT_LINE, EMPTY_LINE, PRICE_UP_LINE]
    for (const line of spoken) {
      for (const word of ['정답', '오답', '점수', '틀렸', '실패', '승리', '패배', '냥']) {
        expect(line, `「${word}」이 들어 있다: ${line}`).not.toContain(word)
      }
    }
  })

  it('끝난 뒤 한 줄이 무엇을 치렀는지 말한다', () => {
    let b = initialBoard()
    for (let i = 0; i < VILLAGES; i++) for (let k = 0; k < LEVY_YIELDS.length; k++) b = levy(b, i)
    while (!isDone(b)) b = canRaise(b) ? raise(b) : mint(b)
    const line = summaryLine(b)
    expect(line).toContain('고을')
    expect(line).toContain('배')
  })
})
