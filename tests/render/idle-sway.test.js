import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { updateSway, measureLocalAxis } from '../../src/render/glb-person.js'
import { idleSeed } from '../../src/systems/idle-pose.js'

// 선생님(2026-09-26): 「누구는 움직이고 누구는 움직이지 않아. 전부 움직이고 있어야해.」
//
// 실제 GLB 를 여기서 풀 수는 없다(9MB 짜리 여섯 벌이고, 시험은 3D 를 안 그린다).
// 그래서 glb-person.js 가 붙일 때 만들어 두는 것과 **같은 모양의** 뼈대를 손으로
// 세운다 — 쉬는 자세(restQuat)와 축 셋(swingAxis·leanAxis·turnAxis). updateSway 가
// 보는 것은 그것뿐이다.
const BONE_KEYS = ['legL', 'legR', 'kneeL', 'kneeR', 'armL', 'armR', 'elbowL', 'elbowR', 'spine', 'head']
const FOOT_DROP = 1.8

function figure(idleKey, { twist = false } = {}) {
  const pivot = new THREE.Group()
  const feet = new THREE.Group()
  feet.position.y = -FOOT_DROP
  pivot.add(feet)
  const model = new THREE.Group()
  model.scale.setScalar(0.42)          // fitToHeight 가 실제로 하는 일 — 배율이 1 이 아니다
  feet.add(model)
  const bones = {}
  for (const [i, key] of BONE_KEYS.entries()) {
    const bone = new THREE.Object3D()
    // 자동 리그의 뼈는 바인드 자세의 축이 제각각이다(swing-axis.test.js 머리말).
    // 축을 따로 재 두는 것이 참인지 보려면 뼈를 일부러 비틀어 두어야 한다.
    if (twist) bone.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.41)
    model.add(bone)
    bones[key] = bone
  }
  model.updateMatrixWorld(true)
  for (const bone of Object.values(bones)) {
    bone.userData.restQuat = bone.quaternion.clone()
    bone.userData.swingAxis = measureLocalAxis(THREE, model, bone, 1, 0, 0)
    bone.userData.leanAxis = measureLocalAxis(THREE, model, bone, 0, 0, 1)
    bone.userData.turnAxis = measureLocalAxis(THREE, model, bone, 0, 1, 0)
  }
  pivot.userData.person = { feet, model, bones, THREE }
  pivot.userData.idleSeed = idleSeed(idleKey)
  return { pivot, feet, model, bones }
}

// 뼈들의 자세를 한 줄의 수로 — 두 순간을 견주기 위한 지문이다.
function fingerprint(bones) {
  const out = []
  for (const key of BONE_KEYS) {
    const q = bones[key].quaternion
    out.push(q.x, q.y, q.z, q.w)
  }
  return out
}

function apart(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i])
  return sum
}

// 1.2초를 16ms 로 흘린다 — 실제 프레임과 같은 굵기다.
function run(pivot, ms, opts) {
  for (let t = 0; t < ms; t += 16) updateSway(pivot, 16, opts)
}

describe('서 있는 몸도 매 프레임 달라진다', () => {
  for (const twist of [false, true]) {
    it(`가만히 선 사람의 뼈가 1.2초 뒤에 다른 자세다 (${twist ? '비틀린 리그' : '고른 리그'})`, () => {
      const f = figure('jo', { twist })
      run(f.pivot, 600, { walking: false })
      const before = fingerprint(f.bones)
      const scaleBefore = f.model.scale.y
      run(f.pivot, 1200, { walking: false })
      const after = fingerprint(f.bones)
      expect(apart(before, after), '자세가 그대로다 — 굳어 있다').toBeGreaterThan(1e-3)
      expect(Math.abs(f.model.scale.y - scaleBefore), '가슴이 부풀지 않는다').toBeGreaterThan(1e-5)
    })
  }

  it('발은 바닥에 붙어 있다 — 숨이 사람을 띄우지 않는다', () => {
    const f = figure('jo')
    for (let t = 0; t < 20000; t += 16) {
      updateSway(f.pivot, 16, { walking: false })
      expect(f.feet.position.y).toBeCloseTo(-FOOT_DROP, 9)
    }
  })

  it('숨은 세로로만 — 가슴이 1% 안쪽으로 부푼다', () => {
    const f = figure('jo')
    let lo = Infinity, hi = -Infinity
    for (let t = 0; t < 20000; t += 16) {
      updateSway(f.pivot, 16, { walking: false })
      const ratio = f.model.scale.y / f.model.scale.x
      lo = Math.min(lo, ratio); hi = Math.max(hi, ratio)
    }
    expect(hi - lo).toBeGreaterThan(1e-4)
    expect(hi).toBeLessThan(1.01)
    expect(lo).toBeGreaterThan(0.99)
  })

  it('두 사람이 같은 자세로 서 있지 않는다', () => {
    const a = figure('gate:changdeok:0')
    const b = figure('gate:changdeok:1')
    let together = 0, steps = 0
    for (let t = 0; t < 12000; t += 160) {
      updateSway(a.pivot, 160, { walking: false })
      updateSway(b.pivot, 160, { walking: false })
      steps++
      if (apart(fingerprint(a.bones), fingerprint(b.bones)) < 1e-6) together++
    }
    expect(steps).toBeGreaterThan(50)
    expect(together, '문 앞에 쌍둥이 인형이 섰다').toBe(0)
  })
})

