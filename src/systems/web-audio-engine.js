// 실제로 소리를 만드는 자리. audio.js 가 정한 이름을 받아 Web Audio 그래프를 세운다.
//
// 오디오 파일을 쓰지 않는다 — dist/어전.html 은 외부 요청 0건이어야 하고,
// 이 게임은 이미 텍스처도 같은 방식(render/textures.js)으로 코드로 그린다.
// 모든 소리는 잡음 버퍼 하나와 오실레이터·필터·엔벨로프로 그 자리에서 합성한다.
//
// Node 에는 Web Audio 가 없지만, 그렇다고 이 파일이 검사 밖에 있는 것은 아니다.
// 처음에는 「검사할 수 없다」고 보고 읽기 좋게만 썼는데, 그러자 이 파일의 함수 17 개 중
// 13 개가 시험 중 한 번도 실행되지 않았고 `kind: 'chime'` 을 `'chimee'` 로 오타 내도
// 시험은 전부 초록불이었다 — 학생이 첫 결정을 내리는 순간 TypeError 로 터지는데.
// 그래서 시험 쪽에 Web Audio 명세를 따르는 가짜 AudioContext 를 두고, 소리 15 종을
// 전부 실제로 이 코드에 통과시킨다 (tests/systems/audio.test.js).
// 판단(언제 무슨 소리를 낼 것인가)은 전부 audio.js 에 있고 거기서 따로 검사한다.
// 여기서 지키는 규칙 넷 — 넷 다 시험이 붙들고 있다:
//   1. AudioContext 는 resume() 이 처음 불릴 때 만든다 (모듈을 읽는 것만으로 만들지 않는다)
//   2. 흰 소리 버퍼 하나를 만들어 두고 돌려 쓴다
//   3. 마스터 음량 노드 하나를 두고 그 아래에 다 건다
//   4. 소리마다 만든 노드는 끝나면 끊는다 (onended → disconnect). 안 그러면 한 시간 수업 동안 쌓인다

const NOISE_SECONDS = 2
const AMBIENT_FADE = 0.6      // 바닥 소리를 넣고 뺄 때의 시간(초). 딸깍 소리를 막는다
const SILENCE = 0.0001        // exponential 램프는 0 을 못 쓴다. 사실상 무음인 값
const DEFAULT_MASTER = 0.75

