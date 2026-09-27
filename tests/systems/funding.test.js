import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  GOAL_BLOCKS, LEVY_MAX, MINT_MAX, LEVY_COIN, LEVY_WEARY_COIN, WEARY_MINSIM,
  MINT_COIN, PRICE_PER_MINT, MINSIM_START, MINSIM_PER_LEVY, RICE_BASE_COINS,
  RECON_NOTE, GOAL_NOTE, WONNAP_REVEAL, DANGBAEK_REVEAL, WEARY_NUDGE, SHRINK_NUDGE,
  HISTORY_LINES, HISTORY_PRICE,
  initialBoard, setLevy, setMint, stepLevy, stepMint,
  minsim, minsimLabel, minsimBar, priceMultiple, priceTimes, priceLabel, riceCoins,
  levyCoin, mintCoin, coinTotal, blocks, levyWorth, levyWorthLine,
  filledBlocks, goalMet, goalLabel, nudgeFor, summaryLine, comparison,
  needCoin, SCALE_COIN, coinAt, levyAt, needAt, NEED_START_AT, needLine,
  villageIsFailing, VILLAGE_TURN_MINSIM,
} from '../../src/systems/funding.js'

// 1막 마지막 자리의 셈판(2026-09-26 선생님: 「원납전과 당백전을 선택하고 선택한 이유를
// 쓰는 건 교육적 의미도 없고 재미도 없어. 원납전과 당백전을 잘 활용하여서 다시
// 만들어보자」). 화면 없이 판정만 잰다 — 막대가 어떻게 보이는지는 사람이 눈으로
// 봐야 알지만, 「밀면 무엇이 얼마나 움직이는가」는 여기서 못 박을 수 있다.

const stripComments = src => src.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')
const raw = readFileSync(join(process.cwd(), 'src', 'systems', 'funding.js'), 'utf8')
const src = stripComments(raw)

const at = (levy, mint) => ({ levy, mint })

describe('지레를 민다', () => {
  it('처음에는 둘 다 0이다 — 아직 아무것도 내려보내지 않았다', () => {
    expect(initialBoard()).toEqual({ levy: 0, mint: 0 })
    expect(filledBlocks(initialBoard())).toBe(0)
    expect(goalMet(initialBoard())).toBe(false)
  })

  it('한 칸씩 밀리고, 끝에서 더 밀어도 넘치지 않는다', () => {
    expect(stepLevy(at(0, 0)).levy).toBe(1)
    expect(stepMint(at(0, 3), 2).mint).toBe(5)
    expect(setLevy(at(0, 0), LEVY_MAX + 9).levy).toBe(LEVY_MAX)
    expect(setMint(at(0, 0), MINT_MAX + 9).mint).toBe(MINT_MAX)
  })

  it('되돌릴 수 있다 — 아직 정해진 일이 아니라 셈이므로 0 아래로는 안 간다', () => {
    expect(stepLevy(at(3, 0), -1).levy).toBe(2)
    expect(stepLevy(at(0, 0), -1).levy).toBe(0)
    expect(setMint(at(0, 2), -5).mint).toBe(0)
  })

  it('밀어도 원래 판을 고치지 않는다 — 새 판을 돌려준다', () => {
    const board = at(2, 2)
    stepLevy(board, 3)
    stepMint(board, 3)
    expect(board).toEqual({ levy: 2, mint: 2 })
  })
})

