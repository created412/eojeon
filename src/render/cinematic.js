const ACT_MOODS = Object.freeze({
  enthronement: 'dawnwinter',
  yangyo: 'day',
  chinjeong: 'day',
  imo: 'daybreak',
  gapsin: 'night',
})

export function cinematicDirective({ actId, beat, phase, rush } = {}) {
  const danger = phase === 'rush' && !!rush
  const fire = (danger && rush?.fire === true) || beat?.kind === 'rush' && beat.fire === true
  const mode = danger ? 'danger' : phase === 'audience' || phase === 'council' ? 'audience' : 'follow'
  return {
    mood: fire ? 'fire' : ACT_MOODS[actId] ?? 'day',
    camera: { mode },
    ambience: danger ? 'tense' : 'palace',
    cue: fire ? 'fire' : danger && actId === 'gapsin' ? 'gunfire' : null,
  }
}

export function interpolateCameraShot(current, target, alpha) {
  const t = Math.max(0, Math.min(1, alpha))
  return Object.fromEntries(Object.keys(current).map(key => [key, current[key] + (target[key] - current[key]) * t]))
}