describe('정지 선호(prefers-reduced-motion)에서는 정말로 서 있는다', () => {
  it('뼈가 쉬는 자세 그대로고, 발도 가슴도 움직이지 않는다', () => {
    const f = figure('jo', { twist: true })
    const rest = Object.values(f.bones).map(b => b.userData.restQuat.clone())
    // 1e-6 은 부동소수의 나머지를 봐 주는 것이다 — 쉬는 자세로 되돌릴 때도 0 도짜리
    // 쿼터니언을 한 번 곱하므로 32비트 반올림이 3e-8 쯤 남는다. 눈에 보이는 각의
    // 십만 분의 일이다.
    for (let t = 0; t < 8000; t += 16) updateSway(f.pivot, 16, { walking: false, reducedMotion: true })
    for (const [i, bone] of Object.values(f.bones).entries()) {
      expect(bone.quaternion.angleTo(rest[i]), BONE_KEYS[i]).toBeLessThan(1e-6)
    }
    expect(f.feet.position.y).toBeCloseTo(-FOOT_DROP, 9)
    expect(f.model.scale.y).toBeCloseTo(f.model.scale.x, 9)
  })

  it('걷는다고 알려도 걷지 않는다 — 걸음은 움직임이다', () => {
    const f = figure('jo')
    const rest = Object.values(f.bones).map(b => b.userData.restQuat.clone())
    for (let t = 0; t < 8000; t += 16) updateSway(f.pivot, 16, { walking: true, reducedMotion: true })
    for (const [i, bone] of Object.values(f.bones).entries()) {
      expect(bone.quaternion.angleTo(rest[i]), BONE_KEYS[i]).toBeLessThan(1e-6)
    }
  })
})

describe('걸음과 숨이 싸우지 않는다', () => {
  it('한참 걷고 나면 서 있는 자세는 물러난다 — 박자가 달라도 같은 걸음이다', () => {
    const a = figure('jo')
    const b = figure('park')
    run(a.pivot, 3000, { walking: true })
    run(b.pivot, 3000, { walking: true })
    // 걸음의 위상은 같은 시간을 흘렸으니 같다. 남는 차이는 서 있는 자세의 몫뿐이고,
    // 그것이 0 으로 물러났다면 두 사람의 다리가 같은 각에 있어야 한다.
    expect(a.pivot.userData.swayAmt).toBeGreaterThan(0.4)
    expect(apart(fingerprint(a.bones), fingerprint(b.bones))).toBeLessThan(1e-6)
  })

  it('걷다 서면 숨이 다시 돌아온다', () => {
    const f = figure('jo')
    run(f.pivot, 3000, { walking: true })
    run(f.pivot, 2000, { walking: false })
    const before = fingerprint(f.bones)
    run(f.pivot, 1200, { walking: false })
    expect(apart(before, fingerprint(f.bones))).toBeGreaterThan(1e-3)
  })
})

describe('뼈가 없는 인물(판 하나로 선 어머니)', () => {
  it('허리는 못 굽히지만 숨은 쉰다', () => {
    const pivot = new THREE.Group()
    const mesh = new THREE.Mesh()
    pivot.add(mesh)
    pivot.userData.idleFlat = mesh
    pivot.userData.idleSeed = idleSeed('mother')
    updateSway(pivot, 16, { walking: false })
    const before = mesh.scale.y
    run(pivot, 1200, { walking: false })
    expect(Math.abs(mesh.scale.y - before)).toBeGreaterThan(1e-5)
    expect(Math.abs(mesh.scale.y - 1)).toBeLessThan(0.01)
    updateSway(pivot, 16, { walking: false, reducedMotion: true })
    expect(mesh.scale.y).toBe(1)
  })
})
