import { isCoarse } from './controls-hint.js'
import { actSpan, nativeCount } from './act-end.js'
import { PAPER } from './paper-data.js'
import { ACTS } from '../data/acts.js'
import { royalIcon } from './royal-icons.js'

// 타이틀 화면 — boot() 이 시작하자마자 화면 전체를 덮는다. 게임은 여기서 누를 때까지
// 시작하지 않는다. 예전에는 열면 곧장 글부터 나와서, 「어전 御前」이라는 제목을 학생이
// 볼 자리가 브라우저 탭밖에 없었다.
//
// 저장이 있을 때 뜨던 「이 어 서」 화면(main.js 의 offerResume)이 이 화면으로 들어왔다.
// 두 단추가 예전 두 콜백을 그대로 부른다 — 이어하기 지식은 여전히 flow.restoreSession()
// 한 곳에만 있다(판정 R60).

// 첫 화면의 연대는 손으로 적지 않는다. 예전에는 「1863 — 1884」가 박혀 있었는데
// 실제 데이터가 닿는 곳은 1882 였다(5막이 아직 없다) — 역사 게임의 첫 화면이
// 사실과 어긋나 있었던 것이다. 같은 종류를 3막 끝 화면에서 이미 한 번 겪었다:
// 「1863년부터 1877년까지, 열네 해」가 4막이 붙은 뒤에도 그대로 남아 있었다.
// actSpan() 은 막과 비트의 year 를 실제로 훑는다 — 5막이 붙는 날 저절로 1884 가 된다.
const yearsLabel = () => {
  const { from, to } = actSpan()
  return `${from} — ${to}`
}

// 햇수도 같은 자리에서 뽑는다(판정 R101). 손으로 「스무 해」라고 적혀 있었는데
// 1863~1884 는 스물한 해이고, 마지막 화면은 이미 actSpan() 으로 「스물한 해를
// 지났다」고 적고 있었다 — 이 게임의 엔딩이 학생에게 정확히 세라고 요구하는데
// 첫 화면이 한 해 틀려 있었던 것이다. 두 수를 손으로 두 번 적지 않는다.
const spanLine = () => `${nativeCount(actSpan().span)} 해 동안 이 궁에서 저 궁으로 옮겨 다녔다.`

// 문구는 선생님이 정한 것이다. tests/ui/title.test.js 가 글자 그대로 붙든다.
export const TITLE = Object.freeze({
  name: '어 전  御 前',
  years: yearsLabel(),
  lines: Object.freeze([
    '열두 살에 왕이 되었다.',
    spanLine(),
    '읽은 문서만, 어전에서 말할 수 있다.',
  ]),
  fresh: '처음부터',
  resume: '이어서 하기',
  sound: '소리',
  soundOn: '켜짐',
  soundOff: '꺼짐',
  // 교실용 문구다. 빼지 마라 — 30대의 태블릿이 동시에 소리를 낸다.
  earphone: '이어폰이 없으면 소리를 끄고 하세요',
})

