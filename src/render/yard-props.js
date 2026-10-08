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
// meshopt 디코더(WASM)는 2026-10-08 에 걷었다 — 도름스 CSP 마크(tools/pack-props.mjs 머리말). GLB 는 quantize 만 쓴다.
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
  // 내려받는 모델이 없다 — 기둥 둘과 지붕 하나로 그 자리에서 짓는다(buildBackGate).
  backgate:   { height: 3.0, name: '후원 뒷문', procedural: true },
}

const FLOOR = 0.0          // 마당은 기단이 없다 — 땅 위에 그대로 놓인다
const loaded = new Map()   // id -> THREE.Object3D (원본)
let loading = null

// 모든 마당 물건을 한 번만 내려받는다. 약속은 다 풀리면 이행된다.
export function propsReady(THREE) {
  if (!loading) {
    const loader = new GLTFLoader()
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
// 후원 뒷문 — 담에 난 작은 일각문. 눈에 띄지 않아야 한다: 붉은 기둥도 단청도 없이
// 나무 빛 그대로이고, 문짝 하나가 반쯤 열려 있다. 찾는 학생의 눈에만 걸린다.
export function buildBackGate(THREE, p) {
  const pivot = new THREE.Group()
  pivot.position.set(p.x, 0, p.z)
  pivot.rotation.y = p.yaw ?? 0
  pivot.userData.fromYear = p.fromYear ?? null
  pivot.userData.propId = p.id
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.95, metalness: 0 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x15100b, roughness: 1, metalness: 0 })
  const tile = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.9, metalness: 0 })
  const box = (w, h, d, m, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
    mesh.position.set(x, y, z)
    pivot.add(mesh)
    return mesh
  }
  box(0.28, 2.5, 0.28, wood, -0.95, 1.25, 0)          // 왼 기둥
  box(0.28, 2.5, 0.28, wood, 0.95, 1.25, 0)           // 오른 기둥
  box(2.3, 0.22, 0.3, wood, 0, 2.55, 0)               // 문틀 위
  box(1.62, 2.3, 0.06, dark, 0, 1.15, -0.12)          // 문 너머의 어둠
  const leaf = box(0.8, 2.25, 0.07, wood, -0.52, 1.13, 0.22)   // 반쯤 열린 문짝
  leaf.rotation.y = 0.9
  const roof = box(2.9, 0.16, 1.2, tile, 0, 2.86, 0)  // 낮은 지붕
  roof.rotation.x = 0.06
  box(2.6, 0.12, 0.5, tile, 0, 3.0, 0)                // 용마루
  return pivot
}

export function buildYardProp(THREE, p) {
  const spec = PROP_SPECS[p.id]
  if (!spec) return null
  if (spec.procedural) return buildBackGate(THREE, p)
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

// ── 사람 꼴의 모델(난병 · 청군) ───────────────────────────────────────────
// 같은 묶음(props-data.js)에 실려 있지만 마당에 놓는 물건이 아니다 — render/crisis.js 가 달아나는
// 판에서 세운다. 걷는 뼈대가 없는 한 덩어리 메시라, 선 자리에서 들썩이게만 한다.
// 2026-10-06 선생님: 「임오군란 군병들의 디자인이 거지같아. 힉스필드로 군병들을 제대로 만들어.」
export const FIGURE_IDS = ['rioter_spear', 'rioter_torch', 'rioter_town', 'qing_soldier']
export const FIGURE_HEIGHT = 2.8   // 임금 키가 2.89 다

/** 사람 하나. 모델이 아직 안 풀렸으면 풀린 뒤에 채워 넣는다(그때까지 빈 그룹이다). */
export function buildFigure(THREE, id, height = FIGURE_HEIGHT) {
  const pivot = new THREE.Group()
  pivot.userData.figureId = id
  const attach = () => {
    const src = loaded.get(id)
    // ⚠ children 의 수로 재지 않는다 — 부른 쪽이 횃불 빛 같은 것을 먼저 달아 둘 수 있다
    //   (그렇게 재다가 횃불 든 군인만 영영 서지 않았다).
    if (!src || pivot.userData.ready) return
    const obj = src.clone(true)
    fitToHeight(THREE, obj, height)
    pivot.add(obj)
    pivot.userData.ready = true
  }
  if (loaded.has(id)) attach()
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
