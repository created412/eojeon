import { describe, it, expect } from 'vitest'
import {
  BAYS, VILLAGES, BAY_MS, TOTAL_MS, YEAR_FROM, YEAR_TO, LEVY_BASE, GRUDGE_PER_LEVY, GRUDGE_FADE_PER_S, GRUDGE_SHOWN,
  MINT_COIN, PRICE_BASE, PRICE_PER_MINT, RECON_NOTE,
  easeFor, initialBoard, tick, levy, mint, price, priceTimes, levyYield, canLevy, wouldTurn, villageState,
  emptyVillages, levyLeft, isWorking, isDone, isLate, timeRatio, yearAt, nudgeFor, summaryLine, boardResult, againReason,
  FIRST_LEVY_LINE, FIRST_MINT_LINE, TURNED_LINE, GRUDGE_LINE, PRICE_UP_LINE, STALL_LINE, START_LINE, AGAIN_COPY,
} from '../../src/systems/rebuild.js'
import { boardHtml, introHtml, doneHtml } from '../../src/ui/rebuild.js'
import { againView } from '../../src/systems/minigame.js'
import { ACTS } from '../../src/data/acts.js'

// ── 경복궁을 짓는다 (2026-10-06 네 번째 판) ───────────────────────────────
//
// 선생님: 「경복궁 중건을 위한 원납전, 당백전 게임을 … 좀 더 재미있게 구성해 봐.」
//
// 앞 판은 시간이 흐르지 않았고 고를 것이 없었다. 새 판은 날이 가고(1865 → 1868), 공사는 돈이
// 있는 동안 저절로 올라가며, 고을은 원성을 쌓고, 찍으면 값이 뛴다. 여기서 재는 것:
//   · 고를 것이 실제로 있는가 — 고을을 아끼면 더 찍게 되고, 덜 찍으려면 고을이 돌아선다.
//   · 기다리기만 해서는 안 되는가 — 날은 간다.
//   · 고을만으로는 모자라는가(반드시 찍게 된다), 찍기만 해도 끝나는가(갇히지 않는다).

const STEP = 50
const idx = Array.from({ length: VILLAGES }, (_, i) => i)
const low = b => b.coin < price(b) * 0.3
const best = (b, ok) => idx.filter(k => canLevy(b, k) && ok(k)).sort((x, y) => levyYield(b, y) - levyYield(b, x))[0]

// 판을 끝까지 돌린다. bot(board) 가 { mint:true } 나 { levy:i } 를 돌려준다. react 는 한 번 누른 뒤 쉬는 시간.
function run(bot, { tries = 1, react = 0 } = {}) {
  let b = initialBoard({ tries })
  let wait = 0
  while (!b.over) {
    b = tick(b, STEP)
    if (b.over) break
    wait -= STEP
    if (wait > 0) continue
    const act = bot(b)
    if (!act) continue
    b = act.mint ? mint(b) : levy(b, act.levy)
    wait = react
  }
  return b
}

const HANDS = {
  // 찍기만 한다.
  mintOnly: b => (low(b) ? { mint: true } : null),
  // 원성이 없는 고을만 걷고, 모자라면 찍는다.
  gentle: b => { if (!low(b)) return null; const i = best(b, k => b.villages[k].grudge < GRUDGE_SHOWN); return i == null ? { mint: true } : { levy: i } },
  // 돌아서기 직전까지 걷고, 모자라면 찍는다.
  careful: b => { if (!low(b)) return null; const i = best(b, k => !wouldTurn(b, k)); return i == null ? { mint: true } : { levy: i } },
  // 고을을 남김없이 짜낸 다음에야 찍는다.
  squeeze: b => { if (!low(b)) return null; const i = best(b, () => true); return i == null ? { mint: true } : { levy: i } },
}

