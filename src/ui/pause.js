import { TITLE } from './title.js'

const CSS = `
.pause{position:fixed;inset:0;z-index:70;background:#0f1113dd;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:12px;padding:24px;overflow:auto}
.pause h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:6px;font-weight:400}
.pause .msg{font-size:13px;color:#8f8a7c;min-height:18px}
.pause button{width:260px;padding:13px;background:#23282c;border:1px solid #3a4248;color:#e8e2d4;
  border-radius:3px;font-size:15px;cursor:pointer}
.pause button.go{background:#3a2d20;border-color:#6a5230;color:#e0a23a}
.pause [hidden]{display:none}.pause .restart-check{max-width:340px;text-align:center}
.pause .restart-check p{color:#e8e2d4;line-height:1.7}.pause .restart-check button{margin-top:10px}
.pause button:focus-visible{outline:2px solid #e0a23a;outline-offset:3px}
.pause .pause-sound{display:flex;gap:10px;align-items:center;justify-content:center;
  width:260px;font-size:13px;color:#8f8a7c}
.pause .pause-sound button{width:auto;flex:1;padding:9px}
`

let styled = false

// 일시정지 화면 — Esc 로 열고 닫는다. 태블릿에는 Esc 가 없으므로 main.js 의
// attachControls() 가 붙이는 단추도 같은 자리로 들어온다.
// onSave() 가 boolean 을 돌려주면 그 값으로 안내 문구를 고른다(localStorage 가 막힌
// 사설 창·잠긴 학교 PC 를 고려한 것이다).
//
// 소리 토글이 여기에도 있다(판정 R91). 태블릿 30대가 동시에 소리를 내는 교실에서
// 「지금 당장 꺼라」가 되려면 수업 도중에 닿을 수 있어야 한다 — 예전에는 타이틀에만
// 있어서, 학생이 소리를 끄려면 새로고침해 하던 것을 버리고 처음 화면으로 나가야 했다.
// 상태는 여기서 들고 있지 않는다: audio 에게 묻고 audio 에게 시킨다. 그래서 타이틀의
// 토글과 이 토글은 언제나 같은 것을 말한다.
export function createPause(root, { onChange = () => {} } = {}) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }
  let el = null, previousFocus = null
  function keepFocus(event) {
    // 회전 안내가 사라지거나 뒤의 판이 버튼에 focus()를 해도 모달 안으로 돌아온다.
    if (el && !el.contains(event.target) && !root.querySelector('.orient')) el.querySelector('.resume')?.focus()
  }

  function close() {
    if (!el) return
    document.removeEventListener('focusin', keepFocus)
    el.remove(); el = null; onChange(false)
    if (previousFocus?.isConnected) previousFocus.focus()
  }

  return {
    isOpen: () => el !== null,
    close,
    toggle({ onSave, onRestart, audio = null }) {
      if (el) { close(); return }
      el = document.createElement('div')
      el.className = 'pause'
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '잠시 멈춤')
      previousFocus = document.activeElement
      el.innerHTML = `
        <h2>잠 시 멈 춤</h2>
        <div class="msg"></div>
        <button class="save go">저장하고 계속한다</button>
        <button class="resume">닫는다</button>
        <div class="pause-sound"><span>${TITLE.sound}</span><button class="snd"></button></div>
        <button class="restart">처음부터 다시</button>
        <div class="restart-check" hidden><p>지금까지의 기록을 지우고 처음부터 시작할까요?</p>
          <button class="cancel-restart">아니요, 계속할게요</button>
          <button class="confirm-restart">기록을 지우고 다시 시작</button></div>`
      root.appendChild(el)
      document.addEventListener('focusin', keepFocus)
      onChange(true)
      const msg = el.querySelector('.msg')
      el.querySelector('.save').addEventListener('click', () => {
        msg.textContent = onSave() ? '저장했다. 이 브라우저에서 이어할 수 있다.' : '저장하지 못했다.'
      })
      el.querySelector('.resume').addEventListener('click', close)
      const snd = el.querySelector('.snd')
      const paint = () => { snd.textContent = audio?.isMuted() ? TITLE.soundOff : TITLE.soundOn }
      paint()
      snd.addEventListener('click', () => { audio?.toggleMuted(); paint() })
      const check = el.querySelector('.restart-check'), restart = el.querySelector('.restart')
      restart.addEventListener('click', () => { check.hidden = false; restart.hidden = true; check.querySelector('.cancel-restart').focus() })
      check.querySelector('.cancel-restart').addEventListener('click', () => { check.hidden = true; restart.hidden = false; restart.focus() })
      check.querySelector('.confirm-restart').addEventListener('click', () => { close(); onRestart() })
      el.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
        if (e.key !== 'Tab') return
        const buttons = [...el.querySelectorAll('button')].filter(b => !b.disabled && b.getClientRects().length)
        const index = buttons.indexOf(document.activeElement)
        if ((e.shiftKey && index <= 0) || (!e.shiftKey && index === buttons.length - 1)) {
          e.preventDefault(); buttons[e.shiftKey ? buttons.length - 1 : 0]?.focus()
        }
      })
      el.querySelector('.resume').focus()
    },
  }
}
