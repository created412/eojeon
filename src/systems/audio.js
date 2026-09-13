// 소리 결정 로직 — 「언제 무슨 소리를 낼 것인가」만 정한다.
// Web Audio 를 직접 부르지 않는다. 실제로 소리를 만드는 일은 주입받은 engine 이 한다
// (브라우저에서는 web-audio-engine.js, 시험에서는 기록하는 가짜 엔진).
// 이렇게 갈라 두면 이 파일의 판단은 전부 Node 에서 검사할 수 있다.
//
// engine 이 지켜야 할 모양은 네 가지뿐이다:
//   resume()          사용자 조작 뒤에 소리를 켠다 (Promise 를 돌려줘도 된다)
//   oneShot(name,opts) 한 번 나는 소리
//   ambient(name)     바닥에 깔리는 소리, null 이면 끈다
//   setGain(v)        0..1 전체 음량

export const MUTE_KEY = 'eojeon.muted'

// 걷는 동안 발소리 사이의 간격. 프레임이 아니라 밀리초다.
export const STEP_INTERVAL_MS = 340
// 달릴 때(Shift)의 간격. 걸음보다 짧다 — 같은 간격으로 두면 속도만 빨라지고
// 발소리는 그대로라 발이 땅에서 미끄러지는 것으로 들린다.
export const RUN_STEP_INTERVAL_MS = 230
// 이보다 적게 남으면 초침(tick)이 경보(alarm)로 바뀐다.
export const ALARM_THRESHOLD_MS = 5000
// 이보다 많이 남았으면 초침을 아예 내지 않는다. 22초짜리 임오군란 촉박은 처음부터
// 끝까지 울지만(총 시간이 이 값 아래다), 90초짜리 자경전 화재는 앞 60초가 조용하다가
// 초침이 시작된다 — 「이제 진짜다」가 소리로 생긴다. 90번 우는 초침은 성가심이다.
export const COUNTDOWN_AUDIBLE_MS = 30000
// 카운트다운 소리 사이의 실시간 바닥. 남은 초가 갑자기 쏟아져 들어와도
// (탭 복귀·시계 되감기) 이 사이에는 두 번 울리지 않는다.
const COUNTDOWN_MIN_GAP_MS = 250
// 음소거가 아닐 때의 마스터 음량. 교실 태블릿 스피커에서 찢어지지 않을 만큼.
const MASTER_GAIN = 0.75

// 이 게임에 실제로 있는 사건에만 이름을 붙였다. 늘리지 마라 — 배선이 이 표만 쓴다.
export const ONE_SHOTS = Object.freeze([
  'step',    // 걸을 때
  'door',    // 방을 옮길 때
  'pick',    // 사료를 주울 때
  'open',    // 문서·회의 화면이 열릴 때
  'close',   // 화면이 닫힐 때
  'brush',   // 친필 화면에서 붓이 지나갈 때
  'decide',  // 어전회의에서 결정할 때 — 편경
  'deny',    // 잠긴 선택지·오늘 더 들을 수 없을 때
  'tick',    // 카운트다운 1초마다
  'alarm',   // 카운트다운 마지막 5초
  'drum',    // 국상
])

export const AMBIENCES = Object.freeze(['hall', 'night', 'siege', 'fire'])