// 한 번 나는 소리. 값은 전부 초 단위다.
// peak 는 마스터(0.75) 아래에서의 크기라 1.0 이 곧 최대는 아니다.
export const ONE_SHOT_SPECS = Object.freeze({
  // 마루를 밟는 짧고 낮은 소리 — 잡음을 낮은 대역으로 좁혀 아주 짧게
  step: { kind: 'noise', freq: 170, q: 1.4, peak: 0.22, attack: 0.004, decay: 0.09 },
  // 나무 문이 닫히는 둔한 소리 — step 보다 낮고 길게, 뒤에 울림이 조금 남는다
  door: { kind: 'noise', freq: 120, q: 0.9, peak: 0.34, attack: 0.006, decay: 0.34, thump: 74 },
  // 종이를 집는 소리 — 높고 바스락거리게
  pick: { kind: 'noise', freq: 2600, q: 0.7, peak: 0.16, attack: 0.004, decay: 0.11 },
  // 종이를 펴는 소리 — pick 보다 넓고 길게
  open: { kind: 'noise', freq: 1800, q: 0.5, peak: 0.18, attack: 0.02, decay: 0.3 },
  // 닫는 소리 — open 보다 짧고 낮게
  close: { kind: 'noise', freq: 900, q: 0.6, peak: 0.16, attack: 0.008, decay: 0.16 },
  // 붓이 종이를 긁는 소리 — 아주 작게, 여러 번 연달아 나므로 귀에 거슬리면 안 된다
  brush: { kind: 'noise', freq: 3400, q: 0.6, peak: 0.07, attack: 0.006, decay: 0.08 },

  // 편경(編磬) — 어전회의에서 결정할 때. 이 게임에서 가장 중요한 소리다.
  // 돌을 친 소리는 관악기와 달리 부분음이 기음의 정수배가 아니다. 자유단 막대의
  // 굽힘 모드비(1 : 2.76 : 5.40)를 그대로 얹어야 '맑고 단단한' 소리가 나고,
  // 정수배로 쌓으면 오르간처럼 물러진다. 높은 모드일수록 먼저 죽는 것도 실제 석재와 같다.
  // 여기에 채가 닿는 순간의 아주 짧은 잡음 클릭을 더해 '때린 것'으로 들리게 한다.
  decide: {
    kind: 'chime',
    base: 932,   // 대략 황종 두 옥타브 위. 태블릿 스피커에서 가장 또렷하게 남는 대역
    partials: [
      { ratio: 1,    gain: 0.30, decay: 1.9 },
      { ratio: 2.76, gain: 0.13, decay: 0.9 },
      { ratio: 5.40, gain: 0.05, decay: 0.45 },
    ],
    click: { freq: 5200, q: 0.8, peak: 0.09, attack: 0.002, decay: 0.03 },
  },

  // 낮고 짧게 막히는 소리 — 잠긴 선택지, 오늘 더 들을 수 없을 때
  deny: { kind: 'square', freq: 104, peak: 0.16, attack: 0.005, decay: 0.13 },

  // 마른 초침
  tick: { kind: 'click', freq: 1250, peak: 0.10, decay: 0.045, noise: { freq: 3200, q: 1, peak: 0.05, decay: 0.02 } },
  // tick 보다 높고 급하게 — 마지막 5초
  alarm: { kind: 'click', freq: 1950, peak: 0.20, decay: 0.075, noise: { freq: 4200, q: 1, peak: 0.09, decay: 0.03 } },

  // 국상 — 깊은 북 한 번. 낮은 사인의 주파수를 빠르게 떨어뜨리고 가죽 소리를 섞는다
  drum: { kind: 'drum', from: 132, to: 44, sweep: 0.09, peak: 0.5, decay: 1.1, noise: { freq: 220, q: 0.8, peak: 0.14, decay: 0.14 } },
})

// 바닥에 까는 소리. 들리는지 모를 만큼 작아야 한다 —
// 학생이 '무슨 소리가 나네' 하고 알아채면 이미 너무 크다.
export const AMBIENT_SPECS = Object.freeze({
  hall: { freq: 320, gain: 0.020 },                       // 궁궐 안, 아주 옅은 방 소리
  night: { freq: 180, gain: 0.014 },                      // 밤
  siege: { freq: 110, gain: 0.024, drone: 46 },           // 임오군란 — 낮은 사인 하나를 더해 조인다
  fire: { freq: 900, gain: 0.030, flicker: 0.5 },         // 불난 궁 — 느리게 흔들리는 음량
})

