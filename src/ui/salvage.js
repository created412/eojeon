export const MAX_KEEP = 2

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
  max-width:720px;z-index:1;padding:2px}
.salvage .doc{flex:0 0 auto;width:214px;text-align:left;padding:10px 12px;border-radius:3px;cursor:pointer;
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
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

// D2 화재 — 실록이 적은 소실물 가운데 무엇을 먼저 꺼내라 할 것인가.
//
// 사관이 여쭙고, 임금은 두 가지를 고르고 이유를 적는다. 그 뒤 실제로 무엇이 남았는지(대보·세자 옥인)와
// 견준다. 시계는 없다 — 촉박은 C1·C2·C3 뿐이다. 사초함의 사료는 건드리지 않는다.
import { compareWithActual } from '../systems/preservation.js'

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
        const items = view.treasures ?? []
        const limit = Math.min(view.pick ?? 2, items.length)
        const chosen = new Set((view.initial?.selected ?? []).filter(id => items.some(t => t.id === id)).slice(0, limit))

        const el = document.createElement('div')
        el.className = 'salvage'
        el.innerHTML = `
          <h2>${view.title}</h2>
          ${view.lines.map(l => `<p>${l}</p>`).join('')}
          ${view.asker ? `<div class="asker"><b>${view.asker.name}</b>` +
            `${view.asker.lines.map(l => `<div>${l}</div>`).join('')}</div>` : ''}
          <div class="grid">${items.map(t => `
            <button class="doc" data-id="${esc(t.id)}" aria-pressed="false"><b>${esc(t.name)}</b>
              <small>${esc(t.gloss)}</small></button>`).join('')}</div>
          <div class="count"></div>
          <label class="preservation-reason" style="z-index:1;width:min(620px,100%);color:#e8e2d4;font-size:14px;line-height:1.7">왜 이 두 가지를 먼저 꺼내라 하겠습니까?
          <textarea class="reason" rows="3" maxlength="1600" style="display:block;width:100%;margin-top:8px;padding:10px;background:#eee5d0;color:#28221b;font:15px/1.6 system-ui" placeholder="이것이 없으면 나라 일에서 무엇이 멈추는지 적어 보세요."></textarea></label>
          <div class="hint">${limit}가지를 고르고 이유를 한 문장 이상 적어 주세요.</div>
          <div class="origin">${view.origin}</div>
          <button class="go" disabled>꺼내라 이른다</button>`
        root.appendChild(el)

        const go = el.querySelector('button.go')
        const count = el.querySelector('.count')
        const reason = el.querySelector('.reason')
        reason.value = view.initial?.reason ?? ''
        reason.addEventListener('input', () => { refresh(); save() })

        function save() {
          if (view.onSave?.({ selected: [...chosen], reason: reason.value }) === false) {
            el.querySelector('.hint').textContent = '기록을 기기에 저장하지 못했습니다. 작성한 내용을 복사해 두세요.'
          }
        }

        function refresh() {
          count.textContent = `${chosen.size} / ${limit}`
          go.disabled = chosen.size !== limit || reason.value.replace(/\s/g,'').length < 8
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
            save()
          })
        })

        go.addEventListener('click', () => {
          if (go.disabled) return
          const result = { selected: [...chosen], reason: reason.value.trim() }
          const cmp = compareWithActual(items, result.selected)
          const name = id => esc(items.find(t => t.id === id)?.name ?? id)
          const mine = result.selected.map(id => `${name(id)} — ${cmp.savedChosen.includes(id) ? '실제로도 건졌다' : '실제로는 탔다'}`)
          el.innerHTML = `<h2>실 제 로 는</h2>
            <div class="asker"><b>내가 꺼내라 한 것</b>${mine.join('<br>')}</div>
            ${(view.actual?.lines ?? []).map(l => `<p>${l}</p>`).join('')}
            ${view.question ? `<div class="asker"><b>생각해 볼 물음</b>${esc(view.question)}</div>` : ''}
            <div class="asker"><b>내가 남긴 이유</b>${esc(result.reason)}</div>
            ${view.footer ? `<p>${view.footer}</p>` : ''}
            <div class="origin">${view.actual?.origin ?? ''}</div>
            <button class="go">불길을 피해 나간다</button>`
          el.querySelector('.go').addEventListener('click', () => { el.remove(); resolve(result) })
        })
        refresh()
      })
    },
  }
}