describe('원납전 — 돈은 확실히 모이고 민심이 깎인다', () => {
  it('한 차례마다 민심이 같은 만큼 깎이고, 0 아래로는 내려가지 않는다', () => {
    expect(minsim(at(0, 0))).toBe(MINSIM_START)
    expect(minsim(at(1, 0))).toBe(MINSIM_START - MINSIM_PER_LEVY)
    expect(minsim(at(LEVY_MAX, 0))).toBeGreaterThanOrEqual(0)
    expect(minsimBar(at(0, 0))).toBe(1)
  })

  it('민심이 문턱 아래로 내려간 뒤에는 한 차례에 걷히는 것이 줄어든다', () => {
    // 문턱을 아직 넘지 않은 차례는 제값대로 걷힌다
    expect(levyCoin(at(1, 0))).toBe(LEVY_COIN)
    expect(levyCoin(at(2, 0))).toBe(LEVY_COIN * 2)
    // 어느 차례부터 줄어드는지 — 그 차례를 돌리기 전의 민심으로 갈린다
    const full = Math.floor((MINSIM_START - WEARY_MINSIM) / MINSIM_PER_LEVY) + 1
    expect(levyCoin(at(full, 0))).toBe(LEVY_COIN * full)
    expect(levyCoin(at(full + 1, 0)) - levyCoin(at(full, 0))).toBe(LEVY_WEARY_COIN)
    expect(LEVY_WEARY_COIN).toBeLessThan(LEVY_COIN)
  })

  it('원납전만으로는 물가를 건드리지 않는다', () => {
    expect(priceMultiple(at(LEVY_MAX, 0))).toBe(1)
    expect(priceLabel(at(LEVY_MAX, 0))).toContain('아직 그대로다')
  })

  it('민심은 숫자가 아니라 말로 나간다 — 숫자를 붙이면 점수가 된다', () => {
    expect(minsimLabel(at(0, 0))).toBe('조용하다')
    expect(minsimLabel(at(LEVY_MAX, 0))).toBe('바닥에 가깝다')
    // 말 자체에 수가 섞여 있지 않다
    for (let n = 0; n <= LEVY_MAX; n++) expect(minsimLabel(at(n, 0))).not.toMatch(/\d/)
  })
})

describe('당백전 — 큰 돈이 단번에 생기고 물가가 뛴다', () => {
  it('한 칸마다 같은 만큼 물가가 오른다', () => {
    expect(priceMultiple(at(0, 0))).toBe(1)
    expect(priceMultiple(at(0, 1))).toBeCloseTo(1 + PRICE_PER_MINT)
    expect(priceMultiple(at(0, 4))).toBeCloseTo(1 + PRICE_PER_MINT * 4)
    expect(mintCoin(at(0, 3))).toBe(MINT_COIN * 3)
  })

  it('찍을수록 한 칸이 채우는 몫이 줄어든다 — 이 화면이 가르치려는 그것이다', () => {
    const gain = m => filledBlocks(at(0, m + 1)) - filledBlocks(at(0, m))
    for (let m = 0; m < MINT_MAX - 1; m++) {
      expect(gain(m + 1), `${m + 1}칸째`).toBeLessThan(gain(m))
      expect(gain(m)).toBeGreaterThan(0)     // 그래도 늘기는 한다 — 막힌 길은 만들지 않는다
    }
  })

  it('이미 걷어 둔 원납전의 값어치가 줄어든다 — 합은 늘어도 먼저 걷은 몫은 준다', () => {
    const before = blocks(at(8, 0))
    const after = blocks(at(8, 1))
    expect(after.levy).toBeLessThan(before.levy)
    expect(after.total).toBeGreaterThan(before.total)
    const worth = levyWorth(at(8, 1))
    expect(worth.then).toBe(levyCoin(at(8, 1)))
    expect(worth.now).toBeLessThan(worth.then)
    expect(levyWorthLine(at(8, 1))).toContain('지금은')
    expect(levyWorthLine(at(0, 4))).toBe('')       // 걷은 것이 없으면 할 말이 없다
  })

  it('쌀 한 섬을 사는 데 드는 돈이 눈에 띄게 늘어난다', () => {
    expect(riceCoins(at(0, 0))).toBe(RICE_BASE_COINS)
    expect(riceCoins(at(0, 4))).toBe(RICE_BASE_COINS * 2)
    expect(riceCoins(at(0, 12))).toBeGreaterThan(RICE_BASE_COINS * 3)
    expect(priceLabel(at(0, 4))).toContain('2배')
  })
})

