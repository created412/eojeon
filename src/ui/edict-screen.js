const CSS = `
.edict{position:fixed;inset:0;z-index:56;background:#0d0e10;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:26px;text-align:center;overflow:auto}
.edict h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:6px;font-weight:400}
.edict p{margin:0;font-size:18px;color:#e8e2d4;line-height:1.8;max-width:620px}
.edict .rows{width:100%;max-width:560px;border:1px solid #2a2f34;border-radius:3px;overflow:hidden;flex-shrink:0}
.edict .r{display:flex;gap:12px;padding:9px 12px;font-size:13px;color:#b9b2a1;
  border-bottom:1px solid #1c2024;text-align:left;line-height:1.6}
.edict .r:last-child{border-bottom:0}
.edict .r .d{flex:none;width:78px;color:#8f8a7c;letter-spacing:1px}
.edict .r.mark{background:#1a1512;color:#e8e2d4}
.edict .r.mark .d{color:#e0a23a}
.edict .paper{max-width:600px;background:#e8e2d4;color:#23201a;border-radius:4px;
  padding:22px 24px;line-height:1.9;font-size:17px;text-align:left;white-space:pre-wrap}
.edict .paper .origin{font-size:13px;color:#5e5849;margin-top:12px;white-space:normal}
.edict .rendered{font-size:12px;color:#7a7462;margin-top:10px;white-space:normal}
.edict .origin{font-size:12px;color:#6b6558;max-width:560px;line-height:1.7}
.edict .gloss{max-width:560px;border:1px solid #2a2f34;border-radius:3px;padding:9px 13px;
  font-size:13px;color:#b9b2a1;line-height:1.8;text-align:left}
.edict .unknown{border:1px solid #3a4248;border-radius:3px;padding:10px 14px;max-width:560px;
  font-size:13px;color:#8f8a7c;line-height:1.7}
.edict button{margin-top:6px;padding:13px 32px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

function rowsHtml(rows) {
  return rows.map(r =>
    `<div class="r${r.mark ? ' mark' : ''}"><span class="d">${r.lunar}</span><span>${r.text}</span></div>`
  ).join('')
}

// 국상 화면(설계서 §7.6) — 『고종실록』 19권 고종 19년 6월 기사를 날짜별로 펼쳐 놓고,
// 그 가운데 하나를 학생이 자기 이름으로 내리게 한다. 벌이 아니라 사실이다.
//
// ⚠ 재구성 고지를 붙이지 않는다. 이것은 실록이다(판정 R11 · 검증 B 2항). 붙는 것은
//    「기록의 내용을 오늘날 말로 옮겼습니다」 — 옮김 고지뿐이다. 둘은 서로를 대신하지 않는다.
// ⚠ 국상이 언제 취소됐는지, 왕비가 언제 돌아왔는지는 실록에서 특정하지 못했다.
//    이 화면은 장례가 시작되는 데까지만 보여주고 그 뒤를 말하지 않는다.
// ⚠ 시계를 붙이지 않는다.
export function createEdict(root) {
  ensureStyle()

  return {
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'edict'
        root.appendChild(el)

        function before() {
          el.innerHTML = `
            <h2>${view.title}</h2>
            ${view.lines.map(l => `<p>${l}</p>`).join('')}
            <div class="rows">${rowsHtml(view.rows)}</div>
            <div class="origin">${view.rowsOrigin}</div>
            ${view.glossary ? `<div class="gloss">${view.glossary}</div>` : ''}
            <div class="paper">${view.hasi.text}
              <div class="origin">${view.hasi.origin}</div>
              <div class="rendered">※ 기록의 내용을 오늘날 말로 옮겼습니다</div></div>
            <button>${view.buttonLabel}</button>`
          el.querySelector('button').addEventListener('click', after)
        }

        function after() {
          const a = view.after
          el.innerHTML = `
            <h2>${view.title}</h2>
            ${a.lines.map(l => `<p>${l}</p>`).join('')}
            <div class="rows">${rowsHtml([{ ...a.objection, mark: true }])}</div>
            <div class="origin">${a.origin}</div>
            ${view.closing.map(l => `<div class="unknown">${l}</div>`).join('')}
            <button>다음</button>`
          el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
        }

        before()
      })
    },
  }
}
