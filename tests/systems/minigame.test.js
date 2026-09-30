import { describe, it, expect, vi } from 'vitest'
import { untilCleared, againView, CLEARED, AGAIN, HINT_FROM, STRONG_HINT_FROM } from '../../src/systems/minigame.js'

// 선생님(2026-09-30): 「조여.」 손으로 하는 장면은 해내야 넘어간다.

describe('해낼 때까지 되풀이한다', () => {
  it('한 번에 해내면 한 판으로 끝난다 — 군더더기 화면이 안 뜬다', async () => {
    const again = vi.fn()
    const out = await untilCleared(async () => ({ cleared: true }), again)
    expect(out.tries).toBe(1)
    expect(again).not.toHaveBeenCalled()
  })

  it('못 해내면 다음으로 **안** 넘어간다 — 다시 판을 연다', async () => {
    const seen = []
    const play = vi.fn(async tries => ({ cleared: tries === 3, reason: '아직 못 채웠다' }))
    await untilCleared(play, async view => { seen.push(view) })
    expect(play).toHaveBeenCalledTimes(3)
    expect(seen).toHaveLength(2)
  })

  it('몇 판 만에 해냈는지 돌려준다', async () => {
    const out = await untilCleared(async t => ({ cleared: t === 4 }), async () => {})
    expect(out.tries).toBe(4)
  })

  it('판이 돌려주는 까닭이 화면에 실린다', async () => {
    let view = null
    await untilCleared(async t => ({ cleared: t === 2, reason: '넉 자를 다 쓰지 못했다' }),
      async v => { view = v })
    expect(view.lines).toContain('넉 자를 다 쓰지 못했다')
  })

  it('아무것도 안 돌려줘도 터지지 않는다 — 다시 할 뿐이다', async () => {
    let n = 0
    const out = await untilCleared(async () => (++n >= 2 ? { cleared: true } : undefined), async () => {})
    expect(out.tries).toBe(2)
  })
})

describe('거듭할수록 더 일러 준다 — 벌이 아니라 도움이다', () => {
  const copy = { hint: '먹을 진하게 눌러 보세요', strong: '왼쪽 위에서 시작해 아래로 긋습니다' }

  it('첫 판에는 거들지 않는다 — 스스로 해 볼 자리다', () => {
    const v = againView({ tries: 1, reason: '아직', ...copy })
    expect(v.lines).not.toContain(copy.hint)
    expect(v.lines).not.toContain(copy.strong)
  })

  it('두 번째부터 한 번 거든다', () => {
    const v = againView({ tries: HINT_FROM, ...copy })
    expect(v.lines).toContain(copy.hint)
    expect(v.lines).not.toContain(copy.strong)
  })

  it('세 번째부터 더 자세히 거든다', () => {
    const v = againView({ tries: STRONG_HINT_FROM, ...copy })
    expect(v.lines).toContain(copy.hint)
    expect(v.lines).toContain(copy.strong)
  })

  it('거들 말이 없는 장면이면 그 줄은 아예 안 뜬다', () => {
    const v = againView({ tries: 9, reason: '아직' })
    expect(v.lines).toEqual(['아직', '처음부터 다시 합니다.'])
  })

  it('처음부터 다시 한다는 것을 늘 말한다 — 놀라지 않게', () => {
    for (const tries of [1, 2, 3, 7]) {
      expect(againView({ tries, ...copy }).lines).toContain('처음부터 다시 합니다.')
    }
  })
})

describe('이 게임은 시험이 아니다 — 깎는 낱말을 쓰지 않는다', () => {
  const BANNED = ['정답', '오답', '점수', '틀렸', '실패', '탈락', '등급']

  it('화면에 나가는 글에 깎는 낱말이 없다', () => {
    const copy = { hint: '먹을 진하게', strong: '왼쪽 위에서' }
    for (const tries of [1, 2, 3, 5]) {
      const v = againView({ tries, reason: '넉 자를 다 쓰지 못했다', ...copy })
      const all = [v.title, v.label, ...v.lines].join(' ')
      for (const word of BANNED) expect(all, `「${word}」이 화면에 나갔다`).not.toContain(word)
    }
  })

  it('넘어가는 이름과 다시 하는 이름이 서로 다르다', () => {
    expect(CLEARED).not.toBe(AGAIN)
  })
})
