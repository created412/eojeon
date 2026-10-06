// 「이 막의 여정」 — 막을 열 때 학생이 보는 지도 한 장.
//
// 2026-09-27 선생님, 막 첫머리의 안내(data/guide.js 의 여덟 문단)를 보시고:
//
//     「이렇게 **글로만** 있으니까 **1막이 어떤 구성이고 어떻게 진행해야 하는지 안 보여.**」
//
// 그래서 문단을 걸음으로 바꾼다. 걸음은 systems/act-map.js 가 **막의 비트에서** 뽑는다
// (그래서 지도가 게임과 어긋날 수 없다). 이 파일은 그것을 그린다 — 번호, 무리마다의
// 작은 글리프, 할 일 한 줄, 그리고 **손으로 하는 걸음의 도드라짐**. 마지막 하나가
// 선생님이 「안 보여」라고 하신 것의 답이다: 이 막에서 내가 실제로 무엇을 하게 되는지.
//
// ── 부르는 쪽이 주는 그릇(view) ────────────────────────────────────────
// main.js 의 playAct() 에서 noteScreen.show(actGuideView(...)) 자리에 이렇게 선다:
//
//   import { createActMap } from './ui/act-map.js'
//   import { actMapView } from './systems/act-map.js'
//   const actMapScreen = createActMap(root)
//   …
//   await actMapScreen.open(actMapView(ACTS[actIndex], actIndex, { intro: GAME_INTRO.slice(0, 2) }))
//
// open(view) 는 학생이 단추를 누를 때 딱 한 번 resolve 하는 Promise 를 준다. 화면을
// 걷는 일도 그 안에서 끝난다 — 부르는 쪽은 await 만 한다(ui/act-question.js 와 같은 꼴).
//
// view 의 칸 — 모두 없어도 화면은 뜬다(없으면 그 줄이 통째로 빠진다):
//   · steps      [{ id, kind, group:'read'|'walk'|'listen'|'hands', title, note, tags?, count?, handle? }]
//                **이것 하나만 있으면 지도가 된다.** systems/act-map.js 의 actMap(act) 가 만든다.
//   · title      '2막 「양요」 — 이 막의 여정'  (머리글. 없으면 '이 막의 여정')
//   · when       '고종 3년 · 1866 · 창덕궁'    (act.dateLabel 그대로. 작은 글씨 한 줄)
//   · intro      ['…', '…']  게임 전체에 대한 문장. **두 줄까지만 낸다** — 세 줄째부터는
//                지도가 다시 안내문이 된다. 세 줄을 주면 앞의 둘만 쓴다.
//   · todo       '이 막에서 할 일' 한 줄(막 데이터가 가진 것). 있으면 지도 위에 세운다.
//   · handleLine act.handle.line. `**셈**` 처럼 별 둘로 감싼 데는 굵게 나온다.
//                handle:true 로 표시된 걸음 안에 붙는다 — 표시된 걸음이 없으면 안 나온다.
//   · startLabel 단추 글씨(없으면 '이 막을 시작한다')
//   · actIndex   숫자. 지금은 title 을 부르는 쪽이 만들므로 쓰지 않는다 —
//                그릇에 남겨 두는 까닭은 부르는 쪽이 늘 같은 것을 넘기게 하려는 것이다.
//
// 활자·색은 스스로 정하지 않는다. ui/type-css.js 의 값(--read-*, --ink-*)을 받아 쓴다.
import { installTypeVars } from './type-css.js'
import { royalIcon } from './royal-icons.js'
import { GROUP_LABEL } from '../systems/act-map.js'

