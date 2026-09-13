const KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1],  ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0],  ArrowRight: [1, 0],
}

// 글을 쓰는 칸에 커서가 있으면 이 모듈은 키를 건드리지 않는다.
//
// 예전에는 포커스와 무관하게 W·A·S·D·방향키에 preventDefault() 를 걸었다. 그래서
// 어전회의 끝의 「왜 그렇게 정했는가」 칸에 **한 글자도 쓸 수 없었다** — 「왜」를
// 치려면 ㅇ·ㅙ 가 필요한데 자판이 막혀 있었고, 방향키로 커서도 못 옮겼다.
// 그 칸이 이 수업의 산출물(세특의 밑감)이다.
export function isTyping(e) {
  const el = e?.target
  if (!el) return false
  const tag = el.tagName
  return tag === 'TEXTAREA' || tag === 'INPUT' || el.isContentEditable === true
}

export function createInput(target) {
  const down = new Set()
  let shift = false
  let pending = null

  const onKeyDown = (e) => {
    if (isTyping(e)) return          // 글 쓰는 중에는 임금을 움직이지 않는다
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true
    if (KEYS[e.code]) { down.add(e.code); e.preventDefault() }
  }
  const onKeyUp = (e) => {
    // keyup 은 글 쓰는 중이어도 지운다 — 키를 누른 채 칸으로 들어가면
    // 그 키가 눌린 채로 남아 임금이 혼자 걸어간다.
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false
    down.delete(e.code)
  }
  const onBlur = () => { down.clear(); shift = false }
  const onPointer = (e) => {
    if (e.button !== 0) return
    const r = target.getBoundingClientRect()
    pending = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  addEventListener('blur', onBlur)
  target.addEventListener('pointerdown', onPointer)

  return {
    axis() {
      let x = 0, z = 0
      for (const code of down) { x += KEYS[code][0]; z += KEYS[code][1] }
      const len = Math.hypot(x, z)
      return len === 0 ? { x: 0, z: 0 } : { x: x / len, z: z / len }
    },
    running() { return shift },
    tap() { const t = pending; pending = null; return t },
    dispose() {
      removeEventListener('keydown', onKeyDown)
      removeEventListener('keyup', onKeyUp)
      removeEventListener('blur', onBlur)
      target.removeEventListener('pointerdown', onPointer)
    },
  }
}
