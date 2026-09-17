import { SCENE_ART } from './scene-art-data.js'

const CSS = `
.loss{position:fixed;inset:0;z-index:54;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:28px;padding-top:max(28px,96px);text-align:center;overflow:auto}
.loss h2{margin:0;font-size:16px;color:#d2503a;letter-spacing:4px;font-weight:400}
.loss p{margin:0;font-size:18px;color:#e8e2d4;line-height:1.8;max-width:600px}
.loss .cards{display:flex;flex-direction:column;gap:6px;width:100%;max-width:480px;margin-top:6px}
.loss .card-row{padding:10px 14px;border:1px solid #4a3a2a;border-radius:3px;color:#a09884;
  text-decoration:line-through;text-align:left;font-size:14px}
.loss .card-row span{float:right;font-size:11px;color:#d2503a;text-decoration:none}
.loss .origin{font-size:12px;color:#6b6558}
.loss .footer{font-size:13px;color:#8f8a7c;max-width:520px;line-height:1.7}
.loss figure{margin:0;width:100%;max-width:640px}
.loss figure img{display:block;width:100%;max-height:38vh;object-fit:cover;border-radius:3px;filter:saturate(.85)}
.loss figure figcaption{font-size:11px;color:#8f8a7c;margin-top:4px;text-align:right}
.loss button{margin-top:8px;padding:12px 30px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false

// 장면 그림(ui/scene-art-data.js) — Higgsfield 로 그린 재구성 그림. 실제 사진·기록화가 아니라는
// 것을 그림 바로 아래에 적는다.
function artFigure(key) {
  const art = key && SCENE_ART[key]
  if (!art) return ''
  return `<figure><img src="${art.src}" alt="${art.alt}"><figcaption>${art.caption}</figcaption></figure>`
}
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// 소실 화면(D1 등) — 학생이 모은 사료가 사라졌음을 사초함이 왜인지와 함께 보여준다.
// 여기서 지워진 카드는 카드 목록에 지워진 것으로 남지, 화면에서 조용히 사라지지 않는다.
// 되찾을 길을 이 화면 어디에도 만들지 않는다 — 잃은 것은 잃은 것이다.
export function createLossScreen(root) {
  ensureStyle()

  return {
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'loss'
        el.innerHTML = `
          <h2>${view.title ?? ''}</h2>
          ${artFigure(view.art)}
          ${(view.lines ?? []).map(l => `<p>${l}</p>`).join('')}
          <div class="cards">${(view.cards ?? []).map(c =>
            `<div class="card-row">${c.title}<span>${c.origin ?? view.tag ?? ''}</span></div>`).join('')}</div>
          ${view.origin ? `<div class="origin">${view.origin}</div>` : ''}
          ${view.footer ? `<div class="footer">${view.footer}</div>` : ''}
          <button>사초함을 닫는다</button>`
        root.appendChild(el)
        el.querySelector('figure img')?.addEventListener('error', e => { e.target.closest('figure').remove() })
        el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
