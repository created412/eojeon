import { it, expect } from 'vitest'
import * as THREE from 'three'
import * as people from '../../src/render/glb-person.js'

function figure() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(27), 3))
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([
    0,0,0,0, 0,0,0,0, 0,0,0,0,
    1,0,0,0, 0,0,0,0, 0,0,0,0,
    2,0,0,0, 0,0,0,0, 0,0,0,0,
  ], 4))
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(Array.from({length: 9}, () => [1,0,0,0]).flat(), 4))
  geometry.setIndex([0,1,2, 3,4,5, 6,7,8])
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial())
  mesh.skeleton = new THREE.Skeleton(['Spine', 'Head', 'LeftHand'].map(name => Object.assign(new THREE.Bone(), {name})))
  return mesh
}

it('얼굴·손과 닿은 삼각형 전체를 색 치환에서 제외한다', () => {
  const mesh = figure()
  people.applyCommonerAttire?.(THREE, mesh)
  expect(Array.from(mesh.geometry.getAttribute('attireMask')?.array ?? [])).toEqual([1,1,1,0,0,0,0,0,0])
})

it('왕의 원본 재질과 지오메트리를 보존해 다시 왕복을 입을 수 있다', () => {
  const mesh = figure(), original = mesh.clone()
  people.applyCommonerAttire?.(THREE, mesh)
  expect(mesh.material).not.toBe(original.material)
  expect(mesh.geometry).not.toBe(original.geometry)
  expect(original.geometry.getAttribute('attireMask')).toBeUndefined()
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }
  mesh.material.onBeforeCompile(shader)
  expect(shader.vertexShader).toContain('vAttireMask = attireMask')
  expect(shader.fragmentShader).toContain('vAttireMask > 0.999')
})

it('손 뼈의 미세한 영향만 받는 옷자락은 붉은 조각으로 남기지 않는다', () => {
  const mesh = figure()
  mesh.geometry.getAttribute('skinIndex').setXYZW(0, 0, 2, 0, 0)
  mesh.geometry.getAttribute('skinWeight').setXYZW(0, .99, .01, 0, 0)
  people.applyCommonerAttire(THREE, mesh)
  expect(mesh.geometry.getAttribute('attireMask').getX(0)).toBe(1)
})
