import { PALACES } from '../data/palaces.js'

// 'audience' — 알현. 임금이 어좌 앞에 서 있고 사람이 찾아오는 국면이다.
// 'day'(탐색) 와 갈라 두는 까닭: 그 국면에서는 걸음·줍기·나들이가 모두 살아 있는데,
// 알현에서는 그 셋이 전부 죽어 있어야 한다(선생님 지적 7번). 국면 하나로 가른다.
export const PHASES = ['boot', 'day', 'audience', 'council', 'beat', 'rush', 'done']

export function actAt(acts, i) {
  return acts[i] ?? null
}

export function nextActIndex(acts, i) {
  return i + 1 < acts.length ? i + 1 : null
}

export function isLastAct(acts, i) {
  return nextActIndex(acts, i) === null
}

// 화재 변형(gyeongbok_burnt 등)도 서로 다른 궁으로 본다 — 미니맵과 씬을 다시 세워야 하기 때문이다
export function palaceChanged(prev, next) {
  return prev !== next
}

/**
 * 막·국면·궁의 전이를 담고, 궁에 매인 자원의 수명을 책임진다.
 * DOM 을 직접 만들지 않는다 — 만드는 일은 resources 로 주입받는다. 그래서 테스트가 된다.
 */
// state 는 「이 흐름이 들고 다니는 상태」를 담아 두는 자리일 뿐이다. 자기 상태를 따로
// 들고 있는 호출자(Task 4의 막 러너의 live)는 넘기지 않는다 — 두 벌이 되면 반드시 어긋난다.
export function createFlow({ acts, state = null, palaces = PALACES, resources = {} }) {
  let phase = 'boot'
  let boundPalace = null
  const bound = new Map()

  const flow = {
    state,
    taken: new Set(),

    // 버그 C — 예전에는 여기 `let actIndex = 0` 이라는 두 번째 진실이 있었다.
    // flow.state 만 갈아 끼우면 그 값이 따라오지 않아, 2·3막에서 저장한 기록을
    // 이어하면 flow.act() 가 여전히 1막을 가리켰다(그리고 곧장 1막 끝 화면이 떴다).
    // 파생 값으로 바꾸면 어긋날 자리 자체가 없어진다 — 상태가 하나뿐이기 때문이다.
    get actIndex() { return flow.state?.actIndex ?? 0 },
    act() { return actAt(acts, flow.actIndex) },
    isLast() { return isLastAct(acts, flow.actIndex) },

    get phase() { return phase },
    setPhase(p) {
      if (!PHASES.includes(p)) throw new Error(`모르는 국면: ${p}`)
      phase = p
      return phase
    },

    // 막 번호를 옮기는 것은 곧 상태를 옮기는 것이다. state 가 아직 없으면 만들어 준다 —
    // 상태 없이 createFlow() 를 부르는 시험이 있고, 그 호출자를 깨지 않는다.
    nextAct() {
      const n = nextActIndex(acts, flow.actIndex)
      if (n === null) return false
      flow.state = { ...(flow.state ?? {}), actIndex: n }
      return true
    },

    // 이어하기의 지식을 한 곳에 모은다. 예전에는 main.js 가 저장된 값만큼 nextAct() 를
    // 다시 부르고, held·lost 를 taken 에 손으로 채워 넣었다 — 그 두 가지를 잊거나
    // 순서를 바꾸면 아무 시험도 울지 않은 채 이어하기가 어긋났다(버그 A·C).
    // 새 이어하기 지식이 생기면 반드시 여기에 넣는다 (판정 R60·R63).
    restoreSession(saved) {
      flow.state = saved
      flow.taken.clear()
      for (const id of saved?.sources?.held ?? []) flow.taken.add(id)
      for (const id of saved?.sources?.lost ?? []) flow.taken.add(id)
      return flow
    },

    // 궁이 바뀔 때마다 궁에 매인 것을 부수고 다시 세운다.
    // 이것을 안 하면 막·궁 전환마다 리스너·DOM·<style> 이 쌓인다.
    syncPalace(palaceId) {
      if (!palaceChanged(boundPalace, palaceId)) return false
      const def = palaces[palaceId]
      if (!def) throw new Error(`모르는 궁: ${palaceId}`)
      flow.disposeBound()
      boundPalace = palaceId
      resources.setPalace?.(def)
      for (const [name, make] of Object.entries(resources.perPalace ?? {})) {
        bound.set(name, make(def))
      }
      return true
    },

    palace() { return boundPalace },
    get(name) { return bound.get(name) ?? null },

    disposeBound() {
      for (const r of bound.values()) r?.dispose?.()
      bound.clear()
    },

    dispose() {
      flow.disposeBound()
      boundPalace = null
      for (const r of resources.lifetime ?? []) r?.dispose?.()
      phase = 'done'
    },
  }

  return flow
}