describe('하는 일이 한 문장이다 — 고을에서 걷거나 돈을 찍어서, 경복궁을 올린다', () => {
  it('처음에는 아무것도 없다', () => {
    const b = initialBoard()
    expect(b.coin).toBe(0)
    expect(b.bays).toBe(0)
    expect(b.mints).toBe(0)
    expect(b.villages).toHaveLength(VILLAGES)
    expect(isWorking(b)).toBe(false)
  })

  it('고을에서 걷으면 돈이 들어온다', () => {
    const b = levy(initialBoard(), 0)
    expect(b.coin).toBe(LEVY_BASE)
    expect(b.levies).toBe(1)
  })

  it('찍으면 큰돈이 들어온다', () => {
    expect(mint(initialBoard()).coin).toBe(MINT_COIN)
    expect(MINT_COIN).toBeGreaterThan(LEVY_BASE * 4)
  })

  it('돈이 있는 동안 공사가 저절로 올라가고, 그만큼 돈이 나간다', () => {
    let b = mint(initialBoard())
    const before = b.coin
    b = tick(b, 1000)
    expect(isWorking(b)).toBe(true)
    expect(b.progress).toBeCloseTo(1000 / BAY_MS, 5)
    expect(before - b.coin).toBeCloseTo(price(b) * 1000 / BAY_MS, 5)
  })

  it('한 채는 지금 값만큼 든다', () => {
    let b = { ...initialBoard(), coin: PRICE_BASE }
    b = tick(b, BAY_MS)
    expect(b.bays).toBe(1)
    expect(b.coin).toBe(0)
  })

  it('돈이 떨어지면 공사가 선다 — 그래도 날은 간다', () => {
    let b = tick(initialBoard(), 5000)
    expect(b.bays).toBe(0)
    expect(b.progress).toBe(0)
    expect(b.stalledMs).toBe(5000)
    expect(b.elapsed).toBe(5000)
    expect(timeRatio(b)).toBeCloseTo(5000 / TOTAL_MS, 6)
  })

  it('열 채를 올리면 끝난다', () => {
    const b = tick({ ...initialBoard(), coin: PRICE_BASE * BAYS }, BAY_MS * BAYS)
    expect(isDone(b)).toBe(true)
    expect(b.bays).toBe(BAYS)
  })

  it('끝난 판은 더 흐르지도, 더 걷히지도 않는다', () => {
    const done = tick({ ...initialBoard(), coin: PRICE_BASE * BAYS }, BAY_MS * BAYS)
    expect(tick(done, 5000)).toBe(done)
    expect(levy(done, 0)).toBe(done)
    expect(mint(done)).toBe(done)
  })
})

describe('고을은 원성을 쌓는다', () => {
  it('걷을 때마다 원성이 차고, 내는 것이 준다', () => {
    let b = initialBoard()
    const first = levyYield(b, 0)
    b = levy(b, 0)
    expect(b.villages[0].grudge).toBeCloseTo(GRUDGE_PER_LEVY, 6)
    const second = levyYield(b, 0)
    expect(second).toBeLessThan(first)
    expect(second).toBeGreaterThan(0)
  })

  it('두면 천천히 가라앉는다', () => {
    let b = levy(initialBoard(), 0)
    b = tick(b, 10000)
    expect(b.villages[0].grudge).toBeCloseTo(GRUDGE_PER_LEVY - GRUDGE_FADE_PER_S * 10, 6)
    // 다 가라앉으려면 한 판의 절반이 넘게 걸린다 — 기다리는 것은 공짜가 아니다.
    expect(GRUDGE_PER_LEVY / GRUDGE_FADE_PER_S * 1000).toBeGreaterThan(TOTAL_MS / 2)
  })

  it('가라앉기 전에 거듭 걷으면 돌아선다 — 다시는 내지 않는다', () => {
    let b = initialBoard()
    b = levy(levy(b, 0), 0)
    expect(wouldTurn(b, 0)).toBe(true)
    expect(villageState(b, 0)).toBe('levied')
    b = levy(b, 0)
    expect(b.villages[0].turned).toBe(true)
    expect(villageState(b, 0)).toBe('empty')
    expect(canLevy(b, 0)).toBe(false)
    expect(levyYield(b, 0)).toBe(0)
    expect(levy(b, 0)).toBe(b)
    // 아무리 두어도 돌아오지 않는다.
    expect(tick(b, TOTAL_MS / 2).villages[0].turned).toBe(true)
    expect(emptyVillages(b)).toBe(1)
    expect(levyLeft(b)).toBe(VILLAGES - 1)
  })

  it('그림이 꼴을 말한다 — 평온 · 원성이 인다 · 돌아섰다', () => {
    let b = initialBoard()
    expect(villageState(b, 3)).toBe('calm')
    b = levy(b, 3)
    expect(villageState(b, 3)).toBe('levied')
    b = tick(b, (GRUDGE_PER_LEVY - GRUDGE_SHOWN) / GRUDGE_FADE_PER_S * 1000 + 500)
    expect(villageState(b, 3)).toBe('calm')
  })
})

