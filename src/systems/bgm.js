// 배경 음악 — V23의 Suno 원곡 + 장면별 Suno v6 연주곡(assets/bgm/README.md).
//
// 선생님 요청(2026-09-14): 「이 게임에 가장 잘 어울리는 BGM」. 바닥 소리(systems/audio.js 의 ambient)는
// 그대로 두고 그 위에 낮게 깐다. 대사·독백 음성이 나오는 동안에는 소리를 줄인다(duck) — 말이 음악에 묻히지 않게.
// 음량은 시간으로 옮긴다(프레임이 아니다): tick(now) 이 목표 음량 쪽으로 조금씩 다가간다.
export const BGM_GAIN = 0.32
export const BED_GAIN = 0.17      // 글을 읽는 화면 — 끄지 않고 절반으로
export const DUCK_GAIN = 0.1
export const FADE_MS = 1400

// 어느 화면에 어떤 곡을 얼마나 크게 깔 것인가 — 비트와 막을 받아 { track, level } 하나를 돌려주는 순수 함수다.
//
// 설계(2026-09-22 BGM 계획서, 선생님 결정):
//   · 막마다 별도로 만든 곡을 쓴다(1863 겨울 아침 … 1884 사흘 밤).
//   · 글을 읽는 화면에서는 끄지 않고 **낮게** 깐다(bed). 자주 껐다 켜면 오히려 거슬린다.
//   · 기록을 빼앗기는 순간과 조작권을 잃는 짧은 장면만 침묵한다.
//   · 2026-10-05 선생님: 「중간에 척화비 미니게임에 bgm빠진거」 — 붓쓰기에는 낮은 Suno 연주곡을 잇는다.
const ACT_TRACK = ['act1', 'act2', 'act3', 'act4', 'act5']

// 글·문서를 읽는 화면. 소리를 끊지 않고 절반으로 낮춘다.
const READING = new Set(['note', 'dispatch', 'outing', 'orders', 'study', 'trail', 'alone'])
// 음악이 아예 없는 자리.
// 2026-10-06 선생님: 「이 부분에 적절한 bgm이 안나오네. 수정해」.
// 친정 독백은 해당 막의 Suno 곡을 낮게 이어 탐색으로 자연스럽게 연결한다.
const SILENT = new Set(['plunder', 'hold'])

export function bgmForBeat(beat, actIndex = 0) {
  const act = ACT_TRACK[actIndex] ?? 'act1'
  if (!beat) return { track: 'theme', level: 'full' }
  if (SILENT.has(beat.kind)) return { track: null, level: 'off' }
  if (beat.kind === 'rush' || beat.kind === 'defend' || beat.kind === 'stand') return { track: 'tension', level: 'full' }
  if (beat.kind === 'procession' || beat.kind === 'move') return { track: 'march', level: 'full' }
  if (beat.kind === 'council') return { track: 'council', level: 'bed' }
  if (beat.kind === 'orders' || beat.kind === 'funding' || beat.kind === 'dilemma' || beat.kind === 'weigh' || beat.kind === 'brush') return { track: 'council', level: 'bed' }
  if (READING.has(beat.kind)) return { track: act, level: 'bed' }
  if (beat.kind === 'audience') return { track: act, level: 'bed' }
  return { track: act, level: 'full' }       // explore — 학생이 궁을 걷는 동안
}

export function createBgm({ tracks = {}, isMuted = () => false, isReady = () => true, makeAudio = src => new Audio(src) } = {}) {
  const players = new Map()     // name -> { audio, gain }
  const stings = new Set()
  let wanted = null
  let wantedLevel = 'full'
  let ducked = false
  let last = null

  function stopStings() {
    for (const audio of stings) { audio.volume = 0; try { audio.pause() } catch { /* */ } }
    stings.clear()
  }

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
    if (ducked) return DUCK_GAIN
    return wantedLevel === 'bed' ? BED_GAIN : BGM_GAIN
  }

  return {
    // set('act2', 'bed') 또는 set({ track, level }) — bgmForBeat() 가 주는 모양을 그대로 받는다.
    set(name, level = 'full') {
      if (name && typeof name === 'object') ({ track: name, level = 'full' } = name)
      wantedLevel = level
      wanted = tracks[name] ? name : null
      if (wanted) player(wanted)
    },
    wanted: () => wanted,
    duck(on) { ducked = !!on },
    // 매 프레임 부른다. 목표 음량으로 다가가고, 소리가 0 이 된 곡은 멈춰 둔다.
    tick(now) {
      const dt = last == null ? 16 : Math.max(0, Math.min(250, now - last))
      last = now
      const step = dt / FADE_MS * BGM_GAIN
      const silent = isMuted() || !isReady()
      if (silent) stopStings()
      for (const [name, p] of players) {
        const t = target(name)
        if (t > 0 && p.audio.paused) { try { p.audio.play?.()?.catch?.(() => {}) } catch { /* 자동 재생이 막히면 다음 조작 뒤에 다시 */ } }
        // 장면 전환은 서서히 잇고, 사용자의 음소거에는 곧바로 응답한다.
        p.gain = silent ? 0 : p.gain < t ? Math.min(t, p.gain + step) : Math.max(t, p.gain - step)
        p.audio.volume = Math.max(0, Math.min(1, p.gain))
        if (p.gain === 0 && t === 0 && !p.audio.paused) { try { p.audio.pause() } catch { /* 이미 멈췄다 */ } }
      }
    },
    // 짧은 여운 한 번(loss·actend). 배경 곡과 겹쳐 울리고 스스로 멎는다.
    sting(name) {
      if (!tracks[name] || isMuted() || !isReady()) return
      const audio = makeAudio(tracks[name])
      stings.add(audio)
      const release = () => stings.delete(audio)
      audio.addEventListener?.('ended', release, { once: true })
      audio.addEventListener?.('error', release, { once: true })
      audio.volume = Math.min(1, BGM_GAIN * 1.4)
      try { audio.play?.()?.then?.(() => {
        if (!stings.has(audio) || isMuted() || !isReady()) { audio.volume = 0; audio.pause(); release() }
      }, release) } catch { release() }
    },
    stop() { wanted = null; stopStings(); for (const p of players.values()) { p.gain = 0; p.audio.volume = 0; try { p.audio.pause() } catch { /* */ } } },
  }
}
