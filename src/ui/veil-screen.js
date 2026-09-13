// 발 자체는 이제 **세계에 걸려 있다**(render/palace.js 의 buildThrone —
// 인정전 어좌 앞에 늘어뜨린 대나무 발). 예전에는 화면 위쪽 42% 를 덮는 판이어서
// 임금이 어디로 가든 따라다녔다 — 궁을 나가도 발이 화면에 있었다(선생님 지적 1번).
//
// 여기 남는 것은 지금이 수렴청정 시기라는 **글자 한 줄**뿐이다. 화면을 가리지 않고
// 위쪽 구석에 조용히 앉는다.
const CSS = `
.sullyeom{position:fixed;left:0;right:0;top:34px;z-index:15;pointer-events:none;
  text-align:center}
.sullyeom span{display:inline-block;padding:4px 14px;background:#0f1113cc;
  border:1px solid #3a2d20;border-radius:2px;
  font-size:11px;color:#8f8a7c;letter-spacing:4px}
`

export function createSullyeom(root) {
  let el = null
  let style = null
  return {
    show() {
      if (el) return
      style = document.createElement('style')
      style.textContent = CSS
      document.head.appendChild(style)
      el = document.createElement('div')
      el.className = 'sullyeom'
      el.innerHTML = '<span>수 렴 청 정</span>'
      root.appendChild(el)
    },
    hide() {
      el?.remove(); el = null
      style?.remove(); style = null
    },
  }
}
