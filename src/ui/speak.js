// 말하는 화면 — 얼굴이 뜨고, 한지 위에 한 줄씩 말이 온다.
//
// 선생님이 이 화면을 두 번 청했다.
//   "아버지 흥선대원군이 말할때 흥선대원군 얼굴이 뜨면서 말하는 형태여야지"
//   "메시지들이 실제 조선의 장계나 사초 같은 종이로 안내가 오게"
//   "사진과 대화가 시뮬레이션 게임 형태로 진행되고 그다음 메타버스 캐릭터 고종이 …"
//
// 예전에는 이름과 대사 서너 줄을 흰 카드에 한꺼번에 얹어 보여 주었다. 그것은
// 「읽을거리」이지 「대화」가 아니다. 여기서는 한 줄씩 온다 — 누가 말하는지 얼굴이
// 오른쪽에 서 있고, 글은 한지 위에 먹으로 앉는다. 누르면 다음 줄이 온다.
//
// 3D 화면을 덮지 않는다. 판과 사람만 pointer-events 를 가지므로, 뒤의 궁궐은
// 그대로 보인다 — 그것이 이 게임이 「메타버스」인 이유다.
import { speakerMedia, mediaFigure, installHistoricalMedia, bindMedia } from './historical-media.js'
import { PAPER } from './paper-data.js'

// 한 글자가 나오는 데 걸리는 시간. **프레임이 아니라 시간이다.**
export const CHAR_MS = 26
// 이보다 긴 줄은 기다리기가 지루하다 — 그 위로는 한 번에 뜬다.
export const MAX_TYPE_MS = 2400

const CSS = `
.speak{position:fixed;inset:0;z-index:46;pointer-events:none;
  font-family:system-ui,'Malgun Gothic',sans-serif}
/* 검은 도포를 입은 사람(대원군)이 어두운 궁궐 앞에 서면 실루엣이 배경에 묻힌다 —
   바깥선에 아주 옅은 빛을 둘러 사람과 배경을 가른다. */
.speak .fig{position:absolute;right:2vw;bottom:0;height:min(66vh,560px);
  object-fit:contain;object-position:bottom;pointer-events:none;
  filter:drop-shadow(0 10px 30px #000c) drop-shadow(0 0 2px #d8cdb455);
  animation:speakIn .28s ease-out}
@keyframes speakIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.speak .panel{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);
  width:min(880px,94vw);min-height:132px;padding:26px 28px 22px;pointer-events:auto;cursor:pointer;
  color:#23201a;border:1px solid #6b5a3e;border-radius:3px;
  background:#e9dfc6;background-size:cover;background-position:center;
  box-shadow:0 12px 40px #000b, inset 0 0 60px #b39a6a33}
.speak .panel::after{content:'';position:absolute;inset:5px;pointer-events:none;
  border:1px solid #6b5a3e55;border-radius:2px}
.speak .name{position:absolute;top:-15px;left:22px;padding:5px 20px 6px;
  font-size:15px;letter-spacing:4px;color:#f3e7d0;background:#7a2b26;
  border:1px solid #c9a15a;border-radius:2px;box-shadow:0 3px 10px #0009}
.speak .name em{font-style:normal;font-size:12px;color:#e4c9a0;letter-spacing:2px;margin-left:9px}
.speak .line{margin:6px 0 0;font-size:17px;line-height:1.9;white-space:pre-wrap;
  word-break:keep-all;min-height:62px;color:#23201a}
.speak .next{position:absolute;right:18px;bottom:10px;font-size:13px;color:#7a2b26;
  letter-spacing:2px;animation:speakBob 1.1s ease-in-out infinite}
@keyframes speakBob{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(3px);opacity:1}}
.speak .dots{position:absolute;left:28px;bottom:11px;display:flex;gap:5px}
.speak .dots i{width:6px;height:6px;border-radius:50%;background:#6b5a3e44;display:block}
.speak .dots i.on{background:#7a2b26}
/* 좁은 화면(태블릿 세로·손전화)에서는 판을 바닥에 붙인다. 판이 떠 있으면 그 틈으로
   사람의 발이 비죽 나온다 — 실제로 820×1180 에서 그랬다. 판이 사람을 잘라 주어야
   「판 뒤에 서 있다」로 읽힌다. */
@media (max-width:900px){
  .speak .fig{height:min(46vh,380px);right:0;bottom:0}
  .speak .panel{bottom:0;left:0;transform:none;width:100%;border-radius:3px 3px 0 0;
    padding:22px 20px 20px;min-height:118px}
  .speak .line{font-size:16px;line-height:1.85;min-height:56px}
  .speak .name{left:16px}
}
`

