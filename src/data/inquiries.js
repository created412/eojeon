export const INQUIRIES = {
 // ⚠ 서계(seogye)는 2026-10-06 에 이 표에서 뺐다 — 낱말 일곱 개를 가로로 늘어놓고 「皇」「勅」을
 //   고르던 것을, 문서를 세로로 펴 놓고 「皇」과 「新印」을 찾는 판으로 갈았다
 //   (data/source-games.js SEOGYE_DOC · ui/doc-seek.js).
 // ⚠ 강화도 조약 세 조항(ganghwa1·7·10)도 2026-10-06 에 이 표에서 뺐다 — 구절을 고르고 해석을
 //   써 넣던 것을, 세 조항을 한 장에 펴 놓고 두 나라를 바꿔 읽으며 주석을 다는 판으로 갈았다
 //   (data/studies.js treaty1876 · ui/doc-study.js).
 // 빈칸 채우기 — 선생님 요청(2026-09-13): 「러시아, 중국, 일본 중에 몇 개에 빈칸을 뚫고 아이들이 채워 나가게」.
 // 『조선책략』의 뼈대(防俄·親中國·結日本·聯美國)를 나라 이름으로 스스로 세워 보게 한다. 미국 칸은 뚫지 않고 보기로만 둔다 —
 // 네 나라가 다 보기로 나와야 「러시아만 막는 나라, 나머지는 손잡을 나라」라는 구조를 가려 읽는다.
 'joseon-chaeryak':{kind:'cloze',
  question:'『조선책략』은 조선에게 어느 나라를 막고, 어느 나라와 손잡으라고 했을까?',
  context:'1880년 청의 외교관 황준헌이 일본에서 써서, 제2차 수신사 김홍집에게 들려 보낸 책이다. 조선이 어떤 나라들 사이에서 어떻게 살아남을지를 적었다.',
  instruction:'빈칸마다 알맞은 나라를 고르세요. 틀린 칸은 붉게 표시됩니다 — 다시 고를 수 있습니다.',
  options:['러시아','중국(청)','일본','미국'],
  parts:['조선은 아시아의 요충에 있어 반드시 다투는 자리가 된다. 오늘 조선의 급한 일로 ',{answer:'러시아'},'를 막는 것보다 앞서는 것이 없다. ',{answer:'러시아'},'를 막으려면 ',{answer:'중국(청)'},'과 친하고, ',{answer:'일본'},'과 맺고, 미국과 이어져 스스로 강해져야 한다.'],
  originalNote:'『조선책략』의 취지를 우리말로 옮김 · 국편 번역 전문이 아닙니다.',
  hints:['1860년 연해주를 차지하고 남쪽으로 내려오던 나라가 어디였는지 떠올려 보세요.','글쓴이 황준헌은 청의 외교관입니다. 자기 나라를 조선이 「막을」 나라로 적었을까요?'],
  prompt:'막아야 할 나라와 손잡아야 할 나라를 왜 그렇게 구분했을까요? 글쓴이의 처지를 함께 생각해 써 보세요.',
  compare:'『조선책략』은 남하하는 러시아를 가장 큰 위협으로 보고(防俄), 이를 막으려면 중국과 친하고(親中國) 일본과 맺고(結日本) 미국과 이어져야(聯美國) 한다고 했습니다. 조선 조정은 이 책을 계기로 미국과의 수교를 논의했고, 1882년 조미 수호 통상 조약을 맺었습니다.',
  counter:'청의 외교관이 쓴 책이 「중국과 친하라」고 할 때, 그 권고는 조선을 위한 것이었을까요, 청을 위한 것이었을까요? 이 책을 읽고 이듬해 영남 유생들이 올린 만인소는 무엇이라고 반대했을까요?',
  source:'https://contents.history.go.kr/mobile/hm/view.do?levelId=hm_116_0070'},
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
