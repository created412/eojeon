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
.edict button[disabled]{opacity:.4;cursor:not-allowed}
/* ── 어보(御寶)를 찍는 자리 ────────────────────────────────────────────
   선생님(2026-09-25): 「손으로 하는 일을 늘립니다 … 교지에 인장 찍기.」
   단추 한 번으로 내려가던 하교를, 임금이 **제 손으로 눌러** 내린다. 누르고 있는
   동안 붉은 印이 진해진다 — 순간에 찍히면 누른 것이 아니라 눌린 것이 된다. */
.edict .stamp{position:relative;margin:14px auto 0;width:112px;height:112px;border:1px dashed #8a6a44;
  border-radius:3px;background:#00000014;cursor:pointer;touch-action:none;display:block;padding:0}
.edict .stamp:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}
.edict .stamp .ink{position:absolute;inset:8px;border:5px solid #a3231f;border-radius:2px;
  display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;place-items:center;
  color:#a3231f;font-size:24px;line-height:1;font-family:"Batang","Gungsuh","SimSun",serif;
  opacity:0;transform:scale(.94) rotate(-2deg)}
/* 인장의 넉 자는 오른쪽 위 → 오른쪽 아래 → 왼쪽 위 → 왼쪽 아래로 읽는다.
   격자는 왼쪽 위부터 채우므로 글자를 之·施·寶·命 순으로 적어 넣는다 — 그래야
   화면에서는 施命之寶 로 읽힌다. (한때 한 줄로 늘어놓아 「寶之命施」로 보였다.) */
.edict .stamp .ink i{font-style:normal}
.edict .stamp .tip{position:absolute;left:0;right:0;bottom:-24px;font-size:12px;color:#8f8a7c;letter-spacing:1px}
.edict .sealnote{font-size:12px;color:#6b6558;max-width:560px;line-height:1.7;margin-top:26px}
@media(prefers-reduced-motion:reduce){.edict .stamp .ink{transition:none!important}}
`

// 어보 한 방. 찍히는 동안 붉은 기운이 오르는 것은 CSS 가 아니라 여기서 값으로 준다 —
// 「얼마나 눌렀는가」를 화면과 시험이 같은 함수로 본다.
export const SEAL_HOLD_MS = 900

// 누른 시간이 얼마면 어느 만큼 찍혔는가(0~1). 손을 떼면 0 으로 되돌아간다 —
// 어보는 한 번에 곧게 눌러야 한다.
export function sealProgress(heldMs, need = SEAL_HOLD_MS) {
  if (!(heldMs > 0)) return 0
  return Math.min(1, heldMs / need)
}

// 어보를 찍는 자리의 마크업. 새기는 글자는 「施命之寶」다 — 교지에 찍던 어보 가운데
// 하나이고, 그 사실만 적는다. 이 하교에 실제로 어느 보를 찍었는지는 확인하지 못했다.
export function sealHtml(label = '어보를 눌러 찍는다') {
  return `<button class="stamp" aria-label="어보를 눌러 찍는다 — 시명지보">
      <span class="ink" aria-hidden="true"><i>之</i><i>施</i><i>寶</i><i>命</i></span>
      <span class="tip">${label}</span>
    </button>`
}

export const SEAL_NOTE =
  '※ 교지에 찍던 어보(御寶) 가운데 하나가 시명지보(施命之寶)입니다. 이 하교에 실제로 어느 보를 찍었는지는 확인하지 못했습니다 — 손으로 찍는 이 동작은 재구성입니다.'

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
              <div class="rendered">※ 기록의 내용을 오늘날 말로 옮겼습니다</div>
              ${sealHtml()}</div>
            <div class="sealnote">${SEAL_NOTE}</div>
            <button class="go" disabled>${view.buttonLabel}</button>`
          bindSeal(el, () => { el.querySelector('.go').disabled = false })
          el.querySelector('.go').addEventListener('click', after)
        }

        // 누르고 있는 동안만 印이 오른다. 다 차면 그 자리에 남고, 그때부터
        // 「내 이름으로 내린다」가 눌린다 — 찍지 않은 하교는 내려가지 않는다.
        function bindSeal(scope, onPressed) {
          const stamp = scope.querySelector('.stamp')
          const ink = stamp.querySelector('.ink')
          const tip = stamp.querySelector('.tip')
          let from = 0, raf = 0, pressed = false
          const draw = p => {
            ink.style.opacity = String(p)
            ink.style.transform = `scale(${(0.94 + p * 0.06).toFixed(3)}) rotate(-2deg)`
          }
          const tick = () => {
            if (pressed || !from) return
            const p = sealProgress(performance.now() - from)
            draw(p)
            if (p >= 1) { land(); return }
            raf = requestAnimationFrame(tick)
          }
          const land = () => {
            pressed = true
            cancelAnimationFrame(raf)
            from = 0
            draw(1)
            tip.textContent = '찍혔다'
            view.onSeal?.()
            onPressed()
          }
          const down = e => {
            if (pressed) return
            e.preventDefault()
            from = performance.now()
            tip.textContent = '누르고 있으라'
            raf = requestAnimationFrame(tick)
          }
          const up = () => {
            if (pressed) return
            cancelAnimationFrame(raf)
            from = 0
            draw(0)
            tip.textContent = '어보를 눌러 찍는다'
          }
          stamp.addEventListener('pointerdown', down)
          stamp.addEventListener('pointerup', up)
          stamp.addEventListener('pointerleave', up)
          stamp.addEventListener('pointercancel', up)
          // 손이 불편한 학생에게 누르고 있기를 강요하지 않는다 — 키보드로는 한 번에 찍힌다.
          stamp.addEventListener('keydown', e => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            if (!pressed) land()
          })
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
