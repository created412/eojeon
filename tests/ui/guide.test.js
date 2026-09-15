import { it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { guideForBeat, actGuideView, ACT_GUIDE } from '../../src/data/guide.js'

// 선생님(2026-09-15): 뭘 하는 건지 안내가 없어 불친절하다 — 모든 장면에 「지금 할 일」, 모든 막에 「이 막에서 할 일」.
it('모든 장면에 지금 할 일이 한 줄 있다', () => {
  for (const act of ACTS) for (const b of act.beats) expect(guideForBeat(b), `${act.id}/${b.id} (${b.kind})`).not.toBe('')
})

it('모든 막에 이 막에서 할 일이 있고, 첫 막은 게임 전체 설명부터 한다', () => {
  for (const [i, act] of ACTS.entries()) {
    expect(ACT_GUIDE[act.id]?.length, act.id).toBeGreaterThan(0)
    expect(actGuideView(act, i).title).toContain('이 막에서 할 일')
  }
  expect(actGuideView(ACTS[0], 0).lines.join(' ')).toContain('고종이 되어')
})
