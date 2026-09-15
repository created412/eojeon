// 「지금 할 일」 한 줄 — 화면 위쪽 가운데에 늘 떠 있다(data/guide.js). 누르지 않는다(pointer-events:none).
export function createGuideStrip(root) {
  const el = document.createElement('div')
  el.className = 'guide-strip'
  el.setAttribute('role', 'status')
  el.hidden = true
  const style = document.createElement('style')
  style.textContent = `.guide-strip{position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:75;pointer-events:none;
  max-width:min(720px,calc(100vw - 32px));box-sizing:border-box;padding:7px 16px;border-radius:18px;
  background:#0f1113e6;border:1px solid #c9a15a88;color:#f3e7d0;font:14px/1.5 system-ui,'Malgun Gothic',sans-serif;
  text-align:center;box-shadow:0 4px 14px #0008}
  .guide-strip b{color:#e0a23a;font-weight:600;margin-right:8px;letter-spacing:1px}
  .guide-strip[hidden]{display:none}
  @media(max-width:760px){.guide-strip{top:auto;bottom:8px;font-size:13px}}`
  document.head.appendChild(style)
  root.appendChild(el)
  return {
    set(text) {
      if (!text) { el.hidden = true; return }
      el.innerHTML = ''
      const b = document.createElement('b'); b.textContent = '지금 할 일'
      el.append(b, document.createTextNode(text))
      el.hidden = false
    },
    hide() { el.hidden = true },
  }
}
