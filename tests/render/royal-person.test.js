import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildPerson, updateSway, disposePerson, RANK_SPECS } from '../../src/render/royal-person.js'

describe('궁궐 아바타', () => {
  it('나이에 맞는 키와 지면에 닿는 발을 유지한다', () => {
    for (const height of [2.35, 2.6, 2.89]) {
      const person = buildPerson(THREE, { ...RANK_SPECS.king, height, ageStage: height < 2.5 ? 'child' : 'adult' })
      const box = new THREE.Box3().setFromObject(person.mesh)
      expect(box.min.y).toBeCloseTo(-1.8, 2)
      expect(box.max.y - box.min.y).toBeCloseTo(height, 2)
      disposePerson(person.pivot)
    }
  })
  it('걷기와 달리기는 다리를 앞뒤로 움직이고 멈추면 안정된다', () => {
    const { pivot } = buildPerson(THREE, RANK_SPECS.king)
    const left = pivot.getObjectByName('left-leg')
    const right = pivot.getObjectByName('right-leg')
    for (let i = 0; i < 8; i++) updateSway(pivot, 16, { walking: true, running: true })
    expect(Math.abs(left.rotation.x)).toBeGreaterThan(.05)
    expect(left.rotation.x * right.rotation.x).toBeLessThan(0)
    expect(left.rotation.z).toBe(0)
    for (let i = 0; i < 90; i++) updateSway(pivot, 16, { walking: false })
    expect(Math.abs(left.rotation.x)).toBeLessThan(.01)
    disposePerson(pivot)
  })
})
