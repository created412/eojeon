const STYLE =
  'position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:60;' +
  'padding:14px 26px;background:#0f1113ee;border:1px solid #3a4248;border-radius:3px;' +
  'color:#e8e2d4;font-size:20px;letter-spacing:3px;pointer-events:none;transition:opacity .6s'

// <style> 태그를 만들지 않는다. 배너는 막마다 떴다 사라지므로
// head 에 스타일을 쌓아 두면 그것이 그대로 누수가 된다.
export function banner(root, text, holdMs = 1400) {
  const el = document.createElement('div')
  el.style.cssText = STYLE
  el.textContent = text
  root.appendChild(el)
  const fade = setTimeout(() => { el.style.opacity = '0' }, holdMs)
  const gone = setTimeout(() => el.remove(), holdMs + 700)
  return {
    dispose() { clearTimeout(fade); clearTimeout(gone); el.remove() },
  }
}