// 글리프 — 걸음의 무리를 한 눈에 갈라 보이는 스물넷 칸 그림.
// royal-icons.js 의 낱말 중 둘(book·compass)이 여기에 딱 맞고, 「듣기」와 「손으로」는
// 없다. 없는 둘만 여기서 그린다 — 같은 24칸·같은 1.5 굵기라 한 줄에 놓아도 식구로
// 보인다. 새 그림 파일은 하나도 늘지 않는다(빌드 천장이 13MB, 지금 10.8MB 다).
const OWN_MARKS = {
  // 귀 — 사람의 말이 임금에게 오는 걸음.
  listen: '<path d="M8.5 10.5a3.6 3.6 0 0 1 7.1 0c0 2.2-2.1 3-2.1 5.1a2.4 2.4 0 0 1-4.5 1"/><path d="M11.6 10.6a1.3 1.3 0 0 1 2.4.6"/><path d="M6 8.2A6.6 6.6 0 0 1 18 8"/>',
  // 붓 — 학생의 손이 실제로 움직이는 걸음.
  hands: '<path d="M18.6 3.6a2 2 0 0 1 2.8 2.8l-8.2 8.2-2.8-2.8 8.2-8.2Z"/><path d="m10.4 11.8 2.8 2.8"/><path d="M9.6 12.6 6 20.4l7.8-3.6"/>',
}

