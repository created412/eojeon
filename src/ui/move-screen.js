import { installTypeVars } from './type-css.js'
// class 이름 "note" 는 쓰지 않는다 — note-screen.js 가 전역으로 심어 둔
// bare .note{position:fixed;inset:0;...} 규칙과 이름이 겹치면, 이 화면 것도 그
// position:fixed;inset:0 을 그대로 물려받아 화면 전체를 덮는 보이지 않는 판이
// 되어 버린다(가독성 검수 QA — SOLAR_NOTE·MOVE_GLOSS 가 화면에 실제로 그려지지
// 않던 원인). 그래서 .gloss 로 쓴다.
const CSS = `
.move{position:fixed;inset:0;z-index:55;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:28px;text-align:center;overflow:auto;
  animation:movein .5s ease-out}
@keyframes movein{from{opacity:0}to{opacity:1}}
/* 해와 달만 벌어진다 — 그 아래 설명 줄에서는 자간을 걷어 냈다(ui/type-css.js §2). */
.move .year{font-size:var(--read-small,13px);color:#c9c1ad;letter-spacing:.34em;font-family:var(--face-display,serif)}
.move .lunar{font-size:var(--read-small,12px);color:var(--paper-quiet,#6b6558);letter-spacing:normal;margin-top:-4px}
.move .solar{font-size:var(--read-small,12px);color:var(--paper-quiet,#6b6558);letter-spacing:normal;margin-top:-2px}
/* 이 한 줄이 이 화면의 표제다 — 「창덕궁 → 경복궁」. 자간이 허락되는 자리. */
.move .path{font-size:clamp(26px,4vw,34px);color:#f0ead9;letter-spacing:.14em;font-family:var(--face-display,serif)}
.move .path b{font-weight:400;color:#e8b45c}
.move .cause{font-size:var(--read-body,16px);color:#cdc6b5;line-height:var(--read-lh-body,1.7);
  max-width:min(100%,var(--read-measure,560px));word-break:keep-all;text-wrap:balance}
.move .self{font-size:var(--read-small,13px);color:var(--paper-quiet,#8f8a7c);letter-spacing:normal}
.move .gloss{margin-top:8px;border:1px dashed #6a5230;color:var(--paper-quiet,#8f8a7c);
  font-size:var(--read-small,12px);padding:12px 16px;border-radius:3px;max-width:min(100%,560px);
  line-height:var(--read-lh-small,1.6);white-space:pre-line;text-align:left;word-break:keep-all}
.move button{margin-top:10px;padding:13px 32px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:var(--read-label,15px);cursor:pointer}
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

// 이어(移御) 화면 — 임금이 옮긴 자리를 알린다. 조작권 글자는 여기 한 글자도 없다
// (설계서 5장 B: 「이동의 성격을 UI 텍스트로 설명하지 않는다. 키보드가 대신 말한다.」).
// self 만 예외로 한 줄 두는 것은, 그것이 엔딩에서 학생이 직접 셀 값(13.2)이기 때문이다.
// lunarDate 는 실록에서 확인한 음력 날짜 문자열만 받는다. solarDate 는 양력이 확정된
// 이어에만 실린다 — 1884년 갑신정변 넉 건뿐이고(검증 A 5항·검증 B 5항), 1868·1873·
// 1875·1877 네 건은 양력 일 단위가 「확인불가」라 이 칸이 비어 있고 대신 view.note 에
// 양력 미확정 고지가 실려 온다. 둘이 한 화면에 같이 나오는 일은 없다.
export function createMoveScreen(root) {
  ensureStyle()

  return {
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'move'
        el.innerHTML = `
          <div class="year">${view.year}</div>
          <div class="lunar">${view.lunarDate ?? ''}</div>
          <div class="solar">${view.solarDate ?? ''}</div>
          <div class="path">${view.fromName} <b>→</b> ${view.toName}</div>
          <div class="cause">${view.cause}</div>
          <div class="self">${view.self ? '스스로 정하신 이동이다. (지금까지 이런 이동은 이번이 처음이다)' : ''}</div>
          ${view.note ? `<div class="gloss">${view.note}</div>` : ''}
          <button>${view.self ? '돌아간다' : '옮긴다'}</button>`
        root.appendChild(el)
        el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
