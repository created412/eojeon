import { evaluateChoices } from '../systems/council.js'

// class 이름 "note" 는 쓰지 않는다 — note-screen.js 가 전역으로 심어 둔
// bare .note{position:fixed;inset:0;...} 규칙과 이름이 겹치면, 이 문구도 그
// position:fixed;inset:0 을 물려받아 화면 전체를 덮는 보이지 않는 판이 되어
// 버린다(가독성 검수 QA — 훈령·신헌 gloss 가 화면에 실제로 그려지지 않던 원인).
// 그래서 .gloss 로 쓴다.
const CSS = `
.orders{position:fixed;inset:0;z-index:51;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:24px;overflow:auto}
.orders h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:3px;font-weight:400}
.orders .q{margin:0;font-size:21px;color:#e8e2d4;text-align:center;max-width:640px;line-height:1.5}
.orders .gloss{margin:0;font-size:12px;color:#8f8a7c;max-width:580px;line-height:1.6;text-align:center}
.orders .read{font-size:12px;color:#8f8a7c}
.orders .hint{font-size:12px;color:#8f8a7c;max-width:580px;text-align:center;margin:0}
.orders .list{display:flex;flex-direction:column;gap:8px;width:100%;max-width:580px}
.orders .cl{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;text-align:left;
  background:#23282c;border:1px solid #3a4248;border-radius:3px;color:#e8e2d4;font-size:15px;cursor:pointer}
.orders .cl[aria-pressed="true"]{border-color:#6a5230;background:#2c2a24}
.orders .cl i{width:14px;height:14px;flex:none;margin-top:4px;border:1px solid #6a5230;border-radius:2px}
.orders .cl[aria-pressed="true"] i{background:#e0a23a}
.orders .locked{padding:12px 14px;border:1px dashed #3a4248;border-radius:3px;color:#5f6971;font-size:15px}
.orders .locked small{display:block;margin-top:5px;color:#8f8a7c;font-size:12px}
.orders textarea{width:100%;max-width:580px;min-height:64px;background:#1a1d21;color:#e8e2d4;
  border:1px solid #3a4248;border-radius:3px;padding:10px;font:14px/1.6 inherit;resize:none}
.orders .paper{max-width:600px;background:#e8e2d4;color:#23201a;border-radius:4px;padding:20px 22px;
  line-height:1.8;font-size:15px;text-align:left;white-space:pre-wrap}
.orders .origin{font-size:12px;color:#6b6558;margin-top:8px}
.orders button.go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false

// 훈령 — 신헌에게 보낼 문구를 여러 줄 담아 보낸다. 어전회의(council-ui.js)와 달리
// 하나만 고르는 것이 아니라 열린 문구 중 여러 개를 동시에 담을 수 있다. 판정은
// evaluateChoices() (systems/council.js, 잠금) 를 그대로 재사용한다 — 읽은 사료만큼
// requires 가 풀린다는 규칙을 이 화면이 새로 만들지 않는다.
//
// textarea 의 값(reason)은 학생이 쓴 글이다 — 전역 규칙대로 DOM 에는 textContent 로만
// 넣는다. innerHTML 문자열에 그대로 끼워 넣지 않는다(main.js 의 fallbackCopy 와 같은 규칙).
export function createOrders(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    open(state, beat) {
      return new Promise(resolve => {
        const evaluated = evaluateChoices(state, { choices: beat.clauses })
        const openCount = evaluated.filter(c => c.unlocked).length
        const picked = new Set()

        const el = document.createElement('div')
        el.className = 'orders'
        el.innerHTML = `
          <h2>${beat.title}</h2>
          ${(beat.notes ?? []).map(n => `<p class="gloss">${n}</p>`).join('')}
          <p class="q">${beat.question}</p>
          <div class="read">쓸 수 있는 문구 ${openCount} / ${evaluated.length}</div>
          <div class="hint">여러 개를 골라 담을 수 있다. 하나도 담지 않고 보낼 수도 있다.</div>
          <div class="list">${evaluated.map(c => c.unlocked
            ? `<button class="cl" data-id="${c.id}" aria-pressed="false"><i></i><span>${c.text}</span></button>`
            : `<div class="locked">???${c.missing.map(m => `<small>← 『${m}』을 읽지 않았습니다</small>`).join('')}</div>`
          ).join('')}</div>
          <textarea placeholder="훈령 끝에 한 줄을 더 적을 수 있다"></textarea>
          <button class="go">봉해서 보낸다</button>`
        root.appendChild(el)

        el.querySelectorAll('.cl').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.id
            if (picked.has(id)) picked.delete(id); else picked.add(id)
            b.setAttribute('aria-pressed', String(picked.has(id)))
          })
        })

        el.querySelector('.go').addEventListener('click', () => {
          const reason = el.querySelector('textarea').value.trim()
          const chosen = evaluated.filter(c => picked.has(c.id))
          el.innerHTML = `
            <h2>${beat.title}</h2>
            <div class="paper">${chosen.length
              ? chosen.map((c, i) => `${i + 1}. ${c.text}`).join('\n')
              : '(아무 문구도 담기지 않았다)'}<span class="reason-slot"></span></div>
            <div class="paper">실제로는 ─ ${beat.actual.line}<div class="origin">${beat.actual.origin}</div></div>
            <button class="go">사신이 떠났다</button>`
          if (reason) el.querySelector('.reason-slot').textContent = `\n\n${reason}`
          el.querySelector('.go').addEventListener('click', () => {
            el.remove()
            resolve({ picked: [...picked], reason })
          })
        })
      })
    },
  }
}
