import { buildPerson, disposePerson } from './glb-person.js'

// 정문을 지키는 사람은 말을 거는 신하가 아니다 — NPC 목록·대화 표지와 별개로 둔다.
export function createGateGuards(THREE, scene) {
  const group = new THREE.Group()
  group.name = 'gateGuards'
  scene.add(group)
  function clear() {
    for (const anchor of group.children) disposePerson(anchor.children[0])
    group.clear()
  }
  function setPalace(def) {
    clear()
    for (const p of def.yard?.gateGuards ?? []) {
      const { pivot } = buildPerson(THREE, { model: 'messenger' })
      const anchor = new THREE.Group()
      anchor.position.set(p.x, 1.9, p.z)
      anchor.rotation.y = p.yaw ?? 0
      anchor.add(pivot)
      group.add(anchor)
    }
  }
  // GLB 복제본은 원본 재질·도형을 공유한다 — 궁을 바꿀 때 공유 GPU 자원을 버리지 않는다.
  function dispose() { clear(); scene.remove(group) }
  return { setPalace, dispose }
}