describe('어느 길로 가도 채워지고, 어느 길로 가도 무엇인가 깎인다', () => {
  // 이기는 배합이 없다는 것이 이 판의 요점이다. 두 끝을 다 밟아 본다.
  it('원납전만으로도 100칸이 찬다 — 대신 민심이 바닥이다', () => {
    const board = at(LEVY_MAX, 0)
    expect(goalMet(board)).toBe(true)
    expect(priceMultiple(board)).toBe(1)
    expect(minsim(board)).toBeLessThan(WEARY_MINSIM)
    expect(minsimLabel(board)).toBe('바닥에 가깝다')
  })

  it('당백전만으로도 100칸이 찬다 — 대신 물가가 여러 배가 된다', () => {
    const board = at(0, MINT_MAX)
    expect(goalMet(board)).toBe(true)
    expect(minsim(board)).toBe(MINSIM_START)
    expect(priceMultiple(board)).toBeGreaterThan(3)
  })

  it('두 끝이 치르는 값이 서로 다르다 — 같은 100칸이 같은 값이 아니다', () => {
    const byLevy = at(LEVY_MAX, 0)
    const byMint = at(0, MINT_MAX)
    expect(minsim(byLevy)).toBeLessThan(minsim(byMint))
    expect(priceMultiple(byLevy)).toBeLessThan(priceMultiple(byMint))
    expect(summaryLine(byLevy)).not.toBe(summaryLine(byMint))
  })

  it('섞어도 채워진다 — 그리고 어느 쪽도 공짜가 아니다', () => {
    for (const [l, m] of [[2, 10], [4, 8], [6, 6], [8, 4], [10, 2]]) {
      expect(goalMet(at(l, m)), `${l}·${m}`).toBe(true)
      expect(minsim(at(l, m))).toBeLessThan(MINSIM_START)
      expect(priceMultiple(at(l, m))).toBeGreaterThan(1)
    }
  })

  it('가만히 두면 채워지지 않는다 — 셈을 해야 움직인다', () => {
    expect(goalMet(at(0, 0))).toBe(false)
    expect(goalMet(at(4, 2))).toBe(false)
  })

  it('채운 몫은 두 갈래로 나뉘어 나온다 — 막대가 두 몫을 나란히 쌓는다', () => {
    const b = blocks(at(6, 6))
    expect(b.levy + b.mint).toBeCloseTo(b.total)
    expect(b.total).toBeCloseTo(coinTotal(at(6, 6)) / priceMultiple(at(6, 6)))
  })

  it('채운 칸을 적은 줄에 칸 말고 다른 단위가 없다', () => {
    expect(goalLabel(at(6, 6))).toContain(`${GOAL_BLOCKS}칸`)
    expect(goalLabel(at(0, 0))).toContain('0칸')
  })
})

describe('밀 때마다 나오는 한 줄', () => {
  it('원납전을 처음 밀면 이름과 실제가 어긋난 것을 알려 준다', () => {
    expect(nudgeFor(at(0, 0), at(1, 0))).toBe(WONNAP_REVEAL)
    expect(WONNAP_REVEAL).toContain('위에서 정해 내려보냈다')
  })

  it('민심 문턱을 지나는 그 차례에만 덜 걷힌다는 것을 알려 준다', () => {
    // 민심이 문턱 아래로 내려앉는 바로 그 차례에 나온다
    const crossing = Math.floor((MINSIM_START - WEARY_MINSIM) / MINSIM_PER_LEVY) + 1
    expect(minsim(at(crossing - 1, 0))).toBeGreaterThanOrEqual(WEARY_MINSIM)
    expect(minsim(at(crossing, 0))).toBeLessThan(WEARY_MINSIM)
    expect(nudgeFor(at(crossing - 1, 0), at(crossing, 0))).toBe(WEARY_NUDGE)
    expect(nudgeFor(at(1, 0), at(2, 0))).toBe('')
  })

  it('당백전을 처음 찍으면 백 배로 정했을 뿐이라는 것을 알려 준다', () => {
    expect(nudgeFor(at(0, 0), at(0, 1))).toBe(DANGBAEK_REVEAL)
  })

  it('걷어 둔 돈이 줄어든 순간에 그것을 말한다 — 이 판의 심지다', () => {
    expect(nudgeFor(at(8, 1), at(8, 2))).toBe(SHRINK_NUDGE)
    expect(nudgeFor(at(8, 0), at(8, 1))).toContain(SHRINK_NUDGE)
    expect(nudgeFor(at(8, 0), at(8, 1))).toContain(DANGBAEK_REVEAL)
  })

  it('되돌릴 때는 아무 말도 하지 않는다 — 벌하지 않는다', () => {
    expect(nudgeFor(at(3, 3), at(2, 3))).toBe('')
    expect(nudgeFor(at(3, 3), at(3, 2))).toBe('')
    expect(nudgeFor(at(3, 3), at(3, 3))).toBe('')
  })
})

