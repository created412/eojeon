// 손가락 기기의 조이스틱 — 왼쪽 아래 작은 원 하나.
//
// 선생님(2026-10-11): 「모바일버전에서는 왼쪽에 작게 움직일수 있는 조이스틱 같은 형태가 있었으면 좋겠어. 구현해봐
// 최대한 게임 화면에 방해되지 않는 크기로.」
//
// 이 모듈은 **방향 하나**만 낸다 — input.js 의 setStick() 으로 넘기면 axis() 가 자판 W·A·S·D 와 같은 길로 흘린다.
// 그래서 걸음·카메라 기준(worldAxis)·탭 목표 지우기·조작권 판정이 전부 자판과 같다. 두 번째 이동 경로를 만들지 않는다.
// 바닥을 짚어 걷는 것(input.js 의 탭)은 그대로 남는다 — 조이스틱은 그 위에 더하는 것이다.
//
// 크기: 바탕 원 84px, 손잡이 34px. 반투명이라 궁이 비친다. 걷는 국면(낮·촉박)에만 보인다(main.js 가 setVisible).

export const STICK_RADIUS = 30     // 손잡이가 가운데서 벗어날 수 있는 거리(px) — 이 거리에서 1(전속)
export const STICK_DEAD = 0.18     // 이 비율 안의 흔들림은 0 으로 본다(손가락을 그냥 댄 것)

// 손가락의 어긋남(px) → 방향 벡터. 길이는 0~1, 죽은 구역 안은 0. 순수 함수 — 시험이 이것만 본다.
export function stickVector(dx, dy, radius = STICK_RADIUS, dead = STICK_DEAD) {
  const len = Math.hypot(dx, dy)
  if (!(len > 0)) return { x: 0, z: 0, mag: 0 }
  const raw = Math.min(1, len / radius)
  if (raw <= dead) return { x: 0, z: 0, mag: 0 }
  // 죽은 구역 바깥을 0~1 로 다시 편다 — 죽은 구역 가장자리에서 갑자기 0.18 로 뛰지 않게.
  const mag = (raw - dead) / (1 - dead)
  return { x: (dx / len) * mag, z: (dy / len) * mag, mag }
}

const CSS = `
.game-stick{position:fixed;left:14px;bottom:64px;z-index:23;width:84px;height:84px;border-radius:50%;
  background:#0f1113a8;border:1px solid #c9a15a66;box-shadow:0 2px 10px #0006;touch-action:none;
  user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.game-stick[hidden]{display:none}
.game-stick .knob{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;
  background:#e0a23ad9;border:1px solid #f3d089;box-shadow:0 1px 6px #0008;pointer-events:none;transition:transform .08s}
.game-stick.on .knob{transition:none;background:#f0c469}
.game-stick::before{content:'';position:absolute;inset:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#c9a15a55}
/* 「?」 단추(main.js helpBtn)는 넓은 화면 규칙(ui/royal-interface.js)이 bottom:84px 에 두어 조이스틱과 겹친다 —
   조이스틱이 있는 손가락 기기에서는 그 위로 올린다. id 선택자라 모듈의 .eojeon 규칙보다 앞선다. */
@media(pointer:coarse){#root button[aria-label='조작 안내']{left:14px!important;bottom:156px!important}}
/* 대화·어전회의·멈춤 뒤에서는 숨는다 — 오른쪽 손가락 단추(.game-controls)와 같은 규칙(ui/cinematic-style.js). */
.eojeon:has(.speak) .game-stick,.eojeon:has(.council) .game-stick,.eojeon:has(.pause) .game-stick{visibility:hidden}
`

export function createJoystick(root, { onChange = () => {} } = {}) {
  if (!document.getElementById('game-stick-style')) {
    const style = document.createElement('style'); style.id = 'game-stick-style'; style.textContent = CSS
    document.head.appendChild(style)
  }
  const el = document.createElement('div')
  el.className = 'game-stick'
  el.setAttribute('role', 'application')
  el.setAttribute('aria-label', '걷기 조이스틱')
  el.hidden = true
  const knob = document.createElement('div'); knob.className = 'knob'
  el.appendChild(knob)
  root.appendChild(el)

  let pointerId = null, cx = 0, cy = 0
  const paint = v => { knob.style.transform = `translate(${v.x * STICK_RADIUS}px,${v.z * STICK_RADIUS}px)` }
  const release = () => {
    if (pointerId === null) return
    pointerId = null; el.classList.remove('on'); paint({ x: 0, z: 0 }); onChange({ x: 0, z: 0 })
  }
  el.addEventListener('pointerdown', e => {
    if (pointerId !== null) return
    e.preventDefault(); e.stopPropagation()
    pointerId = e.pointerId
    const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2
    try { el.setPointerCapture(e.pointerId) } catch { /* 지원 안 하는 브라우저 — 창 전체의 move 로 받는다 */ }
    el.classList.add('on')
    const v = stickVector(e.clientX - cx, e.clientY - cy); paint(v); onChange(v)
  })
  const onMove = e => {
    if (e.pointerId !== pointerId) return
    e.preventDefault()
    const v = stickVector(e.clientX - cx, e.clientY - cy); paint(v); onChange(v)
  }
  const onUp = e => { if (e.pointerId === pointerId) release() }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
  addEventListener('blur', release)

  return {
    el,
    setVisible(on) { const want = !on; if (el.hidden !== want) { el.hidden = want; if (want) release() } },
    dispose() { release(); removeEventListener('blur', release); el.remove() },
  }
}
