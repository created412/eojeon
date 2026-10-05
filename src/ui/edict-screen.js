import { installTypeVars } from './type-css.js'

const CSS = `
.edict{position:fixed;inset:0;z-index:56;background:#0d0e10;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:26px;text-align:center;overflow:auto}
.edict h2{margin:0;font-size:var(--read-lead,15px);color:#c9c1ad;letter-spacing:.4em;font-weight:400;
  font-family:var(--face-display,serif)}
.edict p{margin:0;font-size:var(--read-body,18px);color:var(--paper-strong,#e8e2d4);
  line-height:var(--read-lh-body,1.8);max-width:min(100%,var(--read-measure,620px));word-break:keep-all;text-wrap:balance}
.edict .rows{width:100%;max-width:660px;border:1px solid #2a2f34;border-radius:3px;overflow:hidden;flex-shrink:0}
.edict .r{display:flex;gap:14px;padding:11px 14px;font-size:var(--read-small,13px);color:#c9c2b1;
  border-bottom:1px solid #1c2024;text-align:left;line-height:var(--read-lh-small,1.6);word-break:keep-all}
.edict .r:last-child{border-bottom:0}
.edict .r .d{flex:none;width:88px;color:var(--paper-quiet,#8f8a7c);letter-spacing:normal}
.edict .r.mark{background:#1a1512;color:var(--paper-strong,#e8e2d4)}
.edict .r.mark .d{color:#e8b45c}
.edict .paper{max-width:min(100%,700px);background:#e8e2d4;color:var(--ink-strong,#23201a);border-radius:4px;
  padding:24px 26px;line-height:var(--read-lh-body,1.9);font-size:var(--read-body,17px);text-align:left;
  word-break:keep-all}
/* 줄바꿈을 살리는 것은 **하교의 글**뿐이다. 예전에는 종이 전체에 pre-wrap 을 걸어,
   마크업의 들여쓰기와 줄바꿈까지 빈 줄로 찍혔다 — 풀이·출처·어보 사이가 벌어져
   어보가 종이 밑으로 밀려났다(2026-10-05, 두 칸으로 나눈 뒤 찍어 보고 알았다). */
.edict .paper .hasi{white-space:pre-wrap}
.edict .paper .origin{font-size:var(--read-small,13px);color:var(--ink-quiet,#5e5849);margin-top:14px;white-space:normal}
.edict .rendered{font-size:var(--read-small,12px);color:var(--ink-quiet,#7a7462);margin-top:10px;white-space:normal}
.edict .origin{font-size:var(--read-small,12px);color:var(--paper-quiet,#6b6558);
  max-width:min(100%,var(--read-measure,560px));line-height:var(--read-lh-small,1.7);word-break:keep-all}
/* ── 두 칸: 실록의 닷새 | 내가 내리는 하교 ──────────────────────────────
   2026-10-05 전체 점검. 예전에는 한 줄로 길게 쌓여 있었다 — 표, 출처, 낱말 풀이
   열한 개가 뭉친 문단, 그 아래에야 하교와 어보. 1280×800 에서 **정작 손으로
   찍어야 할 어보가 화면 밖**이었고, 풀이 문단은 「 · 」로 이어진 한 덩어리라
   모르는 낱말을 만나면 처음부터 훑어야 했다.

   그래서 둘로 가른다. 왼쪽은 읽는 것(실록이 날마다 적은 것), 오른쪽은 하는 것
   (그 가운데 하나를 내 이름으로 내린다). 어보는 오른쪽 칸 위쪽에 있어 화면을
   굴리지 않아도 보인다. 좁은 화면에서는 한 칸으로 내려가고, 그때는 **하교가
   먼저** 온다 — 손으로 할 일이 화면 밖으로 밀리지 않게. */
.edict .cols{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:22px;
  width:100%;max-width:1120px;align-items:start;text-align:left}
.edict .col{display:flex;flex-direction:column;gap:12px;min-width:0}
.edict .col .rows,.edict .col .paper{max-width:none}
.edict .col .origin{max-width:none}
.edict .col.act{align-items:center}
.edict .col.act .paper{align-self:stretch}

/* 낱말 풀이는 그 낱말이 나오는 줄 바로 밑에 선다 — 풀이는 낱말 곁에 있을 때만 풀이다. */
.edict .r{flex-wrap:wrap}
.edict .r .t{flex:1 1 0;min-width:0}
.edict .g{flex:1 1 100%;margin:2px 0 0 102px;display:flex;flex-direction:column;gap:1px;
  font-size:var(--read-caption,12px);line-height:1.55;color:var(--paper-quiet,#8f8a7c)}
.edict .g b{color:#c9a15a;font-weight:400}
.edict .paper .g{margin:12px 0 0;color:var(--ink-quiet,#5e5849);white-space:normal}
.edict .paper .g b{color:#7a4a1c}

/* 문턱은 700 이다. 860 으로 두었더니 손전화 가로(844×390)가 걸려 한 칸으로 쌓였다 —
   넓은데 낮은 화면이야말로 두 칸이 필요하다(ui/rebuild.js 가 같은 일을 겪었다). */
@media(max-width:700px){
  .edict .cols{grid-template-columns:1fr}
  .edict .col.act{order:-1}
  .edict .g{margin-left:0}
}
/* 낮은 화면에서는 「내 이름으로 내린다」를 바닥에 붙인다(ui/move-screen.js 와 같은 처방). */
@media(max-height:560px){
  /* 낮은 화면에서는 머리글을 줄인다. 표제와 이끄는 두 줄이 본문 크기 그대로면
     390px 높이의 절반을 먹어, 하교와 어보가 첫 화면에 들어오지 못한다. */
  .edict{justify-content:flex-start;gap:8px;padding:12px 16px}
  .edict > p{font-size:var(--read-small,14px);line-height:1.5}
  .edict .paper{padding:14px 16px 40px;font-size:var(--read-small,15px);line-height:1.7}
  .edict .stamp{width:84px;height:84px;margin-top:8px}
  .edict .stamp .ink{font-size:18px;border-width:4px}
  /* 아직 못 누르는 단추는 붙이지 않는다. 붙였더니 흐릿한 단추가 하교의 글 한가운데에
     떠서 글을 가렸다. 어보를 찍어 단추가 살아나면 그때 바닥에 붙어 눈에 들어온다. */
  .edict button.go:not([disabled]){position:sticky;bottom:0;z-index:2;box-shadow:0 0 0 10px #0d0e10}
}
.edict .unknown{border:1px solid #3a4248;border-radius:3px;padding:12px 16px;max-width:min(100%,660px);
  font-size:var(--read-small,13px);color:var(--paper-quiet,#8f8a7c);line-height:var(--read-lh-small,1.7);
  text-align:left;word-break:keep-all}
.edict button{margin-top:6px;padding:14px 34px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:var(--read-label,15px);cursor:pointer}
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
  color:#a3231f;font-size:24px;line-height:1;font-family:var(--face-hanja,"Batang","Gungsuh","SimSun",serif);
  opacity:0;transform:scale(.94) rotate(-2deg)}
/* 인장의 넉 자는 오른쪽 위 → 오른쪽 아래 → 왼쪽 위 → 왼쪽 아래로 읽는다.
   격자는 왼쪽 위부터 채우므로 글자를 之·施·寶·命 순으로 적어 넣는다 — 그래야
   화면에서는 施命之寶 로 읽힌다. (한때 한 줄로 늘어놓아 「寶之命施」로 보였다.) */
.edict .stamp .ink i{font-style:normal}
/* ⚠ 이 글은 **누런 종이 위**에 놓인다. 예전 빛깔(--paper-quiet)은 어두운 바탕에 쓰는
   옅은 회색이라 종이 위에서는 거의 보이지 않았다 — 「어보를 눌러 찍는다」가 이 화면의
   유일한 조작 안내인데 그것이 안 읽혔다(2026-10-05). 먹빛으로 바꾸고 한 줄에 둔다. */
.edict .stamp .tip{position:absolute;left:50%;transform:translateX(-50%);bottom:-28px;white-space:nowrap;
  font-size:var(--read-small,13px);color:#5e4a2c;letter-spacing:normal}
.edict .paper{padding-bottom:46px}
.edict .sealnote{font-size:var(--read-small,12px);color:var(--paper-quiet,#6b6558);
  max-width:min(100%,var(--read-measure,560px));line-height:var(--read-lh-small,1.7);margin-top:34px;
  word-break:keep-all;text-wrap:balance}
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
  installTypeVars()
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// 낱말 풀이 — [{ word, mean }]. 그 낱말이 나오는 줄 바로 밑에 붙는다.
export function glossHtml(gloss) {
  if (!gloss?.length) return ''
  return `<div class="g">${gloss.map(g => `<span><b>${g.word}</b> — ${g.mean}</span>`).join('')}</div>`
}

export function rowsHtml(rows) {
  return rows.map(r =>
    `<div class="r${r.mark ? ' mark' : ''}"><span class="d">${r.lunar}</span><span class="t">${r.text}</span>${glossHtml(r.gloss)}</div>`
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
            <div class="cols">
              <div class="col read">
                <div class="rows">${rowsHtml(view.rows)}</div>
                <div class="origin">${view.rowsOrigin}</div>
              </div>
              <div class="col act">
                <div class="paper"><div class="hasi">${view.hasi.text}</div>${glossHtml(view.hasi.gloss)}
                  <div class="origin">${view.hasi.origin}</div>
                  <div class="rendered">※ 기록의 내용을 오늘날 말로 옮겼습니다</div>
                  ${sealHtml()}</div>
                <div class="sealnote">${SEAL_NOTE}</div>
                <button class="go" disabled>${view.buttonLabel}</button>
              </div>
            </div>`
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
