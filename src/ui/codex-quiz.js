import { installTypeVars } from './type-css.js'
import { MAX_TEXT, excerptsOf, matchedOf } from '../systems/codex-quiz.js'

// 막 끝 사초함 질문 화면.
//
// 2026-09-26 선생님, 이야기 전면 개편 여섯 가지 가운데 하나: 「막 끝 사초함 질문 —
// 그 막에 모은 문서로만 답할 수 있는 질문을 하나 낸다. 안 모은 학생은 답을 못 한다.
// 벌이 아니라 「모아 둔 것이 힘이 된다」를 몸으로 아는 자리다.」
//
// 이 화면이 하는 일은 하나다: 학생이 그동안 모은 문서를 **자기 손으로 근거로 쓰게**
// 한다. 사초함은 지금까지 쌓이기만 했다 — 열어 보면 목록이 있고, 그 목록을 쓰는
// 자리가 없었다. 여기가 그 자리다. ui/source-inquiry.js 가 카드 한 장 안에서 하던
// 것(근거를 표시하고 해석을 쓴다)을, 막 하나 전체의 사초함으로 넓힌 꼴이다.
//
// ── 문 잠그지 않기 ─────────────────────────────────────────────────────
// 이 화면의 가장 위험한 실패는 「문서를 안 모은 학생이 막 끝에서 멈추는 것」이다.
// 그래서 셋을 지킨다.
//   ① 고른 것이 없어도 넘어간다. 단추의 말이 바뀔 뿐이다.
//   ② 해설(explain)은 **누구에게나** 나온다. 안 모은 학생이 역사 없이 남지 않는다.
//   ③ 없던 문서는 「어디에 있었는지」로만 적는다 — 「왜 안 주웠느냐」가 아니다.
// 점수도, 셈도, 맞고 틀림의 말도 이 화면에 없다.
//
// ── 부르는 쪽과의 약속(contract) ────────────────────────────────────────
// createCodexQuiz(root) → { open(view) : Promise<result> }
//   open() 은 화면을 root 에 붙이고, 학생이 「다음」을 누를 때 **정확히 한 번** resolve
//   한다(그 뒤로 몇 번을 눌러도 다시 풀리지 않는다). 타이머는 쓰지 않는다.
//
// view — systems/codex-quiz.js 의 quizView(act, state) 가 그대로 만들어 준다.
//   act      : 막 번호(1~5). 화면 머리의 「2막 · 사초함」에 쓴다.
//   question : 질문 한 줄. 필수.
//   gloss    : 질문 안의 어려운 낱말 한 줄 풀이. 없으면 ''(그 줄이 안 뜬다).
//   held     : 학생이 지금 든 사료 **카드 객체** 배열 — data/sources.js 의 카드 그대로
//              ({id,title,origin,excerpt,…}). id 목록이 아니다. 모은 차례를 지킨다.
//   wants    : 이 질문에 닿는 문서 id 배열. 화면은 이것을 **표시하지 않는다** —
//              고르기 전에 답이 보이면 이 자리가 없어지는 것과 같다.
//   explain  : 해설. 빈 줄(\n\n)로 문단을 가른다. 누구에게나 보인다.
//   origin   : { [sourceId]: '그 문서는 …에 있었다' } — 없던 문서를 적을 때 쓴다.
//   absent   : [{ id, title, where }] — origin 에서 이미 뽑아 둔 것(quizView 가 넣는다).
//   canAnswer: 질문에 닿는 문서를 한 장이라도 들었는가. **문을 잠그는 데 쓰지 않는다** —
//              화면이 말을 어떻게 걸지만 가른다.
//   labels   : (선택) 화면의 말을 갈아 끼울 자리. LABELS 의 열쇠를 골라 덮어쓴다.
//
// result — open() 이 풀어 주는 것. 부르는 쪽이 기록(state)에 담는다.
//   picked  : 학생이 고른 문서 id 배열(고른 차례 그대로).
//   text    : 학생이 쓴 한 줄(최대 MAX_TEXT 자). 안 썼으면 ''.
//   matched : picked 가운데 wants 에 든 것. **셈하지 말 것** — 기록으로만 쓴다.
//   missed  : wants 가운데 고르지 않은 것. 다음 막의 되돌아보기에 쓸 수 있다.
//
// ※ picked 가 빈 배열이어도 정상이다. 그것도 하나의 결과다.