const mark = group => (OWN_MARKS[group]
  ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${OWN_MARKS[group]}</svg>`
  : royalIcon(group === 'walk' ? 'compass' : 'book'))

// 셋 넷 다섯을 「3」 「4」 로 적으면 셈처럼 읽힌다. 걸음은 세는 것이지 재는 것이 아니다.
const COUNT_WORD = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열']
const countWord = n => COUNT_WORD[n] ?? String(n)

const CSS = `
.actmap{position:fixed;inset:0;z-index:52;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:16px;padding:26px 18px;overflow:auto}
.actmap,.actmap *{box-sizing:border-box}
/* 지도도 종이 위에 앉는다 — 다만 종이 그림(paper-data.js)을 부르지 않고 색으로만 흉내
   낸다. 이 화면 하나 때문에 빌드가 커지지 않게. */
.actmap-sheet{width:100%;max-width:1120px;display:flex;flex-direction:column;gap:10px;
  padding:22px 30px 16px;border:1px solid #6b5a3e;border-radius:3px;
  background:linear-gradient(#efe7d2,#e4d8ba);color:var(--ink-strong,#211d16);
  box-shadow:0 14px 44px #000a, inset 0 0 70px #b39a6a2b;
  /* 얼굴은 파일 안에 실은 것을 쓴다 — 이 줄이 없으면 걸음 이름만 브라우저 기본
     글꼴로 나온다(2026-09-27 선생님: 「폰트의 문제인데 그냥 글자 크기를 키워버렸어」). */
  font-family:var(--face-body,system-ui,sans-serif)}
.actmap-kicker{margin:0;font-size:var(--read-small,14px);color:var(--ink-quiet,#4b4232);letter-spacing:.06em}
.actmap-title{margin:0;font-size:var(--read-title,24px);line-height:var(--read-lh-title,1.45);color:#4f3d21;font-weight:400}
/* 「몇 걸음인가」에 대한 답. 선생님이 안 보인다고 하신 것 중 첫째다 — 그래서 제목 바로 밑이다. */
.actmap-count{margin:0;font-size:var(--read-lead,19px);color:#3f3526}
.actmap-count b{color:#7a4a12;font-weight:600}
/* 게임 전체를 말하는 두 문장. 읽는 칸(34em)보다 넓게 두는 까닭은 이것이 **읽는 글이
   아니라 머리말**이기 때문이다 — 34em 으로 묶으면 세 줄이 되어 지도를 그만큼 아래로
   밀고, 1440×900 에서 시작 단추가 화면 밖으로 나갔다. */
.actmap-intro{margin:0;font-size:var(--read-small,14.5px);line-height:var(--read-lh-small,1.72);
  color:var(--ink-quiet,#4b4232);max-width:min(100%,58em)}
.actmap-todo{margin:0;padding:6px 0 6px 13px;border-left:3px solid #8a6a44;
  font-size:var(--read-lead,19px);line-height:var(--read-lh-body,1.7);max-width:var(--read-measure,34em)}

/* ── 길 ──────────────────────────────────────────────────────────────
   손전화에서는 한 줄(세로), 넓은 화면에서는 흐르는 판이다. 세로일 때 왼쪽에 실선이
   지나가고 번호가 그 위에 앉는다 — 그것이 「여정」이라는 말의 그림이다. */
.actmap-path{position:relative;list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.actmap-path::before{content:'';position:absolute;left:19px;top:14px;bottom:14px;width:2px;
  background:#6b5a3e3d;border-radius:2px}
.actmap-step{position:relative;display:grid;grid-template-columns:40px 1fr;gap:12px;align-items:start;
  padding:10px 12px;border:1px solid #6b5a3e33;border-radius:3px;background:#fffaf01f}
.actmap-num{display:flex;align-items:center;justify-content:center;width:38px;height:38px;
  border-radius:50%;background:#e9dfc6;border:1px solid #6b5a3e88;color:#4f3d21;
  font-size:var(--read-label,15px);font-variant-numeric:tabular-nums}
.actmap-body{display:flex;flex-direction:column;gap:4px;min-width:0}
.actmap-kind{display:flex;align-items:center;gap:6px;color:#6b5230;
  font-size:var(--read-caption,13px);letter-spacing:.06em}
.actmap-kind svg{flex:none}
.actmap-name{margin:0;font-size:var(--read-body,17.5px);line-height:1.5;color:#2c2519;
  word-break:keep-all;text-wrap:balance}
.actmap-note{margin:0;font-size:var(--read-small,14.5px);line-height:var(--read-lh-small,1.72);
  color:var(--ink-quiet,#4b4232);word-break:keep-all;overflow-wrap:break-word}
.actmap-tags{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 0;padding:0;list-style:none}
.actmap-tags li{font-size:var(--read-caption,13px);color:#5b5241;border:1px solid #6b5a3e44;
  border-radius:2px;padding:1px 7px;background:#00000008}

/* 손으로 하는 걸음 — 이 도드라짐이 「어떻게 진행해야 하는지」의 답이다.
   테두리와 번호가 함께 금색이 되고, 왼쪽에 굵은 선이 선다. 색만으로 가르지 않는다:
   「직접 한다」라는 글자가 늘 함께 있다(색을 못 가리는 학생도 읽는다). */
.actmap-step.actmap-doing{background:#fff6e0;border-color:#b07b20;border-left:4px solid #b07b20;
  box-shadow:0 2px 0 #0000000d}
.actmap-step.actmap-doing .actmap-num{background:#b07b20;border-color:#8a5c12;color:#fff8e6}
.actmap-step.actmap-doing .actmap-kind{color:#8a5c12}
.actmap-step.actmap-doing .actmap-name{color:#22201a;font-weight:600}
.actmap-hands-flag{font-size:var(--read-caption,13px);color:#8a5c12;border:1px solid #b07b2088;
  border-radius:2px;padding:1px 7px;background:#b07b201a}
/* 이 막에서 쥐는 것 하나(act.handle) — 걸음 안에 붙는다. */
.actmap-handle{margin:6px 0 0;padding:8px 10px;border:1px dashed #8a5c12aa;border-radius:3px;
  background:#b07b2014;font-size:var(--read-small,14.5px);line-height:var(--read-lh-small,1.72);
  color:#4a3a1c;word-break:keep-all}
.actmap-handle b{font-weight:600;color:#7a4a12}

.actmap-go{align-self:center;margin:10px 0 2px;padding:14px 38px;background:#3a2d20;
  border:1px solid #6a5230;color:#e0a23a;border-radius:2px;font-size:var(--read-label,15px);
  letter-spacing:3px;cursor:pointer;min-width:200px;font-family:inherit}
.actmap-go:hover{background:#4a3a2a}
.actmap-go:focus-visible{outline:2px solid #e0a23a;outline-offset:3px}

/* 넓은 화면 — 걸음이 왼쪽에서 오른쪽으로, 줄이 차면 아랫줄로 흐른다. 세로 실선은 거둔다. */
@media(min-width:900px){
  .actmap-path{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,232px),1fr));
    gap:10px;align-items:stretch}
  .actmap-path::before{display:none}
  /* align-content 를 start 로 두지 않으면, 아랫줄에서 짧은 걸음의 번호와 몸이
     칸 높이만큼 벌어져 둘 사이에 빈 구덩이가 생긴다(2막 7번 걸음에서 그랬다). */
  .actmap-step{grid-template-columns:1fr;gap:7px;padding:10px 14px 12px;align-content:start}
  .actmap-num{width:32px;height:32px}
}
/* 1200px 위에서는 칸 수를 **걸음 수에 맞춰** 잡는다(--actmap-cols 는 open() 이 건다).
   auto-fit 에 맡기면 다섯 걸음이 네 칸에 들어가 마지막 하나가 아랫줄에 외톨이로
   떨어진다 — 그 한 칸이 대개 손으로 하는 걸음이라, 하필 가장 보여야 할 것이
   버려진 것처럼 보였다. 이제 다섯은 3+2, 일곱은 4+3 으로 앉는다. */
@media(min-width:1200px){
  .actmap-path{grid-template-columns:repeat(var(--actmap-cols,4),minmax(0,1fr))}
}
/* 390px — 글씨 크기는 type-css.js 가 한 단계 내린다. 여기서는 여백만 줄인다. */
@media(max-width:760px){
  .actmap{padding:16px 12px}
  .actmap-sheet{padding:20px 16px 18px}
  .actmap-step{grid-template-columns:34px 1fr;gap:10px;padding:9px 10px}
  .actmap-num{width:32px;height:32px}
  .actmap-path::before{left:16px}
}
/* 걸음이 차례로 들어온다 — 순서가 뜻이므로 늦게 오는 것에 뜻이 있다.
   움직임을 줄여 달라고 한 학생에게는 한 번에 다 보인다. */
.actmap-step{animation:actmap-rise .34s ease-out both}
@keyframes actmap-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){
  .actmap-step{animation:none;opacity:1;transform:none}
}
.actmap-sheet{max-width:1040px;border-radius:12px;background:#19211e;color:#f3eddf;border-color:#617165;box-shadow:0 20px 60px #0008}
.actmap-kicker,.actmap-count,.actmap-kind{color:#c9b68d;text-align:center}
.actmap-title{color:#fff1d1;font-family:inherit;font-weight:600;letter-spacing:0;text-align:center}
.actmap-count{font-size:16px}.actmap-count b{color:#ecd2a0}
.actmap-intro{color:#c4c7bc;font-size:15px;text-align:center;align-self:center}
.actmap-todo{color:#f4eedf;font-size:23px;text-align:center;align-self:center;border:0;padding:8px 0;max-width:34em}
.actmap-step{background:#25312b;border-color:#63726466;border-radius:8px}
.actmap-name{color:#f2eddf;font-size:20px;font-weight:600;text-align:center}
.actmap-kind{justify-content:center}.actmap-num{justify-self:center;background:#17221b;color:#e7d6b4}
.actmap-step.actmap-doing{background:#343729;border-color:#af945d}
.actmap-step.actmap-doing .actmap-name{color:#fff0cc}
.actmap-step.actmap-doing .actmap-kind,.actmap-hands-flag{color:#e9cc91}
.actmap-details summary{padding:8px 0;cursor:pointer;text-align:center;color:#d4c6a7;font-size:15px}
.actmap-note,.actmap-handle{color:#e6dfce;font-size:17px}.actmap-handle b{color:#f0cb7e}
.actmap-tags li{color:#ddd4bf;border-color:#8c8b7466}
.actmap-step[hidden]{display:none}
.actmap-nav{display:flex;gap:18px;align-items:center;justify-content:center;color:#d1c19f;font-size:15px}
.actmap-nav button{padding:8px 18px;min-height:44px;border:1px solid #71674f;border-radius:5px;background:#233027;color:#e4d3ac;font:inherit;cursor:pointer}
.actmap-nav button:disabled{opacity:.4}
.actmap-step{animation:none}
.actmap-go{position:sticky;bottom:0;z-index:3;letter-spacing:0;font-size:19px;border-radius:6px;background:#3c3020;box-shadow:0 0 0 8px #19211e}
@media(max-height:560px){.actmap{padding:12px}.actmap-sheet{padding:16px;gap:8px}.actmap-title{font-size:22px}.actmap-todo{font-size:19px;line-height:1.5}.actmap-path{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.actmap-path::before{display:none}.actmap-step{grid-template-columns:1fr;gap:5px;padding:10px}.actmap-name{font-size:17px}.actmap-kind{font-size:12px}.actmap-num{width:26px;height:26px}.actmap-intro{font-size:14px}}
@media(max-height:560px){.actmap-sheet{padding:12px;gap:6px}.actmap-count{display:none}.actmap-step{padding:8px}.actmap-num{width:22px;height:22px}.actmap-kind svg{width:16px;height:16px}.actmap-details summary{padding:6px 0}.actmap-go{position:static;margin:0;padding:10px 28px;box-shadow:none}.actmap-kicker{font-size:14px}}
`

let styled = false
function ensureStyle(doc) {
  if (styled && doc === globalThis.document) return
  if (!doc?.head) return
  installTypeVars(doc)
  if (doc.getElementById?.('eojeon-actmap-style')) return
  const style = doc.createElement('style')
  style.id = 'eojeon-actmap-style'
  style.textContent = CSS
  doc.head.appendChild(style)
  if (doc === globalThis.document) styled = true
}

// `**셈**` 처럼 별 둘로 감싼 데만 굵게. 학생의 글이 아니라 우리가 적은 한 줄이지만,
// innerHTML 로 통째로 넣지 않는다 — 이 화면이 받는 글이 어디서 오든 태그가 되지 않게.
function emphasize(doc, el, text) {
  const pieces = String(text ?? '').split('**')
  for (const [i, piece] of pieces.entries()) {
    if (!piece) continue
    if (i % 2 === 1) {
      const strong = doc.createElement('b')
      strong.textContent = piece
      el.appendChild(strong)
    } else {
      el.appendChild(doc.createTextNode ? doc.createTextNode(piece) : Object.assign(doc.createElement('span'), { textContent: piece }))
    }
  }
}

export function createActMap(root) {
  const doc = root?.ownerDocument ?? globalThis.document
  ensureStyle(doc)

  return {
    open(view = {}) {
      return new Promise(resolve => {
        const steps = (view.steps ?? []).filter(Boolean)
        const hands = steps.filter(s => s.group === 'hands' || s.handle).length

        const el = doc.createElement('div')
        el.className = 'actmap'
        const sheet = doc.createElement('div')
        sheet.className = 'actmap-sheet'
        el.appendChild(sheet)

        if (view.when) {
          const kicker = doc.createElement('p')
          kicker.className = 'actmap-kicker'
          kicker.textContent = view.when
          sheet.appendChild(kicker)
        }

        const title = doc.createElement('h2')
        title.className = 'actmap-title type-display'
        title.textContent = view.title ?? '이 막의 여정'
        sheet.appendChild(title)

        // 「몇 걸음이고 그중 몇 군데서 내가 하는가」 — 지도의 첫 문장은 이 셈이다.
        if (steps.length) {
          const count = doc.createElement('p')
          count.className = 'actmap-count'
          emphasize(doc, count, hands
            ? `모두 **${countWord(steps.length)} 걸음**입니다. 그중 **${countWord(hands)} 군데**에서 당신이 직접 합니다.`
            : `모두 **${countWord(steps.length)} 걸음**입니다.`)
          sheet.appendChild(count)
        }

        // 게임 전체에 대한 말은 **두 문장까지**이고, 한 문단으로 붙여 낸다. 문단을
        // 둘로 두면 그만큼 지도가 아래로 밀려 1440×900 에서 시작 단추가 잘렸다.
        // 세 줄째부터는 지도가 다시 안내문이 된다 — 그래서 셋째 줄은 버린다.
        const intro = (view.intro ?? []).filter(Boolean).slice(0, 2)
        if (intro.length) {
          const p = doc.createElement('p')
          p.className = 'actmap-intro type-read'
          p.textContent = intro.join(' ')
          sheet.appendChild(p)
        }

        if (view.todo) {
          const todo = doc.createElement('p')
          todo.className = 'actmap-todo type-read'
          todo.textContent = view.todo
          sheet.appendChild(todo)
        }

        const path = doc.createElement('ol')
        path.className = 'actmap-path'
        // 넓은 화면의 칸 수 — 두 줄로 고르게 앉는 수다(다섯이면 3+2, 일곱이면 4+3).
        path.style.setProperty?.('--actmap-cols', String(Math.min(4, Math.max(3, Math.ceil(steps.length / 2)))))
        sheet.appendChild(path)

        for (const [i, step] of steps.entries()) {
          const li = doc.createElement('li')
          li.className = (step.group === 'hands' || step.handle) ? 'actmap-step actmap-doing' : 'actmap-step'
          li.style.animationDelay = `${Math.min(i, 8) * 55}ms`

          const num = doc.createElement('div')
          num.className = 'actmap-num'
          num.textContent = String(i + 1)
          li.appendChild(num)

          const body = doc.createElement('div')
          body.className = 'actmap-body'
          li.appendChild(body)

          const kind = doc.createElement('div')
          kind.className = 'actmap-kind'
          kind.innerHTML = mark(step.group)
          const label = doc.createElement('span')
          label.textContent = GROUP_LABEL[step.group] ?? ''
          kind.appendChild(label)
          if (step.group === 'hands' || step.handle) {
            const flag = doc.createElement('span')
            flag.className = 'actmap-hands-flag'
            flag.textContent = '직접 한다'
            kind.appendChild(flag)
          }
          body.appendChild(kind)

          const name = doc.createElement('p')
          name.className = 'actmap-name'
          name.textContent = step.title ?? ''
          body.appendChild(name)

          let more = body
          if (step.note) {
            const note = doc.createElement('p')
            note.className = 'actmap-note type-read'
            note.textContent = step.note
            const details = doc.createElement('details')
            details.className = 'actmap-details'
            const summary = doc.createElement('summary')
            summary.textContent = '어떻게 진행하나요?'
            details.appendChild(summary)
            details.appendChild(note)
            body.appendChild(details)
            more = details
          }

          const tags = (step.tags ?? []).filter(Boolean)
          if (tags.length) {
            const list = doc.createElement('ul')
            list.className = 'actmap-tags'
            for (const tag of tags) {
              const item = doc.createElement('li')
              item.textContent = tag
              list.appendChild(item)
            }
            more.appendChild(list)
          }

          // 이 막에서 쥐는 것 하나는 그 걸음 안에서 말한다 — 따로 떨어뜨리면
          // 「무엇을 쥐는지」와 「언제 쥐는지」가 갈라진다.
          if (step.handle && view.handleLine) {
            const handle = doc.createElement('p')
            handle.className = 'actmap-handle type-read'
            emphasize(doc, handle, view.handleLine)
            more.appendChild(handle)
          }

          path.appendChild(li)
        }

        if (steps.length > 3) {
          let at = 0
          const nav = doc.createElement('div'); nav.className = 'actmap-nav'
          const back = doc.createElement('button'); back.textContent = '이전'
          const count = doc.createElement('span')
          const next = doc.createElement('button'); next.textContent = '다음 여정'
          const paint = () => {
            Array.from(path.children).forEach((li, i) => { li.hidden = i < at * 3 || i >= (at + 1) * 3 })
            count.textContent = `${at + 1} / ${Math.ceil(steps.length / 3)}`
            back.disabled = at === 0
            next.disabled = (at + 1) * 3 >= steps.length
          }
          back.addEventListener('click', () => { if (at > 0) { at--; paint() } })
          next.addEventListener('click', () => { if ((at + 1) * 3 < steps.length) { at++; paint() } })
          nav.appendChild(back); nav.appendChild(count); nav.appendChild(next)
          sheet.appendChild(nav)
          paint()
        }

        const go = doc.createElement('button')
        go.className = 'actmap-go'
        go.textContent = view.startLabel ?? '이 막을 시작한다'
        sheet.appendChild(go)

        let done = false
        const close = () => {
          if (done) return
          done = true
          el.remove()
          resolve()
        }
        go.addEventListener('click', close)
        root.appendChild(el)
        // 뜨자마자 초점이 단추에 간다 — 손대지 않고 Enter 로만도 막이 열린다.
        // preventScroll 이 없으면 브라우저가 단추를 보이게 하려고 지도를 **맨 아래로
        // 끌어내린다.** 걸음이 일곱인 막에서 학생이 처음 보는 것이 「1막을 시작한다」
        // 단추가 되어, 제목도 첫 걸음도 화면 위로 잘려 나갔다(1440×900 에서 실제로 그랬다).
        go.focus?.({ preventScroll: true })
      })
    },
  }
}
