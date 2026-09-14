// 배경 음악 — 궁의 메인 테마와 촉박 장면의 긴장 변주(assets/bgm, Gemini Lyria RealTime).
//
// 선생님 요청(2026-09-14): 「이 게임에 가장 잘 어울리는 BGM」. 바닥 소리(systems/audio.js 의 ambient)는
// 그대로 두고 그 위에 낮게 깐다. 대사·독백 음성이 나오는 동안에는 소리를 줄인다(duck) — 말이 음악에 묻히지 않게.
// 음량은 시간으로 옮긴다(프레임이 아니다): tick(now) 이 목표 음량 쪽으로 조금씩 다가간다.
export const BGM_GAIN = 0.32
export const DUCK_GAIN = 0.1
export const FADE_MS = 1400

// 비트가 정하는 곡. 촉박(rush)만 긴장 변주, 나머지는 메인 테마.
export function bgmForBeat(beat) {
  if (!beat) return 'main'
  return beat.kind === 'rush' ? 'tension' : 'main'
}

export function createBgm({ tracks = {}, isMuted = () => false, isReady = () => true, makeAudio = src => new Audio(src) } = {}) {
  const players = new Map()     // name -> { audio, gain }
  let wanted = null
  let ducked = false
  let last = null

  function player(name) {
    if (!tracks[name]) return null
    if (!players.has(name)) {
      const audio = makeAudio(tracks[name])
      audio.loop = true
      audio.volume = 0
      players.set(name, { audio, gain: 0 })
    }
    return players.get(name)
  }

  function target(name) {
    if (isMuted() || !isReady() || name !== wanted) return 0
    return ducked ? DUCK_GAIN : BGM_GAIN
  }

  return {
    set(name) { wanted = tracks[name] ? name : null; if (wanted) player(wanted) },
    wanted: () => wanted,
    duck(on) { ducked = !!on },
    // 매 프레임 부른다. 목표 음량으로 다가가고, 소리가 0 이 된 곡은 멈춰 둔다.
    tick(now) {
      const dt = last == null ? 16 : Math.max(0, Math.min(250, now - last))
      last = now
      const step = dt / FADE_MS * BGM_GAIN
      for (const [name, p] of players) {
        const t = target(name)
        if (t > 0 && p.audio.paused) { try { p.audio.play?.()?.catch?.(() => {}) } catch { /* 자동 재생이 막히면 다음 조작 뒤에 다시 */ } }
        p.gain = p.gain < t ? Math.min(t, p.gain + step) : Math.max(t, p.gain - step)
        p.audio.volume = Math.max(0, Math.min(1, p.gain))
        if (p.gain === 0 && t === 0 && !p.audio.paused) { try { p.audio.pause() } catch { /* 이미 멈췄다 */ } }
      }
    },
    stop() { wanted = null; for (const p of players.values()) { p.gain = 0; p.audio.volume = 0; try { p.audio.pause() } catch { /* */ } } },
  }
}