const CSS = `
.opening{position:fixed;inset:0;z-index:90;background:#0f1113 center/cover no-repeat;
  display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:22px;padding:32px 22px;overflow:auto;text-align:center}
/* 그림 위에 글이 얹히므로 아래를 어둡게 깔아 준다 — 안 그러면 어느 화면에서는 읽히고
   어느 화면에서는 안 읽힌다. 그림이 없으면(paper-data.js 가 비면) 이 겹만 남아
   지금까지와 똑같은 검은 화면이 된다. */
.opening::before{content:'';position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(58% 40% at 50% 44%, #0f1113dd 0%, #0f111300 72%),
             linear-gradient(180deg,#0f1113cc 0%,#0f111366 34%,#0f111355 58%,#0f1113ee 100%)}
.opening > *{position:relative;z-index:1}
.opening .opening-name{font-size:34px;color:#f2ead9;letter-spacing:10px;line-height:1.4;
  text-shadow:0 2px 18px #000c}
.opening .opening-years{font-size:14px;color:#a89f8c;letter-spacing:6px;text-shadow:0 1px 6px #000}
.opening .opening-lines{display:flex;flex-direction:column;gap:10px;max-width:560px;margin-top:6px}
.opening .opening-lines div{font-size:17px;color:#c4bba6;line-height:1.9;
  text-shadow:0 1px 3px #000, 0 0 18px #000c}
.opening .opening-lines div:last-child{color:#e0a23a}
.opening .opening-notice{max-width:560px;padding:12px 16px;border:1px solid #6a5230;border-radius:3px;
  background:#23201a;color:#c9b98f;font-size:14px;line-height:1.7}
.opening .opening-buttons{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:10px}
.opening .opening-buttons button{padding:15px 34px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:16px;cursor:pointer;min-width:150px}
.opening .opening-buttons button.opening-second{background:#23282c;border-color:#3a4248;color:#e8e2d4}
.opening .opening-sound{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;
  margin-top:10px;font-size:13px;color:#8f8a7c}
.opening .opening-sound button{padding:8px 16px;background:#23282c;border:1px solid #3a4248;
  color:#e8e2d4;border-radius:3px;font-size:13px;cursor:pointer}
`

let styled = false

