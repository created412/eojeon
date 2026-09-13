import { describe, it, expect } from 'vitest'
import {
  createAudio,
  MUTE_KEY,
  STEP_INTERVAL_MS,
  RUN_STEP_INTERVAL_MS,
  ALARM_THRESHOLD_MS,
  COUNTDOWN_AUDIBLE_MS,
  ONE_SHOTS,
  AMBIENCES,
} from '../../src/systems/audio.js'

// 기록하는 가짜 엔진. audio.js 는 Web Audio 를 직접 부르지 않으므로
// 이 네 함수만 있으면 「언제 무슨 소리를 낼 것인가」를 전부 검사할 수 있다.
function fakeEngine() {
  const calls = []
  return {
    calls,
    resume: () => { calls.push(['resume']) },
    oneShot: (n, o) => { calls.push(['oneShot', n, o]) },
    ambient: (n) => { calls.push(['ambient', n]) },
    setGain: (v) => { calls.push(['setGain', v]) },
  }
}

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)) },
  }
}

const only = (engine, kind) => engine.calls.filter((c) => c[0] === kind)
const shots = (engine) => only(engine, 'oneShot').map((c) => c[1])

function ready(extra = {}) {
  const engine = fakeEngine()
  const audio = createAudio({ engine, storage: fakeStorage(), ...extra })
  audio.unlock()
  engine.calls.length = 0   // unlock 자체가 남긴 흔적은 지우고 시작한다
  return { engine, audio }
}

describe('소리 이름표', () => {
  it('브리프의 한 번 나는 소리 열한 가지를 그대로 담는다', () => {
    expect([...ONE_SHOTS]).toEqual([
      'step', 'door', 'pick', 'open', 'close', 'brush',
      'decide', 'deny', 'tick', 'alarm', 'drum',
    ])
  })

  it('바닥 소리 네 가지를 그대로 담는다 (없음은 null 로 준다)', () => {
    expect([...AMBIENCES]).toEqual(['hall', 'night', 'siege', 'fire'])
  })

  it('이름표는 밖에서 바꿀 수 없다 — 배선(Task D)이 이 표만 쓴다', () => {
    expect(Object.isFrozen(ONE_SHOTS)).toBe(true)
    expect(Object.isFrozen(AMBIENCES)).toBe(true)
  })
})

describe('unlock() — 사용자 조작 전에는 소리가 없다', () => {
  it('unlock() 전에 play("step") 를 불러도 엔진이 안 불린다', () => {
    const engine = fakeEngine()
    const audio = createAudio({ engine, storage: fakeStorage() })
    expect(audio.isReady()).toBe(false)
    expect(audio.play('step')).toBe(false)
    expect(engine.calls).toEqual([])
  })

  it('unlock() 뒤에는 불린다', () => {
    const engine = fakeEngine()
    const audio = createAudio({ engine, storage: fakeStorage() })
    audio.unlock()
    expect(audio.isReady()).toBe(true)
    expect(only(engine, 'resume')).toHaveLength(1)
    audio.play('decide')
    expect(shots(engine)).toEqual(['decide'])
  })

  it('play() 가 opts 를 그대로 엔진에 넘긴다', () => {
    const { engine, audio } = ready()
    audio.play('step', { gain: 0.4 })
    expect(only(engine, 'oneShot')[0]).toEqual(['oneShot', 'step', { gain: 0.4 }])
  })

  it('unlock() 은 마스터 음량도 세운다', () => {
    const engine = fakeEngine()
    const audio = createAudio({ engine, storage: fakeStorage() })
    audio.unlock()
    const gains = only(engine, 'setGain')
    expect(gains).toHaveLength(1)
    expect(gains[0][1]).toBeGreaterThan(0)
  })

  it('unlock() 은 여러 번 불러도 된다 — 탭을 다녀오면 컨텍스트가 다시 잠긴다', () => {
    const engine = fakeEngine()
    const audio = createAudio({ engine, storage: fakeStorage() })
    audio.unlock()
    audio.unlock()
    expect(only(engine, 'resume')).toHaveLength(2)
    expect(audio.isReady()).toBe(true)
  })
})

