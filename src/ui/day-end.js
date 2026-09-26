// 하루의 끝 — 해가 지고, 오늘 한 일과 하지 않은 일이 한 판에 나란히 선다.
//
// 선생님(2026-09-25): 「하루의 끝을 보여 줍니다. 오늘 한 일 / 하지 않은 일을 짧게
// 보여 주고 다음 날로 넘깁니다.」
//
// 2026-09-26 에 뜻이 한 번 바뀌었다. 하루의 셈(해 칸)을 없애고 **남은 일이 있으면
// 나갈 수 없게** 했으므로(core/clock.js · systems/freedom.js exitBlock), 이 판의
// 「하지 않은 일」은 이제 학생이 고르지 않은 것이 아니다 — 조작권·봉쇄로 그 자리에
// 갈 수 없었던 것뿐이다. 대개 비어 있고, 비어 있는 것이 옳다.
//
// ⚠ 벌 주는 화면이 아니다. 붉은 글씨도, 점수도, 「실패」도 없다. 오늘 임금이 한 일을
//   적어 두는 자리다.
//
// 2026-09-26 선생님: 「이거도 정리해줘야해. 지금 가독성이 너무 떨어져.」
// 이 판에서 잘못돼 있던 것 — 표제 「해 가 진 다」만 벌어져야 하는데 날짜줄·이름표
// (「오 늘 한 일 3」)까지 자간이 걸려 낱말이 풀어졌고, 꼬리말이 13px 회색이라
// 「…기록이 남지 않은 일이 / 다.」처럼 한 글자만 다음 줄에 떨어졌다.
// 크기·먹색·자간은 이제 ui/type-css.js 한 곳에서 온다.
import { installTypeVars } from './type-css.js'

const CSS = `
.dayend{position:fixed;inset:0;z-index:55;background:#0d0f11;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:16px;padding:26px;text-align:center;overflow:auto}
/* 표제만 벌어진다 — 해가 천천히 지는 그 속도가 글자 사이에 있다. */
.dayend h2{margin:0;font-size:var(--read-lead,15px);color:#c9c1ad;letter-spacing:.5em;font-weight:400;
  font-family:var(--face-display,serif)}
.dayend .date{font-size:var(--read-small,12px);color:var(--paper-quiet,#6b6558);letter-spacing:normal}
/* 표제·날짜·해줄 아래로는 한 칸이다 — 이끄는 줄도, 두 칸도, 꼬리말도 같은 폭·같은
   왼쪽 선에서 시작한다. 예전에는 폭이 저마다 달라 꼬리말이 판 밖에 떠 있었다. */
.dayend .sun{width:100%;max-width:860px;height:2px;background:linear-gradient(90deg,#e0a23a,#6a5230,#23282c)}
.dayend p{margin:0;font-size:var(--read-body,17px);color:var(--paper-strong,#e8e2d4);
  line-height:var(--read-lh-body,1.8);width:100%;max-width:860px;word-break:keep-all;text-wrap:balance}
.dayend .cols{display:flex;gap:16px;flex-wrap:wrap;justify-content:center;width:100%;max-width:860px}
.dayend .col{flex:1 1 320px;min-width:0;text-align:left;border:1px solid #2a2f34;border-radius:3px;padding:16px 18px}
/* 이름표에는 자간을 주지 않는다 — 「오늘 한 일」은 읽는 낱말이지 표제가 아니다. */
.dayend .col b{display:block;font-size:var(--read-label,12px);letter-spacing:.02em;color:var(--paper-quiet,#8f8a7c);
  font-weight:400;margin-bottom:10px}
.dayend .col.did b{color:#e8b45c}
.dayend .col .it{font-size:var(--read-small,14px);color:var(--paper-strong,#e8e2d4);
  line-height:var(--read-lh-small,1.7);padding:4px 0;word-break:keep-all}
.dayend .col .it span{color:var(--paper-quiet,#8f8a7c);font-size:var(--read-caption,12px)}
.dayend .col .none{font-size:var(--read-small,13px);color:var(--paper-quiet,#6b6558)}
.dayend .tail{font-size:var(--read-small,13px);color:var(--paper-quiet,#8f8a7c);
  width:100%;max-width:860px;line-height:var(--read-lh-small,1.8);
  word-break:keep-all;text-wrap:balance;text-align:left}
.dayend button{margin-top:6px;padding:14px 34px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:var(--read-label,15px);cursor:pointer}
@media(max-width:760px){.dayend{padding:20px 14px;gap:12px}.dayend h2{letter-spacing:.34em}
  .dayend .col{flex:1 1 100%;padding:13px 14px}.dayend .tail{text-align:left}}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// 판을 조립하는 일은 DOM 없이 시험할 수 있어야 한다 — 「하지 않은 일」이 조용히
// 빠지는 것이 이 화면에서 일어날 수 있는 가장 나쁜 일이다(tests/ui/day-end.test.js).
export function dayEndHtml(report) {
  const did = report.done ?? []
  const missed = report.missed ?? []
  const items = list => list.map(it => typeof it === 'string'
    ? `<div class="it">${it}</div>`
    : `<div class="it">${it.label} <span>${it.reason ?? ''}</span></div>`).join('')
  return `
    <h2>해 가 진 다</h2>
    ${report.title ? `<div class="date">${report.title}</div>` : ''}
    <div class="sun"></div>
    <p>${report.lead ?? '임금의 하루가 끝났다.'}</p>
    <div class="cols">
      <div class="col did"><b>오늘 한 일 ${did.length}</b>${items(did) || '<div class="none">하나도 하지 않았다</div>'}</div>
      <div class="col"><b>하지 않은 일 ${missed.length}</b>${items(missed) || '<div class="none">남겨 둔 것이 없다</div>'}</div>
    </div>
    <div class="tail">${report.tail ?? '하지 못한 일은 임금이 고른 것이 아니다 — 그 자리에 갈 수 없었거나, 기록이 남지 않은 일이다.'}</div>
    <button class="go">${report.buttonLabel ?? '다음 날로'}</button>`
}

export function createDayEnd(root) {
  ensureStyle()
  return {
    show(report) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'dayend'
        el.innerHTML = dayEndHtml(report)
        root.appendChild(el)
        const go = el.querySelector('.go')
        go.focus?.()
        const done = () => { el.remove(); resolve() }
        go.addEventListener('click', done)
      })
    },
  }
}