describe('찍으면 값이 오른다', () => {
  it('찍기 전에는 값이 그대로다', () => {
    expect(price(levy(initialBoard(), 0))).toBe(PRICE_BASE)
  })

  it('한 번 찍을 때마다 값이 오르고, 내려오지 않는다', () => {
    let b = mint(initialBoard())
    expect(price(b)).toBe(PRICE_BASE + PRICE_PER_MINT)
    b = tick(mint(b), 20000)
    expect(price(b)).toBe(PRICE_BASE + PRICE_PER_MINT * 2)
    expect(priceTimes(b)).toBeCloseTo((PRICE_BASE + PRICE_PER_MINT * 2) / PRICE_BASE, 6)
  })

  it('값이 올라도 이미 올린 채는 그대로다', () => {
    let b = tick({ ...initialBoard(), coin: PRICE_BASE * 2 }, BAY_MS * 2)
    expect(b.bays).toBe(2)
    b = mint(mint(b))
    expect(b.bays).toBe(2)
  })

  it('값이 오르면 같은 돈으로 덜 올라간다', () => {
    const cheap = tick({ ...initialBoard(), coin: 10 }, 60000)
    const dear = tick({ ...mint(mint(mint(initialBoard()))), coin: 10 }, 60000)
    expect(dear.bays + dear.progress).toBeLessThan(cheap.bays + cheap.progress)
  })
})

describe('날은 간다 — 기다리기만 해서는 안 된다', () => {
  it(`${YEAR_FROM}년에서 ${YEAR_TO}년으로 간다`, () => {
    expect(yearAt(initialBoard())).toBe(YEAR_FROM)
    expect(yearAt(tick(initialBoard(), TOTAL_MS / 2))).toBe(YEAR_FROM + 1)
    expect(yearAt(tick(initialBoard(), TOTAL_MS))).toBe(YEAR_TO)
  })

  it('아무것도 하지 않으면 한 채도 못 올리고 날이 다 간다', () => {
    const b = run(() => null)
    expect(isLate(b)).toBe(true)
    expect(b.bays).toBe(0)
    expect(boardResult(b).cleared).toBe(false)
  })

  it('가장 빠른 손도 기한의 절반은 넘게 쓴다 — 서 있을 틈은 넉넉하지만 끝없지는 않다', () => {
    expect(BAY_MS * BAYS).toBeGreaterThan(TOTAL_MS / 2)
    expect(BAY_MS * BAYS).toBeLessThan(TOTAL_MS * 0.7)
  })
})

describe('고를 것이 있다 — 고을을 아끼면 더 찍고, 덜 찍으려면 고을이 돌아선다', () => {
  const mintOnly = run(HANDS.mintOnly)
  const gentle = run(HANDS.gentle)
  const careful = run(HANDS.careful)
  const squeeze = run(HANDS.squeeze)

  it('네 가지 손 모두 끝까지 올린다', () => {
    for (const [name, b] of Object.entries({ mintOnly, gentle, careful, squeeze })) expect(isDone(b), name).toBe(true)
  })

  it('고을을 아낄수록 더 찍게 된다', () => {
    expect(emptyVillages(gentle)).toBe(0)
    expect(emptyVillages(careful)).toBe(0)
    expect(gentle.mints).toBeGreaterThan(careful.mints)
    expect(mintOnly.mints).toBeGreaterThan(gentle.mints)
  })

  it('고을을 남김없이 짜내면 덜 찍는다 — 대신 고을이 모두 돌아선다', () => {
    expect(emptyVillages(squeeze)).toBe(VILLAGES)
    expect(squeeze.mints).toBeLessThan(careful.mints)
    expect(priceTimes(squeeze)).toBeLessThan(priceTimes(careful))
  })

  it('어느 손도 값을 치르지 않고는 끝내지 못한다 — 찍거나, 돌아서게 하거나', () => {
    for (const b of [mintOnly, gentle, careful, squeeze]) expect(b.mints + emptyVillages(b)).toBeGreaterThan(0)
    for (const b of [mintOnly, gentle, careful, squeeze]) expect(b.mints).toBeGreaterThan(0)
  })
})