describe('음소거', () => {
  it('기본값은 소리 켜짐이다', () => {
    const audio = createAudio({ engine: fakeEngine(), storage: fakeStorage() })
    expect(audio.isMuted()).toBe(false)
  })

  it('음소거면 play() 가 엔진을 아예 안 부른다 — 음량 0 이 아니라 호출 자체가 없다', () => {
    const { engine, audio } = ready()
    audio.setMuted(true)
    engine.calls.length = 0
    expect(audio.play('decide')).toBe(false)
    expect(audio.play('step')).toBe(false)
    expect(only(engine, 'oneShot')).toEqual([])
  })

  it('음소거를 켰다 끄면 다시 난다', () => {
    const { engine, audio } = ready()
    audio.setMuted(true)
    audio.play('decide')
    audio.setMuted(false)
    audio.play('decide')
    expect(shots(engine)).toEqual(['decide'])
  })

  it('toggleMuted() 는 새 값을 돌려준다', () => {
    const { audio } = ready()
    expect(audio.toggleMuted()).toBe(true)
    expect(audio.isMuted()).toBe(true)
    expect(audio.toggleMuted()).toBe(false)
    expect(audio.isMuted()).toBe(false)
  })

  it('음소거가 storage 에 남고, 새 createAudio 가 그 값으로 시작한다', () => {
    const storage = fakeStorage()
    const first = createAudio({ engine: fakeEngine(), storage })
    first.setMuted(true)
    expect(storage.map.has(MUTE_KEY)).toBe(true)

    const second = createAudio({ engine: fakeEngine(), storage })
    expect(second.isMuted()).toBe(true)

    second.setMuted(false)
    const third = createAudio({ engine: fakeEngine(), storage })
    expect(third.isMuted()).toBe(false)
  })

  it('저장 키는 다른 저장 키와 겹치지 않는다', () => {
    expect(MUTE_KEY).toBe('eojeon.muted')
  })

  it('음소거는 마스터 음량도 0 으로 내린다 — 울리던 꼬리와 바닥 소리를 재운다', () => {
    const { engine, audio } = ready()
    audio.setMuted(true)
    expect(only(engine, 'setGain').at(-1)[1]).toBe(0)
    audio.setMuted(false)
    expect(only(engine, 'setGain').at(-1)[1]).toBeGreaterThan(0)
  })
})

describe('storage 가 없거나 던져도 터지지 않는다 (사설 창·잠긴 학교 PC)', () => {
  it('storage 가 null 이어도 그냥 돈다', () => {
    const engine = fakeEngine()
    const audio = createAudio({ engine, storage: null })
    expect(audio.isMuted()).toBe(false)
    expect(() => audio.setMuted(true)).not.toThrow()
    expect(audio.isMuted()).toBe(true)
  })

  it('getItem 이 던져도 소리 켜짐으로 시작한다', () => {
    const storage = {
      getItem: () => { throw new Error('보안 정책이 막았다') },
      setItem: () => {},
    }
    let audio
    expect(() => { audio = createAudio({ engine: fakeEngine(), storage }) }).not.toThrow()
    expect(audio.isMuted()).toBe(false)
  })

  it('setItem 이 던져도 그 자리에서는 음소거가 먹는다 (기억만 못 한다)', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error('용량이 없다') },
    }
    const audio = createAudio({ engine: fakeEngine(), storage })
    audio.unlock()
    expect(() => audio.setMuted(true)).not.toThrow()
    expect(audio.isMuted()).toBe(true)
    expect(audio.play('step')).toBe(false)
  })
})

describe('바닥 소리 — setAmbient()', () => {
  it('처음에는 아무것도 안 깔려 있다', () => {
    const { audio } = ready()
    expect(audio.ambient()).toBe(null)
  })

  it('setAmbient("hall") 을 두 번 부르면 엔진이 한 번만 불린다', () => {
    const { engine, audio } = ready()
    expect(audio.setAmbient('hall')).toBe(true)
    expect(audio.setAmbient('hall')).toBe(false)
    expect(only(engine, 'ambient')).toEqual([['ambient', 'hall']])
    expect(audio.ambient()).toBe('hall')
  })

  it('setAmbient(null) 이 바닥 소리를 끈다', () => {
    const { engine, audio } = ready()
    audio.setAmbient('night')
    engine.calls.length = 0
    audio.setAmbient(null)
    expect(only(engine, 'ambient')).toEqual([['ambient', null]])
    expect(audio.ambient()).toBe(null)
  })

  it('아무것도 안 깔린 채 setAmbient(null) 을 불러도 엔진을 괴롭히지 않는다', () => {
    const { engine, audio } = ready()
    audio.setAmbient(null)
    expect(only(engine, 'ambient')).toEqual([])
  })

  it('unlock 전에는 엔진을 부르지 않고, unlock 때 깔린다', () => {
    const engine = fakeEngine()
    const audio = createAudio({ engine, storage: fakeStorage() })
    audio.setAmbient('hall')
    expect(only(engine, 'ambient')).toEqual([])
    expect(audio.ambient()).toBe('hall')
    audio.unlock()
    expect(only(engine, 'ambient')).toEqual([['ambient', 'hall']])
  })

  it('음소거면 바닥 소리를 멈추고, 풀면 원래 것으로 돌아온다', () => {
    const { engine, audio } = ready()
    audio.setAmbient('siege')
    audio.setMuted(true)
    audio.setMuted(false)
    expect(only(engine, 'ambient')).toEqual([
      ['ambient', 'siege'], ['ambient', null], ['ambient', 'siege'],
    ])
    expect(audio.ambient()).toBe('siege')
  })

  it('음소거 중에 바꾼 바닥 소리는 풀 때 그것으로 깔린다', () => {
    const { engine, audio } = ready()
    audio.setAmbient('hall')
    audio.setMuted(true)
    engine.calls.length = 0
    audio.setAmbient('fire')
    expect(only(engine, 'ambient')).toEqual([])
    audio.setMuted(false)
    expect(only(engine, 'ambient')).toEqual([['ambient', 'fire']])
  })
})