let styled = false

export function createSpeak(root) {
  installHistoricalMedia()
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  let el = null
  let timer = null
  let advance = null      // 지금 열려 있는 화면을 한 칸 넘기는 함수

  function close() {
    if (timer) { clearInterval(timer); timer = null }
    el?.remove()
    el = null
    advance = null
  }

  /**
   * view — { name, title, portrait, lines }
   *   portrait  PORTRAITS 의 키('regent' 따위). 없으면 얼굴 없이 판만 뜬다.
   * 마지막 줄까지 다 읽으면 Promise 가 풀린다.
   */
  function show(view) {
    close()
    return new Promise(resolve => {
      const lines = (view.lines ?? []).filter(Boolean)
      if (lines.length === 0) { resolve(); return }
      const media = speakerMedia(view)

      el = document.createElement('div')
      el.className = 'speak'
      el.innerHTML =
        `<div class="conversation"><div class="panel">
           <div class="name">${view.name ?? ''}${view.title ? `<em>${view.title}</em>` : ''}</div>
           <p class="line"></p>
           <div class="dots">${lines.map(() => '<i></i>').join('')}</div>
           <div class="next">▼</div>
         </div>${mediaFigure(media, { portrait: true })}</div>`
      root.appendChild(el)
      bindMedia(el)

      const panel = el.querySelector('.panel')
      // 한지. 배경 그림이 없으면 CSS 의 단색이 그대로 남는다 — 종이 없이도 읽힌다.
      if (PAPER.hanji) panel.style.backgroundImage = `url(${PAPER.hanji})`

      const lineEl = el.querySelector('.line')
      const nextEl = el.querySelector('.next')
      const dots = [...el.querySelectorAll('.dots i')]
      let i = -1
      let typing = false

      function paint(n) {
        // **학생이 아니라 우리가 쓴 글이지만 textContent 로만 넣는다** — 이 게임의
        // 규칙이다(글이 화면에 들어가는 자리는 언제나 textContent).
        lineEl.textContent = lines[i].slice(0, n)
      }

      function startLine() {
        i += 1
        dots.forEach((d, k) => d.classList.toggle('on', k <= i))
        nextEl.textContent = i === lines.length - 1 ? '▼ 닫기' : '▼'
        const text = lines[i]
        const step = Math.max(8, Math.min(CHAR_MS, MAX_TYPE_MS / Math.max(1, text.length)))
        let n = 0
        typing = true
        paint(0)
        if (timer) clearInterval(timer)
        timer = setInterval(() => {
          n += 1
          paint(n)
          if (n >= text.length) { clearInterval(timer); timer = null; typing = false }
        }, step)
      }

      advance = () => {
        if (typing) {                    // 아직 나오는 중이면 먼저 다 보여 준다
          if (timer) { clearInterval(timer); timer = null }
          typing = false
          paint(lines[i].length)
          return
        }
        if (i >= lines.length - 1) { close(); resolve(); return }
        startLine()
      }

      panel.addEventListener('click', () => advance?.())
      startLine()
    })
  }

  return {
    show,
    close,
    isOpen: () => el !== null,
    // E 키가 들어오는 자리. 열려 있으면 한 칸 넘기고 true 를 돌려준다.
    press() {
      if (!el) return false
      advance?.()
      return true
    },
    dispose() { close() },
  }
}
