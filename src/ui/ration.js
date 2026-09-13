import { RICE_NOTE } from '../systems/prices.js'

const CSS = `
.ration{position:fixed;inset:0;z-index:56;background:#12100d;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:14px;padding:26px;text-align:center;overflow:auto}
.ration h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:5px;font-weight:400}
.ration p{margin:0;font-size:18px;color:#e8e2d4;line-height:1.8;max-width:620px}
.ration .chart{width:100%;max-width:460px;display:flex;flex-direction:column;gap:7px;margin-top:4px}
.ration .row{display:flex;align-items:center;gap:10px;font-size:13px;color:#8f8a7c}
.ration .row .yr{width:150px;text-align:right;letter-spacing:1px}
.ration .row .bar{height:13px;background:#e0a23a;border-radius:2px;min-width:3px}
.ration .row.now .yr{color:#e8e2d4}
.ration .row.now .bar{background:#d2503a}
.ration .row .mul{color:#b9b2a1;letter-spacing:1px}
.ration .rice-line{font-size:15px;color:#e0a23a;letter-spacing:2px;margin-top:6px}
.ration .price-note{font-size:12px;color:#6b6558;max-width:520px;line-height:1.7}
.ration .staged{border:1px dashed #6a5230;color:#8f8a7c;font-size:12px;padding:8px 12px;
  border-radius:3px;max-width:520px;line-height:1.7}
.ration .origin{font-size:12px;color:#6b6558}
.ration .sack{width:172px;height:132px;border-radius:10px 10px 16px 16px;cursor:pointer;
  background:linear-gradient(#c9b489,#9c8659);border:1px solid #6b5a3a;
  display:flex;align-items:center;justify-content:center;color:#4a3d26;font-size:14px;letter-spacing:3px}
.ration .grain{width:100%;max-width:460px;height:74px;border-radius:3px;
  background:repeating-linear-gradient(115deg,#e6ddc4 0 6px,#cfc3a2 6px 9px,#8a7a55 9px 11px,#5c5138 11px 13px)}
.ration button{margin-top:6px;padding:12px 30px;background:#3a2d20;border:1px solid #6a5230;
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

function chartHtml(series) {
  return series.map(r => `
    <div class="row${r.act === series.length ? ' now' : ''}">
      <span class="yr">${r.label}</span>
      <span class="bar" style="width:${Math.round(r.bar * 62)}%"></span>
      <span class="mul">${r.ratio.toFixed(1)}배</span>
    </div>`).join('')
}

// G 회수(설계서 §5.G) — 두 장면을 잇달아 보여 준다. 종로에서 열여섯 해치 추이를 마주하고,
// 무위영에서 열세 달 만에 나온 급료 가마를 연다.
//
// ⚠ 절대 쌀값은 한 글자도 나가지 않는다(판정 R19). 여기 들어오는 series 에는 지수 값이
//    아예 없고 배수만 있다.
// ⚠ 이 화면에는 시계를 붙이지 않는다. 촉박은 C1·C2·C3 세 번뿐이다.
// ⚠ 임금이 시전과 무위영을 직접 본 기록은 없다 — 장면 자체에 재구성 고지를 붙인다.
//    그러나 학생이 거기서 보는 것(쌀값 추세·겨와 모래)은 재구성이 아니다. 둘을 나눠 적는다.
export function createRation(root) {
  ensureStyle()

  return {
    open(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'ration'
        root.appendChild(el)

        function market() {
          const m = view.market
          el.innerHTML = `
            <h2>${m.title}</h2>
            ${m.lines.map(l => `<p>${l}</p>`).join('')}
            <div class="chart">${chartHtml(m.series)}</div>
            <div class="rice-line">${m.riceText}</div>
            <div class="price-note">${RICE_NOTE}</div>
            <div class="staged">${m.stagedNote}</div>
            <div class="origin">${m.origin}</div>
            <button>무위영으로 간다</button>`
          el.querySelector('button').addEventListener('click', sack)
        }

        function sack() {
          const s = view.ration
          el.innerHTML = `
            <h2>${s.title}</h2>
            ${s.lines.map(l => `<p>${l}</p>`).join('')}
            <div class="sack">${s.sackLabel}</div>
            <div class="origin">${s.origin}</div>
            <button>${s.buttonLabel}</button>`
          const open = () => reveal()
          el.querySelector('.sack').addEventListener('click', open)
          el.querySelector('button').addEventListener('click', open)
        }

        function reveal() {
          const r = view.ration.reveal
          el.innerHTML = `
            <h2>${view.ration.title}</h2>
            <div class="grain"></div>
            ${r.lines.map(l => `<p>${l}</p>`).join('')}
            <div class="staged">${r.soldierNote}</div>
            <div class="origin">${r.origin}</div>
            <button>돌아간다</button>`
          el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
        }

        market()
      })
    },
  }
}
