import { describe, it, expect } from 'vitest'
import { noticeFor } from '../../src/ui/dialog.js'

// noticeFor 가 정직 고지를 고르는 세 갈래. 지금은 'staged' 등급을 쓰는 카드가
// 없어 이 분기가 죽은 코드처럼 보이지만, 2단계에서 재구성 카드가 다시 들어온다 —
// 여기서 새면 "지어낸 것"이 "실재하는 기록"으로 학생에게 읽힌다.
describe('noticeFor — 사료 카드가 다는 정직 고지', () => {
  it("grade: 'staged' 는 재구성 고지를 낸다", () => {
    const notice = noticeFor({ grade: 'staged' })
    expect(notice).toContain('기록에 남아 있지 않습니다')
  })

  it("grade: 'staged' 는 rendering 값과 무관하게 재구성 고지가 우선한다", () => {
    const notice = noticeFor({ grade: 'staged', rendering: '우리말 옮김' })
    expect(notice).toContain('기록에 남아 있지 않습니다')
    expect(notice).not.toContain('오늘날 말로 옮겼습니다')
  })

  it("rendering: '우리말 옮김' 은 번역 고지를 낸다 (grade: source)", () => {
    const notice = noticeFor({ grade: 'source', rendering: '우리말 옮김' })
    expect(notice).toContain('오늘날 말로 옮겼습니다')
  })

  it("rendering: '우리말 옮김' 은 번역 고지를 낸다 (grade: textbook)", () => {
    const notice = noticeFor({ grade: 'textbook', rendering: '우리말 옮김' })
    expect(notice).toContain('오늘날 말로 옮겼습니다')
  })

  it('원문 그대로거나 rendering 이 없으면 고지가 없다', () => {
    expect(noticeFor({ grade: 'source', rendering: '원문' })).toBe('')
    expect(noticeFor({ grade: 'textbook' })).toBe('')
    expect(noticeFor({ grade: 'source' })).toBe('')
  })
})
