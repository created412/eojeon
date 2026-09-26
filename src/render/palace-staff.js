// 궁을 오가는 사람들의 몸 — 걸음은 systems/palace-walkers.js 가 세고, 여기서는 세운다.
//
// 선생님(2026-09-26): 「오가게 만드는 거부터 해.」
//
// 정문의 수문장(gate-guards.js)과 같은 자리에 둔다: **말을 거는 신하가 아니다.**
// npcMeshes 에 넣지 않으므로 npcNear·표지·이름표·알현 어느 것도 이들을 보지 못한다.
// 그래서 궁을 마음껏 가로질러도 「보이는 몸」과 「말이 걸리는 자리」가 어긋나지 않는다
// (data/walkers.js 머리말 — 그 어긋남 때문에 신하는 제 전각에 남겨 두었다).
import { buildPerson, disposePerson, updateSway, RANK_SPECS } from './glb-person.js'
import { createWalkers } from '../systems/palace-walkers.js'
import { walkersIn } from '../data/walkers.js'

const TURN_RATE = 5.2      // 초당 라디안 — 돌아서는 속도
const BOW_MAX = 0.45       // 읍의 깊이. scene.js 의 신하와 같은 값을 쓴다

function turnToward(current, want, dt) {
  let diff = want - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  const step = TURN_RATE * (dt / 1000)
  return current + Math.max(-step, Math.min(step, diff))
}

export function createPalaceStaff(THREE, scene) {
  const group = new THREE.Group()
  group.name = 'palaceStaff'
  scene.add(group)
  const bodies = new Map()          // id -> { anchor, pivot, mesh, bowShown }
  const walkers = createWalkers()
  const bowQuat = new THREE.Quaternion()

  function clear() {
    for (const { anchor, pivot } of bodies.values()) {
      group.remove(anchor)
      disposePerson(pivot)
    }
    bodies.clear()
  }

  function setPalace(def) {
    clear()
    const list = walkersIn(def?.id)
    // 길이 안 나오는 사람은 walkers 가 걸러 낸다(막힌 궁·불탄 전각). 몸도 세우지 않는다.
    const ids = new Set(walkers.setPalace(def, list))
    for (const w of list) {
      if (!ids.has(w.id)) continue
      const spec = RANK_SPECS[w.rank] ?? RANK_SPECS.mid
      const built = buildPerson(THREE, { ...spec, ageStage: 'adult', idleKey: w.id })
      const anchor = new THREE.Group()
      anchor.position.set(0, 1.9, 0)
      anchor.add(built.pivot)
      group.add(anchor)
      bodies.set(w.id, { anchor, pivot: built.pivot, mesh: built.mesh, bowShown: 0 })
    }
  }

  // 읍 — render/scene.js 의 applyBow 와 같은 모양이다. 굽히는 자리를 허리와 발목으로
  // 나누는 까닭도 같다(거기 주석 참고). updateSway 가 허리를 쉬는 자세로 되돌리므로
  // **걸음 자세 뒤에** 얹는다.
  function applyBow(body, amount) {
    if (amount === 0 && body.bowShown === 0) return
    body.bowShown = amount
    const person = body.pivot.userData?.person
    if (!person) return
    if (body.mesh) body.mesh.rotation.x = BOW_MAX * amount * 0.32
    const spine = person.bones?.spine
    const rest = spine?.userData?.restQuat
    const axis = spine?.userData?.swingAxis
    if (!rest || !axis) return
    bowQuat.setFromAxisAngle(axis, BOW_MAX * amount * 0.75)
    spine.quaternion.copy(rest).multiply(bowQuat)
  }

  /**
   * 한 프레임. now·dt 는 ms, king 은 임금의 자리.
   * hidden — 불·난군처럼 궁이 궁이 아닌 장면에서는 이들을 지운다. 그런 장면에
   * 내관이 서류를 들고 지나가면 그림이 거짓말을 한다.
   * frozen — 알현. 예전에는 이때도 지웠지만, 그러면 아뢰는 장면 내내 궁이 텅 빈다.
   * 선 자리에서 멈추게만 한다(systems/palace-walkers.js frozen) — 숨은 쉰다.
   */
  function tick(now, dt, king, { reducedMotion = false, hidden = false, frozen = false } = {}) {
    group.visible = !hidden
    if (hidden || bodies.size === 0) return
    for (const w of walkers.tick({ now, king, reducedMotion, frozen })) {
      const body = bodies.get(w.id)
      if (!body) continue
      body.anchor.position.x = w.x
      body.anchor.position.z = w.z
      const dx = (king?.x ?? w.x) - w.x
      const dz = (king?.z ?? w.z) - w.z
      // yaw 가 null 이면 임금을 본다 — 굽히는 동안이 그렇다(scene.js placeNpc 의 약속).
      const want = w.yaw != null ? w.yaw
        : (Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : body.anchor.rotation.y)
      body.anchor.rotation.y = turnToward(body.anchor.rotation.y, want, dt)
      updateSway(body.pivot, dt, { walking: w.walking, reducedMotion })
      applyBow(body, w.bow)
    }
  }

  function dispose() { clear(); scene.remove(group) }
  return { setPalace, tick, dispose, ids: () => walkers.ids() }
}
