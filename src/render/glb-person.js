// 사람 — 진짜 3D 메시로 세운다.
//
// 세 번째 판이다. ① 원기둥에 구를 얹은 골격(character.js) → ② 그려 둔 그림을 판에
// 붙인 빌보드(sprite-person.js) → ③ 여기.
//
// 빌보드를 버린 까닭은 선생님의 한 마디다: **「고종 캐릭터 크기는 입체적이지 않고
// 매우 작고」.** 빌보드는 구조적으로 납작하다 — 돌려 세워도 두께가 없고, 그림에
// 이미 구워진 조명이 장면의 빛과 어긋난다. 그리고 그림을 아무리 잘 그려도
// 「3D 게임」으로 읽히지 않는다.
//
// 지금은 인물마다 실제 메시가 있다. 뼈대(skin)가 붙어 있어 걸음 동작을 얹을 수 있고,
// 장면의 빛을 그대로 받는다.
//
// 크기: 원본 GLB 는 개당 9MB 안팎이다. tools/pack-glb.mjs 가 텍스처를 1024 webp 로,
// 지오메트리를 meshopt 로 줄여 개당 400KB 안팎으로 만든다(23배). base64 로 소스에
// 실려 「외부 요청 0건」이 그대로다 — meshopt 디코더는 three 에 동봉돼 있다.
//
// 계약은 앞의 두 판과 같다: buildPerson / disposePerson / updateSway / RANK_SPECS.
// 그래서 scene.js 는 import 줄 하나만 바뀐다.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
// 뼈대가 붙은 메시는 Object3D.clone() 으로 복제하면 안 된다 — 복제본이 **원본의
// 뼈대**를 가리켜 정점이 한 점으로 무너진다. 화면에는 아무것도 안 보이는데
// renderer.info 의 삼각형 수는 늘어 있어 오래 헤맸다. SkeletonUtils 가 뼈대까지
// 함께 복제한다.
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import { MODELS } from './models-data.js'
// 서 있는 사람의 숨·무게 옮김·고개. 값은 저쪽(DOM 도 three 도 모르는 순수 모듈)이
// 내고, 뼈를 돌리는 일만 여기서 한다 — 선생님 2026-09-26 「전부 움직이고 있어야해.」
import { idlePose, idleSeed } from '../systems/idle-pose.js'

// 인물이 세계에서 차지하는 키. 앞선 두 판이 쓰던 값을 그대로 잇는다 —
// 이 값을 바꾸면 궁궐·문·기둥과의 비례가 함께 틀어진다.
const HEIGHT = { child: 2.35, adult: 2.89 }
const FOOT_DROP = 1.8          // pivot 원점에서 발끝까지 (아래로)

export const RANK_SPECS = {
  king:      { model: 'king' },        // ageStage 에 따라 king_child / king_adult
  regent:    { model: 'regent' },
  senior:    { model: 'senior' },
  mid:       { model: 'mid' },
  messenger: { model: 'messenger' },
}

function modelKey(spec) {
  const base = spec.model ?? 'mid'
  return base === 'king' ? `king_${spec.ageStage === 'child' ? 'child' : 'adult'}` : base
}

// ── 내려받기 ────────────────────────────────────────────────────────────────
// base64 라도 브라우저가 풀고 지오메트리를 세우는 데 시간이 든다. 다 되기 전에는
// 아무것도 그리지 않는다 — 반쯤 선 사람이 번쩍이는 것보다 잠깐 없는 편이 낫다.
const loaded = new Map()       // key -> { scene, clips }
// 원본 왕복은 다음 장면에서도 쓴다. 사복용 복제본만 바꾸고, 다시 세울 때는 재사용한다.
const commonerGeometries = new WeakMap()
const commonerMaterials = new WeakMap()