describe('발소리 — stepped() 는 시간을 본다, 프레임을 세지 않는다', () => {
  it('간격은 340ms 다', () => {
    expect(STEP_INTERVAL_MS).toBe(340)
  })

  it('100ms 씩 열 번 부르면 세 번 난다', () => {
    const { engine, audio } = ready()
    for (let t = 100; t <= 1000; t += 100) audio.stepped(t, { walking: true })
    expect(shots(engine)).toEqual(['step', 'step', 'step'])
  })

  it('같은 시간을 다른 호출 간격으로 돌려도 걸음 수가 같다 — 프레임 독립성', () => {
    // 동어반복을 피한다: 340 을 다시 계산해 견주는 게 아니라,
    // 호출 횟수가 5~9 배 다른 세 번의 주행에서 나온 '실제 발소리 개수'를 견준다.
    const walk = (dtMs, totalMs) => {
      const engine = fakeEngine()
      const audio = createAudio({ engine, storage: fakeStorage() })
      audio.unlock()
      let frames = 0
      for (let t = dtMs; t <= totalMs; t += dtMs) {
        audio.stepped(t, { walking: true })
        frames++
      }
      return { steps: shots(engine).length, frames }
    }

    const TOTAL = 3000
    const fast = walk(16, TOTAL)    // ~60fps
    const mid = walk(20, TOTAL)     // 50fps
    const slow = walk(100, TOTAL)   // 10fps — 성능이 나쁜 태블릿

    // 호출 횟수는 실제로 크게 다르다 (이 줄이 없으면 위 비교가 무의미해진다)
    expect(fast.frames).toBe(187)
    expect(mid.frames).toBe(150)
    expect(slow.frames).toBe(30)

    // 그런데 걸음 수는 같다
    expect(fast.steps).toBe(slow.steps)
    expect(mid.steps).toBe(slow.steps)
    expect(slow.steps).toBe(9)      // 3000ms / 340ms + 첫 걸음
  })

  it('걷지 않으면 안 나고, 위상이 비워져 다시 걸을 때 곧바로 난다', () => {
    const { engine, audio } = ready()
    expect(audio.stepped(0, { walking: true })).toBe(true)
    expect(audio.stepped(100, { walking: true })).toBe(false)
    expect(audio.stepped(200, { walking: false })).toBe(false)
    expect(audio.stepped(250, { walking: true })).toBe(true)   // 위상이 비었으니 곧바로
    expect(shots(engine)).toEqual(['step', 'step'])
  })

  it('걷는 인자를 아예 안 주면 걷지 않는 것으로 본다', () => {
    const { engine, audio } = ready()
    expect(audio.stepped(0)).toBe(false)
    expect(engine.calls).toEqual([])
  })

  it('한참 뒤에 불려도 밀린 걸음이 몰아쳐 나지 않는다', () => {
    const { engine, audio } = ready()
    audio.stepped(0, { walking: true })
    audio.stepped(60000, { walking: true })   // 탭을 벗어났다 돌아왔다
    expect(shots(engine)).toEqual(['step', 'step'])
  })

  it('시계가 뒤로 가면 위상만 다시 잡고 소리는 내지 않는다', () => {
    const { engine, audio } = ready()
    expect(audio.stepped(1000, { walking: true })).toBe(true)
    expect(audio.stepped(500, { walking: true })).toBe(false)   // 시계가 뒤로 갔다
    expect(audio.stepped(600, { walking: true })).toBe(false)
    expect(audio.stepped(900, { walking: true })).toBe(true)    // 다시 잡은 위상에서 340ms
    expect(shots(engine)).toEqual(['step', 'step'])
  })

  it('달리기 간격은 230ms 다 — 걷기보다 짧다', () => {
    expect(RUN_STEP_INTERVAL_MS).toBe(230)
    expect(RUN_STEP_INTERVAL_MS).toBeLessThan(STEP_INTERVAL_MS)
  })

  it('같은 3000ms 를 걸으면 9 걸음, 달리면 13 걸음이다', () => {
    // 「더 빠르다」가 아니라 실제로 난 발소리의 개수를 견준다.
    const go = (opts) => {
      const engine = fakeEngine()
      const audio = createAudio({ engine, storage: fakeStorage() })
      audio.unlock()
      for (let t = 20; t <= 3000; t += 20) audio.stepped(t, opts)
      return shots(engine).length
    }
    const walked = go({ walking: true })
    const ran = go({ walking: true, running: true })
    expect(walked).toBe(9)
    expect(ran).toBe(13)
    expect(ran).toBeGreaterThan(walked)
  })

  it('달리기를 안 주면 예전과 똑같이 걷는다 — 기존 호출자가 안 깨진다', () => {
    const { engine, audio } = ready()
    for (let t = 20; t <= 3000; t += 20) audio.stepped(t, { walking: true })
    expect(shots(engine)).toHaveLength(9)
  })

  it('달려도 걷지 않으면 아무 소리도 안 난다', () => {
    const { engine, audio } = ready()
    expect(audio.stepped(0, { walking: false, running: true })).toBe(false)
    expect(engine.calls).toEqual([])
  })

  it('달리는 같은 시간을 다른 호출 간격으로 돌려도 걸음 수가 같다 — 프레임 독립성', () => {
    // 230 을 다시 계산해 견주지 않는다. 호출 횟수가 6 배 다른 두 주행에서
    // 나온 '실제 발소리 개수'를 견준다.
    const run = (dtMs) => {
      const engine = fakeEngine()
      const audio = createAudio({ engine, storage: fakeStorage() })
      audio.unlock()
      let frames = 0
      for (let t = dtMs; t <= 3000; t += dtMs) {
        audio.stepped(t, { walking: true, running: true })
        frames++
      }
      return { steps: shots(engine).length, frames }
    }
    const fast = run(16)     // ~60fps
    const slow = run(100)    // 10fps — 성능이 나쁜 태블릿

    // 호출 횟수는 실제로 크게 다르다 (이 줄이 없으면 아래 비교가 무의미해진다)
    expect(fast.frames).toBe(187)
    expect(slow.frames).toBe(30)

    expect(fast.steps).toBe(slow.steps)
    expect(slow.steps).toBe(13)
  })

  it('음소거면 걸어도 엔진을 안 부른다', () => {
    const { engine, audio } = ready()
    audio.setMuted(true)
    engine.calls.length = 0
    for (let t = 100; t <= 1000; t += 100) audio.stepped(t, { walking: true })
    expect(only(engine, 'oneShot')).toEqual([])
  })
})

