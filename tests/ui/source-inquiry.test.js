import {it,expect} from 'vitest'
import {INQUIRIES,inquiryReady} from '../../src/data/inquiries.js'
import {inquiryHtml} from '../../src/ui/source-inquiry.js'
import {BRUSH_GUIDES} from '../../src/ui/brush-guides-data.js'
import {CHEOKHWABI_GLYPHS,ILSA_GLYPHS,isTraced} from '../../src/systems/brush-trace.js'
it('정답 구절을 하나라도 짚고 한 문장을 쓰면 비교할 수 있다',()=>{
 const s=INQUIRIES.seogye,t='외교적 위계가 바뀐다고 해석하였다.'
 expect(inquiryReady(s,{selected:['皇','勅'],text:''})).toBe(false)
 expect(inquiryReady(s,{selected:['室','奉'],text:t})).toBe(false)
 expect(inquiryReady(s,{selected:['皇','室'],text:t})).toBe(true)
 expect(inquiryReady(s,{selected:['皇','勅'],text:'위계 문제'})).toBe(false)
})
it('강화도 조약: 정답 구절을 모두 골라도, 하나만 골라도 통과한다',()=>{
 const t='청의 간섭을 막으려는 일본에게 유리하다.'
 expect(inquiryReady(INQUIRIES.ganghwa1,{selected:['자주의 나라','평등한 권리'],text:t})).toBe(true)
 expect(inquiryReady(INQUIRIES.ganghwa1,{selected:['평등한 권리'],text:t})).toBe(true)
 expect(inquiryReady(INQUIRIES.ganghwa7,{selected:['일본국 항해자'],text:t})).toBe(true)
 expect(inquiryReady(INQUIRIES.ganghwa10,{selected:['가','모두 일본국 관원이 심판한다.'].slice(1),text:'일본 관원이 재판한다.'})).toBe(true)
 expect(inquiryReady(INQUIRIES.ganghwa10,{selected:['조선국 인민과 관계되는 일이 생기더라도,'],text:t})).toBe(false)
})
it('세 조항은 서로 다른 근거와 해석 질문을 갖는다',()=>{
 expect(new Set(['ganghwa1','ganghwa7','ganghwa10'].map(id=>INQUIRIES[id].prompt)).size).toBe(3)
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

it('조선책략 빈칸 — 네 칸을 모두 맞게 채우고 한 문장을 써야 비교할 수 있다', () => {
 const s = INQUIRIES['joseon-chaeryak'], t = '청이 러시아를 막으려고 조선을 끌어들였다.'
 expect(s.kind).toBe('cloze')
 const right = { 0: '러시아', 1: '러시아', 2: '중국(청)', 3: '일본' }
 expect(inquiryReady(s, { blanks: right, text: t })).toBe(true)
 expect(inquiryReady(s, { blanks: { ...right, 2: '일본' }, text: t })).toBe(false)
 expect(inquiryReady(s, { blanks: { 0: '러시아' }, text: t })).toBe(false)
 expect(inquiryReady(s, { blanks: right, text: '청' })).toBe(false)
 const html = inquiryHtml('joseon-chaeryak')
 expect((html.match(/class="cloze-blank"/g) ?? []).length).toBe(4)
 for (const o of s.options) expect(html).toContain(o)
})
