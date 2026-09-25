// 하루의 끝 — 해가 지고, 오늘 한 일과 하지 않은 일이 한 판에 나란히 선다.
//
// 선생님(2026-09-25): 「하루의 끝을 보여 줍니다. 해 칸을 다 쓰면 오늘 한 일 / 하지 않은
// 일을 짧게 보여 주고 다음 날로 넘깁니다. 선택에 무게가 생깁니다.」
//
// 이 게임이 내내 가르치는 것은 「무엇을 포기했는가」다(core/clock.js 머리말). 그런데
// 포기한 것이 화면에 한 번도 보이지 않았다 — 하루가 끝나면 배너 한 줄이 지나가고
// 다음 장면이 시작됐고, 하지 않은 일은 게임을 다 끝낸 뒤 기록(記錄) 복사 안에서야
// 처음 보였다. 고른 것과 못 고른 것을 그 자리에서 나란히 보여 주지 않으면, 고른 일도
// 고른 것이 아니다.
//
// ⚠ 벌 주는 화면이 아니다. 「하지 않은 일」에 붉은 글씨도, 점수도, 「실패」도 없다.
//   임금의 하루가 짧았다는 사실을 적는 자리다.
const CSS = `
.dayend{position:fixed;inset:0;z-index:55;background:#0d0f11;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:26px;text-align:center;overflow:auto}
.dayend h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:6px;font-weight:400}
.dayend .date{font-size:12px;color:#6b6558;letter-spacing:2px}
.dayend .sun{width:min(420px,84vw);height:2px;background:linear-gradient(90deg,#e0a23a,#6a5230,#23282c)}
.dayend p{margin:0;font-size:17px;color:#e8e2d4;line-height:1.8;max-width:560px}
.dayend .cols{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;width:100%;max-width:640px}
.dayend .col{flex:1 1 260px;min-width:0;text-align:left;border:1px solid #2a2f34;border-radius:3px;padding:12px 14px}
.dayend .col b{display:block;font-size:12px;letter-spacing:3px;color:#8f8a7c;font-weight:400;margin-bottom:8px}
.dayend .col.did b{color:#e0a23a}
.dayend .col .it{font-size:14px;color:#e8e2d4;line-height:1.7;padding:3px 0;word-break:keep-all}
.dayend .col .it span{color:#8f8a7c;font-size:12px}
.dayend .col .none{font-size:13px;color:#6b6558}
.dayend .tail{font-size:13px;color:#8f8a7c;max-width:560px;line-height:1.8}
.dayend button{margin-top:4px;padding:13px 32px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
@media(max-width:600px){.dayend{padding:20px 14px;gap:10px}.dayend p{font-size:16px}}
`

let styled = false
function ensureStyle() {
  if (styled) return
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
    <div class="tail">${report.tail ?? '하지 않은 일도 기록에 남는다. 임금의 하루는 짧고, 고르지 않은 것은 듣지 못한 것이 된다.'}</div>
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