describe('셈을 마친 뒤 — 학생의 셈과 교과서를 나란히 놓는다', () => {
  it('학생의 셈이 한 줄로 적힌다 — 예전 「이유 쓰기」를 대신하는 기록이다', () => {
    expect(summaryLine(at(6, 6))).toContain('원납전을 6차례')
    expect(summaryLine(at(6, 6))).toContain('당백전을 6칸')
    expect(summaryLine(at(6, 6))).toContain('2.5배')
    expect(summaryLine(at(0, 0))).toContain('원납전은 걷지 않고')
    expect(summaryLine(at(0, 0))).toContain('당백전은 찍지 않았다')
  })

  it('배수는 화면에 적힌 그대로 넘어간다 — 4.00배가 아니라 4배다', () => {
    expect(priceTimes(at(0, 12))).toBe('4')
    expect(priceTimes(at(0, 6))).toBe('2.5')
    expect(priceTimes(at(0, 1))).toBe('1.25')
  })

  it('당신의 물가는 수로, 실제의 물가는 수 없이 적는다', () => {
    const c = comparison(at(0, 12))
    expect(c.yourPrice).toContain('4배')
    expect(c.actualPrice).toBe(HISTORY_PRICE)
    expect(c.actualPrice).not.toMatch(/\d+배/)
    expect(c.actualPrice).toContain('기록으로 정할 수 없다')
  })

  it('교과서가 적은 것까지만 말한다 — 원납전의 할당과 당백전의 발행·회수', () => {
    const c = comparison(at(6, 6))
    expect(c.actual).toEqual(HISTORY_LINES)
    expect(c.actual.join(' ')).toContain('고을마다 낼 액수를 위에서 정해 내려보냈다')
    expect(c.actual.join(' ')).toContain('1866년')
    expect(c.actual.join(' ')).toContain('거두어졌다')
  })

  it('비트가 제 문구를 주면 그것을 쓴다 — acts.js 가 덮어쓸 수 있다', () => {
    const c = comparison(at(6, 6), { actualLines: ['다른 줄'] })
    expect(c.actual).toEqual(['다른 줄'])
  })

  it('못 채운 셈도 판정이 아니다 — 멈춘 자리를 적을 뿐이다', () => {
    const c = comparison(at(2, 2))
    expect(c.goal).toContain('칸에서 셈을 멈추었다')
    expect(c.goal).not.toMatch(/실패|모자|부족|못했/)
  })

  it('재구성 고지가 딸려 나온다', () => {
    expect(comparison(at(6, 6)).note).toBe(RECON_NOTE)
    expect(RECON_NOTE).toContain('재구성')
    expect(GOAL_NOTE).toContain('칸')
  })
})

