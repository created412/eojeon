const ACTION = Object.freeze({
  document: '읽기',
  person: '말하기',
  door: '가기',
})

export function interactionCue({ kind, label, distance = Infinity, urgent = false } = {}) {
  const visible = urgent || distance <= 18
  return {
    label: `${label ?? ''} · E ${ACTION[kind] ?? '살피기'}`,
    tone: urgent ? 'red' : 'gold',
    pulse: urgent,
    visible,
  }
}
