// 대사 음성 — 인물마다 정한 목소리(data/voice-cast.js)로 만든 한 줄씩의 소리를 대화판과 맞춰 튼다.
//
// 선생님 요청(2026-09-13): 「각 인물에 맞는 음성을 … 싱크를 정확히 맞춰 넣고」.
// 글자마다 「이 시각에 나타난다」가 data/voice-data.js 의 t 에 적혀 있다(tools/pack-voice.py 가
// 음성 인식의 단어 시각으로 맞췄다). 대화판은 재생 중인 소리의 currentTime 을 보고 그 시각을 지난
// 글자까지만 찍는다 — 프레임이 아니라 소리의 시계를 따른다. 느린 기계에서도 글자가 말을 앞지르지 않는다.
import { voiceKey } from '../data/voice-cast.js'

// times[i] ≤ ms 인 글자 수. times 는 뒤로 가지 않는다(pack-voice.py 가 보장한다).
export function revealCount(times, ms) {
  let lo = 0, hi = times.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] <= ms) lo = mid + 1
    else hi = mid
  }
  return lo
}

// clips — { key: { src, ms, t } }. isMuted — 게임의 음소거(systems/audio.js)를 그대로 따른다.
// makeAudio — 시험에서 가짜 소리를 끼우는 자리. 브라우저에서는 new Audio(src).
export function createVoicePlayer({ clips = {}, isMuted = () => false, makeAudio = src => new Audio(src),
  onStart = () => {}, onEnd = () => {} } = {}) {
  let current = null
  let sequence = null

  function stopAudio() {
    if (!current) return
    const a = current.audio
    current.failed = true // 대화판도 소리가 멈추면 시간 기반 글자 표시로 전환한다.
    current = null
    try { a.pause() } catch { /* 이미 멈췄다 */ }
    onEnd()
  }

  function stop() {
    sequence?.stop()
    sequence = null
    stopAudio()
  }

  function playAudio(clip, complete = () => {}) {
    stopAudio()
    if (!clip || isMuted()) return null
    const audio = makeAudio(clip.src)
    const handle = { audio, failed: false, ended: false, currentMs: () => (audio.currentTime ?? 0) * 1000, stop }
    current = handle
    const finish = failed => {
      if (current !== handle) return
      handle.failed = failed
      handle.ended = !failed
      current = null
      onEnd()
      complete(failed)
    }
    audio.addEventListener?.('ended', () => finish(false))
    audio.addEventListener?.('error', () => finish(true))
    try { audio.play?.()?.catch?.(() => finish(true)) } catch { finish(true) }
    onStart()
    return handle
  }

  return {
    clipFor(npcId, line) {
      if (!npcId || !line) return null
      return clips[voiceKey(npcId, line)] ?? null
    },
    // 소리를 틀고 손잡이를 돌려준다. 음소거면 null — 부르는 쪽은 예전처럼 글자만 찍는다.
    play(clip) {
      stop()
      return playAudio(clip)
    },
    narrate(lines, { onLine = () => {} } = {}) {
      stop()
      let index = 0, cancelled = false, timer = null, resolve, lineStarted = 0, readMs = 0
      const done = new Promise(r => { resolve = r })
      const run = {
        done,
        silence() { stopAudio(); scheduleNext() },
        stop() {
          if (cancelled) return
          cancelled = true
          clearTimeout(timer)
          if (sequence === run) { sequence = null; stopAudio() }
          resolve()
        },
      }
      sequence = run
      function scheduleNext() {
        if (cancelled) return
        clearTimeout(timer)
        timer = setTimeout(next, Math.max(0, readMs - (Date.now() - lineStarted)))
      }
      function next() {
        timer = null
        if (cancelled) return
        if (index >= lines.length) { run.stop(); return }
        const text = lines[index++]
        const clip = clips[voiceKey('gojong-narrator', text)]
        lineStarted = Date.now()
        readMs = Math.max(2400, clip?.ms ?? text.length * 100)
        onLine(text, clip, index - 1)
        if (!playAudio(clip, failed => failed ? scheduleNext() : next())) scheduleNext()
      }
      next()
      return run
    },
    silence() { if (sequence) sequence.silence(); else stopAudio() },
    stop,
    isPlaying: () => current !== null,
  }
}