function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// show({ hasSave, audio, onFresh, onResume })
//   hasSave  저장이 있을 때만 「이어서 하기」를 낸다
//   audio    isMuted() / toggleMuted() / unlock() — 소리 토글과 잠금 해제
//   onFresh  「처음부터」 (예전 offerResume 의 onFresh 그대로)
//   onResume 「이어서 하기」 (예전 offerResume 의 onResume 그대로)
export function createTitle(root) {
  let el = null

  const onKey = (e) => {
    if (e.target?.tagName === 'BUTTON') return
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      e.preventDefault()
      el?.querySelector('.opening-primary')?.click()
    }
  }

  function close() {
    if (!el) return
    removeEventListener('keydown', onKey)
    el.remove()
    el = null
  }

  return {
    isOpen: () => el !== null,
    close,
    show({ hasSave = false, notice = '', audio = null, onFresh, onResume } = {}) {
      ensureStyle()
      close()

      el = document.createElement('div')
      el.className = 'opening'
      // 첫 화면에 어전 그림을 건다. 예전에는 검은 바탕에 글자만 있었다 —
      // 학생이 이 게임에서 처음 보는 화면이 「어디에 들어왔는가」를 말해야 한다.
      if (PAPER.injeongjeon) el.style.backgroundImage = `url(${PAPER.injeongjeon})`

      const mast = document.createElement('div')
      mast.className = 'opening-mast'
      mast.innerHTML = `<span class="opening-brand">${royalIcon('palace')} 역사 속으로, 한 걸음</span><span class="opening-edition">고종의 시대를 걷는 역사 어드벤처</span>`
      el.appendChild(mast)

      const name = document.createElement('div')
      name.className = 'opening-name'
      name.setAttribute('aria-label', TITLE.name)
      name.innerHTML = '어전<span class="opening-seal" aria-hidden="true">御<br>前</span>'
      el.appendChild(name)

      const years = document.createElement('div')
      years.className = 'opening-years'
      years.textContent = TITLE.years
      el.appendChild(years)

      const invitation = document.createElement('div')
      invitation.className = 'opening-invitation'
      invitation.innerHTML = '왕의 자리에서,<br>역사의 갈림길로.'
      el.appendChild(invitation)

      const lines = document.createElement('div')
      lines.className = 'opening-lines'
      for (const line of TITLE.lines) {
        const d = document.createElement('div')
        d.textContent = line
        lines.appendChild(d)
      }
      el.appendChild(lines)

      // 못 읽는 저장을 만났다는 알림(main.js 의 STALE_SAVE_NOTICE). 없으면 이 판이
      // 통째로 안 생긴다 — 처음 하는 학생의 화면은 지금까지와 똑같다.
      // 학생이 쓴 글자가 아니라 우리가 쓴 문구지만, 화면에 나가는 글은 언제나
      // textContent 로만 넣는다(전역 제약 2).
      if (notice) {
        const n = document.createElement('div')
        n.className = 'opening-notice'
        n.textContent = notice
        el.appendChild(n)
      }

      const buttons = document.createElement('div')
      buttons.className = 'opening-buttons'

      // 브라우저는 사용자가 누르기 전에 소리를 못 내게 막는다. 이 두 단추를 누르는
      // 순간이 이 게임에서 소리를 열 수 있는 첫 기회다 — 다른 데서 열려고 하면
      // 콘솔에 경고만 쌓인다. 소리를 열고 나서 게임을 시작한다.
      const enter = (go) => () => {
        try { audio?.unlock() } catch { /* 소리가 안 나도 수업은 계속된다 */ }
        close()
        go?.()
      }

      // 저장이 있으면 「이어서 하기」가 먼저다 — 하던 것을 실수로 지우지 않게.
      const mk = (text, primary, onTap) => {
        const b = document.createElement('button')
        b.textContent = text
        b.className = primary ? 'opening-primary' : 'opening-second'
        b.addEventListener('click', enter(onTap))
        buttons.appendChild(b)
        return b
      }

      let first
      if (hasSave) {
        first = mk(TITLE.resume, true, onResume)
        mk(TITLE.fresh, false, onFresh)
      } else {
        first = mk(TITLE.fresh, true, onFresh)
      }
      el.appendChild(buttons)

      const soundRow = document.createElement('div')
      soundRow.className = 'opening-sound'
      const soundLabel = document.createElement('span')
      soundLabel.textContent = TITLE.sound
      const soundBtn = document.createElement('button')
      const paint = () => {
        soundBtn.textContent = audio?.isMuted() ? TITLE.soundOff : TITLE.soundOn
        soundBtn.setAttribute('aria-pressed', String(!audio?.isMuted()))
      }
      paint()
      soundBtn.addEventListener('click', () => { audio?.toggleMuted(); paint() })
      const note = document.createElement('span')
      // 태블릿에는 「←」가 가리킬 자리가 없다(단추가 줄바꿈된다) — 화살표는 넓은 화면에서만.
      note.textContent = isCoarse() ? TITLE.earphone : `← ${TITLE.earphone}`
      soundRow.appendChild(soundLabel)
      soundRow.appendChild(soundBtn)
      soundRow.appendChild(note)
      el.appendChild(soundRow)

      const vista = document.createElement('div')
      vista.className = 'opening-vista'
      vista.innerHTML = `${royalIcon('compass')}<div><strong>창덕궁</strong><span>이야기가 시작되는 곳</span></div><span class="vista-line"></span>`
      el.appendChild(vista)
      const chapters = document.createElement('div')
      chapters.className = 'opening-chapters'
      chapters.setAttribute('aria-label', '이야기의 다섯 막')
      ACTS.forEach((act, index) => {
        const chapter = document.createElement('div')
        const count = document.createElement('span'); count.className = 'chapter-count'; count.textContent = String(index+1).padStart(2,'0')
        const text = document.createElement('div')
        const title = document.createElement('strong'); title.textContent = act.title
        const year = document.createElement('small'); year.textContent = `${act.year}`
        text.append(title,year); chapter.append(count,text); chapters.appendChild(chapter)
      })
      el.appendChild(chapters)
      const footer = document.createElement('div')
      footer.className='opening-footer'
      footer.textContent='사료를 읽고, 사람을 만나고, 자신의 판단을 남기는 여정 · 3D 공간은 학습용 재구성입니다.'
      el.appendChild(footer)

      root.appendChild(el)
      addEventListener('keydown', onKey)
      first.focus?.()
    },
  }
}
