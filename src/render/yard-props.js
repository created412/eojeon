// 마당에 놓이는 물건 — 가마·척화비·해치·드무·굴뚝·해시계·우물·장독대.
//
// 선생님(2026-09-16): 「방 이외에도 추가할거 없나 찾아서 힉스필드로 만들어 넣어.」
// 방 안은 세간으로 찼는데 마당은 여전히 나무와 회랑뿐이었고, 무엇보다 **대본이 말하는
// 물건이 화면에 없었다**: 1막에서 임금은 「가마에 오른다」는데 가마가 없었고, 2막에서
// 학생이 직접 비문을 쓴 척화비는 어디에도 서지 않았다.
//
// 만든 길(assets/props/README.md): Higgsfield `gpt_image_2_5` 로 물건 한 개짜리 기준
// 그림을 그리고, `image_to_3d`(Meshy) 로 GLB 를 뽑고, tools/pack-props.mjs 가 meshopt·webp
// 로 줄여 base64 로 싣는다 — 외부 요청 0건은 그대로다.
//
// 놓는 자리는 data/palaces.js 의 yard.props 다. fromYear 를 적으면 그 해부터 보인다
// (척화비는 1871년에 세워졌다 — 그전 장면에 서 있으면 안 된다).
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { PROP_MODELS } from './props-data.js'

// 물건마다 세계에서의 키(m)와 바닥에서 띄울 높이. 생성기가 낸 GLB 는 크기가 제각각이라
// 여기 적은 키에 맞춘다 — 임금 키가 2.89 다.
export const PROP_SPECS = {
  gama:       { height: 2.4, name: '가마' },
  cheokhwabi: { height: 2.3, name: '척화비' },
  haetae:     { height: 2.2, name: '해치' },
  deumu:      { height: 1.2, name: '드무' },
  chimney:    { height: 4.2, name: '굴뚝' },
  sundial:    { height: 1.4, name: '앙부일구' },
  well:       { height: 2.0, name: '우물' },
  jangdok:    { height: 1.4, name: '장독대' },
}

const FLOOR = 0.0          // 마당은 기단이 없다 — 땅 위에 그대로 놓인다
const loaded = new Map()   // id -> THREE.Object3D (원본)
let loading = null

// 모든 마당 물건을 한 번만 내려받는다. 약속은 다 풀리면 이행된다.
export function propsReady(THREE) {
  if (!loading) {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loading = Promise.all(Object.entries(PROP_MODELS).map(([id, uri]) =>
      loader.loadAsync(uri).then(g => {
        // 생성기가 낸 재질은 금속처럼 번들거린다. 마당의 돌·나무·놋으로 낮춘다.
        g.scene.traverse(o => {
          for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
            m.metalness = 0
            m.roughness = Math.max(m.roughness ?? 1, 0.85)
            if (m.emissive) m.emissive.setHex(0x000000)
          }
        })
        loaded.set(id, g.scene)
      }).catch(() => { /* 한 개가 안 풀려도 나머지는 선다 */ })))
  }
  return loading
}

// 모델을 정해진 키로 맞추고 발밑을 원점에 오게 한다.
function fitToHeight(THREE, obj, height) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3()
  box.getSize(size)
  if (!(size.y > 1e-6)) return
  const s = height / size.y
  obj.scale.setScalar(s)
  obj.updateMatrixWorld(true)
  const after = new THREE.Box3().setFromObject(obj)
  obj.position.x -= (after.min.x + after.max.x) / 2
  obj.position.z -= (after.min.z + after.max.z) / 2
  obj.position.y -= after.min.y - FLOOR
}

/**
 * 마당 물건 하나. 모델이 아직 안 풀렸으면 풀린 뒤에 채워 넣는다.
 *   p: { id, x, z, yaw, scale?, fromYear? }
 * 반환 그룹의 userData.fromYear 를 씬이 보고 해에 따라 보였다 감췄다 한다.
 */
export function buildYardProp(THREE, p) {
  const spec = PROP_SPECS[p.id]
  if (!spec) return null
  const pivot = new THREE.Group()
  pivot.position.set(p.x, 0, p.z)
  pivot.rotation.y = p.yaw ?? 0
  pivot.userData.fromYear = p.fromYear ?? null
  pivot.userData.propId = p.id
  // 마당 물건은 가림 판정에서 빼지 않는다 — 굴뚝처럼 큰 것은 임금을 가릴 수 있다.
  const attach = () => {
    const src = loaded.get(p.id)
    if (!src || pivot.children.length) return
    const obj = src.clone(true)
    fitToHeight(THREE, obj, spec.height * (p.scale ?? 1))
    pivot.add(obj)
  }
  if (loaded.has(p.id)) attach()
  else propsReady(THREE).then(attach)
  return pivot
}

// 궁 하나의 마당 물건 전부.
export function buildYardProps(THREE, def) {
  const g = new THREE.Group()
  for (const p of def.yard?.props ?? []) {
    const obj = buildYardProp(THREE, p)
    if (obj) g.add(obj)
  }
  return g
}

// 그 해에 이미 있는 것만 보인다. 척화비는 1871년에 세워졌다.
export function applyYear(group, year) {
  if (!group) return
  for (const child of group.children) {
    const from = child.userData?.fromYear
    child.visible = from == null || year == null || year >= from
  }
}