describe('카운트다운 — countdown()', () => {
  it('경보로 넘어가는 문턱은 5000ms 다', () => {
    expect(ALARM_THRESHOLD_MS).toBe(5000)
  })

  it('5초 넘게 남으면 tick, 5초 이하면 alarm', () => {
    const { engine, audio } = ready()
    expect(audio.countdown(10000, 30000, 1000)).toBe('tick')
    expect(audio.countdown(5001, 30000, 6000)).toBe('tick')
    expect(audio.countdown(5000, 30000, 7000)).toBe('alarm')
    expect(audio.countdown(1200, 30000, 11000)).toBe('alarm')
    expect(shots(engine)).toEqual(['tick', 'tick', 'alarm', 'alarm'])
  })

  it('초침이 들리기 시작하는 문턱은 30000ms 다', () => {
    expect(COUNTDOWN_AUDIBLE_MS).toBe(30000)
  })

  it('30초보다 많이 남으면 아무 소리도 안 난다', () => {
    const { engine, audio } = ready()
    expect(audio.countdown(60000, 90000, 1000)).toBe(null)
    expect(audio.countdown(45000, 90000, 16000)).toBe(null)
    expect(audio.countdown(30001, 90000, 30999)).toBe(null)
    expect(engine.calls).toEqual([])
  })

  it('경계는 이하다 — 딱 30000ms 남았으면 운다', () => {
    const { engine, audio } = ready()
    expect(audio.countdown(30000, 90000, 60000)).toBe('tick')
    expect(shots(engine)).toEqual(['tick'])
  })

  it('22초 촉박은 첫 초부터 운다 — 전체가 30초 아래다', () => {
    const { engine, audio } = ready()
    expect(audio.countdown(22000, 22000, 0)).toBe('tick')
    for (let t = 1000; t <= 22000; t += 1000) audio.countdown(22000 - t, 22000, t)
    const played = shots(engine)
    expect(played).toHaveLength(22)                                  // 22초 내내
    expect(played.filter((n) => n === 'tick')).toHaveLength(17)
    expect(played.filter((n) => n === 'alarm')).toHaveLength(5)
  })

  it('90초 촉박은 앞 60초가 조용하고 초침은 30 번만 난다', () => {
    const { engine, audio } = ready()
    // 전체를 1초씩 훑는다 — 「30 아래에서만 운다」를 다시 계산하지 않고
    // 실제로 난 소리의 개수를 센다.
    const heard = []
    for (let t = 0; t <= 90000; t += 1000) {
      const name = audio.countdown(90000 - t, 90000, t)
      if (name) heard.push({ t, name })
    }
    expect(heard).toHaveLength(30)                                   // 90 이 아니다
    expect(heard[0].t).toBe(60000)                                   // 앞 60초는 조용하다
    expect(shots(engine).filter((n) => n === 'tick')).toHaveLength(25)
    expect(shots(engine).filter((n) => n === 'alarm')).toHaveLength(5)
  })

  it('같은 초에 여러 번 불러도 한 번만 난다', () => {
    const { engine, audio } = ready()
    audio.countdown(10000, 30000, 1000)
    // 시각은 400ms 나 흘렀지만(실시간 바닥에 걸리지 않는다) 남은 초가 같다
    expect(audio.countdown(9600, 30000, 1400)).toBe(null)
    expect(audio.countdown(9100, 30000, 1900)).toBe(null)
    expect(audio.countdown(9000, 30000, 2000)).toBe('tick')
    expect(shots(engine)).toEqual(['tick', 'tick'])
  })

  it('남은 시간이 0 이하면 아무것도 안 난다', () => {
    const { engine, audio } = ready()
    expect(audio.countdown(0, 30000, 30000)).toBe(null)
    expect(audio.countdown(-500, 30000, 30500)).toBe(null)
    expect(engine.calls).toEqual([])
  })

  it('nowMs 가 크게 뛰어도 소리가 몰아쳐 나지 않는다', () => {
    const { engine, audio } = ready()
    audio.countdown(30000, 30000, 0)
    audio.countdown(4000, 30000, 26000)          // 탭을 26초 벗어났다 돌아왔다
    expect(shots(engine)).toEqual(['tick', 'alarm'])
  })

  it('시각이 멈춘 채 남은 시간만 쏟아져 들어와도 한 번을 넘지 않는다', () => {
    const { engine, audio } = ready()
    for (let remain = 9000; remain > 4000; remain -= 100) {
      audio.countdown(remain, 30000, 5000)       // nowMs 가 그대로다
    }
    expect(shots(engine)).toHaveLength(1)
  })

  it('시계가 뒤로 가도 한 번을 넘지 않는다', () => {
    const { engine, audio } = ready()
    audio.countdown(10000, 30000, 1000)
    engine.calls.length = 0
    audio.countdown(10400, 30000, 600)           // 시계가 뒤로 갔다
    audio.countdown(10400, 30000, 600)
    audio.countdown(10400, 30000, 600)
    expect(only(engine, 'oneShot')).toHaveLength(1)
  })

  it('10초 카운트다운을 60fps 로 끝까지 돌리면 tick 5 · alarm 5 다', () => {
    const { engine, audio } = ready()
    for (let t = 0; t <= 10000; t += 16) audio.countdown(10000 - t, 10000, t)
    const played = shots(engine)
    expect(played.filter((n) => n === 'tick')).toHaveLength(5)
    expect(played.filter((n) => n === 'alarm')).toHaveLength(5)
    expect(played.slice(-5)).toEqual(['alarm', 'alarm', 'alarm', 'alarm', 'alarm'])
  })

  it('같은 10초를 10fps 로 돌려도 개수가 같다 — 프레임 독립성', () => {
    const run = (dtMs) => {
      const engine = fakeEngine()
      const audio = createAudio({ engine, storage: fakeStorage() })
      audio.unlock()
      let frames = 0
      for (let t = 0; t <= 10000; t += dtMs) { audio.countdown(10000 - t, 10000, t); frames++ }
      return { played: shots(engine), frames }
    }
    const fast = run(16)
    const slow = run(100)
    expect(fast.frames).toBe(626)
    expect(slow.frames).toBe(101)
    expect(fast.played).toEqual(slow.played)
  })

  it('새 카운트다운이 시작되면(totalMs 가 바뀌면) 위상을 새로 잡는다', () => {
    const { engine, audio } = ready()
    audio.countdown(8000, 30000, 1000)
    engine.calls.length = 0
    // 다른 총 시간의 카운트다운인데 남은 초가 우연히 같다
    expect(audio.countdown(8000, 12000, 2000)).toBe('tick')
  })

  it('음소거면 엔진을 안 부르지만 위상은 넘어간다 — 풀 때 몰아쳐 나지 않는다', () => {
    const { engine, audio } = ready()
    audio.setMuted(true)
    engine.calls.length = 0
    expect(audio.countdown(10000, 30000, 1000)).toBe(null)
    expect(only(engine, 'oneShot')).toEqual([])
    audio.setMuted(false)
    expect(audio.countdown(9500, 30000, 1500)).toBe(null)   // 같은 초는 이미 지났다
    expect(only(engine, 'oneShot')).toEqual([])
  })

  it('unlock 전에는 아무 소리도 안 난다', () => {
    const engine = fakeEngine()
    const audio = createAudio({ engine, storage: fakeStorage() })
    expect(audio.countdown(3000, 30000, 1000)).toBe(null)
    expect(engine.calls).toEqual([])
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// 여기서부터는 web-audio-engine.js — 실제로 소리를 만드는 쪽이다.
//
// 브리프는 「Web Audio 는 Node 에서 검사할 수 없다」고 했고 처음엔 그대로 따랐다.
// 그 전제가 틀렸다. 그때 이 파일의 함수 17 개 중 13 개가 시험 중 한 번도 실행되지 않았고,
// kind: 'chime' 을 'chimee' 로 오타 내면 학생이 첫 결정을 내리는 순간 TypeError 로
// 터지는데 시험은 전부 초록불이었다. master.connect(destination) 을 지워 모든 소리가
// 무음이 돼도 마찬가지였다.
//
// 그래서 Web Audio 명세를 따르는 가짜 AudioContext 를 두고 소리 15 종을 전부
// 진짜 합성 코드에 통과시킨다. 들리는 소리는 여기서 못 재지만, 「터지는가·이어져
// 있는가·새는가」는 전부 잴 수 있다.
// ─────────────────────────────────────────────────────────────────────────────

function fakeAudioContext() {
  const ctx = {
    sampleRate: 48000,
    currentTime: 0,
    state: 'suspended',
    destination: { kind: 'destination', isParam: false },
    nodes: [],
    edges: [],
    buffers: [],
  }

  // AudioParam — 값 하나와 예약된 사건들. 실제 브라우저처럼 사건을 쌓아 둔다.
  function param(node, name, value) {
    const p = {
      isParam: true, name, value,
      events: [],
      setValueAtTime(v, t) { p.events.push(['set', v, t]); p.value = v; return p },
      linearRampToValueAtTime(v, t) { p.events.push(['linear', v, t]); return p },
      exponentialRampToValueAtTime(v, t) { p.events.push(['exp', v, t]); return p },
      setTargetAtTime(v, t, c) { p.events.push(['target', v, t, c]); return p },
      cancelScheduledValues(t) { p.events.push(['cancel', t]); return p },
    }
    node.params.push(p)
    return p
  }

  function node(kind) {
    const n = {
      kind, params: [], disconnected: false,
      connect(to) { ctx.edges.push([n, to]); return to },
      disconnect() {
        n.disconnected = true
        ctx.edges = ctx.edges.filter(([from]) => from !== n)
      },
    }
    ctx.nodes.push(n)
    return n
  }

  // 소리를 내는 노드는 끝나는 시각이 있다. finishAll() 이 그 onended 를 부른다 —
  // 실제 브라우저에서 재생이 끝나는 순간에 해당한다.
  function source(kind) {
    const n = node(kind)
    n.onended = null
    n.starts = []
    n.endAt = null
    n.ended = false
    n.start = (when = 0, offset = 0, duration = null) => {
      n.starts.push({ when, offset, duration })
      if (duration != null) n.endAt = when + duration
    }
    n.stop = (when = 0) => { n.endAt = when }
    return n
  }

  ctx.createGain = () => {
    const n = node('gain')
    n.gain = param(n, 'gain', 1)
    return n
  }
  ctx.createOscillator = () => {
    const n = source('oscillator')
    n.type = 'sine'
    n.frequency = param(n, 'frequency', 440)
    n.detune = param(n, 'detune', 0)
    return n
  }
  ctx.createBufferSource = () => {
    const n = source('bufferSource')
    n.buffer = null
    n.loop = false
    n.playbackRate = param(n, 'playbackRate', 1)
    return n
  }
  ctx.createBiquadFilter = () => {
    const n = node('biquad')
    n.type = 'lowpass'
    n.frequency = param(n, 'frequency', 350)
    n.Q = param(n, 'Q', 1)
    n.gain = param(n, 'gain', 0)
    return n
  }
  ctx.createBuffer = (channels, length, sampleRate) => {
    const data = new Float32Array(length)
    const b = {
      numberOfChannels: channels, length, sampleRate,
      duration: length / sampleRate,
      getChannelData: () => data,
    }
    ctx.buffers.push(b)
    return b
  }
  ctx.resume = () => { ctx.state = 'running'; return Promise.resolve() }

  // 예약된 소리가 전부 끝난 것으로 친다
  ctx.finishAll = () => {
    for (const n of ctx.nodes) {
      if (n.endAt != null && !n.ended) { n.ended = true; n.onended?.() }
    }
  }
  ctx.alive = () => ctx.nodes.filter((n) => !n.disconnected)
  ctx.allEvents = () => ctx.nodes.flatMap((n) => n.params).flatMap((p) => p.events)

  return ctx
}

async function boot() {
  const { createWebAudioEngine } = await import('../../src/systems/web-audio-engine.js')
  const made = []
  function Ctor() {
    const c = fakeAudioContext()
    made.push(c)
    return c        // 생성자가 객체를 돌려주면 new 가 그걸 준다
  }
  const engine = createWebAudioEngine({ AudioContextCtor: Ctor })
  return { engine, made, ctx: () => made[0] }
}

// 이 노드에서 출발해 무엇에 닿는가. 소리가 흐르는 길은 destination 에서 끝나고,
// 변조 경로는 AudioParam 에서 끝난다(fire 의 LFO 는 lfo → depth → g.gain 으로
// 두 칸을 건너 param 에 닿는다). 둘 중 어디에도 못 닿으면 그 소리는 새어 나간 것이다.
function endpointsOf(ctx, start) {
  const seen = new Set()
  const found = { output: false, param: false }
  const walk = (n) => {
    if (seen.has(n)) return
    seen.add(n)
    for (const [from, to] of ctx.edges) {
      if (from !== n) continue
      if (to === ctx.destination) { found.output = true; continue }
      if (to.isParam) { found.param = true; continue }
      walk(to)
    }
  }
  walk(start)
  return found
}

describe('web-audio-engine — 가짜 AudioContext 로 합성 경로를 실제로 통과시킨다', () => {
  it('엔진을 만드는 것만으로 AudioContext 를 만들지 않는다', async () => {
    const { made } = await boot()
    expect(made).toHaveLength(0)
  })

  it('AudioContext 는 resume() 이 처음 불릴 때 딱 하나 생긴다', async () => {
    const { engine, made } = await boot()
    await engine.resume()
    expect(made).toHaveLength(1)
    expect(made[0].state).toBe('running')
    await engine.resume()
    await engine.resume()
    expect(made).toHaveLength(1)
  })

  it('audio.js 가 기대하는 네 함수를 갖추고, 넷 다 실제로 돈다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    engine.oneShot('step')
    engine.ambient('hall')
    engine.setGain(0.4)
    expect(ctx().nodes.length).toBeGreaterThan(1)
  })

  // 여기가 'chimee' 오타를 잡는 자리다
  it('한 번 나는 소리 11 개를 전부 실제로 내고, 어느 것도 던지지 않는다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    for (const name of ONE_SHOTS) {
      const before = ctx().nodes.length
      expect(() => engine.oneShot(name), name + ' 이 던졌다').not.toThrow()
      // 소리마다 노드가 실제로 생겨야 한다 — 조용히 아무것도 안 하면 그것도 고장이다
      expect(ctx().nodes.length, name + ' 이 노드를 안 만들었다').toBeGreaterThan(before)
    }
  })

  it('바닥 소리 4 개와 null 을 전부 실제로 걸고, 어느 것도 던지지 않는다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    for (const name of AMBIENCES) {
      const before = ctx().nodes.length
      expect(() => engine.ambient(name), name + ' 이 던졌다').not.toThrow()
      expect(ctx().nodes.length, name + ' 이 노드를 안 만들었다').toBeGreaterThan(before)
    }
    expect(() => engine.ambient(null)).not.toThrow()
  })

  it('모르는 이름은 조용히 넘긴다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    const before = ctx().nodes.length
    expect(() => engine.oneShot('없는소리')).not.toThrow()
    expect(() => engine.ambient('없는바닥')).not.toThrow()
    expect(ctx().nodes.length).toBe(before)
  })

  it('편경(decide)은 부분음 셋과 채 클릭 하나로 실제 노드를 만든다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    const before = ctx().nodes.length
    engine.oneShot('decide')
    const made = ctx().nodes.slice(before)
    expect(made.filter((n) => n.kind === 'oscillator')).toHaveLength(3)
    expect(made.filter((n) => n.kind === 'bufferSource')).toHaveLength(1)
    // 기음 932Hz 와 비조화 배음 두엇이 실제로 잡혀 있다
    const freqs = made
      .filter((n) => n.kind === 'oscillator')
      .map((n) => n.frequency.events.find((e) => e[0] === 'set')[1])
    expect(freqs[0]).toBeCloseTo(932, 5)
    expect(freqs[1] / freqs[0]).toBeCloseTo(2.76, 5)
    expect(freqs[2] / freqs[0]).toBeCloseTo(5.40, 5)
  })

  // master.connect(ctx.destination) 을 지우면 모든 소리가 무음이 된다
  it('마스터 게인이 destination 에 이어져 있다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    const toDest = ctx().edges.filter(([, to]) => to === ctx().destination)
    expect(toDest).toHaveLength(1)
    expect(toDest[0][0].kind).toBe('gain')
  })

  it('낸 소리가 하나도 빠짐없이 destination 까지 닿는다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    for (const name of ONE_SHOTS) engine.oneShot(name)
    engine.ambient('siege')
    engine.ambient('fire')
    const c = ctx()
    const sources = c.nodes.filter((n) => n.kind === 'oscillator' || n.kind === 'bufferSource')
    expect(sources.length).toBeGreaterThan(10)
    const lost = sources.filter((n) => {
      const e = endpointsOf(c, n)
      return !e.output && !e.param
    })
    expect(lost.map((n) => n.kind)).toEqual([])
    // 실제로 소리를 내는(변조가 아닌) 것이 대다수여야 한다 —
    // 전부 변조 경로로 빠져 무음이 되는 경우를 이 줄이 막는다
    expect(sources.filter((n) => endpointsOf(c, n).output).length).toBeGreaterThan(10)
  })

  it('0 을 목표로 하는 exponential 램프가 하나도 없다 — 브라우저가 던지는 자리다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    for (const name of ONE_SHOTS) engine.oneShot(name)
    engine.oneShot('brush', { gain: 0 })     // 배율 0 으로 불러도 0 이 새면 안 된다
    engine.ambient('siege')
    engine.ambient('fire')
    engine.ambient(null)
    const bad = ctx().allEvents().filter(([kind, value]) => kind === 'exp' && !(value > 0))
    expect(bad).toEqual([])
  })

  it('바닥 소리를 뺄 때 cancelScheduledValues 뒤에 반드시 닻(setValueAtTime)이 온다', async () => {
    // 닻이 없으면 뒤따르는 램프의 시작값이 정해지지 않아 값이 튄다 — 딸깍이다.
    // siege 의 드론과 fire 의 LFO 가 이 규칙을 빠뜨렸던 자리다.
    const { engine, ctx } = await boot()
    await engine.resume()
    engine.ambient('siege')
    engine.ambient('fire')
    engine.ambient(null)
    for (const p of ctx().nodes.flatMap((n) => n.params)) {
      p.events.forEach(([kind], i) => {
        if (kind !== 'cancel') return
        expect(p.events[i + 1]?.[0], 'cancel 뒤에 닻이 없다').toBe('set')
      })
    }
  })

  it('소리를 잔뜩 낸 뒤 살아 있는 노드는 마스터 하나뿐이다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    for (let round = 0; round < 3; round++) {
      for (const name of ONE_SHOTS) engine.oneShot(name)
      for (const name of AMBIENCES) engine.ambient(name)
    }
    engine.ambient(null)
    const c = ctx()
    expect(c.nodes.length).toBeGreaterThan(60)   // 실제로 많이 만들었다
    c.finishAll()                                 // 예약된 소리가 전부 끝났다
    const alive = c.alive()
    expect(alive).toHaveLength(1)
    expect(alive[0].kind).toBe('gain')
    expect(c.edges.filter(([, to]) => to === c.destination)).toHaveLength(1)
  })

  it('흰 소리 버퍼는 딱 한 번 만들어 돌려 쓴다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    for (const name of ONE_SHOTS) engine.oneShot(name)
    engine.ambient('hall')
    expect(ctx().buffers).toHaveLength(1)
    expect(ctx().buffers[0].duration).toBe(2)
  })

  it('버퍼 재생 위치가 버퍼 길이를 벗어나지 않는다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    for (let round = 0; round < 20; round++) {       // 위치를 무작위로 고르므로 여러 번 돌린다
      for (const name of ONE_SHOTS) engine.oneShot(name)
    }
    engine.ambient('hall')
    const c = ctx()
    for (const n of c.nodes.filter((x) => x.kind === 'bufferSource')) {
      const len = n.buffer.duration
      for (const { offset, duration } of n.starts) {
        expect(offset).toBeGreaterThanOrEqual(0)
        expect(offset).toBeLessThan(len)
        if (!n.loop && duration != null) expect(offset + duration).toBeLessThanOrEqual(len)
      }
    }
  })

  it('바닥 소리를 바꾸면 옛것을 실제로 멈춘다 — 겹쳐 쌓이지 않는다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    engine.ambient('hall')
    const first = ctx().nodes.filter((n) => n.kind === 'bufferSource')
    expect(first).toHaveLength(1)
    expect(first[0].endAt).toBe(null)              // 아직 돌고 있다
    engine.ambient('night')
    expect(first[0].endAt).not.toBe(null)          // 멈추도록 예약됐다
    expect(first[0].endAt).toBeGreaterThan(0)      // 곧바로가 아니라 페이드가 끝난 뒤
  })

  it('setGain 은 마스터를 부드럽게 옮긴다 — 급히 꺾으면 딸깍한다', async () => {
    const { engine, ctx } = await boot()
    await engine.resume()
    engine.setGain(0)
    const master = ctx().nodes[0]
    expect(master.gain.events.filter(([k]) => k === 'target')).toHaveLength(1)
    expect(master.gain.events.at(-1)[1]).toBe(0)
    engine.setGain(5)                               // 범위 밖은 잘린다
    expect(master.gain.events.at(-1)[1]).toBe(1)
  })

  it('oneShot 의 opts.gain 이 실제로 소리를 줄인다 — audio.js 의 play(name, opts) 와 이어진다', async () => {
    const peakOf = async (opts) => {
      const { engine, ctx } = await boot()
      await engine.resume()
      engine.oneShot('decide', opts)
      return Math.max(...ctx().allEvents().filter(([k]) => k === 'exp').map(([, v]) => v))
    }
    const full = await peakOf(undefined)
    const half = await peakOf({ gain: 0.5 })
    expect(half).toBeCloseTo(full / 2, 6)
  })

  it('AudioContext 가 없는 곳(Node)에서도 부르는 족족 조용히 넘어간다', async () => {
    const { createWebAudioEngine } = await import('../../src/systems/web-audio-engine.js')
    const engine = createWebAudioEngine({ AudioContextCtor: null })
    expect(() => {
      engine.oneShot('decide')
      engine.ambient('hall')
      engine.ambient(null)
      engine.setGain(0)
    }).not.toThrow()
    await expect(engine.resume()).resolves.toBeUndefined()
  })

  it('브리프의 소리 이름을 하나도 빠뜨리지 않는다', async () => {
    const mod = await import('../../src/systems/web-audio-engine.js')
    expect(Object.keys(mod.ONE_SHOT_SPECS).sort()).toEqual([...ONE_SHOTS].sort())
    expect(Object.keys(mod.AMBIENT_SPECS).sort()).toEqual([...AMBIENCES].sort())
  })

  it('편경(decide)은 기음에 어울리지 않는 배음을 얹은 소리다', async () => {
    const { ONE_SHOT_SPECS } = await import('../../src/systems/web-audio-engine.js')
    const decide = ONE_SHOT_SPECS.decide
    // 정수배가 아닌 부분음이 둘 이상이어야 '돌을 친 소리'가 된다.
    // 정수배만 쌓으면 오르간처럼 물러진다.
    const inharmonic = decide.partials.filter((p) => Math.abs(p.ratio - Math.round(p.ratio)) > 0.1)
    expect(inharmonic.length).toBeGreaterThanOrEqual(2)
    // 기음이 가장 오래 남는다 — 높은 모드가 먼저 죽는 실제 석재의 감쇠
    const decays = decide.partials.map((p) => p.decay)
    expect(decays[0]).toBe(Math.max(...decays))
    expect(decays[0]).toBeGreaterThan(1)   // 긴 감쇠
  })
})
