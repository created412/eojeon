import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { PALACES } from '../../src/data/palaces.js'
import { collides } from '../../src/data/hall-geometry.js'
import { artifactById } from '../../src/data/artifacts.js'
import { artifactsIn, artifactNear, markArtifactSeen, artifactCount } from '../../src/systems/artifacts.js'
import { createState, serialize, deserialize } from '../../src/core/state.js'
import { PALACE_LIFE_IDS, palaceLifeProgress, unlockPalaceLifeCollection } from '../../src/systems/palace-discoveries.js'
import { buildPalaceDiscoveries } from '../../src/render/palace-discoveries.js'
import { palaceCollectionHtml, discoveryDecoration } from '../../src/ui/palace-discoveries.js'

describe('선택 발견과 기념 기록', () => {
  it('세 발견은 각각 재구성임을 명시하고 사료를 지어내지 않는다', () => {
    for (const id of PALACE_LIFE_IDS) {
      const a = artifactById(id)
      expect(a.discovery).toBe('palace-life')
      expect(a.lines).toHaveLength(2)
      expect(a.note).toContain('재구성')
    }
  })
  it('셋을 찾아야 해금되며 반복 발견·보통 물건은 진행을 늘리지 않는다', () => {
    let state = createState()
    state = markArtifactSeen(state, 'well')
    state = markArtifactSeen(state, PALACE_LIFE_IDS[0])
    state = markArtifactSeen(state, PALACE_LIFE_IDS[0])
    expect(palaceLifeProgress(state).found).toHaveLength(1)
    expect(unlockPalaceLifeCollection(state).reward).toBeNull()
    state = markArtifactSeen(state, PALACE_LIFE_IDS[1])
    expect(unlockPalaceLifeCollection(state).reward).toBeNull()
    state = markArtifactSeen(state, PALACE_LIFE_IDS[2])
    const unlocked = unlockPalaceLifeCollection(state)
    expect(unlocked.reward.name).toBe('궁을 움직이는 손길')
    expect(state.lore.collections).toBeUndefined()
    expect(unlocked.state.sources).toBe(state.sources)
    expect(unlocked.state.beatIndex).toBe(state.beatIndex)
    expect(artifactCount(unlocked.state)).toBe(4) // 보상은 물건 수에 넣지 않는다.
    expect(unlockPalaceLifeCollection(unlocked.state)).toEqual({ state: unlocked.state, reward: null })
  })
  it('새 필드가 없는 저장을 받아들이고 해금은 저장을 다시 열어도 남는다', () => {
    expect(palaceLifeProgress({})).toEqual({ found: [], complete: false, unlocked: false })
    let state = createState()
    for (const id of PALACE_LIFE_IDS) state = markArtifactSeen(state, id)
    const { state: earned } = unlockPalaceLifeCollection(state)
    const restored = deserialize(serialize(earned))
    expect(palaceLifeProgress(restored).unlocked).toBe(true)
    expect(unlockPalaceLifeCollection(restored).reward).toBeNull()
  })
  it('첫 발견 전에는 모음 안내가 숨고, 보상을 열면 재구성임을 밝힌다', () => {
    expect(palaceCollectionHtml(createState())).toBe('')
    let state = createState()
    state = markArtifactSeen(state, PALACE_LIFE_IDS[0])
    const partial = palaceCollectionHtml(state)
    expect(partial).toContain('1 / 3')
    expect(partial).not.toContain('data-palace-collection')
    for (const id of PALACE_LIFE_IDS) state = markArtifactSeen(state, id)
    const earned = unlockPalaceLifeCollection(state)
    expect(palaceCollectionHtml(earned.state)).toContain('data-palace-collection')
    expect(discoveryDecoration(earned.reward).match(/<svg/g)).toHaveLength(3)
    expect(palaceCollectionHtml(earned.state)).toContain('재구성')
  })
})

// 물·담·벽·기둥을 통과하지 않고 스폰에서 문으로 들어가 발견할 수 있어야 한다.
function reachableCells(def) {
  const step = .5, queue = [{ x: def.spawn.x, z: def.spawn.z }], seen = new Set()
  const key = p => `${p.x},${p.z}`
  seen.add(key(queue[0]))
  for (let at = 0; at < queue.length; at++) {
    const p = queue[at]
    for (const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]) {
      const q = { x: p.x + dx, z: p.z + dz }, k = key(q)
      if (seen.has(k) || Math.abs(q.x) >= def.ground.w / 2 - 1 || Math.abs(q.z) >= def.ground.d / 2 - 1) continue
      seen.add(k)
      if (!collides(def, q)) queue.push(q)
    }
  }
  return queue
}

describe('물건을 눈으로 보고 걸어 다가간다', () => {
  for (const palace of ['changdeok', 'gyeongbok']) it(`${palace}: 입체 물건의 자리와 E 발견 지점이 같고 실제로 닿는다`, () => {
    const def = PALACES[palace]
    const spots = artifactsIn(def).filter(s => PALACE_LIFE_IDS.includes(s.id))
    const group = buildPalaceDiscoveries(THREE, def)
    const paths = reachableCells(def)
    expect(spots).toHaveLength(3)
    expect(group.children).toHaveLength(3)
    for (const spot of spots) {
      expect(collides(def, spot)).toBeNull()
      expect(artifactNear(def, spot.x, spot.z, { room: spot.room }).id).toBe(spot.id)
      expect(paths.some(p => Math.hypot(p.x - spot.x, p.z - spot.z) < .6), spot.id).toBe(true)
      const mesh = group.getObjectByName(spot.id)
      expect(mesh.position.x).toBe(spot.x)
      expect(mesh.position.z).toBe(spot.z)
      const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3())
      expect(size.x).toBeGreaterThan(1)
      expect(size.y).toBeGreaterThan(.4)
      expect(size.z).toBeGreaterThan(.5)
    }
  })
})
