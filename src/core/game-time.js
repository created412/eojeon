// 한 번 멈춘 시간은 행렬·촉박·미니게임 어느 쪽에도 더하지 않는다.
export function createGameTime(readNow = () => performance.now()) {
  const reasons = new Set(), pending = new Set()
  let stoppedAt = null, excluded = 0
  const now = () => (stoppedAt ?? readNow()) - excluded
  return {
    now,
    isPaused: () => reasons.size > 0,
    setPaused(paused, reason = 'menu') {
      if (paused) {
        if (!reasons.size) stoppedAt = readNow()
        reasons.add(reason)
      } else {
        reasons.delete(reason)
        if (!reasons.size && stoppedAt !== null) { excluded += readNow() - stoppedAt; stoppedAt = null }
      }
    },
    // 결과 화면도 멈춤 중에는 다음 장면으로 넘어가거나 포커스를 빼앗지 않는다.
    delay(callback, ms) {
      const end = now() + ms
      let timer
      const cancel = () => { clearTimeout(timer); pending.delete(cancel) }
      const tick = () => {
        if (!reasons.size && now() >= end) { pending.delete(cancel); callback(); return }
        timer = setTimeout(tick, reasons.size ? 50 : Math.max(1, Math.min(50, end - now())))
      }
      pending.add(cancel); timer = setTimeout(tick, Math.min(50, ms))
      return cancel
    },
    dispose() { for (const cancel of pending) cancel() },
  }
}
