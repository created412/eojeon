import { buildPerson, disposePerson, updateSway } from './glb-person.js'

// 정문을 지키는 사람은 말을 거는 신하가 아니다 — NPC 목록·대화 표지와 별개로 둔다.
//
// 그래서 오래 잊혀 있었다. npcMeshes 에 없으니 render() 의 그 순회가 이들을 보지
// 못하고, 궁을 오가는 사람도 아니니 palace-staff 의 tick 도 이들을 부르지 않았다.
// 결과는 선생님이 보신 그대로다(2026-09-26): 「누구는 움직이고 누구는 움직이지
// 않아. 전부 움직이고 있어야해.」 문 앞의 둘은 스무 해를 눈 한 번 깜박이지 않고 서
// 있었다. 이제 이들에게도 프레임이 온다 — 자리는 그대로, 숨만 쉰다.
export function createGateGuards(THREE, scene) {
  const group = new THREE.Group()
  group.name = 'gateGuards'
  scene.add(group)
  // 몸을 따로 들고 있는다 — 프레임마다 group.children[i].children[0] 을 뒤지지 않게.
  const pivots = []
  function clear() {
    for (const anchor of group.children) disposePerson(anchor.children[0])
    group.clear()
    pivots.length = 0
  }
  function setPalace(def) {
    clear()
    const guards = def.yard?.gateGuards ?? []
    for (let i = 0; i < guards.length; i++) {
      const p = guards[i]
      // 숨의 박자는 이름에서 나온다. 수문장에게는 이름이 없으니 궁과 자리 번호를
      // 이름 삼는다 — 둘이 같은 박자로 숨쉬면 문 앞에 쌍둥이 인형이 선다.
      const { pivot } = buildPerson(THREE, { model: 'messenger', idleKey: `gate:${def.id ?? ''}:${i}` })
      const anchor = new THREE.Group()
      anchor.position.set(p.x, 1.9, p.z)
      anchor.rotation.y = p.yaw ?? 0
      anchor.add(pivot)
      group.add(anchor)
      pivots.push(pivot)
    }
  }
  // 한 프레임. 수문장은 자리를 떠나지 않으므로 걸음은 없다 — 서 있는 자세뿐이다.
  // 어느 국면에서든 부른다: 자세만 얹으니 알현·행렬과 싸울 일이 없다.
  function tick(dt, { reducedMotion = false } = {}) {
    for (const pivot of pivots) updateSway(pivot, dt, { walking: false, reducedMotion })
  }
  // GLB 복제본은 원본 재질·도형을 공유한다 — 궁을 바꿀 때 공유 GPU 자원을 버리지 않는다.
  function dispose() { clear(); scene.remove(group) }
  return { setPalace, tick, dispose }
}