describe('고을만으로는 모자란다 — 반드시 찍게 된다', () => {
  // 걷기만 하는 손들: 원성이 θ 아래로 가라앉은 고을만 걷고, 끝 T 초에는 남김없이 짜낸다.
  const levyOnly = (th, squeezeS, eager) => b => {
    if (!eager && !low(b)) return null
    const squeezing = b.elapsed >= TOTAL_MS - squeezeS * 1000
    const i = best(b, k => squeezing || b.villages[k].grudge < th)
    return i == null ? null : { levy: i }
  }

  it('어떤 식으로 걷어도, 몇 번째 판이어도, 걷기만으로는 열 채를 못 올린다', () => {
    let furthest = 0
    for (const tries of [1, 2, 3, 4, 6]) {
      for (const th of [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.59, 2]) {
        for (const squeezeS of [0, 5, 10, 20, 30, 45]) {
          for (const eager of [true, false]) {
            const b = run(levyOnly(th, squeezeS, eager), { tries })
            expect(isLate(b), `tries ${tries} θ ${th} 끝 ${squeezeS}초 ${eager ? '미리' : '모자랄 때'}`).toBe(true)
            furthest = Math.max(furthest, b.bays + b.progress)
          }
        }
      }
    }
    // 아슬아슬하게 모자란 것이 아니라 넉넉히 모자란다.
    expect(furthest).toBeLessThan(BAYS - 1)
  })
})

describe('아무도 갇히지 않는다', () => {
  it('한 번 찍어 들어오는 것이 그때 오르는 값보다 훨씬 크다', () => {
    expect(MINT_COIN).toBeGreaterThan(PRICE_PER_MINT * 5)
  })

  it('고을을 하나도 안 건드려도 찍기만으로 끝낼 수 있다', () => {
    const b = run(HANDS.mintOnly)
    expect(isDone(b)).toBe(true)
    expect(b.levies).toBe(0)
  })

  it('누를 때마다 3초씩 쉬는 느린 손도 찍기만 하면 첫 판에 끝낸다', () => {
    expect(isDone(run(HANDS.mintOnly, { react: 3000 }))).toBe(true)
  })

  it('고을을 모두 돌아서게 한 뒤에도 끝낼 수 있다 — 되돌릴 수 없는 한 수가 판을 막지 않는다', () => {
    let b = initialBoard()
    for (const i of idx) b = levy(levy(levy(b, i), i), i)
    expect(emptyVillages(b)).toBe(VILLAGES)
    while (!b.over) { b = tick(b, STEP); if (!b.over && low(b)) b = mint(b) }
    expect(isDone(b)).toBe(true)
  })

  it('거듭할수록 거든다 — 기한은 그대로, 일꾼의 손이 빨라지고 찍는 돈이 는다', () => {
    expect(easeFor(1)).toEqual({ bayMs: BAY_MS, mintCoin: MINT_COIN, mintCue: false })
    expect(easeFor(2).bayMs).toBeLessThan(BAY_MS)
    expect(easeFor(2).mintCue).toBe(true)
    expect(easeFor(3).mintCoin).toBeGreaterThan(MINT_COIN)
    expect(easeFor(4).bayMs).toBeLessThan(easeFor(3).bayMs)
  })

  it('누를 때마다 3초씩 쉬면서 고을부터 걷는 손도 몇 판 안에는 끝낸다', () => {
    const cleared = [1, 2, 3, 4].some(tries => isDone(run(HANDS.gentle, { tries, react: 3000 })))
    expect(cleared).toBe(true)
  })

  it('「아직」 화면이 까닭과 거드는 말을 싣는다', () => {
    const late = run(() => null)
    const view = againView({ tries: 3, reason: boardResult(late).reason, hint: AGAIN_COPY.hint, strong: AGAIN_COPY.strong })
    expect(view.lines[0]).toBe(againReason(late))
    expect(view.lines[0]).toContain(`${YEAR_TO}년`)
    expect(view.lines).toContain(AGAIN_COPY.hint)
    expect(view.lines.join(' ')).toContain('주전소')
  })
})

describe('판이 바뀐 뒤 내미는 줄', () => {
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

  it('원성이 가라앉기 전에 또 걷으면 그렇게 말한다', () => {
    const b = levy(levy(initialBoard(), 1), 0)
    expect(nudgeFor(b, levy(b, 0))).toBe(GRUDGE_LINE)
  })

  it('고을이 돌아서면 그렇게 말한다 — 願納이 怨納이 된다', () => {
    const b = levy(levy(initialBoard(), 0), 0)
    expect(nudgeFor(b, levy(b, 0))).toBe(TURNED_LINE)
    expect(TURNED_LINE).toContain('원망하며 내는 돈')
  })

  it('돈이 떨어지는 그 순간에 말한다', () => {
    const b = { ...initialBoard(), coin: 0.01 }
    expect(nudgeFor(b, tick(b, 500))).toBe(STALL_LINE)
  })

  it('아무 일도 없으면 아무 말도 안 한다', () => {
    const b = mint(initialBoard())
    expect(nudgeFor(b, tick(b, 100))).toBeNull()
    expect(nudgeFor(null, b)).toBeNull()
  })
})

