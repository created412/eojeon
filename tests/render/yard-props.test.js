import { it, expect } from 'vitest'
import * as THREE from 'three'
import { PALACES } from '../../src/data/palaces.js'
import { PROP_MODELS } from '../../src/render/props-data.js'
import { PROP_SPECS, buildYardProp, buildYardProps, applyYear } from '../../src/render/yard-props.js'

// 2026-09-16 선생님 요청 — 「방 이외에도 추가할거 없나 찾아서 힉스필드로 만들어 넣어.」
// 마당에 놓은 물건(Higgsfield image_to_3d 로 만든 GLB)이 실제로 실려 있고 자리가 맞는가.

it('마당에 놓는 물건은 모두 모델과 크기 지정이 있다', () => {
  for (const [id, spec] of Object.entries(PROP_SPECS)) {
    expect(PROP_MODELS[id], id).toBeTruthy()
    expect(PROP_MODELS[id].startsWith('data:model/gltf-binary;base64,'), id).toBe(true)
    expect(spec.height, id).toBeGreaterThan(0.5)
  }
})

it('궁이 부르는 물건은 모두 만들 수 있는 것이고, 궁 담 안에 있다', () => {
  for (const def of Object.values(PALACES)) {
    for (const p of def.yard?.props ?? []) {
      expect(PROP_SPECS[p.id], `${def.id}/${p.id}`).toBeTruthy()
      expect(Math.abs(p.x), `${def.id}/${p.id} x`).toBeLessThan(def.ground.w / 2 - 1)
      expect(Math.abs(p.z), `${def.id}/${p.id} z`).toBeLessThan(def.ground.d / 2 - 1)
    }
  }
})

it('대본이 말하는 물건이 실제로 서 있다 — 운현궁의 가마와 척화비', () => {
  const ids = (p) => (PALACES[p].yard?.props ?? []).map(x => x.id)
  expect(ids('unhyeon')).toContain('gama')            // 1막: 「가마에 오른다」
  expect(ids('gyeongbok')).toContain('cheokhwabi')    // 2막: 학생이 비문을 쓴 그 비석
  expect(ids('changdeok')).toContain('cheokhwabi')
  expect(ids('gyeongbok')).toContain('haetae')        // 광화문 앞 한 쌍
  expect(ids('gyeongbok').filter(i => i === 'haetae')).toHaveLength(2)
})

it('척화비는 1871년부터 선다 — 그전 장면에는 없다', () => {
  for (const def of Object.values(PALACES)) {
    for (const p of def.yard?.props ?? []) {
      if (p.id === 'cheokhwabi') expect(p.fromYear, def.id).toBe(1871)
    }
  }
  const group = buildYardProps(THREE, PALACES.gyeongbok)
  const stele = group.children.find(c => c.userData.propId === 'cheokhwabi')
  applyYear(group, 1866)
  expect(stele.visible).toBe(false)
  applyYear(group, 1873)
  expect(stele.visible).toBe(true)
  applyYear(group, null)          // 해를 모르면 감추지 않는다
  expect(stele.visible).toBe(true)
})

it('자리와 각도를 그대로 쓰고, 모르는 물건은 만들지 않는다', () => {
  const p = buildYardProp(THREE, { id: 'well', x: 3, z: -4, yaw: 1.2 })
  expect([p.position.x, p.position.z]).toEqual([3, -4])
  expect(p.rotation.y).toBeCloseTo(1.2, 5)
  expect(buildYardProp(THREE, { id: 'nonesuch', x: 0, z: 0 })).toBe(null)
})
