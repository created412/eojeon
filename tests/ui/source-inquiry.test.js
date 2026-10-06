import {it,expect} from 'vitest'
import {INQUIRIES,inquiryReady} from '../../src/data/inquiries.js'
import {inquiryHtml} from '../../src/ui/source-inquiry.js'
import {BRUSH_GUIDES} from '../../src/ui/brush-guides-data.js'
import {CHEOKHWABI_GLYPHS,ILSA_GLYPHS,isTraced} from '../../src/systems/brush-trace.js'
// 서계는 2026-10-06 에 이 표에서 나갔다 — 문서를 세로로 펴고 「皇」과 「新印」을 찾는 판이 되었다
// (tests/data/source-reads.test.js 가 붙든다).
it('서계는 이제 사료 탐구가 아니라 제 판에서 찾는다',()=>{
 expect(INQUIRIES.seogye).toBeUndefined()
})
// 강화도 조약 세 조항도 2026-10-06 에 이 표에서 나갔다 — 세 조항을 한 장에 펴 놓고 두 나라를
// 바꿔 읽으며 주석을 다는 판이 되었다(tests/data/studies.test.js 가 붙든다).
it('강화도 조약 세 조항은 이제 사료 탐구가 아니라 뜯어 읽는 판에서 읽는다',()=>{
 for(const id of ['ganghwa1','ganghwa7','ganghwa10'])expect(INQUIRIES[id]).toBeUndefined()
})
it('남은 탐구는 해설을 처음에는 숨기고, 출처를 적는다',()=>{
 for(const id of Object.keys(INQUIRIES)){expect(inquiryHtml(id)).toContain('inquiry-comparison" hidden');expect(INQUIRIES[id].source).toContain('contents.history.go.kr')}
})
it('모든 한자는 안내선이 내장되어 있고 일부만 칠하면 완료되지 않는다',()=>{
 for(const ch of [...CHEOKHWABI_GLYPHS,...ILSA_GLYPHS]){
  const guide=BRUSH_GUIDES[ch]
  expect(guide.length).toBeGreaterThan(30)
  expect(isTraced(guide,guide.slice(0,Math.floor(guide.length*.55)))).toBe(false)
  expect(isTraced(guide,guide)).toBe(true)
 }
})

// 『조선책략』도 2026-10-06 에 이 표에서 나갔다 — 선생님: 「이건 없어도 좋을 거 같아. 복잡해.」
it('사료 탐구 표는 비어 있다 — 해석을 써 넣는 칸이 게임에 남아 있지 않다', () => {
 expect(Object.keys(INQUIRIES)).toEqual([])
 expect(inquiryHtml('joseon-chaeryak')).toBe('')
})
