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
.move .year{font-size:13px;color:#8f8a7c;letter-spacing:5px}
.move .lunar{font-size:12px;color:#6b6558;letter-spacing:2px;margin-top:-6px}
.move .solar{font-size:12px;color:#6b6558;letter-spacing:2px;margin-top:-4px}
.move .path{font-size:30px;color:#e8e2d4;letter-spacing:4px}
.move .path b{font-weight:400;color:#e0a23a}
.move .cause{font-size:16px;color:#b9b2a1}
.move .self{font-size:13px;color:#8f8a7c;letter-spacing:2px}
.move .gloss{margin-top:6px;border:1px dashed #6a5230;color:#8f8a7c;font-size:12px;
  padding:8px 12px;border-radius:3px;max-width:480px;line-height:1.6;white-space:pre-line}
.move button{margin-top:10px;padding:12px 30px;background:#3a2d20;border:1px solid #6a5230;
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