export function applyCommonerAttire(THREE, root) {
  root.traverse(o => {
    if (!o.isSkinnedMesh) return
    const source = o.geometry
    let geometry = commonerGeometries.get(source)
    if (!geometry) {
      geometry = source.clone()
      const joints = source.getAttribute('skinIndex'), weights = source.getAttribute('skinWeight')
      const protectedBones = new Set(o.skeleton.bones.flatMap((b, i) =>
        /head|neck|hand/i.test(b.name) ? [i] : []))
      const mask = new Float32Array(source.getAttribute('position').count).fill(1)
      // 얼굴·손도 옷과 한 텍스처에 있다. 피부색 범위에 기대지 않고 해당 뼈가 영향을
      // 주로 움직이는 면 전체를 제외해야 붉은 입술·손의 그늘까지 본래 색을 지킨다.
      const protectedVertices = mask.map((_, i) => {
        let weight = 0, headWeight = 0
        for (let c = 0; c < 4; c++) {
          const joint = joints.getComponent(i, c)
          if (protectedBones.has(joint)) weight += weights.getComponent(i, c)
          if (/head|neck/i.test(o.skeleton.bones[joint]?.name ?? '')) headWeight += weights.getComponent(i, c)
        }
        // 자동 뼈대에는 옷자락까지 손의 작은 가중치가 섞인다. 그것까지 피부로 보면
        // 도포에 붉은 삼각형이 남으므로 머리·손이 주로 움직이는 면만 보호한다.
        return headWeight >= 0.5 || weight >= 0.9 ? 1 : 0
      })
      const indices = source.index?.array ?? Array.from(mask.keys())
      for (let i = 0; i < indices.length; i += 3) {
        const triangle = [indices[i], indices[i + 1], indices[i + 2]]
        if (triangle.some(v => protectedVertices[v])) for (const v of triangle) mask[v] = 0
      }
      geometry.setAttribute('attireMask', new THREE.BufferAttribute(mask, 1))
      commonerGeometries.set(source, geometry)
    }
    o.geometry = geometry
    const recolor = sourceMaterial => {
      if (commonerMaterials.has(sourceMaterial)) return commonerMaterials.get(sourceMaterial)
      const material = sourceMaterial.clone()
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float attireMask; varying float vAttireMask;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAttireMask = attireMask;')
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vAttireMask;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            if (vAttireMask > 0.999) {
              vec3 c = diffuseColor.rgb;
              bool red = c.r > c.g * 1.45 && c.r > c.b * 1.45;
              bool gold = c.r > c.g * 1.05 && c.g > c.b * 1.35;
              if ((red || gold) && c.r > 0.025) {
                float shade = 0.85 + 0.15 * dot(c, vec3(0.2126, 0.7152, 0.0722));
                diffuseColor.rgb = vec3(0.31, 0.53, 0.49) * shade;
              }
            }`)
      }
      // 왕복과 다른 셰이더로 캐시하고, 금색 보도 옷과 같은 명도로 눌러 문양을 흐린다.
      material.customProgramCacheKey = () => 'commoner-attire-v1'
      commonerMaterials.set(sourceMaterial, material)
      return material
    }
    o.material = Array.isArray(o.material) ? o.material.map(recolor) : recolor(o.material)
  })
}
let readyResolve = null
const readyPromise = new Promise(res => { readyResolve = res })
let loading = false

export function modelsReady(THREE) {
  if (!loading) {
    loading = true
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const jobs = Object.entries(MODELS).map(([key, uri]) =>
      loader.loadAsync(uri).then(g => {
        // Exported robes default to metallic, fully emissive surfaces. Let cloth
        // receive palace lighting instead of glowing like polished metal at night.
        g.scene.traverse(o => {
          for (const material of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
            material.metalness = 0
            material.roughness = .93
            material.emissiveIntensity = 0
            if ('specularIntensity' in material) material.specularIntensity = .2
          }
        })
        loaded.set(key, { scene: g.scene, clips: g.animations ?? [] })
      })
    )
    Promise.allSettled(jobs).then(() => readyResolve())
  }
  return readyPromise
}

// GLB 의 크기는 제각각이다 — 원본이 몇 미터인지 알 수 없다. 그래서 매번
// 경계 상자를 재서 **원하는 키에 맞춘다**. 발끝이 정확히 y=0 에 오게 내린다.
function fitToHeight(THREE, obj, wantH) {
  // 스킨 메시는 절두체 컬링에서 잘못 잘린다 — 경계 구가 뼈대 이전(bind pose)
  // 기준이라 실제로 화면 안에 있어도 밖으로 판정되어 **통째로 안 그려진다.**
  // 실제로 첫 판에서 방은 그려지는데 사람만 사라졌다(삼각형 수는 늘어 있었다).
  obj.traverse(o => { o.frustumCulled = false; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  // **행렬을 먼저 갱신해야 한다.** 갓 복제한 뼈대는 월드 행렬이 비어 있어
  // Box3.setFromObject 가 엉뚱한(때로는 거의 0인) 크기를 준다. 그러면
  // wantH/size.y 가 수백이 되어 인물이 궁궐만 해진다 — 실제로 그렇게 났다.
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj, true)
  const size = new THREE.Vector3(); box.getSize(size)
  if (!(size.y > 1e-4)) return
  let s = wantH / size.y
  // 말이 안 되는 배율은 재지 못한 것이다 — 키우다 화면을 덮느니 그냥 두는 편이 낫다.
  if (!(s > 0.02 && s < 50)) { obj.userData.fitted = { raw: [size.x, size.y, size.z], scale: 'refused' }; return }
  obj.scale.setScalar(s)
  obj.updateMatrixWorld(true)
  const box2 = new THREE.Box3().setFromObject(obj, true)
  obj.position.y -= box2.min.y                    // 발끝을 0 으로
  const c = new THREE.Vector3(); box2.getCenter(c)
  obj.position.x -= c.x                            // 좌우 가운데로
  obj.position.z -= c.z
  obj.userData.fitted = { raw: [+size.x.toFixed(2), +size.y.toFixed(2), +size.z.toFixed(2)], scale: +s.toFixed(3) }
}

/**
 * spec:
 *   model     'king' | 'regent' | 'senior' | 'mid' | 'messenger'
 *   ageStage  'child' | 'adult' (기본 'adult') — king 에서만 갈린다
 *
 * 반환 { pivot, mesh, topY } — 앞선 두 판과 같은 모양이다.
 * 모델이 아직 안 풀렸으면 빈 pivot 을 주고, 풀리는 대로 그 안에 채워 넣는다.
 */
// 발밑 그림자. 참고 영상(선생님이 보내신 것)에서 가장 크게 배운 것이다 — 인물마다
// 발밑에 옅고 둥근 그늘이 하나 있고, 그것 하나로 사람이 바닥에 **붙어** 보인다.
// 그림자가 없으면 아무리 잘 만든 인물도 바닥 위에 떠 있는 판으로 보인다.
//
// 진짜 그림자(shadowMap)를 쓰지 않는 까닭: 궁궐 전체에 그림자를 켜면 태블릿에서
// 프레임이 반으로 떨어진다. 이 게임의 카메라는 늘 위에서 내려다보므로, 발밑의
// 둥근 그늘 하나면 눈이 속는다.
//
// ⚠ 캔버스에 그린 부드러운 그라데이션을 텍스처로 쓰려다 **한 번도 화면에 안 나왔다**
//   (빨간 판으로 바꿔 보니 판 자체는 제자리에 있었다 — 텍스처만 투명하게 나왔다).
//   원인을 더 파는 대신 텍스처를 버렸다: 원판 둘을 겹쳐 옅은 것 위에 짙은 것을 얹으면
//   가장자리가 부드러워 보이고, 그리는 것은 삼각형 서른 개뿐이다.
function buildShadow(THREE, figureH) {
  const g = new THREE.Group()
  const r = figureH * 0.34
  const disc = (radius, opacity) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 18),
      new THREE.MeshBasicMaterial({ color: 0x0a0c0e, transparent: true, opacity, depthWrite: false })
    )
    m.rotation.x = -Math.PI / 2
    m.scale.z = 0.72          // 위에서 비스듬히 보므로 앞뒤로 조금 눌러 둔다
    m.userData.noOcclude = true
    return m
  }
  const outer = disc(r, 0.035)
  const inner = disc(r * 0.6, 0.07)
  inner.position.y = 0.01
  g.add(outer, inner)
  return g
}

export function buildPerson(THREE, spec = {}) {
  const key = modelKey(spec)
  const stage = spec.ageStage === 'child' ? 'child' : 'adult'
  // height 를 주면 그 키로 세운다 — 임금이 해마다 자라는 길이다(systems/king-age.js).
  // 안 주면 예전대로 두 벌의 기본값을 쓴다.
  const figureH = Number.isFinite(spec.height) ? spec.height : HEIGHT[stage]

  const pivot = new THREE.Group()
  const feet = new THREE.Group()
  feet.position.y = -FOOT_DROP
  pivot.add(feet)

  // 그림자는 **걸음의 까딱임을 따라 오르내리면 안 된다** — 발이 뜨는 순간에도 그늘은
  // 바닥에 그대로 있어야 한다. 그래서 feet 이 아니라 pivot 에 직접 매단다.
  const shadow = buildShadow(THREE, figureH)
  shadow.position.y = -FOOT_DROP + 0.12
  pivot.add(shadow)

  const state = { feet, model: null, bones: null, THREE }
  pivot.userData.person = state
  // 숨의 박자는 **이름에서** 나온다. pivot.uuid 로도 되지만 그것은 새로 고칠 때마다
  // 달라진다 — 같은 궁을 두 번 보면 같은 사람이 같은 박자로 숨쉬어야 한다.
  // 이름을 못 받은 몸(수문장처럼 목록에 없는 사람)은 부르는 쪽이 자리 번호를 준다.
  pivot.userData.idleSeed = idleSeed(spec.idleKey ?? pivot.uuid)

  const attach = () => {
    const src = loaded.get(key)
    if (!src || state.model) return
    const obj = cloneSkinned(src.scene)
    if (spec.model === 'king' && spec.attire === 'commoner') applyCommonerAttire(THREE, obj)
    fitToHeight(THREE, obj, figureH)
    feet.add(obj)
    state.model = obj
    state.bones = findBones(obj)
    // 뼈대의 처음 자세와, 그 뼈를 앞뒤로 흔드는 축을 재 둔다.
    // 축을 재려면 월드 행렬이 서 있어야 한다 — fitToHeight 가 이미 세워 두었다.
    obj.updateMatrixWorld(true)
    for (const b of Object.values(state.bones)) {
      if (!b) continue
      b.userData.restQuat = b.quaternion.clone()
      b.userData.swingAxis = measureSwingAxis(THREE, obj, b)
      // 앞뒤 축 하나로는 「무게를 옮긴다」와 「고개를 돌린다」를 그릴 수 없다.
      // 옆으로 기우는 것은 **앞뒤 축(Z)** 을 중심으로 도는 일이고, 고개를 돌리는 것은
      // **위 축(Y)** 을 중심으로 도는 일이다. 붙일 때 한 번 재 두면 프레임마다
      // 쓰기만 하면 된다(측정은 새 객체를 만든다 — 프레임에서는 절대 부르지 않는다).
      b.userData.leanAxis = measureLocalAxis(THREE, obj, b, 0, 0, 1)
      b.userData.turnAxis = measureLocalAxis(THREE, obj, b, 0, 1, 0)
    }
  }
  if (loaded.has(key)) attach()
  else readyPromise.then(attach)

  return { pivot, mesh: feet, topY: -FOOT_DROP + figureH }
}

// ⚠ **아무것도 버리지 않는다.**
//
// SkeletonUtils.clone() 은 그래프만 복제하고 **지오메트리와 재질은 원본과 함께 쓴다.**
// 그래서 여기서 geometry.dispose() 를 부르면 버려지는 것은 이 복제본의 것이 아니라
// **모두가 쓰는 원본**이다. 다음에 같은 인물을 세우면 이미 버려진 버퍼를 가리키고,
// 그 버퍼로 그리려는 순간 WebGL 이 넘어간다 — 화면이 통째로 검게 죽는다.
//
// 실제로 그렇게 났다. 알현이 끝날 때마다 setNpcs() 로 사람들을 다시 세우게 만든
// 날, 게임 화면이 검은 판이 되었다(궁궐도 하늘도 안 보였다). 미리보기는 한두 프레임만
// 그려서 멀쩡했고, 시험은 3D 를 안 보므로 초록불이었다.
//
// 재질·텍스처를 안 버리는 규칙은 예전부터 여기 적혀 있었다. 지오메트리도 같은 이유로
// 안 버려야 한다는 것을 그때는 몰랐다. 사람을 화면에서 내리는 것은 부모에서 떼는
// 것으로 충분하다 — 무거운 것은 모델 여섯 벌뿐이고 그것은 계속 쓴다.
export function disposePerson(pivot) {
  pivot.userData.disposeFigure?.()
  pivot.parent?.remove(pivot)
}

// pivot 이 실제로 향하는 방향 — 조상들이 Y 로 돌린 각의 합이다.
function ancestorYaw(obj) {
  let y = 0
  for (let p = obj.parent; p; p = p.parent) y += p.rotation.y
  return y
}

// image_to_3d 가 붙여 주는 뼈대는 이름이 표준이다(LeftUpLeg · RightLeg · Spine · Head …).
// 그래서 생성기가 준 클립(0.30초짜리 정지 자세)에 기대지 않고 **걸음을 여기서 만든다.**
// 크레딧을 더 쓰지 않고, 걸음의 빠르기·보폭을 우리가 정할 수 있다.
const BONE_NAMES = {
  legL: 'LeftUpLeg', legR: 'RightUpLeg', kneeL: 'LeftLeg', kneeR: 'RightLeg',
  footL: 'LeftFoot', footR: 'RightFoot',
  armL: 'LeftArm', armR: 'RightArm', elbowL: 'LeftForeArm', elbowR: 'RightForeArm',
  spine: 'Spine', head: 'Head',
}

function findBones(obj) {
  const byName = new Map()
  obj.traverse(o => { if (o.name) byName.set(o.name, o) })
  const out = {}
  for (const [k, n] of Object.entries(BONE_NAMES)) out[k] = byName.get(n) ?? null
  return out
}

// 한 걸음의 각도. 팔은 다리와 **반대로** 흔들린다 — 같은 쪽이 같이 나가면
// 사람이 아니라 인형으로 보인다.
//
// ⚠⚠ **축을 뼈마다 따로 잰다.** 이것이 「발이 좌우로 걸어나간다」의 진짜 원인이었다.
//
// 처음에는 `bone.rotation.x` 를 돌렸다. 사람이 만든 리그라면 그것이 앞뒤 흔들기지만,
// image_to_3d 가 자동으로 붙여 준 뼈는 **바인드 자세의 축이 제각각**이다. 그 뼈에서
// x 축은 앞뒤가 아니라 좌우였고, 그래서 다리가 앞으로 나가는 대신 옆으로 벌어졌다.
// 한 번은 흔들폭을 줄여 덮어 보았지만(1.0 → 0.28) 그것은 처방이 아니라 은폐였다 —
// 옆으로 걷는 걸음이 작게 옆으로 걷는 걸음이 되었을 뿐이다.
//
// 이제 붙일 때 **그 뼈의 지역 좌표에서 「모델의 좌우축」이 어느 쪽인지**를 재 둔다
// (measureSwingAxis). 그 축으로 돌리면 리그가 어떻게 생겼든 다리는 앞뒤로 흔들린다.
const LEG_SWING = 0.62
const KNEE_BEND = 0.9
const ARM_SWING = 0.5

// 뼈 하나의 「앞뒤로 흔드는 축」 — 모델 기준 좌우축(X)을 그 뼈의 지역 좌표로 옮긴 것.
// 사람이 다리를 앞으로 내는 것은 골반의 좌우축을 중심으로 도는 일이다.
export function measureSwingAxis(THREE, root, bone) {
  return measureLocalAxis(THREE, root, bone, 1, 0, 0)
}

// 모델 기준의 축 하나를 그 뼈의 지역 좌표로 옮긴다. 앞뒤 흔들기(X)·옆으로 기움(Z)·
// 고개 돌리기(Y)가 모두 같은 셈이라 한 함수로 둔다.
export function measureLocalAxis(THREE, root, bone, x, y, z) {
  const rootQ = new THREE.Quaternion()
  const boneQ = new THREE.Quaternion()
  root.getWorldQuaternion(rootQ)
  bone.getWorldQuaternion(boneQ)
  const rel = boneQ.invert().multiply(rootQ)          // 모델 좌표 → 뼈 지역 좌표
  return new THREE.Vector3(x, y, z).applyQuaternion(rel).normalize()
}

// 자리 하나를 돌려 쓴다 — 매 프레임 새로 만들지 않는다.
// ⚠ **반드시 THREE.Quaternion 이어야 한다.** 평범한 객체 { x, y, z, w } 를 넘기면
// three 의 multiplyQuaternions 가 읽는 것은 `_x`(밑줄)이라 전부 undefined 가 되고,
// 뼈의 회전이 NaN 이 되어 스킨 메시가 **한 점으로 무너진다.** 실제로 그렇게 났다 —
// 화면에서 임금이 손톱만 한 얼룩이 되어 어좌 앞에 붙어 있었다. 시험은 3D 를 안 보고,
// 미리보기는 걷지 않는 자세만 찍어서 둘 다 초록불이었다.
let _q = null
// 서 있는 자세를 담아 두는 그릇 하나. 프레임마다 새로 만들지 않는다.
const _idle = {}

// 걸음과 숨을 **한 번에** 얹는다. 두 함수로 나누어 차례로 부르면 뒤에 부른 쪽이
// 앞의 것을 덮는다(applyBow 가 허리를 덮는 것과 같은 일이 몸 전체에서 일어난다).
// 그래서 뼈마다 각을 합쳐 한 번만 쓴다.
//   idleW — 서 있는 자세의 몫(0~1). 걸음이 커지면 0 으로 줄어든다: 걷는 사람이
//   무게를 옮기고 고개를 돌리면 다리가 둘 다 앞으로 나간 꼴이 된다.
function poseBody(THREE, bones, phase, amount, idle, idleW) {
  if (!_q) _q = new THREE.Quaternion()
  const swing = Math.sin(phase) * amount
  const lift = Math.max(0, Math.sin(phase)) * amount
  const w = idle ? idleW : 0
  // extra — 앞뒤 축 말고 하나 더 돌릴 것이 있으면(옆으로 기움·고개 돌리기) 그 축의
  // 이름과 각을 준다. 두 번째 회전은 필요할 때만 곱한다.
  const set = (b, angle, extraKey, extraAngle) => {
    const rest = b?.userData.restQuat
    const axis = b?.userData.swingAxis
    if (!rest || !axis) return
    _q.setFromAxisAngle(axis, angle)
    b.quaternion.copy(rest).multiply(_q)
    if (!extraKey || !(Math.abs(extraAngle) > 1e-5)) return
    const axis2 = b.userData[extraKey]
    if (!axis2) return
    _q.setFromAxisAngle(axis2, extraAngle)
    b.quaternion.multiply(_q)
  }
  set(bones.legL, swing * LEG_SWING + (idle ? idle.legL * w : 0))
  set(bones.legR, -swing * LEG_SWING + (idle ? idle.legR * w : 0))
  set(bones.kneeL, -Math.max(0, -swing) * KNEE_BEND)   // 뒤로 간 다리가 무릎을 접는다
  set(bones.kneeR, -Math.max(0, swing) * KNEE_BEND)
  set(bones.armL, -swing * ARM_SWING + (idle ? idle.armL * w : 0))
  set(bones.armR, swing * ARM_SWING + (idle ? idle.armR * w : 0))
  set(bones.elbowL, -Math.abs(swing) * 0.4)
  set(bones.elbowR, -Math.abs(swing) * 0.4)
  // 걸을 때 상체가 아주 조금 앞으로 + 서 있을 때의 숨. 옆으로 기우는 것은 무게를
  // 옮기는 그 몫이다(leanAxis).
  set(bones.spine, Math.abs(swing) * 0.05 + (idle ? idle.spine * w : 0),
    'leanAxis', idle ? idle.lean * w : 0)
  set(bones.head, -lift * 0.05 + (idle ? idle.headNod * w : 0),
    'turnAxis', idle ? idle.headYaw * w : 0)
}

// 한 걸음마다 몸이 위아래로 까딱인다. 한 다리로 서는 순간 몸이 조금 올라가는 그것이다.
// 두 걸음에 한 번이 아니라 **한 걸음에 한 번**이므로 위상을 두 배로 돈다.
const BOB = 0.055

let worldPos = null

// 걸음이 이만큼 커지면 서 있는 자세는 완전히 물러난다. WALK_AMT(0.42)에서 0 이 되게
// 맞춘 수다 — 걷기 시작하는 그 순간에 숨이 갑자기 꺼지지 않고 함께 잦아든다.
const IDLE_FADE = 1 / 0.42

// 판 하나로 선 인물(render/mother-person.js)의 숨. 뼈가 없고, pivot 의 회전은
// 빌보드가 매 프레임 덮어쓴다 — 건드릴 수 있는 것은 판의 세로 배율 하나뿐이다.
// 그래도 「아무 일도 일어나지 않는 판」보다는 낫다.
function swayFlat(pivot, dtMs, reducedMotion) {
  const mesh = pivot.userData?.idleFlat
  if (!mesh) return
  if (reducedMotion) { mesh.scale.y = 1; return }
  const t = (pivot.userData.idleClock ?? 0) + dtMs
  pivot.userData.idleClock = t
  idlePose(t, pivot.userData.idleSeed, _idle)
  mesh.scale.y = _idle.scaleY
}

/**
 * 매 프레임 부른다.
 *   walking / running  걸음 동작을 돌릴지, 얼마나 빠르게
 *   reducedMotion      정지 선호 — 서성임도 걸음도 숨도 없다. 사람은 그냥 서 있는다.
 *   camera             빌보드 시절의 인자. 3D 메시는 카메라를 안 본다 — 무시한다.
 */
export function updateSway(pivot, dtMs, { walking = false, running = false, reducedMotion = false } = {}) {
  const s = pivot.userData?.person
  if (!s || !s.model) return swayFlat(pivot, dtMs, reducedMotion)

  // 정지 선호(prefers-reduced-motion)에서는 쉬는 자세로 되돌리고 나간다. 굽힘
  // (scene.js applyBow)은 이 뒤에 얹히므로 읍은 그대로 남는다 — 그것은 움직임이
  // 아니라 자세다.
  if (reducedMotion) {
    pivot.userData.swayAmt = 0
    if (s.bones) poseBody(s.THREE, s.bones, 0, 0, null, 0)
    s.feet.position.y = -FOOT_DROP
    s.model.scale.y = s.model.scale.x
    return
  }

  // 걸음의 위상. 시간으로 돈다 — 프레임 수를 세지 않는다.
  const speed = walking ? (running ? 0.0135 : 0.0085) : 0.0022
  const phase = ((pivot.userData.swayPhase ?? 0) + dtMs * speed) % (Math.PI * 2)
  pivot.userData.swayPhase = phase

  // 걷다 서면 각도가 뚝 끊기지 않게, 흔드는 폭을 부드럽게 오간다.
  const want = walking ? (running ? 0.62 : 0.42) : 0.0
  const cur = pivot.userData.swayAmt ?? 0
  const amt = cur + (want - cur) * Math.min(1, dtMs / 120)
  pivot.userData.swayAmt = amt

  // 서 있는 자세의 시계는 걸음의 위상과 따로 간다 — 숨은 0.24Hz 고 걸음은 그보다
  // 다섯 배 빠르다. 한 시계로 둘을 돌리면 어느 한쪽이 거짓이 된다.
  const clock = (pivot.userData.idleClock ?? 0) + dtMs
  pivot.userData.idleClock = clock
  const idleW = Math.max(0, 1 - amt * IDLE_FADE)
  const idle = idleW > 0 ? idlePose(clock, pivot.userData.idleSeed, _idle) : null

  if (s.bones) poseBody(s.THREE, s.bones, phase, amt, idle, idleW)

  // 걸음의 까딱임. 다리가 안 보이는 인물에게 「걷고 있다」를 알리는 것은 이쪽이다.
  s.feet.position.y = -FOOT_DROP + Math.abs(Math.sin(phase)) * BOB * amt

  // 가슴이 부푸는 것 — 발은 바닥에 붙어 있어야 하므로 세로로만 아주 작게. 걸을 때는
  // 걸음의 박자를 타고(두 걸음에 한 번), 서 있을 때는 숨의 박자를 탄다.
  const breathe = amt > 0.02
    ? 1 + Math.sin(phase * 2) * 0.006
    : (idle ? idle.scaleY : 1)
  s.model.scale.y = s.model.scale.x * breathe
}