describe('역사에 거짓을 보태지 않는다', () => {
  // ⚠ 절대 수치를 짓지 않는다(systems/prices.js 와 같은 규칙, 설계서 11장 검증 규약).
  it('냥도, 절대 액수도, 절대 쌀값도 한 글자 없다', () => {
    expect(src).not.toMatch(/냥/)
    expect(src).not.toMatch(/[0-9]\s*(원|문|섬값|석)/)
    // 화면에 나가는 모든 말을 훑는다
    const spoken = [
      RECON_NOTE, GOAL_NOTE, WONNAP_REVEAL, DANGBAEK_REVEAL, WEARY_NUDGE, SHRINK_NUDGE,
      HISTORY_PRICE, ...HISTORY_LINES,
      ...[[0, 0], [6, 6], [LEVY_MAX, 0], [0, MINT_MAX]].flatMap(([l, m]) => {
        const c = comparison(at(l, m))
        return [summaryLine(at(l, m)), goalLabel(at(l, m)), priceLabel(at(l, m)),
          minsimLabel(at(l, m)), levyWorthLine(at(l, m)), c.goal, c.you, c.yourPrice, c.actualPrice]
      }),
    ]
    for (const line of spoken) expect(line, line).not.toMatch(/냥/)
  })

  it('채점하는 말이 없다 — 점수도, 정답도, 오답도', () => {
    expect(src).not.toMatch(/오답|정답|점수|맞았습니다|틀렸|실점|감점|벌점|승리|패배/)
  })

  it('시계가 없다 — 촉박은 C1·C2·C3 세 번뿐이다', () => {
    expect(src).not.toMatch(/setTimeout|setInterval|Date\.now|performance\.now/)
  })

  it('고칠 수 있는 수는 모두 이름을 달고 있다 — 화면이 제 마음대로 셈하지 않게', () => {
    for (const k of [GOAL_BLOCKS, LEVY_MAX, MINT_MAX, LEVY_COIN, LEVY_WEARY_COIN,
      WEARY_MINSIM, MINT_COIN, PRICE_PER_MINT, MINSIM_START, MINSIM_PER_LEVY, RICE_BASE_COINS]) {
      expect(typeof k).toBe('number')
    }
    // 수가 바뀌어도 역사 서술은 그대로다 — 그 약속을 파일에 적어 두었다
    expect(raw).toContain('달라지면 그것이 잘못이다')
  })

  it('DOM 을 건드리지 않는다 — 화면 없이 시험할 수 있다', () => {
    expect(src).not.toMatch(/document|window|addEventListener/)
  })
})

