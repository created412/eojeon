import { it, expect } from 'vitest'
import * as THREE from 'three'
import { PALACES } from '../../src/data/palaces.js'
import { ROOM_SHRINK } from '../../src/data/hall-geometry.js'
import { buildYardFeatures } from '../../src/render/yard-features.js'
import { createGateGuards } from '../../src/render/gate-guards.js'
import { createAtmosphere } from '../../src/render/atmosphere.js'
import { isOccludable } from '../../src/render/occlusion.js'

it('실제로 지은 도형도 담과 방과 스폰을 침범하지 않는다', () => {
  for (const def of Object.values(PALACES)) {
    const root = buildYardFeatures(THREE, {}, def)
    for (const feature of root.children) {
      const b = new THREE.Box3().setFromObject(feature)
      expect(b.min.x, feature.name).toBeGreaterThan(-def.ground.w / 2)
      expect(b.max.x, feature.name).toBeLessThan(def.ground.w / 2)
      expect(b.min.z, feature.name).toBeGreaterThan(-def.ground.d / 2)
      expect(b.max.z, feature.name).toBeLessThan(def.ground.d / 2)
      for (const r of def.rooms) {
        const overlap = b.min.x < r.x + r.w * ROOM_SHRINK / 2 && b.max.x > r.x - r.w * ROOM_SHRINK / 2 &&
          b.min.z < r.z + r.d * ROOM_SHRINK / 2 && b.max.z > r.z - r.d * ROOM_SHRINK / 2
        expect(overlap, `${feature.name}/${r.id}`).toBe(false)
      }
      const dx = Math.max(b.min.x - def.spawn.x, 0, def.spawn.x - b.max.x)
      const dz = Math.max(b.min.z - def.spawn.z, 0, def.spawn.z - b.max.z)
      expect(Math.hypot(dx, dz), feature.name).toBeGreaterThanOrEqual(1.5 - 1e-5)
    }
  }
})

it('물·길·다리 판은 남고 난간은 가림 판정에 양보한다 — 발은 돌 윗면에 닿는다', () => {
  for (const id of ['changdeok', 'gyeongbok']) {
    const root = buildYardFeatures(THREE, {}, PALACES[id])
    const floors = [], rails = [], meshes = []
    root.traverse(o => {
      if (!o.isMesh) return
      meshes.push(o)
      if (o.userData.surface) floors.push(o)
      if (o.name === '난간') rails.push(o)
    })
    expect(floors.length).toBeGreaterThan(3)
    expect(rails).toHaveLength(1)
    for (const m of floors) expect(isOccludable(m), m.name).toBe(false)
    for (const m of rails) expect(isOccludable(m), m.name).toBe(true)
    expect(meshes.length).toBeLessThanOrEqual(20)
    const bridge = root.getObjectByName('다리 판')
    expect(new THREE.Box3().setFromObject(bridge).max.y).toBeCloseTo(.1, 5)
    const water = root.getObjectByName('물')
    expect(water.material.transparent).toBe(true)
    expect(water.material.opacity).toBeLessThan(1)
  }
})

it('수문장은 별도 그룹에 서고 궁을 바꾸거나 해제하면 남지 않는다', () => {
  const scene = new THREE.Scene(), guards = createGateGuards(THREE, scene)
  guards.setPalace(PALACES.changdeok)
  const root = scene.getObjectByName('gateGuards')
  expect(root.children).toHaveLength(2)
  for (const [i, g] of root.children.entries()) {
    expect(g.userData.npcId).toBeUndefined()
    expect(g.position.x).toBe(PALACES.changdeok.yard.gateGuards[i].x)
    expect(g.children[0].userData.person).toBeTruthy()
  }
  guards.setPalace(PALACES.gyeongu)
  expect(root.children).toHaveLength(0)
  guards.setPalace(PALACES.unhyeon)
  expect(root.children).toHaveLength(2)
  guards.dispose()
  expect(scene.getObjectByName('gateGuards')).toBeUndefined()
})

it('새·연기는 움직임 줄이기에서 멈추며 연기는 겨울·밤과 온전한 방에서만 난다', () => {
  const scene = new THREE.Scene(), a = createAtmosphere(scene), player = new THREE.Vector3()
  a.setPalace(PALACES.unhyeon)
  const birds = scene.getObjectByName('yardBirds'), smoke = scene.getObjectByName('chimneySmoke')
  expect(birds).toBeTruthy()
  expect(smoke).toBeTruthy()
  a.setMood('day')
  expect(smoke.visible).toBe(false)
  for (const mood of ['dawnwinter', 'night']) {
    a.setMood(mood)
    expect(smoke.visible).toBe(true)
  }
  a.update(1000, player, false)
  const before = [...birds.geometry.attributes.position.array]
  const puffs = [...smoke.instanceMatrix.array]
  a.update(9000, player, true)
  expect([...birds.geometry.attributes.position.array]).toEqual(before)
  expect([...smoke.instanceMatrix.array]).toEqual(puffs)
  a.update(10000, player, false)
  expect([...birds.geometry.attributes.position.array]).not.toEqual(before)
  expect([...smoke.instanceMatrix.array]).not.toEqual(puffs)
  a.setMood('fire')
  expect(smoke.visible).toBe(false)
  a.setPalace(PALACES.gyeongbok_jagyeong)
  a.setMood('night')
  expect(scene.getObjectByName('chimneySmoke')).toBeUndefined()
  a.setPalace(PALACES.changdeok)
  expect(scene.getObjectByName('chimneySmoke')).toBeUndefined()
  a.dispose()
  expect(scene.children).toHaveLength(0)
})