describe('이 게임은 시험이 아니다', () => {
  const said = [FIRST_LEVY_LINE, FIRST_MINT_LINE, TURNED_LINE, GRUDGE_LINE, PRICE_UP_LINE, STALL_LINE, START_LINE,
    RECON_NOTE, AGAIN_COPY.hint, AGAIN_COPY.strong, againReason(initialBoard()), summaryLine(run(HANDS.squeeze))]

  it('깎는 낱말도, 액수도 쓰지 않는다', () => {
    for (const s of said) {
      for (const word of ['정답', '오답', '실패', '틀렸', '점수', '감점']) expect(s.includes(word), `${word}: ${s}`).toBe(false)
      expect(/냥/.test(s), s).toBe(false)
    }
  })

  it('눈금이 지어낸 것임을 밝힌다', () => {
    expect(RECON_NOTE).toContain('눈금')
    expect(RECON_NOTE).toContain('기록으로는 정할 수 없어')
    expect(RECON_NOTE).toContain('시간은 줄여 흘립니다')
  })

  it('끝난 뒤 한 줄이 무엇을 치렀는지 말한다', () => {
    const squeeze = run(HANDS.squeeze)
    expect(summaryLine(squeeze)).toContain(`고을 ${VILLAGES}곳이 돌아섰고`)
    expect(summaryLine(squeeze)).toContain(`돈을 ${squeeze.mints}번 찍어`)
    const gentle = run(HANDS.gentle)
    expect(summaryLine(gentle)).toContain('돌아선 고을은 없었고')
    const r = boardResult(gentle)
    expect(r).toMatchObject({ cleared: true, bays: BAYS, mints: gentle.mints, emptied: 0 })
    expect(r.summary).toBe(summaryLine(gentle))
  })
})

describe('화면', () => {
  const beat = ACTS[0].beats.find(b => b.kind === 'funding')
  const view = { title: beat.title, intro: beat.intro, quote: beat.quote, actual: beat.actualLine, lines: beat.lines,
    overturn: beat.overturn, overturnBy: beat.overturnBy, nextLabel: beat.nextLabel }

  it('있는 것이 전부 실제 물건이다 — 공사판 · 고을 여덟 · 주전소 · 날', () => {
    const html = boardHtml(view)
    expect((html.match(/data-village=/g) ?? []).length).toBe(VILLAGES)
    expect(html).toContain('data-mint')
    expect(html).toContain('data-daybar')
    expect(html).toContain(String(YEAR_FROM))
    expect(html).toContain(String(YEAR_TO))
    expect(html).toContain('원납전')
    expect(html).toContain('당백전')
    // 「올린다」 단추는 없다 — 공사는 저절로 올라간다.
    expect(html).not.toContain('data-raise')
  })

  it('앞 판이 규칙 넷을 말하고, 읽는 동안에는 시작 단추를 눌러야 흐른다', () => {
    const intro = introHtml(view, 1)
    expect((intro.match(/<p><b>/g) ?? []).length).toBe(4)
    expect(intro).toContain('저절로 올라간다')
    expect(intro).toContain('돌아선다')
    expect(intro).toContain('한 채 값이 오른다')
    expect(intro).toContain('class="go start"')
    expect(intro).toContain(beat.intro[0])
  })

  it('다시 하는 판의 앞 판은 짧고, 무엇이 달라졌는지 말한다', () => {
    const again = introHtml(view, 2)
    expect(again).toContain('다시 — 경복궁을 짓는다')
    expect(again).not.toContain(beat.intro[0])
    expect(again).toContain('주전소가 빛난다')
  })

  it('끝 판에 학생의 셈 · 『매천야록』 · 교과서의 문장 · 아버지의 말이 차례로 온다', () => {
    const board = run(HANDS.squeeze)
    const html = doneHtml(view, board)
    const order = [summaryLine(board), '怨納錢', beat.actualLine, beat.lines.at(-1), beat.overturn, beat.nextLabel].map(s => html.indexOf(s))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})
