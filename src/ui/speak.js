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
import { revealCount } from '../systems/voice.js'

// 선생님(2026-10-06): 「대화문이 글자 크기가 커져서 매우 좋아. 다만 … 글자가 빠르게
// 쏟아지듯 뜨게 되어서 눈이 너무 피로해.」
// 예전에는 한 글자씩(26ms) 찍었다. 글이 커지자 그 흐름이 눈을 잡아끌었다 — 읽는 게
// 아니라 쫓게 된다. 이제 **한 줄이 통째로 조용히 떠오른다**(REVEAL_MS 동안 한 번).
// 읽는 속도는 학생의 손이 정한다(「다음 대사」). 목소리가 실린 줄만 소리의 시계를 따른다.
export const REVEAL_MS = 420

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
.speak .line.rise{animation:speakLine .42s ease-out}
@keyframes speakLine{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.speak .line.rise{animation:none}}
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
/* 2026-10-06 사용자: 「대화문 글자가 작고, 폰트가 가독성이 떨어져.」 */
.eojeon .speak .conversation{width:min(1400px,94vw);bottom:24px;grid-template-columns:minmax(0,1fr) minmax(230px,27%);gap:12px}
.eojeon .speak .conversation .panel{display:flex;flex-direction:column;overflow:hidden;padding:62px 36px 68px;min-height:238px;max-height:62vh;background:linear-gradient(145deg,#17282af5,#101c25f5)!important;border:1px solid #d5bd8277;border-top:3px solid #d6bd80;border-radius:12px;box-shadow:0 18px 64px #0009;color:#fff8e8}
.eojeon .speak .conversation .panel::after{display:none}
.eojeon .speak .conversation .panel .name{top:0;left:28px;padding:10px 22px;background:#d9c394;color:#183035;font:600 22px/1.3 var(--face-body,system-ui);letter-spacing:0;border:0;border-radius:0 0 6px 6px}
.eojeon .speak .conversation .panel .name em{font:400 16px/1.3 var(--face-body,system-ui);color:#394849;letter-spacing:0}
.eojeon .speak .conversation .panel .line{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;font:500 clamp(23px,2vw,30px)/1.65 var(--face-body,system-ui);color:#fff8e8;text-align:center;text-wrap:pretty;letter-spacing:0;margin:8px auto 0;padding:0;min-height:72px;max-width:38em}
.eojeon .speak .conversation .panel .dots{left:30px;bottom:24px;gap:7px}
.eojeon .speak .conversation .panel .dots i{width:7px;height:7px;background:#9faaa555}
.eojeon .speak .conversation .panel .dots i.on{background:#dac491}
.eojeon .speak .conversation .panel .next{right:22px;bottom:14px;min-height:44px;padding:9px 20px;border:1px solid #d5bd8277;background:#243a3c;color:#ffe6ae;border-radius:6px;font:600 17px/1.4 var(--face-body,system-ui);letter-spacing:0;animation:none;cursor:pointer}
.eojeon .speak .conversation .portrait-stage{background:transparent;border:0;box-shadow:none;padding:0;overflow:visible;max-height:none}
.eojeon .speak .conversation .portrait-stage .historical-image{height:min(65vh,640px);width:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 6px 18px #000a)}
.eojeon .speak .conversation .portrait-stage .media-zoom{background:transparent}
.eojeon .speak .conversation .portrait-stage figcaption{margin:0;padding:8px 10px;background:#122027e8;color:#eee3cd;font:400 13px/1.5 var(--face-body,system-ui);text-align:center;border-radius:6px;text-shadow:none}
.portrait-source-hint{display:block;color:#d5bf88}
/* 고정 소리 단추가 대화 진행점을 덮지 않도록 대화 중에는 빈 위쪽에 둔다. */
.eojeon:has(.speak) .game-sound{left:12px!important;top:12px;bottom:auto!important}
@media(max-height:550px) and (min-width:501px){
 .eojeon .speak .conversation{bottom:10px;grid-template-columns:minmax(0,1fr) 170px;gap:8px}
 .eojeon .speak .conversation .panel{padding:46px 20px 68px;min-height:190px;max-height:calc(100vh - 80px)}
 .eojeon .speak .conversation .panel .line{font-size:21px;line-height:1.5;min-height:54px}
 .eojeon .speak .conversation .panel .name{font-size:18px;padding:7px 14px}
 .eojeon .speak .conversation .portrait-stage .historical-image{height:65vh}
 .eojeon .speak .conversation .portrait-stage figcaption{font-size:11px;padding:5px}
}
@media(max-width:500px){
 .eojeon .speak .conversation{bottom:10px;gap:0}
 .eojeon .speak .conversation .portrait-stage{width:46%;max-height:none;overflow:visible}
 .eojeon .speak .conversation .portrait-stage .historical-image{height:30vh}
 .eojeon .speak .conversation .portrait-stage figcaption{font-size:11px;padding:4px}
 .eojeon .speak .conversation .panel{padding:52px 18px 64px;max-height:52vh;min-height:190px}
 .eojeon .speak .conversation .panel .line{font-size:22px;line-height:1.55}
 .eojeon .speak .conversation .panel .name{font-size:19px;left:18px}
}
@media(prefers-reduced-motion:reduce){.eojeon .speak .speaker-portrait{animation:none}}
`

let styled = false

// voice — systems/voice.js 의 createVoicePlayer(). 없으면 예전처럼 글자만 찍는다.
export function createSpeak(root, { voice = null } = {}) {
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
    voice?.stop()
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
           <button type="button" class="next">다음 대사 →</button>
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
        lineEl.scrollTop = 0
        dots.forEach((d, k) => d.classList.toggle('on', k <= i))
        nextEl.textContent = i === lines.length - 1 ? '대화 마치기 ✓' : '다음 대사 →'
        const text = lines[i]
        voice?.stop()
        if (timer) clearInterval(timer)
        typing = true
        paint(0)
        // 이 줄에 목소리가 있으면 소리의 시계를 따라 찍는다. 소리가 막히면(음소거·자동 재생 차단)
        // 그 자리에서 아래의 글자 찍기로 넘어간다 — 대화가 멈추지 않는다.
        // 목소리는 「」 대사에만 붙는다. 지문(누가 들어온다·손을 얹는다 같은 안내 문장)은 읽지 않는다(2026-09-14 선생님).
        const clip = text.includes('「') ? voice?.clipFor(view.npcId, text) : null
        const handle = clip ? voice.play(clip) : null
        if (handle) {
          timer = setInterval(() => {
            if (handle.failed) { clearInterval(timer); timer = null; showWhole(text); return }
            const n = Math.min(text.length, revealCount(clip.t, handle.currentMs()))
            paint(n)
            if (handle.ended || n >= text.length) { clearInterval(timer); timer = null; paint(text.length); typing = false }
          }, 30)
          return
        }
        showWhole(text)
      }

      // 한 줄을 통째로 올린다. 글자를 세지 않는다 — 떠오르는 것은 줄 하나뿐이다.
      function showWhole(text) {
        if (timer) { clearInterval(timer); timer = null }
        typing = false
        lineEl.classList.remove('rise')
        void lineEl.offsetWidth
        lineEl.classList.add('rise')
        paint(text.length)
      }

      advance = () => {
        if (typing) {                    // 아직 나오는 중이면 먼저 다 보여 준다
          if (timer) { clearInterval(timer); timer = null }
          typing = false
          paint(lines[i].length)
          return
        }
        // 다음 줄로 넘기거나 닫으면 지금 말은 멈춘다. 글자만 다 보이게 한 첫 누름에서는 말을 끊지 않는다.
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