export const LABELS = {
  tag: '사초함',
  ask: '사초함을 열어, 이 질문에 닿는 문서를 고른다. 한 장이어도 좋다.',
  emptyHand: '사초함이 비어 있다. 고를 것이 없어도 이 질문의 해설은 읽을 수 있다.',
  mine: '내 말로 한 줄 (써도 되고 안 써도 된다)',
  minePlaceholder: '내가 고른 문서에는 …라고 적혀 있으므로, …라고 답한다.',
  submitWith: '이 문서로 답한다',
  submitWithout: '고르지 않고 해설을 읽는다',
  statusIdle: '문서를 골라 보세요. 고른 문서의 글이 질문 옆에 그대로 놓입니다.',
  answerHead: '문서가 말하는 것',
  quoteHead: '내가 고른 문서',
  noneHead: '고른 문서가 없다',
  noneBody: '이 질문에 닿는 글을 이번에는 놓지 않았다. 해설은 아래에 그대로 있다.',
  absentHead: '사초함에 없던 문서',
  // 5막에는 「다음 막」이 없다 — 어느 막에서 읽어도 참인 문장으로 둔다.
  absentFoot: '문서 한 장이 이 자리에서 무엇을 할 수 있는지, 이제 보았다.',
  mineHead: '내가 쓴 한 줄',
  explainHead: '해설',
  next: '다 음',
}

