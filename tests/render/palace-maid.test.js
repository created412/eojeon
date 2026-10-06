import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { RANK_SPECS } from '../../src/render/glb-person.js'
import { MODELS } from '../../src/render/models-data.js'
import { WALKERS } from '../../src/data/walkers.js'
import { PALACES } from '../../src/data/palaces.js'
import { createPalaceStaff } from '../../src/render/palace-staff.js'

// 선생님(2026-10-06): 「궁녀가 여전히 대충그린 그림이야. 다른 캐릭터에 맞춰서 만들어 넣어야해.」
// 궁녀도 다른 인물과 같은 길이다 — Higgsfield 원화 → image_to_3d(리깅) → tools/pack-glb.mjs → MODELS.maid.
// 코드로 깎던 입체 메시(render/palace-maid.js)는 걷어 냈다.
describe('궁녀 — 다른 인물과 같은 GLB 인물이다', () => {
  it('궁녀 모델이 다른 인물들과 함께 실려 있고, 코드 메시 갈래는 없다', () => {
    expect(MODELS.maid).toMatch(/^data:model\/gltf-binary;base64,/)
    expect(RANK_SPECS.maid.model).toBe('maid')
    const src = readFileSync(join(process.cwd(), 'src', 'render', 'glb-person.js'), 'utf8')
    expect(src).not.toContain("from './palace-maid.js'")
    expect(src).not.toContain('buildPalaceMaid')
    expect(existsSync(join(process.cwd(), 'src', 'render', 'palace-maid.js'))).toBe(false)
  })

  it('실린 궁녀 GLB 는 다른 인물과 같은 뼈 이름(리깅)을 가진다 — 걸음·읍이 같은 셈으로 돈다', () => {
    const glb = readFileSync(join(process.cwd(), 'assets', 'models', 'opt', 'maid.glb'))
    // GLB 의 JSON 청크는 12바이트 머리 뒤에 온다: [길이][형식 'JSON'][본문]
    const len = glb.readUInt32LE(12)
    const json = JSON.parse(glb.subarray(20, 20 + len).toString('utf8'))
    const names = new Set((json.nodes ?? []).map(n => n.name))
    for (const bone of ['Spine', 'Head', 'LeftUpLeg', 'RightUpLeg', 'LeftArm', 'RightArm']) expect(names.has(bone), bone).toBe(true)
    expect(json.skins?.length ?? 0).toBeGreaterThan(0)
    expect(glb.length).toBeLessThan(700 * 1024)   // 다른 인물(370~440KB)과 같은 급으로 줄였다
  })

  it('창덕궁과 경복궁의 살림 동선에 궁녀를 배정한다', () => {
    for (const id of ['changdeok', 'gyeongbok']) expect(WALKERS[id].filter(w => w.rank === 'maid')).toHaveLength(2)
  })

  it('궁인 무리에서 길을 따라 이동하고 궁을 바꿀 때 이전 몸을 정리한다', () => {
    const scene = new THREE.Scene(), staff = createPalaceStaff(THREE, scene)
    staff.setPalace(PALACES.changdeok)
    staff.tick(0, 16, { x: 999, z: 999 })
    const group = scene.getObjectByName('palaceStaff')
    const maidIds = WALKERS.changdeok.filter(w => w.rank === 'maid').map(w => `palace-staff:${w.id}`)
    const maids = group.children.filter(a => maidIds.includes(a.name))
    expect(maids).toHaveLength(2)
    const starts = maids.map(a => a.position.clone())
    for (let t = 100; t <= 16000; t += 100) staff.tick(t, 100, { x: 999, z: 999 })
    expect(maids.some((a, i) => a.position.distanceTo(starts[i]) > 1)).toBe(true)
    staff.setPalace(PALACES.gyeongbok)
    expect(maids.every(a => a.parent === null)).toBe(true)
    const gbIds = WALKERS.gyeongbok.filter(w => w.rank === 'maid').map(w => `palace-staff:${w.id}`)
    expect(group.children.filter(a => gbIds.includes(a.name))).toHaveLength(2)
    staff.dispose()
    expect(scene.getObjectByName('palaceStaff')).toBeUndefined()
  })
})
