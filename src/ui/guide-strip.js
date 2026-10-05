// 「지금 할 일」 한 줄 — 화면 위쪽 가운데에 늘 떠 있다(data/guide.js). 누르지 않는다(pointer-events:none).
//
// ── 띠가 본문을 덮지 않게 한다(2026-10-05 전체 점검) ─────────────────────
//
// 이 띠는 z-index 75 로 모든 전체 화면 판(45~62) **위에** 뜬다. 그런데 판들은
// 저마다 맨 위에 제목과 첫 안내 줄을 두므로, 띠가 정확히 그 자리를 덮었다 —
// 장계 화면의 첫 줄(「장계 2통이 닿았다. 봉한 것을 눌러 …」)은 띠 밑에 깔려
// 아예 읽을 수 없었고, 어전회의·훈령·공사판·글 화면의 제목도 마찬가지였다.
// 전 화면을 한 장씩 찍어 보고서야 드러났다: 판을 하나씩 만들 때는 그 판만 띄워
// 보았고, 그때는 띠가 없었다.
//
// 띠를 없애지는 않는다(지금 무엇을 하는지는 늘 보여야 한다). 대신 띠가 **제 키를
// 재서 알리고**, 판들이 그만큼 비켜 선다:
//
//   html.guide-top / guide-bottom  띠가 위에 떴는가, 아래에 떴는가(좁은 화면은 아래)
//   --guide-clear                  띠가 차지한 높이 — 판이 그쪽 안여백으로 쓴다
//
// 판 쪽 CSS 를 열두 군데 고치는 대신 여기 한 곳에서 규칙을 건다 — 새 판을 만들면
// 아래 PANELS 에 이름 하나만 더하면 된다.
const PANELS = ['note', 'dispatch', 'council', 'orders', 'rebuild', 'brush',
  'loss', 'move', 'ration', 'cquiz']

const GAP = 12   // 띠와 본문 사이에 두는 숨

export function createGuideStrip(root) {
  const el = document.createElement('div')
  el.className = 'guide-strip'
  el.setAttribute('role', 'status')
  el.hidden = true
  // 띠가 뜬 쪽만 비운다. 두 쪽을 한 규칙으로 걸면, 띠가 위에 떴을 때 아래쪽 안여백이
  // 0 으로 덮여 판 밑의 단추가 화면 끝에 붙는다.
  const selTop = PANELS.map(p => `html.guide-top #root > .${p}`).join(',')
  const selBottom = PANELS.map(p => `html.guide-bottom #root > .${p}`).join(',')
  const style = document.createElement('style')
  style.textContent = `.guide-strip{position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:75;pointer-events:none;
  max-width:min(720px,calc(100vw - 32px));box-sizing:border-box;padding:7px 16px;border-radius:18px;
  background:#0f1113e6;border:1px solid #c9a15a88;color:#f3e7d0;font:14px/1.5 system-ui,'Malgun Gothic',sans-serif;
  text-align:center;box-shadow:0 4px 14px #0008}
  .guide-strip b{color:#e0a23a;font-weight:600;margin-right:8px;letter-spacing:1px}
  .guide-strip[hidden]{display:none}
  @media(max-width:760px){.guide-strip{top:auto;bottom:8px;font-size:13px}}
  ${selTop}{padding-top:var(--guide-clear,0px) !important;box-sizing:border-box}
  ${selBottom}{padding-bottom:var(--guide-clear,0px) !important;box-sizing:border-box}`
  document.head.appendChild(style)
  root.appendChild(el)

  const html = document.documentElement
  function publish() {
    html.classList.remove('guide-top', 'guide-bottom')
    if (el.hidden) { html.style.removeProperty('--guide-clear'); return }
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight || 0
    // 화면 위쪽 절반에 떴으면 위를, 아래쪽이면 아래를 비운다(좁은 화면에서는 아래에 뜬다).
    const top = r.top < vh / 2
    html.style.setProperty('--guide-clear', `${Math.ceil(top ? r.bottom + GAP : vh - r.top + GAP)}px`)
    html.classList.add(top ? 'guide-top' : 'guide-bottom')
  }
  // 창 크기가 바뀌면(태블릿을 돌리면) 띠의 줄 수와 자리가 바뀐다 — 다시 잰다.
  window.addEventListener?.('resize', publish)

  return {
    set(text) {
      if (!text) { el.hidden = true; publish(); return }
      el.innerHTML = ''
      const b = document.createElement('b'); b.textContent = '지금 할 일'
      el.append(b, document.createTextNode(text))
      el.hidden = false
      publish()
    },
    hide() { el.hidden = true; publish() },
  }
}

export const GUIDE_PANELS = PANELS
