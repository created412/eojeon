// 세로로 들고 들어온 학생에게 가로로 돌려 달라고 말하는 한 판.
//
// 2026-09-27 선생님: 「모바일이나 태블릿pc로 접속해도 플레이 가능하게 만들어봐.
// 세로화면일 땐 가로로 돌리라는 문구 뜨고, 가로로 돌리면 진행되도록.」
//
// 왜 필요한가: 이 게임의 화면들은 가로를 전제로 짜여 있다. 3D 마당은 가로로 넓고,
// 공사판(rebuild)·어전회의는 두 칸을 나란히 놓으며, 하루의 끝은 「오늘 한 일 / 하지 않은
// 일」을 좌우로 벌린다. 390×844 세로에서는 그 두 칸이 위아래로 쌓여 화면 밖으로 밀리고,
// 학생은 **아래에 무엇이 더 있는지 모른 채** 「안 눌린다」고 판단한다.
// 「독립군의 별」에서 똑같은 일을 이미 한 번 겪었다 — 그때도 원인은 터치가 아니라
// 배치였고, 학생들은 기기를 돌려서 스스로 해결하고 있었다. 그러면 처음부터 돌려
// 달라고 말하는 것이 옳다.
//
// ⚠ 이 판은 **막는 판이 아니라 안내하는 판**이다. 교실 태블릿은 회전 잠금이 켜진 채로
//    나눠 주는 일이 흔하고, 그런 기기에서는 학생이 아무리 돌려도 portrait 그대로다.
//    빠져나갈 길이 없으면 그 학생은 수업 내내 이 화면만 본다 — 고치려던 것보다 나쁘다.
//    그래서 조용한 한 줄을 아래에 둔다. 눈에 먼저 띄지는 않되, 찾으면 있다.
//    (ration.js 의 「손이 불편하면 건너뛴다」와 같은 규칙이다.)

// 기기 판정은 여기서 다시 하지 않는다. controls-hint.js 의 isCoarse() 하나만 쓴다 —
// 예전에 main.js 와 fire-rush.js 가 따로 판정했다가 「안내는 짚으라는데 짚을 단추가
// 없는」 상태를 만든 적이 있고, 그래서 그 파일에 판정을 모으고 시험으로 잠가 두었다
// (tests/ui/controls-hint.test.js). 이 파일을 만들며 그 잠금을 한 번 어겼다 — 시험이 잡았다.
import { isCoarse } from './controls-hint.js'

// ── 판정 ──────────────────────────────────────────────────────────────────
// DOM 없이 시험할 수 있게 떼어 둔다. 화면을 띄울지 말지는 오직 이 함수가 정한다.
//
// coarse 가 조건에 들어가는 까닭: 좁게 줄인 PC 창은 portrait 이지만 돌릴 수가 없다.
// 「돌리세요」라고 말해 놓고 돌릴 방법이 없으면 그것도 갇히는 것이다. 기준은
// isCoarse() — main.js 가 태블릿 단추를 붙일 때 쓰는 바로 그 판정이다(controls-hint.js).
export function shouldAskRotate({ coarse, portrait, dismissed }) {
  return !!coarse && !!portrait && !dismissed
}

const CSS = `
/* z-index 는 이 저장소에서 가장 높다. 지금 제일 높은 것이 타이틀의 90 인데, 처음에
   이 판도 90 으로 두었더니 **타이틀이 이 판 위에 그려졌다** — 같은 층이면 나중에
   붙은 쪽이 이긴다. boot() 에서 이 판을 먼저 세우고 타이틀이 뒤에 오기 때문이다.
   화면이 비쳐 보여 글자가 겹쳤다. 이 판은 다른 모든 화면을 덮어야 뜻이 서므로
   한참 위로 올린다 — 새 화면이 생겨도 이 판만은 덮이지 않게. */
.orient{position:fixed;inset:0;z-index:2000;background:#0f1113;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:22px;padding:32px 26px;text-align:center;
  font-family:var(--face-body,system-ui,'Malgun Gothic',sans-serif)}
/* 돌아가는 기기 그림. 글을 못 읽는 순간에도 뜻이 먼저 닿아야 한다 — 이 화면은
   「무슨 말인지 모르겠다」가 곧 수업 중단이 되는 자리다. */
.orient .phone{width:74px;height:120px;border:3px solid #d9c38f;border-radius:10px;
  position:relative;animation:orient-turn 2.6s ease-in-out infinite}
.orient .phone::after{content:'';position:absolute;left:50%;bottom:7px;transform:translateX(-50%);
  width:26px;height:3px;border-radius:2px;background:#d9c38f}
@keyframes orient-turn{
  0%,26%{transform:rotate(0)} 52%,78%{transform:rotate(-90deg)} 100%{transform:rotate(-90deg)}
}
.orient h2{margin:0;font-size:var(--read-title,24px);color:#f0ebdd;font-weight:400;
  letter-spacing:.08em;line-height:var(--read-lh-title,1.45)}
.orient p{margin:0;font-size:var(--read-body,17px);color:var(--paper-quiet,#b3aa95);
  line-height:var(--read-lh-body,1.8);max-width:26em;word-break:keep-all;text-wrap:pretty}
/* 빠져나가는 길. 눈에 먼저 띄면 안 되지만, 찾으면 있어야 한다. */
.orient button{margin-top:4px;background:none;border:0;border-bottom:1px solid #4b5560;
  color:#8f8a7c;font:inherit;font-size:var(--read-small,14px);padding:4px 2px;cursor:pointer;
  letter-spacing:.04em}
.orient button:hover,.orient button:focus-visible{color:#c9c1ad;border-bottom-color:#8f8a7c}
@media(prefers-reduced-motion:reduce){.orient .phone{animation:none;transform:rotate(-90deg)}}
`