// ── 결승선이 달아난다 (2026-09-27) ─────────────────────────────────────────
// 선생님이 같은 판을 두고 두 번째로 「더 재미있게」라고 하셨다. 띄워 보니 까닭이
// 화면에 있었다 — 당백전을 미는데 **제 막대가 뒤로 물러났다**. 겪는 일로 치면
// 「내 돈이 사라졌다」인데, 그런 일은 일어나지 않는다. 일어나는 일은 그 반대다:
// 내 돈은 그대로인데 사려던 것의 값이 오른다.
//
// 그래서 같은 부등식을 뒤집어 놓았다. 아래는 그 뒤집기가 **셈을 바꾸지 않았다**는 것과,
// 뒤집은 보람(막대가 안 물러난다 · 금이 달아난다)을 함께 못 박는다.
describe('결승선이 달아난다', () => {
  it('부등식이 예전과 똑같다 — 보이는 쪽만 뒤집었지 셈은 안 바꿨다', () => {
    // 돈 ÷ 물가 ≥ 100  ⟺  돈 ≥ 100 × 물가. 이것이 깨지면 뒤집기가 규칙을 바꾼 것이다.
    for (let levy = 0; levy <= LEVY_MAX; levy++) {
      for (let mint = 0; mint <= MINT_MAX; mint++) {
        const s = at(levy, mint)
        expect(coinTotal(s) >= needCoin(s), `levy ${levy} · mint ${mint}`).toBe(goalMet(s))
      }
    }
  })

  it('돈 막대는 한 번도 물러나지 않는다 — 이번에 고친 바로 그것이다', () => {
    for (let levy = 0; levy <= LEVY_MAX; levy++) {
      for (let mint = 1; mint <= MINT_MAX; mint++) {
        const prev = at(levy, mint - 1)
        const now = at(levy, mint)
        // 당백전을 찍어도 원납전으로 만든 돈은 그대로다. 예전 막대는 여기서 줄었다.
        expect(levyAt(now), `levy ${levy} · mint ${mint}`).toBe(levyAt(prev))
        expect(coinAt(now)).toBeGreaterThan(coinAt(prev))
      }
    }
  })

  it('당백전을 찍을수록 결승선이 오른쪽으로 간다', () => {
    for (let mint = 1; mint <= MINT_MAX; mint++) {
      expect(needAt(at(0, mint))).toBeGreaterThan(needAt(at(0, mint - 1)))
    }
    // 원납전은 결승선을 건드리지 않는다 — 물가를 안 올리기 때문이다.
    for (let levy = 1; levy <= LEVY_MAX; levy++) {
      expect(needAt(at(levy, 0))).toBe(NEED_START_AT)
    }
  })

  it('자가 막대보다 길다 — 끝에서 막대가 자에 붙으면 거리가 도로 좁아진다', () => {
    // 화면을 찍어 보고 잡은 버그다. 자를 「물가가 끝까지 올랐을 때의 벽값」으로 두었더니
    // 가질 수 있는 돈보다 짧아, 다 민 학생의 막대가 멈추고 금만 갔다 — 다 밀수록
    // 따라잡히는 것처럼 보였다. 가르치려는 것과 정반대다.
    expect(coinTotal(at(LEVY_MAX, MINT_MAX))).toBeLessThanOrEqual(SCALE_COIN)
    // 자 끝에 눌리지 않았다는 것 — 마지막 한 칸도 막대를 밀어낸다.
    expect(coinAt(at(LEVY_MAX, MINT_MAX))).toBeGreaterThan(coinAt(at(LEVY_MAX, MINT_MAX - 1)))
    expect(needAt(at(0, MINT_MAX))).toBeLessThanOrEqual(1)
  })

  it('밀어낸 거리를 적은 줄이 물가 배수와 같은 수를 쓴다', () => {
    // 화면 두 곳이 서로 다른 배수를 말하면 학생이 먼저 알아챈다.
    expect(needLine(at(6, 0))).not.toMatch(/배/)
    expect(needLine(at(6, 10))).toContain(`${priceTimes(at(6, 10))}배`)
    expect(needLine(at(6, 10))).toContain('결승선')
  })

  // 2026-09-27 선생님: 「힉스필드 등을 활용하여 제대로 된 게임의 형태를 만들어봐.」
  // 민심이 「원망이 돈다」는 낱말에서 **비어 가는 고을 그림**으로 바뀌었다. 그림과 낱말은
  // 같은 눈금을 두 방식으로 말하는 것이라, 서로 다른 때에 바뀌면 화면이 거짓말을 한다.
  it('고을 그림과 민심 말이 같은 자리에서 바뀐다', () => {
    for (let levy = 0; levy <= LEVY_MAX; levy++) {
      const s = at(levy, 0)
      const word = minsimLabel(s)
      if (villageIsFailing(s)) {
        // 사람이 떠나는 그림이 걸렸는데 말은 「조용하다」면 학생이 먼저 알아챈다.
        expect(word, `levy ${levy}`).not.toBe('조용하다')
        expect(word, `levy ${levy}`).not.toBe('술렁인다')
      } else {
        expect(['조용하다', '술렁인다'], `levy ${levy}`).toContain(word)
      }
    }
  })

  it('고을 그림은 걷기 전에는 성하다 — 아무것도 안 했는데 비어 있으면 벌하는 것이다', () => {
    expect(villageIsFailing(at(0, 0))).toBe(false)
    // 당백전만 찍어서는 고을이 비지 않는다. 물가는 오르지만 걷어 간 것은 없다.
    expect(villageIsFailing(at(0, MINT_MAX))).toBe(false)
    // 끝까지 걷으면 반드시 빈다 — 그림이 안 바뀌면 이 고침이 통째로 헛것이다.
    expect(villageIsFailing(at(LEVY_MAX, 0))).toBe(true)
    expect(VILLAGE_TURN_MINSIM).toBeGreaterThan(WEARY_MINSIM)
  })

  it('절대 수치가 새지 않는다 — 자도 칸과 배수로만 만든다', () => {
    // 이 판의 못 하나(맨 위 ⚠): 냥도 총액도 쌀 한 섬 값도 적지 않는다.
    expect(needLine(at(6, 10))).not.toMatch(/냥|원|석|섬/)
    expect(SCALE_COIN).toBe(levyCoin(at(LEVY_MAX, 0)) + MINT_COIN * MINT_MAX)
  })
})