// 자간은 표제 한 줄에만 남는다(ui/type-css.js §2). 활자 크기·줄간·먹색은 전부
// --read-* 에서 받아 쓰고, 그 변수가 없는 빌드에서도 예전 값으로 서게 대비책을 적는다.
const CSS = `
.cquiz{position:fixed;inset:0;background:#0f1113;z-index:53;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:16px;padding:28px 22px;overflow:auto}
.cquiz .cquiz-sheet{position:relative;width:100%;max-width:880px;box-sizing:border-box;
  padding:34px 40px 30px;border:1px solid #6b5a3e;border-radius:3px;color:var(--ink-strong,#23201a);
  background:#e9dfc6 center/cover no-repeat;background-image:var(--hanji);
  box-shadow:0 14px 44px #000a, inset 0 0 70px #b39a6a2b;
  display:flex;flex-direction:column;gap:18px;align-items:stretch;
  font-family:var(--face-body);word-break:keep-all;overflow-wrap:break-word}
.cquiz .cquiz-sheet::after{content:'';position:absolute;inset:6px;border:1px solid #6b5a3e44;
  border-radius:2px;pointer-events:none}
/* 판은 조작하는 것이 아니라 담는 것이다 — 초점 테를 두르지 않는다. 첫 Tab 이 사초함의
   첫 칸으로 들어가고, 거기서부터 점선 테가 어디 있는지를 말한다. */
.cquiz .cquiz-sheet:focus{outline:none}
.cquiz .cquiz-tag{font-size:var(--read-label,13px);color:var(--ink-quiet,#5e4a2c);letter-spacing:.22em;
  font-family:var(--face-display,serif);margin:0}
.cquiz .cquiz-q{margin:0;font-family:var(--face-display,serif);font-size:var(--read-title,22px);
  line-height:var(--read-lh-title,1.5);color:#3a2d20;font-weight:400;text-align:left}
.cquiz .cquiz-gloss{margin:0;font-size:var(--read-small,14px);line-height:var(--read-lh-small,1.7);
  color:var(--ink-quiet,#5e4a2c);border-left:2px solid #8a6a4466;padding-left:12px}
.cquiz .cquiz-ask{margin:0;font-size:var(--read-body,17px);line-height:var(--read-lh-body,1.8);
  color:var(--ink-strong,#23201a)}

/* 사초함 — 학생이 든 문서만 놓인다. 질문에 닿는 것을 앞으로 끌어내지 않는다. */
.cquiz .cquiz-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:12px;margin:0}
.cquiz .cquiz-card{display:flex;flex-direction:column;gap:6px;text-align:left;cursor:pointer;
  background:#00000008;border:1px solid #8a6a4477;border-radius:3px;padding:14px 16px;
  font-family:inherit;color:var(--ink-strong,#23201a);word-break:keep-all}
.cquiz .cquiz-card:hover{background:#8a6a4418}
/* 초점과 고름을 한눈에 갈라 놓는다. 화면 확인(1440·390) 중에 드러난 것이다: 초점 테가
   고른 테와 같은 색·같은 굵기라, 첫 칸에 초점이 가 있는 것만으로 **이미 한 장을 고른
   것처럼** 보였다. 초점은 점선으로 떨어뜨려 두르고, 고른 것만 실선으로 두른다 —
   거기에 「근거 1」이라는 글자까지 붙으므로 색을 못 보는 눈에도 갈린다. */
.cquiz .cquiz-card:focus-visible{outline:2px dashed #5e4a2c;outline-offset:3px}
.cquiz .cquiz-card[aria-pressed=true]{border-color:#8a3b22;border-width:2px;padding:13px 15px;
  background:#8a3b2214;box-shadow:inset 0 0 0 1px #8a3b2233}
.cquiz .cquiz-card-title{font-size:var(--read-body,16px);line-height:var(--read-lh-small,1.6)}
.cquiz .cquiz-card-origin{font-size:var(--read-caption,12px);line-height:1.55;color:var(--ink-quiet,#5e4a2c)}
.cquiz .cquiz-card-mark{font-size:var(--read-caption,12px);color:#8a3b22;letter-spacing:.14em}
.cquiz .cquiz-empty{margin:0;font-size:var(--read-small,15px);line-height:var(--read-lh-small,1.8);
  color:var(--ink-quiet,#5e4a2c);border:1px dashed #8a6a4477;border-radius:3px;padding:16px 18px}

.cquiz .cquiz-mine{display:block;font-size:var(--read-label,14px);color:var(--ink-quiet,#5e4a2c);margin:0}
.cquiz .cquiz-text{display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:13px 14px;
  font:inherit;font-size:var(--read-body,16px);line-height:var(--read-lh-body,1.8);
  color:var(--ink-strong,#23201a);background:#fffaf0aa;border:1px solid #8a6a4477;border-radius:2px;
  resize:vertical}
.cquiz .cquiz-status{margin:0;font-size:var(--read-small,13px);line-height:var(--read-lh-small,1.7);
  color:var(--ink-quiet,#5e4a2c);min-height:1.2em}
.cquiz .cquiz-submit,.cquiz .cquiz-next{width:100%;padding:14px;cursor:pointer;font-family:inherit;
  font-size:var(--read-label,15px);letter-spacing:.14em;border-radius:2px;
  border:1px solid #8a6a44;background:#00000008;color:#5e4a2c}
.cquiz .cquiz-submit:hover,.cquiz .cquiz-next:hover{background:#8a6a4418}
.cquiz .cquiz-next{border-color:#6a5230;background:#3a2d20;color:#e0a23a}
.cquiz .cquiz-next:hover{background:#4a3a2a}

/* 답이 선 뒤 — 질문과 인용을 **나란히** 놓는다. 답이 문서의 말로 보여야 한다. */
.cquiz .cquiz-answer{display:flex;flex-direction:column;gap:18px;margin:0;
  border-top:1px solid #8a6a4466;padding-top:20px}
.cquiz .cquiz-pair{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
.cquiz .cquiz-pair-q{flex:1 1 240px;min-width:0;font-family:var(--face-display,serif);
  font-size:var(--read-lead,18px);line-height:var(--read-lh-title,1.6);color:#3a2d20}
.cquiz .cquiz-quotes{flex:2 1 340px;min-width:0;display:flex;flex-direction:column;gap:14px}
.cquiz .cquiz-quote{border-left:3px solid #8a6a44;padding:2px 0 2px 16px}
.cquiz .cquiz-quote b{display:block;font-weight:400;font-size:var(--read-label,14px);color:var(--ink-quiet,#5e4a2c)}
.cquiz .cquiz-quote .cquiz-line{margin:8px 0 0;font-size:var(--read-body,16px);
  line-height:var(--read-lh-body,1.85);white-space:pre-wrap;color:var(--ink-strong,#23201a)}
.cquiz .cquiz-quote small{display:block;margin-top:8px;font-size:var(--read-caption,12px);
  line-height:1.6;color:var(--ink-quiet,#5e4a2c)}
.cquiz .cquiz-none{flex:2 1 340px;min-width:0;border:1px dashed #8a6a4477;border-radius:3px;padding:14px 16px}
.cquiz .cquiz-none b{display:block;font-weight:400;font-size:var(--read-label,14px);color:var(--ink-quiet,#5e4a2c)}
.cquiz .cquiz-none p{margin:8px 0 0;font-size:var(--read-small,15px);line-height:var(--read-lh-small,1.8);
  color:var(--ink-quiet,#5e4a2c)}

.cquiz .cquiz-absent{margin:0;border:1px dashed #8a6a4477;border-radius:3px;padding:16px 18px;
  background:#00000006}
.cquiz .cquiz-absent b{display:block;font-weight:400;font-size:var(--read-label,14px);
  color:var(--ink-quiet,#5e4a2c);letter-spacing:.06em;margin-bottom:10px}
.cquiz .cquiz-absent-row{font-size:var(--read-small,15px);line-height:var(--read-lh-small,1.8);
  color:var(--ink-strong,#23201a);padding:6px 0;border-bottom:1px solid #8a6a4433}
.cquiz .cquiz-absent-row:last-of-type{border-bottom:0}
.cquiz .cquiz-absent-row span{display:block;font-size:var(--read-caption,13px);color:var(--ink-quiet,#5e4a2c)}
.cquiz .cquiz-absent-foot{margin:12px 0 0;font-size:var(--read-small,14px);
  line-height:var(--read-lh-small,1.8);color:var(--ink-quiet,#5e4a2c)}

.cquiz .cquiz-explain{margin:0}
.cquiz .cquiz-explain b{display:block;font-weight:400;font-size:var(--read-label,14px);
  color:var(--ink-quiet,#5e4a2c);letter-spacing:.06em;margin-bottom:10px}
.cquiz .cquiz-explain p{margin:0 0 12px;font-size:var(--read-body,16.5px);
  line-height:var(--read-lh-body,1.9);color:var(--ink-strong,#23201a);text-wrap:pretty}
.cquiz .cquiz-explain p:last-child{margin-bottom:0}
/* 학생이 쓴 한 줄은 사관이 받아 적은 것이다 — 종이 위에 한 칸을 내어 준다
   (ui/act-end.js .reason 과 같은 자리). textContent 로만 넣는다. */
.cquiz .cquiz-mine-shown{margin:0;border-left:3px solid #8a3b2299;padding:2px 0 2px 16px}
.cquiz .cquiz-mine-shown b{display:block;font-weight:400;font-size:var(--read-label,14px);
  color:var(--ink-quiet,#5e4a2c)}
.cquiz .cquiz-mine-shown p{margin:8px 0 0;font-size:var(--read-body,16px);
  line-height:var(--read-lh-body,1.85);white-space:pre-wrap;color:var(--ink-strong,#23201a)}

@media(max-width:760px){
  .cquiz{padding:18px 14px}
  .cquiz .cquiz-sheet{padding:24px 18px 22px;gap:15px}
  .cquiz .cquiz-grid{grid-template-columns:1fr}
  .cquiz .cquiz-pair{flex-direction:column;gap:14px}
}
/* 종이가 들어오는 짧은 숨 하나. 「움직임을 줄임」을 켠 기기에서는 아예 안 건다. */
@media(prefers-reduced-motion:no-preference){
  .cquiz .cquiz-sheet{animation:cquiz-in .28s ease-out both}
  @keyframes cquiz-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.id = 'eojeon-cquiz-style'
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

// 해설·인용의 빈 줄(\n\n)을 문단으로 가른다. 한 줄 안의 \n 은 종이 위에서 그대로
// 살려야 하므로(비문의 줄바꿈이 뜻이다) white-space:pre-wrap 에 맡기고 여기서 건드리지 않는다.
const paragraphs = (text) => String(text ?? '')
  .split(/\n\s*\n/)
  .map(p => p.trim())
  .filter(Boolean)

const labelsOf = (view) => ({ ...LABELS, ...(view?.labels ?? {}) })

// ── 묻는 판 ─────────────────────────────────────────────────────────────
// 순수 함수다. DOM 없이 시험할 수 있어야 한다(tests 환경이 node 다).
export function codexQuizHtml(view) {
  const L = labelsOf(view)
  const held = view?.held ?? []
  const cards = held.map((card, i) => `
      <button type="button" class="cquiz-card" data-id="${esc(card.id)}" aria-pressed="false"
        aria-label="${esc(card.title)} — 근거로 고른다">
        <span class="cquiz-card-title">${esc(card.title)}</span>
        <span class="cquiz-card-origin">${esc(card.origin ?? '')}</span>
        <span class="cquiz-card-mark" data-mark="${i}"></span>
      </button>`).join('')

  // 판 자체가 초점을 받는다(tabindex="-1"). 첫 칸에 초점을 주면 그 테가 「이미 한 장을
  // 골랐다」로 읽힌다 — 화면을 눈으로 보고 고친 자리다.
  return `<div class="cquiz-sheet type-read" tabindex="-1">
      <p class="cquiz-tag type-display">${esc(view?.act ?? '')}막 · ${esc(L.tag)}</p>
      <h2 class="cquiz-q">${esc(view?.question ?? '')}</h2>
      ${view?.gloss ? `<p class="cquiz-gloss">${esc(view.gloss)}</p>` : ''}
      <p class="cquiz-ask">${esc(L.ask)}</p>
      ${held.length
        ? `<div class="cquiz-grid" role="group" aria-label="사초함의 문서">${cards}</div>`
        : `<p class="cquiz-empty">${esc(L.emptyHand)}</p>`}
      <label class="cquiz-mine">${esc(L.mine)}
        <textarea class="cquiz-text" rows="2" maxlength="${MAX_TEXT}"
          placeholder="${esc(L.minePlaceholder)}"></textarea></label>
      <p class="cquiz-status" role="status" aria-live="polite">${esc(L.statusIdle)}</p>
      <button type="button" class="cquiz-submit">${esc(held.length ? L.submitWith : L.submitWithout)}</button>
    </div>`
}

// ── 답이 선 판 ───────────────────────────────────────────────────────────
// 고른 문서의 글을 질문 **옆에** 놓는다. 그리고 해설은 고른 것이 있든 없든 나온다.
// 없던 문서는 「어디에 있었는가」로만 적는다 — 이 화면에서 가장 조심하는 문장들이다.
export function codexQuizAnswerHtml(view, { picked = [], text = '' } = {}) {
  const L = labelsOf(view)
  const quotes = excerptsOf(picked)
  const absent = view?.absent ?? []

  const quoteSide = quotes.length
    ? `<div class="cquiz-quotes">${quotes.map(q => `
          <div class="cquiz-quote">
            <b>${esc(q.title)}</b>
            <p class="cquiz-line">${esc(q.excerpt)}</p>
            <small>${esc(q.origin ?? '')}</small>
          </div>`).join('')}</div>`
    : `<div class="cquiz-none"><b>${esc(L.noneHead)}</b><p>${esc(L.noneBody)}</p></div>`

  const absentBox = absent.length
    ? `<div class="cquiz-absent"><b>${esc(L.absentHead)}</b>
        ${absent.map(a => `<div class="cquiz-absent-row">『${esc(a.title)}』<span>${esc(a.where)}</span></div>`).join('')}
        <p class="cquiz-absent-foot">${esc(L.absentFoot)}</p></div>`
    : ''

  // 학생이 쓴 글은 여기서 문자열로 넣지 않는다 — 판이 붙은 뒤 textContent 로 채운다.
  const mineBox = String(text ?? '').trim()
    ? `<div class="cquiz-mine-shown"><b>${esc(L.mineHead)}</b><p></p></div>`
    : ''

  return `<div class="cquiz-answer">
      <div class="cquiz-pair">
        <div class="cquiz-pair-q">${esc(view?.question ?? '')}</div>
        ${quoteSide}
      </div>
      ${mineBox}
      ${absentBox}
      <div class="cquiz-explain"><b>${esc(L.explainHead)}</b>
        ${paragraphs(view?.explain).map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <button type="button" class="cquiz-next">${esc(L.next)}</button>
    </div>`
}

// 고른 장수에 따라 바뀌는 안내 한 줄. 「몇 장 중 몇 장」처럼 셈하지 않는다 —
// 셈이 보이면 학생이 그것을 점수로 읽는다.
export function statusLine(view, pickedCount) {
  const L = labelsOf(view)
  if (pickedCount === 0) return L.statusIdle
  if (pickedCount === 1) return '한 장을 놓았다. 더 놓아도 되고, 이대로 답해도 된다.'
  return '여러 장을 나란히 놓았다. 놓은 차례대로 질문 옆에 선다.'
}

export function createCodexQuiz(root) {
  ensureStyle()

  return {
    open(view) {
      return new Promise(resolve => {
        const L = labelsOf(view)
        const el = document.createElement('div')
        el.className = 'cquiz'
        el.innerHTML = codexQuizHtml(view)
        root.appendChild(el)

        const sheet = el.querySelector('.cquiz-sheet')
        const area = el.querySelector('.cquiz-text')
        const status = el.querySelector('.cquiz-status')
        const submit = el.querySelector('.cquiz-submit')

        const picked = []                 // 고른 차례를 지킨다 — 그것이 학생의 논증 순서다
        let done = false                  // resolve() 는 정확히 한 번이다
        let answered = false

        function paint() {
          for (const b of el.querySelectorAll('.cquiz-card')) {
            const on = picked.includes(b.dataset.id)
            b.setAttribute('aria-pressed', String(on))
            const mark = b.querySelector('.cquiz-card-mark')
            if (mark) mark.textContent = on ? `근거 ${picked.indexOf(b.dataset.id) + 1}` : ''
          }
          status.textContent = statusLine(view, picked.length)
          submit.textContent = picked.length ? L.submitWith : L.submitWithout
        }

        for (const b of el.querySelectorAll('.cquiz-card')) {
          // <button> 이므로 Enter·Space 는 브라우저가 click 으로 바꿔 준다 —
          // 손가락과 키보드가 같은 한 자리를 지난다.
          b.addEventListener('click', () => {
            const id = b.dataset.id
            const i = picked.indexOf(id)
            if (i >= 0) picked.splice(i, 1)
            else picked.push(id)
            paint()
          })
        }

        function showAnswer() {
          if (answered) return
          answered = true
          const text = area?.value ?? ''
          const panel = document.createElement('div')
          panel.innerHTML = codexQuizAnswerHtml(view, { picked, text })
          const answer = panel.firstElementChild
          // 학생이 쓴 글 — innerHTML 에 절대 섞지 않는다(ui/act-end.js 와 같은 규칙).
          const mine = answer.querySelector('.cquiz-mine-shown p')
          if (mine) mine.textContent = text.trim()
          sheet.appendChild(answer)

          // 묻는 판은 잠근다 — 지운다는 뜻이 아니다. 학생이 자기가 무엇을 골랐는지
          // 그대로 보면서 해설을 읽어야 한다.
          submit.remove()
          for (const b of el.querySelectorAll('.cquiz-card')) b.disabled = true
          if (area) area.readOnly = true

          const next = answer.querySelector('.cquiz-next')
          next.addEventListener('click', finish)
          next.focus()
          answer.scrollIntoView({ block: 'nearest' })
        }

        function finish() {
          if (done) return
          done = true
          el.remove()
          document.removeEventListener('keydown', onKey)
          resolve({
            picked: [...picked],
            text: String(area?.value ?? '').slice(0, MAX_TEXT),
            matched: matchedOf({ wants: view?.wants ?? [] }, picked),
            missed: (view?.wants ?? []).filter(id => !picked.includes(id)),
          })
        }

        // 키보드만으로도 끝까지 간다. 글을 쓰는 칸에서는 Enter 가 줄바꿈이어야 하므로
        // 그 자리는 비켜 준다. 타이머는 쓰지 않는다 — 기다리게 하는 장치가 없다.
        function onKey(e) {
          if (e.key !== 'Enter') return
          if (e.target === area) return
          if (e.target?.classList?.contains('cquiz-card')) return   // 단추가 스스로 처리한다
          e.preventDefault()
          if (answered) finish()
          else showAnswer()
        }
        document.addEventListener('keydown', onKey)

        submit.addEventListener('click', showAnswer)
        paint()
        // 초점은 판에 둔다 — 여기서부터 Tab 으로 사초함에 들어간다.
        sheet.focus({ preventScroll: true })
      })
    },
  }
}