function makeNoiseBuffer(ctx) {
  const frames = Math.floor(ctx.sampleRate * NOISE_SECONDS)
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

export function createWebAudioEngine({
  AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext,
} = {}) {
  let ctx = null
  let master = null
  let noise = null
  let ambientVoice = null   // { stop(when) }
  let gainValue = DEFAULT_MASTER

  // AudioContext 는 여기서만 만든다. resume() 전에는 절대 만들지 않는다 —
  // 사용자 조작 없이 만들면 브라우저가 suspended 상태로 두고 콘솔에 경고를 쌓는다.
  function ensure() {
    if (ctx) return ctx
    if (!AudioContextCtor) return null
    ctx = new AudioContextCtor()
    master = ctx.createGain()
    master.gain.value = gainValue
    master.connect(ctx.destination)
    noise = makeNoiseBuffer(ctx)
    return ctx
  }

  // 엔벨로프. 0 에서 올리고 0 으로 내린다 — 갑자기 켜고 끄면 딸깍 소리가 난다.
  function envelope(t0, peak, attack, decay) {
    const g = ctx.createGain()
    g.gain.setValueAtTime(SILENCE, t0)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, SILENCE * 2), t0 + attack)
    g.gain.exponentialRampToValueAtTime(SILENCE, t0 + attack + decay)
    return g
  }

  // 소리 하나가 끝나면 그 소리가 쓴 노드를 전부 끊는다.
  function reap(source, nodes) {
    source.onended = () => {
      source.disconnect()
      for (const n of nodes) n.disconnect()
    }
  }

  // 걸러 낸 흰 소리 한 조각. step·pick·open·close·brush 와 여러 소리의 '때린 순간'이 이걸 쓴다.
  function burst(t0, { freq, q, peak, attack = 0.004, decay, type = 'bandpass' }) {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const g = envelope(t0, peak, attack, decay)
    src.connect(filter)
    filter.connect(g)
    g.connect(master)
    // 버퍼의 다른 자리에서 시작한다 — 늘 같은 자리를 쓰면 연달아 낼 때 기계음처럼 들린다
    const dur = attack + decay
    src.start(t0, Math.random() * (NOISE_SECONDS - dur - 0.05), dur + 0.02)
    reap(src, [filter, g])
    return dur
  }

  function tone(t0, { type = 'sine', freq, peak, attack = 0.003, decay, sweepTo = null, sweep = 0 }) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + sweep)
    const g = envelope(t0, peak, attack, decay)
    osc.connect(g)
    g.connect(master)
    osc.start(t0)
    osc.stop(t0 + attack + decay + 0.02)
    reap(osc, [g])
  }

  // 셋째 인자 level 은 이 한 번의 소리에만 걸리는 배율이다 (oneShot 의 opts.gain).
  // 표의 peak 에 곱해 쓴다 — 붓질처럼 연달아 나는 소리를 부르는 쪽에서 더 죽이고 싶을 때.
  const PLAY = {
    noise(t0, spec, level) {
      burst(t0, { ...spec, peak: spec.peak * level })
      // 문은 잡음만으로는 가볍다. 낮은 사인을 얹어 '둔한' 무게를 준다
      if (spec.thump) tone(t0, { freq: spec.thump, peak: spec.peak * 0.6 * level, decay: spec.decay * 0.7 })
    },

    // 편경: 비조화 부분음들을 각자의 감쇠로 겹치고, 채가 닿는 클릭을 더한다
    chime(t0, spec, level) {
      for (const p of spec.partials) {
        tone(t0, { freq: spec.base * p.ratio, peak: p.gain * level, attack: 0.002, decay: p.decay })
      }
      if (spec.click) burst(t0, { ...spec.click, peak: spec.click.peak * level })
    },

    square(t0, spec, level) {
      tone(t0, { type: 'square', freq: spec.freq, peak: spec.peak * level, attack: spec.attack, decay: spec.decay })
    },

    click(t0, spec, level) {
      tone(t0, { freq: spec.freq, peak: spec.peak * level, attack: 0.001, decay: spec.decay })
      if (spec.noise) burst(t0, { ...spec.noise, peak: spec.noise.peak * level, attack: 0.001 })
    },

    drum(t0, spec, level) {
      tone(t0, {
        freq: spec.from, sweepTo: spec.to, sweep: spec.sweep,
        peak: spec.peak * level, attack: 0.004, decay: spec.decay,
      })
      if (spec.noise) burst(t0, { ...spec.noise, peak: spec.noise.peak * level, attack: 0.002 })
    },
  }

  // 바닥 소리 한 벌. 흰 소리를 아주 낮은 저역 통과로 걸러 반복한다.
  function makeAmbient(spec, t0) {
    const src = ctx.createBufferSource()
    src.buffer = noise
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = spec.freq
    filter.Q.value = 0.7
    const g = ctx.createGain()
    g.gain.setValueAtTime(SILENCE, t0)
    g.gain.exponentialRampToValueAtTime(spec.gain, t0 + AMBIENT_FADE)
    src.connect(filter)
    filter.connect(g)
    g.connect(master)
    src.start(t0, Math.random() * NOISE_SECONDS)

    const extras = []
    // 임오군란 — 낮은 사인 하나가 배 아래에서 조여 온다
    if (spec.drone) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = spec.drone
      const dg = ctx.createGain()
      dg.gain.setValueAtTime(SILENCE, t0)
      dg.gain.exponentialRampToValueAtTime(spec.gain * 0.8, t0 + AMBIENT_FADE)
      osc.connect(dg)
      dg.connect(master)
      osc.start(t0)
      extras.push({ node: osc, gain: dg })
    }
    // 불 — 느린 오실레이터로 음량을 흔들어 넘실거리게 한다
    if (spec.flicker) {
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = spec.flicker
      const depth = ctx.createGain()
      depth.gain.value = spec.gain * 0.5
      lfo.connect(depth)
      depth.connect(g.gain)
      lfo.start(t0)
      extras.push({ node: lfo, gain: depth })
    }

    return {
      stop(when) {
        // 뺄 때도 0 으로 내리고 나서 멈춘다 — 끊으면 딸깍한다
        g.gain.cancelScheduledValues(when)
        g.gain.setValueAtTime(Math.max(g.gain.value, SILENCE), when)
        g.gain.exponentialRampToValueAtTime(SILENCE, when + AMBIENT_FADE)
        src.stop(when + AMBIENT_FADE + 0.05)
        reap(src, [filter, g])
        for (const e of extras) {
          // 본 게인 경로와 똑같이 닻을 먼저 박는다. cancelScheduledValues 가
          // 페이드인 램프까지 지우기 때문에, 닻이 없으면 뒤따르는 램프의 시작값이
          // 정해지지 않은 채 값이 튄다 — 딸깍이다.
          // (페이드인 0.6초가 끝나기 전에 바닥 소리를 바꾸면 바로 그 자리가 된다)
          e.gain.gain.cancelScheduledValues(when)
          e.gain.gain.setValueAtTime(Math.max(e.gain.gain.value, SILENCE), when)
          e.gain.gain.exponentialRampToValueAtTime(SILENCE, when + AMBIENT_FADE)
          e.node.stop(when + AMBIENT_FADE + 0.05)
          reap(e.node, [e.gain])
        }
      },
    }
  }

  return {
    // 사용자 조작 안에서 부른다. 여기서 AudioContext 가 처음 생긴다.
    resume() {
      const c = ensure()
      if (!c) return Promise.resolve()
      return Promise.resolve(c.resume?.())
    },

    // opts.gain 은 이 한 번의 소리에만 걸리는 배율(0..1)이다. 안 주면 표대로 낸다.
    // audio.js 의 play(name, opts) 가 그대로 넘겨 준다 — 그쪽 계약과 여기가 어긋나면
    // Task D 가 넘긴 값이 조용히 사라진다.
    oneShot(name, opts) {
      if (!ctx) return
      const spec = ONE_SHOT_SPECS[name]
      if (!spec) return
      const level = Math.min(1, Math.max(0, opts?.gain ?? 1))
      PLAY[spec.kind](ctx.currentTime, spec, level)
    },

    ambient(name) {
      if (!ctx) return
      const now = ctx.currentTime
      if (ambientVoice) {
        ambientVoice.stop(now)
        ambientVoice = null
      }
      const spec = name == null ? null : AMBIENT_SPECS[name]
      if (!spec) return
      ambientVoice = makeAmbient(spec, now)
    },

    // 음소거를 켜고 끌 때 쓴다. 급히 꺾으면 딸깍하므로 짧은 시정수로 미끄러뜨린다.
    setGain(v) {
      gainValue = Math.min(1, Math.max(0, v))
      if (!master) return
      master.gain.setTargetAtTime(gainValue, ctx.currentTime, 0.02)
    },
  }
}