// 이 판이 한 번 뜨고 나면 학생이 「이대로 보기」를 고를 수 있다. 그 선택은 새로
// 고치기 전까지만 산다 — localStorage 에 남기지 않는다. 다음 시간에 다른 학생이
// 같은 기기를 들었을 때 안내가 조용히 사라져 있으면 안 된다.
let dismissed = false

export function resetDismissed() { dismissed = false }

// 화면을 세우고, 돌릴 때마다 스스로 나타났다 사라진다.
// 돌려주는 것은 떼어내는 함수 하나다 — 부르는 쪽이 정리할 수 있게.
export function installOrientGate(root, {
  doc = globalThis.document,
  coarse = null,        // 시험에서 갈아 끼운다
  mm = (q) => globalThis.matchMedia?.(q) ?? { matches: false },
} = {}) {
  if (!root || !doc?.head) return () => {}

  if (!doc.getElementById('eojeon-orient-style')) {
    const style = doc.createElement('style')
    style.id = 'eojeon-orient-style'
    style.textContent = CSS
    doc.head.appendChild(style)
  }

  const isCoarseNow = () => (typeof coarse === 'function' ? coarse() : isCoarse())
  // orientation 미디어 쿼리를 모르는 낡은 브라우저에서는 창 비율로 갈음한다 —
  // 모른다고 「가로다」로 넘겨 버리면 세로 학생이 그대로 밀린 화면을 본다.
  const isPortraitNow = () => {
    const q = mm('(orientation: portrait)')
    if (typeof q?.matches === 'boolean') return q.matches
    return (globalThis.innerHeight ?? 0) > (globalThis.innerWidth ?? 0)
  }

  let el = null

  function paint() {
    const want = shouldAskRotate({ coarse: isCoarseNow(), portrait: isPortraitNow(), dismissed })
    if (want && !el) {
      el = doc.createElement('div')
      el.className = 'orient'
      el.setAttribute('role', 'alertdialog')
      el.setAttribute('aria-label', '화면을 가로로 돌려 주세요')
      const icon = doc.createElement('div'); icon.className = 'phone'; icon.setAttribute('aria-hidden', 'true')
      const h = doc.createElement('h2'); h.textContent = '화면을 가로로 돌려 주세요'
      const p = doc.createElement('p')
      p.textContent = '이 수업은 가로 화면에 맞추어 만들었습니다. 기기를 옆으로 돌리면 곧바로 이어집니다.'
      const skip = doc.createElement('button')
      skip.type = 'button'
      skip.textContent = '돌릴 수 없습니다 — 이대로 보기'
      skip.addEventListener('click', () => { dismissed = true; paint() })
      el.append(icon, h, p, skip)
      root.appendChild(el)
      // 이 판이 떠 있는 동안 뒤의 화면을 읽지 못하게 한다 — 돋보기(스크린 리더)가
      // 가려진 글을 계속 읽으면 학생은 어디를 보아야 할지 모른다.
      skip.focus?.()
    } else if (!want && el) {
      el.remove()
      el = null
    }
  }

  paint()

  // 돌리는 순간을 받는 길이 기기마다 다르다 — 셋 다 걸어 두고 같은 자리로 모은다.
  const q = mm('(orientation: portrait)')
  q?.addEventListener?.('change', paint)
  addEventListener('resize', paint)
  addEventListener('orientationchange', paint)

  return () => {
    q?.removeEventListener?.('change', paint)
    removeEventListener('resize', paint)
    removeEventListener('orientationchange', paint)
    el?.remove()
    el = null
  }
}
