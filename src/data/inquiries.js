export const INQUIRIES = {
 // ⚠ 서계(seogye)는 2026-10-06 에 이 표에서 뺐다 — 낱말 일곱 개를 가로로 늘어놓고 「皇」「勅」을
 //   고르던 것을, 문서를 세로로 펴 놓고 「皇」과 「新印」을 찾는 판으로 갈았다
 //   (data/source-games.js SEOGYE_DOC · ui/doc-seek.js).
 // ⚠ 강화도 조약 세 조항(ganghwa1·7·10)도 2026-10-06 에 이 표에서 뺐다 — 구절을 고르고 해석을
 //   써 넣던 것을, 세 조항을 한 장에 펴 놓고 두 나라를 바꿔 읽으며 주석을 다는 판으로 갈았다
 //   (data/studies.js treaty1876 · ui/doc-study.js).
 // ⚠ 『조선책략』의 빈칸 채우기 + 해석 쓰기도 2026-10-06 에 이 표에서 뺐다 — 선생님: 「이건 없어도
 //   좋을 거 같아. 복잡해.」 빈칸에 나라를 놓고 글쓴이를 따지는 판이 되었다(data/studies.js chaeryak1880).
 //   이 표는 이제 비어 있다. 옛 저장에 남은 탐구 기록을 읽는 길(main.js buildRecordText)만 남는다.
}
export const MIN_ANSWER=8
// 채점이 아니라 '근거를 짚고 생각을 적었는가'만 본다. 정답 구절을 하나라도 짚었으면 되고, 더 골라도 막지 않는다.
export const clozeBlanks=spec=>(spec.parts??[]).filter(p=>typeof p!=='string')
// 빈칸은 모두 맞아야 한다 — 이 활동은 나라 이름을 제자리에 세우는 것 자체가 내용이다. 해석은 서계와 같은 기준.
export function clozeCorrect(spec,record){
 const got=record?.blanks??{}
 return clozeBlanks(spec).every((b,i)=>got[i]===b.answer)
}
export function inquiryReady(spec,record){
 if(spec.kind==='cloze')return clozeCorrect(spec,record)&&answerLength(record?.text)>=MIN_ANSWER
 const selected=record?.selected??[]
 return selected.some(s=>spec.targets.includes(s))&&answerLength(record?.text)>=MIN_ANSWER
}
export const answerLength=t=>String(t??'').replace(/\s/g,'').length