// localStorage 는 사설 창·잠긴 학교 PC 에서 읽기만 해도 던진다.
// 그때는 기억하지 않고 그냥 돈다 — 소리가 안 나느니 못 외우는 편이 낫다.
function readMuted(storage) {
  try {
    return storage?.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(storage, muted) {
  try {
    storage?.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // 못 외워도 이번 수업 시간에는 먹는다
  }
}

export function createAudio({ engine, storage = globalThis.localStorage } = {}) {
  let ready = false
  // 기본값은 소리 켜짐이다. 교실 기본이 꺼짐이면 학생은 끄는 단추가 있는 줄도 모른 채
  // 무음으로 한 시간을 보낸다.
  let muted = readMuted(storage)

  let wanted = null      // 깔고 싶은 바닥 소리
  let applied = null     // 엔진에 실제로 준 것
  let lastStepAt = null  // 발소리 위상 (밀리초). null 이면 다음 걸음은 곧바로 난다
  let cdKey = null       // 카운트다운에서 이미 울린 '남은 초'
  let cdAt = null        // 그 소리를 낸 실제 시각
  let cdTotal = null     // 지금 세고 있는 카운트다운의 총 시간

  // 음소거일 때 바닥 소리는 멈춰야 한다 — 이것만은 엔진을 부른다.
  // 한 번 나는 소리와 달리 바닥 소리는 이미 울리고 있어서, 안 부르면 계속 난다.
  function syncAmbient() {
    const want = ready && !muted ? wanted : null
    if (want === applied) return
    applied = want
    engine.ambient(want)
  }

  // play() 는 음소거면 엔진을 아예 부르지 않지만, 이미 울리고 있는 소리의 꼬리는
  // 마스터 음량으로만 재울 수 있다.
  function syncGain() {
    if (!ready) return
    engine.setGain(muted ? 0 : MASTER_GAIN)
  }

  const api = {
    // 반드시 사용자 조작(탭·클릭·키) 안에서 부른다. 그 밖에서 부르면 브라우저가 막고
    // 콘솔에 경고만 쌓인다. 탭을 다녀오면 컨텍스트가 다시 잠기므로 여러 번 불러도 된다.
    unlock() {
      const done = engine.resume()
      ready = true
      syncGain()
      syncAmbient()
      return Promise.resolve(done)
    },

    isReady() {
      return ready
    },

    // 음소거거나 아직 unlock 전이면 아무 일도 안 한다 — 음량 0 이 아니라 호출 자체가 없다.
    // 태블릿 30대가 도는 교실에서 들리지 않을 소리를 만드느라 헛일하지 않는다.
    play(name, opts) {
      if (!ready || muted) return false
      engine.oneShot(name, opts)
      return true
    },

    // 같은 것을 다시 주면 아무 일도 안 한다 — 매 프레임 불려도 안전하다.
    setAmbient(name) {
      const next = name ?? null
      if (next === wanted) return false
      wanted = next
      syncAmbient()
      return true
    },

    // 지금 '깔려 있어야 할' 것을 돌려준다 — 엔진에 실제로 걸린 것이 아니다.
    // 음소거 중에는 엔진에는 null 이 가 있지만 여기서는 'hall' 이라고 답한다.
    // 그래야 음소거를 푸는 순간 원래 방 소리로 돌아올 수 있고, 배선(Task D)이
    // '방이 바뀌었나'를 이 값으로 판단해도 음소거 여부에 흔들리지 않는다.
    ambient() {
      return wanted
    },

    setMuted(next) {
      muted = !!next
      writeMuted(storage, muted)
      syncGain()
      syncAmbient()
      return muted
    },

    isMuted() {
      return muted
    },

    toggleMuted() {
      return api.setMuted(!muted)
    },

    // 걷는 동안 STEP_INTERVAL_MS 마다 한 번. 호출은 매 프레임 오지만 소리는 시간으로 센다 —
    // 프레임을 세면 성능 좋은 기계에서만 발소리가 빨라진다.
    // 멈추면 위상을 비워, 다시 걷는 순간 곧바로 한 걸음이 난다.
    // running 이면 간격이 230ms 로 좁아진다. 안 주면 예전 그대로 340ms 로 돈다 —
    // 이 함수를 부르는 기존 자리가 깨지지 않는다.
    stepped(nowMs, { walking = false, running = false } = {}) {
      if (!walking) {
        lastStepAt = null
        return false
      }
      const interval = running ? RUN_STEP_INTERVAL_MS : STEP_INTERVAL_MS
      if (lastStepAt === null) {
        lastStepAt = nowMs
        return api.play('step')
      }
      const since = nowMs - lastStepAt
      // 시계가 뒤로 갔다 — 위상만 다시 잡는다
      if (since < 0) {
        lastStepAt = nowMs
        return false
      }
      if (since < interval) return false
      // 위상은 이어 간다(340 씩 더한다). 이 한 줄이 프레임 독립성의 핵심이다 —
      // lastStepAt = nowMs 로 바꾸면 호출 간격만큼 위상이 밀려, 느린 태블릿에서
      // 걸음 수가 줄어든다(3000ms 에 9 걸음이 8 걸음이 된다).
      // 다만 한참 뒤에 불렸다면(탭 복귀) 밀린 걸음을 몰아 내지 않고 지금으로 맞춘다.
      // 그래서 프레임 독립성이 성립하는 범위는 '호출 간격 < 340ms'(3fps 초과)까지다.
      // 그보다 느리게 불리면 밀린 걸음을 따라잡지 않고 떨군다 — 일부러 그렇게 했다.
      // 몰아 내면 걸음이 아니라 자갈 쏟는 소리가 된다. 버그로 보고 고치지 마라.
      lastStepAt = since >= interval * 2 ? nowMs : lastStepAt + interval
      return api.play('step')
    },

    // 매 프레임 불린다. '남은 초'가 바뀔 때만 한 번 운다.
    // 남은 초를 열쇠로 쓰기 때문에 nowMs 가 크게 뛰어도(탭을 벗어났다 돌아옴)
    // 건너뛴 초만큼 소리가 몰아쳐 나지 않는다 — 한 번만 난다.
    // 낸 소리의 이름을 돌려준다. 아무것도 안 냈으면 null.
    countdown(remainMs, totalMs, nowMs) {
      if (!(remainMs > 0)) {
        // 카운트다운이 끝났다. 상태를 반만 지우면 나중에 물린다 —
        // 같은 totalMs 로 250ms 안에 다시 시작할 때 실시간 바닥이 첫 초침을 삼킨다.
        cdKey = null
        cdAt = null
        cdTotal = null
        return null
      }
      // 30초보다 많이 남았으면 아무것도 안 낸다 — 위상도 건드리지 않는다.
      // 조용한 동안 상태를 만지지 않아야, 소리가 시작되는 첫 초가 「이미 울린 초」로
      // 삼켜지지 않는다.
      if (remainMs > COUNTDOWN_AUDIBLE_MS) return null
      if (totalMs !== cdTotal) {
        // 다른 카운트다운이 시작됐다 — 위상을 새로 잡는다
        cdTotal = totalMs
        cdKey = null
        cdAt = null
      }
      const key = Math.ceil(remainMs / 1000)
      if (key === cdKey) return null
      // 실시간 바닥. 시각이 멈춘 채 남은 시간만 쏟아져 들어와도 연달아 울지 않는다.
      // (시계가 뒤로 간 경우 since 가 음수라 막지 않는다 — 한 번은 울고 열쇠가 바뀐다)
      if (cdAt !== null) {
        const since = nowMs - cdAt
        if (since >= 0 && since < COUNTDOWN_MIN_GAP_MS) return null
      }
      cdKey = key
      cdAt = nowMs
      // 음소거·unlock 전이면 소리는 안 나지만 위상은 넘어간다.
      // 그래야 음소거를 푸는 순간 밀린 초가 쏟아지지 않는다.
      const name = remainMs <= ALARM_THRESHOLD_MS ? 'alarm' : 'tick'
      return api.play(name) ? name : null
    },
  }

  return api
}
