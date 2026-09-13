import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { measureSwingAxis } from '../../src/render/glb-person.js'

// 「발이 좌우로 걸어나간다」의 정체는 **회전축**이었다.
//
// 사람이 만든 리그라면 넓적다리뼈의 x 축을 돌리는 것이 앞뒤 흔들기다. 그런데
// image_to_3d 가 자동으로 붙여 준 뼈는 바인드 자세의 축이 제각각이라, 그 뼈에서
// x 축은 좌우였다 — 다리가 앞으로 나가는 대신 옆으로 벌어졌다.
//
// measureSwingAxis 는 「모델 기준 좌우축(X)」이 그 뼈의 지역 좌표에서 어느 쪽인지
// 재어 둔다. 그 축으로 돌리면 뼈가 어떻게 생겼든 다리는 앞뒤로 흔들린다.
// 여기서는 뼈를 일부러 비틀어 놓고 그것이 참인지 본다.

function setup(boneQuat) {
  const root = new THREE.Object3D()
  const bone = new THREE.Object3D()
  if (boneQuat) bone.quaternion.copy(boneQuat)
  root.add(bone)
  root.updateMatrixWorld(true)
  return { root, bone }
}

// 뼈를 axis 만큼 angle 돌렸을 때, 뼈에 매달린 점이 **세계에서** 어디로 가는가.
function tipAfterSwing(root, bone, axis, angle) {
  const rest = bone.quaternion.clone()
  bone.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle))
  root.updateMatrixWorld(true)
  // 뼈 아래로 1 만큼 내려간 자리(무릎쯤)
  const tip = new THREE.Vector3(0, -1, 0).applyMatrix4(bone.matrixWorld)
  bone.quaternion.copy(rest)
  root.updateMatrixWorld(true)
  return tip
}

describe('앞뒤로 흔드는 축을 뼈마다 잰다', () => {
  it('축이 틀어지지 않은 뼈에서는 모델의 X 축 그대로다', () => {
    const { root, bone } = setup(null)
    const a = measureSwingAxis(THREE, root, bone)
    expect(a.x).toBeCloseTo(1, 6)
    expect(a.y).toBeCloseTo(0, 6)
    expect(a.z).toBeCloseTo(0, 6)
  })

  it('뼈가 Y 로 90도 틀어져 있으면 축도 90도 돌아 있다', () => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
    const { root, bone } = setup(q)
    const a = measureSwingAxis(THREE, root, bone)
    // 모델의 +X 는 이 뼈의 지역 좌표에서 -Z 다
    expect(a.x).toBeCloseTo(0, 6)
    expect(Math.abs(a.z)).toBeCloseTo(1, 6)
  })

  // 이것이 핵심 검사다: 뼈가 어떻게 틀어져 있든, **잰 축으로 돌리면 발끝이 앞뒤(z)로
  // 움직이고 좌우(x)로는 거의 안 움직인다.** 예전처럼 rotation.x 를 돌리면
  // 틀어진 뼈에서 정확히 그 반대가 된다.
  for (const [name, q] of [
    ['틀어지지 않은 뼈', null],
    ['Y 로 90도', new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)],
    ['Y 로 -37도', new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.6458)],
    ['Z 로 20도 + Y 로 130도', new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.349)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 2.269))],
  ]) {
    it(`${name} — 잰 축으로 돌리면 발끝이 앞뒤로 간다`, () => {
      const { root, bone } = setup(q)
      const axis = measureSwingAxis(THREE, root, bone)
      const fwd = tipAfterSwing(root, bone, axis, 0.5)
      const back = tipAfterSwing(root, bone, axis, -0.5)
      const dz = Math.abs(fwd.z - back.z)
      const dx = Math.abs(fwd.x - back.x)
      expect(dz, '앞뒤로 벌어져야 한다').toBeGreaterThan(0.7)
      expect(dx, `좌우로는 벌어지면 안 된다 (dx=${dx.toFixed(3)}, dz=${dz.toFixed(3)})`)
        .toBeLessThan(0.02)
    })
  }

  it('옛 방식(뼈의 x 축을 그냥 돌리기)은 틀어진 뼈에서 실제로 좌우로 벌어진다', () => {
    // 이 검사가 무너뜨리려는 것이 바로 예전 코드다 — 반례가 실재함을 보인다.
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
    const { root, bone } = setup(q)
    const naive = new THREE.Vector3(1, 0, 0)      // 뼈의 지역 x 축
    const fwd = tipAfterSwing(root, bone, naive, 0.5)
    const back = tipAfterSwing(root, bone, naive, -0.5)
    expect(Math.abs(fwd.x - back.x), '좌우로 벌어진다').toBeGreaterThan(0.7)
    expect(Math.abs(fwd.z - back.z), '앞뒤로는 안 벌어진다').toBeLessThan(0.02)
  })
})
