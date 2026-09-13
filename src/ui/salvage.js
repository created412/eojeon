export const MAX_KEEP = 3

const CSS = `
.salvage{position:fixed;inset:0;z-index:57;display:flex;flex-direction:column;align-items:center;
  justify-content:safe center;gap:12px;padding:22px;overflow:auto;
  background:radial-gradient(120% 90% at 50% 110%, #3a1608 0%, #1a0d07 45%, #0f1113 100%)}
.salvage::after{content:'';position:fixed;inset:0;pointer-events:none;
  background:linear-gradient(0deg,#ff6a1e33,#0000 45%);animation:flick 1.7s ease-in-out infinite alternate}
@keyframes flick{from{opacity:.55}to{opacity:1}}
.salvage h2{margin:0;font-size:16px;color:#e08a3a;letter-spacing:5px;font-weight:400;z-index:1}
.salvage p{margin:0;font-size:17px;color:#e8e2d4;line-height:1.8;max-width:620px;text-align:center;z-index:1}
.salvage .grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;
  max-width:720px;max-height:46vh;overflow:auto;z-index:1;padding:2px}
.salvage .doc{width:214px;text-align:left;padding:10px 12px;border-radius:3px;cursor:pointer;
  background:#e8e2d4;color:#23201a;border:2px solid #e8e2d4;font-size:13px;line-height:1.5}
.salvage .doc small{display:block;color:#6b6558;font-size:11px;margin-top:4px}
.salvage .doc[aria-pressed="true"]{border-color:#e0a23a;box-shadow:0 0 0 3px #e0a23a55}
.salvage .doc[disabled]{opacity:.45;cursor:not-allowed}
.salvage .asker{z-index:1;max-width:620px;background:#0f1113aa;border-left:3px solid #e08a3a;
  padding:10px 14px;color:#e8e2d4;font-size:15px;line-height:1.8}
.salvage .asker b{display:block;font-size:12px;color:#e08a3a;letter-spacing:2px;font-weight:400;margin-bottom:4px}
.salvage .count{font-size:13px;color:#e0a23a;letter-spacing:3px;z-index:1}
.salvage .hint{font-size:12px;color:#8f8a7c;z-index:1}
.salvage .origin{font-size:12px;color:#8f8a7c;z-index:1}
.salvage button.go{z-index:1;padding:13px 32px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
.salvage button.go[disabled]{opacity:.4;cursor:not-allowed}
`

let styled = false

// D2 화재 — 사초함에서 최대 세 장이 살아남는다.
//
// **임금이 안고 뛰는 화면이 아니다.** 기록을 지고 나오는 것은 사관과 승정원 관원의
// 일이고, 임금이 하는 일은 무엇을 먼저 꺼내라 이르는 것이다 — 이 게임에서 임금이
// 내내 하는 그 일이다. 그래서 화면 위에 그 말을 청하는 사람(view.asker)이 서 있고,
// 단추는 「들고 나간다」가 아니라 「이것부터 꺼내라 이르신다」다.
// 여기에 시계는 없다(촉박은 C1·C2·C3
// 뿐이다). 정확히 limit(가진 것이 셋보다 적으면 그 수)만큼 고르기 전까지 '들고 나간다'는
// 눌리지 않는다. survive() 가 나머지를 전부 잃게 만든다 — 여기서는 무엇을 고를지만 묻는다.
export function createSalvage(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    open(view) {
      return new Promise(resolve => {
        const limit = Math.min(MAX_KEEP, view.cards.length)
        const chosen = new Set()

        const el = document.createElement('div')
        el.className = 'salvage'
        el.innerHTML = `
          <h2>${view.title}</h2>
          ${view.lines.map(l => `<p>${l}</p>`).join('')}
          ${view.asker ? `<div class="asker"><b>${view.asker.name}</b>` +
            `${view.asker.lines.map(l => `<div>${l}</div>`).join('')}</div>` : ''}
          <div class="grid">${view.cards.map(c => `
            <button class="doc" data-id="${c.id}" aria-pressed="false">${c.title}
              <small>${c.origin}</small></button>`).join('')}</div>
          <div class="count"></div>
          <div class="hint">${limit}장을 다 고르면 이 단추가 눌립니다.</div>
          <div class="origin">${view.origin}</div>
          <button class="go" disabled>이것부터 꺼내라 이르신다</button>`
        root.appendChild(el)

        const go = el.querySelector('button.go')
        const count = el.querySelector('.count')

        function refresh() {
          count.textContent = `${chosen.size} / ${limit} 장`
          go.disabled = chosen.size !== limit
          el.querySelectorAll('.doc').forEach(b => {
            const on = chosen.has(b.dataset.id)
            b.setAttribute('aria-pressed', String(on))
            b.disabled = !on && chosen.size >= limit
          })
        }

        el.querySelectorAll('.doc').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.id
            if (chosen.has(id)) chosen.delete(id)
            else if (chosen.size < limit) chosen.add(id)
            refresh()
          })
        })

        go.addEventListener('click', () => { el.remove(); resolve([...chosen]) })
        refresh()
      })
    },
  }
}
