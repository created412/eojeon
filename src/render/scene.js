import * as THREE from 'three'
import { safePosition } from '../data/hall-geometry.js'
import { makeTextures, buildPalace } from './palace.js'
import { createFire } from './fire.js'
import { buildPerson, disposePerson, updateSway, RANK_SPECS, modelsReady } from './glb-person.js'
import { buildMother } from './mother-person.js'
import { updatePalaceOcclusion } from './occlusion.js'
import { turnToward } from './facing.js'
import { buildProp } from './props.js'
import { interpolateCameraShot } from './cinematic.js'
import { createAtmosphere } from './atmosphere.js'
import { interactionCue } from '../systems/interaction-cues.js'
import { createCrisis } from './crisis.js'

// 카메라는 임금 뒤 이만큼에서 이 높이로 내려다본다. **시험도 이 값을 가져다 쓴다** —
// 예전에는 tests/render/occlusion.test.js 가 34·30 을 따로 적어 두었고, 여기서
// 14·11 로 당긴 뒤에도 시험은 옛 값으로 가림을 재고 있었다(초록불인 채로).
// 카메라 — 임금 뒤 12m, 높이 6.5m 에서 가슴께를 본다.
//
// 예전에는 높이 11 에서 발밑(y=0)을 내려다봤다. 그러면 시야가 「수평선 아래 19도」에서
// 잘려, 앞에 선 전각의 **처마 밑동만** 화면에 들어왔다 — 궁궐에 서 있는데 화면에는
// 갈색 판 하나가 걸쳐 있을 뿐이었다("건물들은 왜 있는지 모르겠고"). 카메라를 낮추고
// 가슴께(1.6)를 보게 하니 시야의 윗변이 거의 수평까지 올라와, 마당에서 정전이 보이고
// 정전 안의 어좌와 일월오봉도까지 보인다. 인물도 화면에서 더 커졌다.
//
// 이 두 수는 render/occlusion.js·ui/minimap.js 와 함께 맞물려 있다 — 바꾸면 눈으로 확인할 것.
export const CAM_DIST = 12
export const CAM_HEIGHT = 6.3
// 발밑이 아니라 가슴께를 본다. 이 한 줄이 화면 윗변을 수평까지 끌어올린다.
export const CAM_LOOK_Y = 2.6

// audio — 소리를 낼 곳은 발소리 하나뿐이다(updateKingMotion). 없어도 그냥 돈다:
// 씬은 소리를 몰라도 그리는 일을 다 해야 한다(시험은 audio 없이 이 함수를 부른다).
// running — 「지금 Shift 를 누르고 있는가」를 묻는 함수. input.js 의 running() 이
// 그 답을 갖고 있는데 씬까지 닿아 있지 않았다. 씬이 속도를 재서 짐작하게 두지 않는다:
// 이동은 고정 스텝(16.7ms)으로 누적되어 한 프레임에 0 걸음일 때도 두 걸음일 때도 있어,
// 속도로 짐작하면 달리기가 프레임마다 켜졌다 꺼졌다 한다. 없으면 늘 걷는 것으로 본다.
// 행렬에서 곁을 걷는 사람이 한 프레임에 다가가는 최대 거리(m). 60fps 에서 초당 약 11m — 임금 걸음보다 넉넉히 빠르다.
export const FOLLOW_STEP = 0.18

export function createScene(canvas, { audio = null, running = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.32
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1d21)
  scene.fog = new THREE.Fog(0x1a1d21, 70, 150)
  const atmosphere = createAtmosphere(scene)
  const crisis = createCrisis(scene)
  let crisisStage = null

  // 시야각 48도. 38도이던 것을 넓혔다 — 선생님: "지금 게임에는 건물에 뚜껑(지붕)이
  // 없어." 실은 지붕은 지어져 있었는데 **시야에 안 들어왔다.** 카메라를 낮춰 궁궐이
  // 보이게 한 대신, 위쪽이 수평선 아래에서 잘려 처마 밑동만 화면에 들어왔던 것이다.
  // 48도면 시야의 윗변이 수평선 위로 올라가, 앞에 선 전각의 지붕이 보인다.
  // (인물은 그만큼 작아지지만, 카메라를 15m 로 당겨 둔 덕에 여전히 얼굴이 읽힌다.)
  const camera = new THREE.PerspectiveCamera(52, 1, 0.35, 400)

  const ambient = new THREE.AmbientLight(0xffffff, 0.55)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight(0xffe9c4, 0.9)
  sun.position.set(40, 70, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 55, bottom: -55, near: 1, far: 180 })
  sun.shadow.normalBias = .08
  sun.shadow.bias = -.0003
  scene.add(sun)
  // 하늘빛 — 위에서 하늘색이, 아래에서 땅색이 스민다. 이것 하나로 그늘진 면이
  // 검게 죽지 않고 그 시각의 색을 머금는다. 방향광만 있으면 처마 밑이 새까매진다.
  const sky = new THREE.HemisphereLight(0xffffff, 0x6b6252, 0.0)
  scene.add(sky)

  // ── 때 (時) ────────────────────────────────────────────────────────────
  // 다섯 막이 스무 해에 걸쳐 있는데 **전부 같은 갈색 대낮**이었다. 1863년 즉위,
  // 자경전이 타는 밤, 임오군란의 새벽이 화면에서 구분되지 않았다.
  // 빛과 색은 이 게임에서 가장 싸고 가장 크게 달라지는 자리다.
  //
  // sky   하늘색 · ground 땅색 · sun 해의 색과 세기 · amb 전체 밝기
  // bg    배경(=하늘) 색 · fog 안개 색과 시작/끝 거리
  const MOODS = {
    // 1863년 음 12월. 열두 살이 즉위한 겨울 아침 — 해가 낮고 푸르다.
    dawnwinter: { sky: 0xb3c4d5, ground: 0x57534a, sun: 0xffd2a2, sunI: 1.75, amb: 0.32, skyI: .82,
                  bg: 0x8e9da6, fog: [0x8e9da6, 50, 155], sunPos: [-30, 24, 45] },
    // 여느 낮. 2막·3막의 기본.
    day:        { sky: 0xc1ced7, ground: 0x706252, sun: 0xffe5be, sunI: 1.85, amb: 0.35, skyI: .78,
                  bg: 0x99aab3, fog: [0x99aab3, 65, 175], sunPos: [-40, 42, 30] },
    // 자경전이 타는 밤. 불은 fire.js 가 따로 그린다 — 여기서는 그 불이 놓일
    // 어둠을 만든다. 아래에서 올라오는 주황이 처마를 물들인다.
    fire:       { sky: 0x3a1c12, ground: 0xd2571c, sun: 0xff8a34, sunI: 0.70, amb: 0.16, skyI: 1.15,
                  bg: 0x140805, fog: [0x2c1108, 18, 70], sunPos: [10, 14, 25] },
    // 1882년 6월 새벽. 난군이 담을 넘던 그 시각.
    daybreak:   { sky: 0x7d5a6b, ground: 0x6b4a34, sun: 0xff9a52, sunI: 0.72, amb: 0.22, skyI: 0.66,
                  bg: 0x2a1c22, fog: [0x3a2226, 20, 80], sunPos: [-42, 12, 34] },
    // 1884년 10월 밤. 갑신정변은 사흘 밤낮이었다.
    night:      { sky: 0x2f4472, ground: 0x1d2028, sun: 0xa9bcea, sunI: 0.30, amb: 0.13, skyI: 0.62,
                  bg: 0x090c14, fog: [0x0c1220, 16, 66], sunPos: [-25, 55, -15] },
  }
  let moodName = null

  // 막·장면에 맞는 때로 바꾼다. 같은 것을 다시 주면 아무 일도 안 한다.
  function setMood(name) {
    const m = MOODS[name]
    if (!m || name === moodName) return
    moodName = name
    ambient.intensity = m.amb
    sun.color.setHex(m.sun)
    sun.intensity = m.sunI
    sun.position.set(...m.sunPos)
    sky.color.setHex(m.sky)
    sky.groundColor.setHex(m.ground)
    sky.intensity = m.skyI
    scene.background.setHex(m.bg)
    scene.fog.color.setHex(m.fog[0])
    scene.fog.near = m.fog[1]
    scene.fog.far = m.fog[2]
    atmosphere.setMood(name)
  }
  setMood('day')

  let cinematic = { mood: 'day', camera: { mode: 'follow' } }
  let reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  let cameraShot = { x: 0, y: CAM_HEIGHT, z: CAM_DIST, lookY: CAM_LOOK_Y }
  let orbit = 0, zoom = 1, dragging = false, lastPointerX = 0, snapCamera = true
  let openingView = false
  function setOpeningView(enabled) { openingView = enabled; snapCamera = true }
  function rotateView(direction) { orbit += Math.sign(direction)*Math.PI/4 }
  function resetView() { orbit=0;zoom=1 }
  // 마우스는 오른쪽 끌기, 손가락은 한 손가락 끌기로 시점을 돌린다(2026-09-14 태블릿). 손가락은 조금 움직인 뒤에야
  // 돌리기 시작한다 — 탭(걷기)과 섞이지 않게(input/input.js isTap 과 같은 14px).
  let touchStart = null
  const orbitDown = e => {
    if (e.button === 2) { dragging = true; lastPointerX = e.clientX; canvas.setPointerCapture(e.pointerId); return }
    if (e.pointerType === 'touch' && e.isPrimary) touchStart = { x: e.clientX, id: e.pointerId }
  }
  const orbitMove = e => {
    if (touchStart && e.pointerId === touchStart.id && !dragging && Math.abs(e.clientX - touchStart.x) > 14) {
      dragging = true; lastPointerX = e.clientX; try { canvas.setPointerCapture(e.pointerId) } catch { /* 이미 뗐다 */ }
    }
    if (dragging) { orbit -= (e.clientX - lastPointerX) * .007; lastPointerX = e.clientX }
  }
  const orbitUp = () => { dragging = false; touchStart = null }
  const noMenu = e => e.preventDefault()
  const onWheel = e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom + e.deltaY * .0006, .65, 1.5) }
  canvas.addEventListener('pointerdown', orbitDown)
  canvas.addEventListener('pointermove', orbitMove)
  canvas.addEventListener('pointerup', orbitUp)
  canvas.addEventListener('pointercancel', orbitUp)
  canvas.addEventListener('contextmenu', noMenu)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  const motionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
  const motionChange = e => setReducedMotion(e.matches)
  motionQuery?.addEventListener('change', motionChange)
  function worldAxis({ x, z }) {
    return { x: x * Math.cos(orbit) + z * Math.sin(orbit), z: -x * Math.sin(orbit) + z * Math.cos(orbit) }
  }

  function setCinematic(next = {}) {
    cinematic = { ...cinematic, ...next, camera: { ...cinematic.camera, ...next.camera } }
    setMood(cinematic.mood)
  }

  function setReducedMotion(enabled) {
    reducedMotion = enabled === true
  }

  // 임금 — 예전에는 CapsuleGeometry 하나였다. 지금은 render/character.js 가
  // 원기둥·구를 쌓고 캔버스에 그린 흉배를 입혀 만든다. player(바깥 그룹)의
  // position 은 movement.js 가 그대로 mutate 한다(계약을 안 바꾼다) — 그 안에
  // facing(걷는 방향으로 도는 그룹) → pivot(숨쉬듯·걷듯 까딱이는 그룹) → mesh 순으로 얹는다.
  const player = new THREE.Group()
  player.position.set(0, 1.9, 0)
  scene.add(player)

  const kingFacing = new THREE.Group()
  player.add(kingFacing)
  let king = null       // { pivot, mesh }
  let kingLook = null   // { stage, height } — 지금 세워진 것이 무엇인지

  // look — { stage: 'child'|'adult', height } 또는 옛 방식의 문자열 하나.
  // 키까지 받는 까닭은 임금이 해마다 자라기 때문이다(systems/king-age.js).
  function setKingAge(look) {
    if (!look) return
    const want = typeof look === 'string' ? { stage: look, height: null } : look
    const attire = want.attire ?? 'royal'
    if (kingLook && want.stage === kingLook.stage && want.height === kingLook.height && attire === kingLook.attire) return
    if (king) { kingFacing.remove(king.pivot); disposePerson(king.pivot) }
    king = buildPerson(THREE, { ...RANK_SPECS.king, ageStage: want.stage, height: want.height, attire })
    kingFacing.add(king.pivot)
    kingLook = { stage: want.stage, height: want.height, attire }
  }
  setKingAge('child')

  // 신하 — 궁마다 다른 사람이 서 있다. main.js 가 이미 이 막·이 궁에서 보여야 할
  // 목록(npcsAt())을 걸러 넘긴다 — 여기서는 그리기만 한다. 목록이 실제로 바뀔 때만
  // 다시 짓는다(막이 안 바뀌었는데 매 프레임 다시 지으면 낭비다).
  const npcGroup = new THREE.Group()
  scene.add(npcGroup)
  const npcMeshes = new Map()   // id -> { anchor, pivot }
  let npcKey = ''
  let activePalace = null

  function setNpcs(list) {
    const key = list.map(n => n.id).sort().join(',')
    if (key === npcKey) return
    npcKey = key
    for (const { anchor, pivot } of npcMeshes.values()) {
      npcGroup.remove(anchor)
      disposePerson(pivot)
    }
    npcMeshes.clear()
    for (const n of list) {
      if (n.voice) continue   // 목소리로만 나오는 인물(data/npcs.js voice) — 몸을 세우지 않는다
      // hatStyle 은 골격으로 사람을 쌓던 시절의 지정이다. 지금은 그림 자체에
      // 사모·익선관이 이미 그려져 있어 여기서 고를 것이 없다(npcs.js 의 값은 남겨 둔다).
      const spec = RANK_SPECS[n.rank] ?? RANK_SPECS.mid
      const built = n.id === 'mother' ? buildMother(THREE) : buildPerson(THREE, { ...spec, ageStage: 'adult' })
      const anchor = new THREE.Group()
      anchor.position.set(n.x, 1.9, n.z)
      anchor.add(built.pivot)
      npcGroup.add(anchor)
      // walking·yaw 는 알현 장면(systems/audience.js)이 쓴다. 평소에는 walking 이
      // false 이고 yaw 가 null 이라, 아래 render() 가 임금 쪽을 보게 돌려 준다.
      npcMeshes.set(n.id, { anchor, pivot: built.pivot, npc: n, walking: false, yaw: null })
    }
  }

  // ── 장면에 놓이는 물건(지금은 도끼 하나) ────────────────────────────────
  // 알현이 청할 때만 놓이고, 그 비트가 끝나면 치운다. 궁에 매인 것이 아니라
  // 장면에 매인 것이라 palaceGroup 이 아니라 여기 따로 둔다.
  const propGroup = new THREE.Group()
  scene.add(propGroup)

  function setProps(list = []) {
    for (const child of [...propGroup.children]) {
      propGroup.remove(child)
      child.traverse(o => { o.geometry?.dispose?.() })
    }
    for (const p of list) {
      const obj = buildProp(THREE, p.id)
      if (!obj) continue
      obj.position.set(p.x ?? 0, 0, p.z ?? 0)
      obj.rotation.y = p.yaw ?? 0
      propGroup.add(obj)
    }
  }

  // 신하 하나를 옮기고 돌린다 — 알현 장면에서 문을 열고 걸어 들어오는 그 사람이다.
  // setNpcs() 를 다시 부르면 목록이 통째로 다시 지어져(모델 복제 포함) 걸음이
  // 끊긴다. 그래서 자리만 옮기는 길을 따로 둔다.
  //   yaw: null 이면 임금 쪽을 본다. 숫자면 그 각으로 고정한다.
  //   smooth: true 이면 한 번에 FOLLOW_STEP 만큼만 다가간다 — 행렬에서 곁을 걷는 사람이 순간이동하지 않게(2026-09-15).
  function placeNpc(id, { x, z, yaw = null, walking = false, hidden = null, smooth = false } = {}) {
    const e = npcMeshes.get(id)
    if (!e) return false
    if (x != null || z != null) {
      const p={x:x??e.anchor.position.x,z:z??e.anchor.position.z}
      const at=activePalace?safePosition(activePalace,p,.8):p
      if (smooth) {
        const dx=at.x-e.anchor.position.x,dz=at.z-e.anchor.position.z,d=Math.hypot(dx,dz)
        const k=d>FOLLOW_STEP?FOLLOW_STEP/d:1
        e.anchor.position.x+=dx*k;e.anchor.position.z+=dz*k
      } else { e.anchor.position.x=at.x;e.anchor.position.z=at.z }
    }
    if (hidden != null) e.anchor.visible = !hidden
    e.yaw = yaw
    e.walking = walking === true
    return true
  }

  // Textured, skinned human figures are embedded in the HTML. Decode once;
  // each role then clones its own skeleton while sharing the GPU assets.
  modelsReady(THREE)

  const tex = makeTextures(THREE)
  let palaceGroup = null
  // 지붕·기둥·벽 가운데 지금 카메라와 임금 사이를 가리는 것들 — render/occlusion.js.
  // 궁을 바꾸면(setPalace) 새 Set 으로 갈아 끼운다: 옛 궁의 오브젝트를 들고 있지 않는다.
  let faded = new Set()

  const fire = createFire(THREE, { count: 160 })
  scene.add(fire.object3D)

  // 태블릿 탭 이동 — 화면 위 탭 지점(0..1 정규 좌표)을 카메라에서 지면(y=0)으로
  // 레이캐스트해 3D 좌표를 얻는다. Raycaster/Plane/결과 벡터를 매번 새로 만들지 않는다
  const raycaster = new THREE.Raycaster()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const groundHit = new THREE.Vector3()

  function pickGround(nx, ny) {
    const ndcX = nx * 2 - 1
    const ndcY = -(ny * 2 - 1)
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera)
    const hit = raycaster.ray.intersectPlane(groundPlane, groundHit)
    return hit ? { x: hit.x, z: hit.z } : null
  }

  // 「아직 들을 것이 남은 사람」 위에 뜨는 이름표.
  //
  // 예전에는 노란 구슬이 공중에 떠 있었다. 선생님: "노란색 해가 있는 장치가 굳이
  // 필요할까 해. 그거 없애고 차라리 캐릭터 위에 다음 단계로 넘어갈 화살표가 인물
  // 머리 위에 떠다니는게 어떨까 싶어." 참고로 보내신 영상에서도 표지는 물건 위에
  // 이름과 함께 떠 있고, 그것이 「여기를 보라」를 훨씬 분명하게 말한다.
  //
  // 스프라이트라 언제나 카메라를 마주 본다. 글자는 캔버스에 한 번 그려 두고 이름마다
  // 재질을 캐시한다 — 같은 사람이 계속 떠 있어도 텍스처는 하나다.
  const MARKER_Y = 3.9
  const MAX_MARKERS = 16
  const markerCache = new Map()   // 이름 -> SpriteMaterial

  function markerMaterial(label) {
    const key = label || ''
    if (markerCache.has(key)) return markerCache.get(key)
    const pad = 22, fs = 40
    const probe = document.createElement('canvas').getContext('2d')
    probe.font = `${fs}px system-ui, 'Malgun Gothic', sans-serif`
    const tw = key ? Math.ceil(probe.measureText(key).width) : 0
    const w = Math.max(128, tw + pad * 2)
    const h = 128
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const g = c.getContext('2d')
    const plateH = 62
    // 판 — 짙은 먹빛에 금테. 아래로 뾰족한 꼬리가 사람을 가리킨다.
    g.fillStyle = 'rgba(20,22,26,0.88)'
    g.strokeStyle = '#c9a15a'
    g.lineWidth = 3
    const r = 8
    g.beginPath()
    g.moveTo(r, 2); g.lineTo(w - r, 2); g.quadraticCurveTo(w - 2, 2, w - 2, 2 + r)
    g.lineTo(w - 2, plateH - r); g.quadraticCurveTo(w - 2, plateH, w - r, plateH)
    g.lineTo(w / 2 + 12, plateH); g.lineTo(w / 2, plateH + 18); g.lineTo(w / 2 - 12, plateH)
    g.lineTo(r, plateH); g.quadraticCurveTo(2, plateH, 2, plateH - r)
    g.lineTo(2, 2 + r); g.quadraticCurveTo(2, 2, r, 2)
    g.closePath(); g.fill(); g.stroke()
    if (key) {
      g.fillStyle = '#f2e7cf'
      g.font = `${fs}px system-ui, 'Malgun Gothic', sans-serif`
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(key, w / 2, plateH / 2 + 2)
    }
    // 아래를 가리키는 화살표 — 「이 사람이다」
    g.fillStyle = '#e0a23a'
    g.beginPath()
    g.moveTo(w / 2 - 16, plateH + 34); g.lineTo(w / 2 + 16, plateH + 34); g.lineTo(w / 2, plateH + 60)
    g.closePath(); g.fill()

    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    mat.userData.aspect = w / h
    markerCache.set(key, mat)
    return mat
  }

  const markers = []
  for (let i = 0; i < MAX_MARKERS; i++) {
    const sp = new THREE.Sprite(markerMaterial(''))
    sp.visible = false
    sp.renderOrder = 900          // 기둥·처마에 가리지 않는다 — 길잡이이기 때문이다
    scene.add(sp)
    markers.push(sp)
  }
  let markerCount = 0
  const cueRing = new THREE.Mesh(new THREE.RingGeometry(.85,1.0,40), new THREE.MeshBasicMaterial({ color:0xeac779, transparent:true, opacity:.7, side:THREE.DoubleSide, depthWrite:false }))
  cueRing.rotation.x = -Math.PI / 2; cueRing.visible = false; scene.add(cueRing)
  let cueKey = ''
  function setInteractionCues(list = []) {
    const nearest = [...list].sort((a,b) => Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0]
    if (!nearest) {
      cueRing.visible = false
      if (cueKey !== 'none') { setPickupMarkers([]); cueKey = 'none' }
      return
    }
    const distance = Math.hypot(nearest.x-player.position.x,nearest.z-player.position.z)
    const cue = interactionCue({ ...nearest, distance })
    cueRing.visible = true
    cueRing.position.set(nearest.x,.13,nearest.z)
    cueRing.material.color.set(cue.tone === 'red' ? '#f09866' : '#eac779')
    // Only the main interaction hint owns E prompts and their authoritative range rules.
      const label = nearest.label ?? '문서'
    const key = `${nearest.x},${nearest.z},${label}`
    if (key !== cueKey) {
      cueKey = key
      setPickupMarkers([{ ...nearest, label, y: nearest.kind === 'person' ? 4.3 : 2.8 }])
    }
  }

  function setPickupMarkers(list) {
    markerCount = Math.min(list.length, MAX_MARKERS)
    for (let i = 0; i < MAX_MARKERS; i++) {
      const sp = markers[i]
      if (i >= markerCount) { sp.visible = false; continue }
      const m = list[i]
      const mat = markerMaterial(m.label ?? '')
      sp.material = mat
      const h = 1.5
      sp.scale.set(h * (mat.userData.aspect ?? 1), h, 1)
      sp.userData.baseY = m.y ?? MARKER_Y
      sp.position.set(m.x, sp.userData.baseY, m.z)
      sp.visible = true
    }
  }

  function disposeGroup(group) {
    group.traverse((obj) => {
      obj.geometry?.dispose()
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
      for (const m of mats) {
        if (m.map && !Object.values(tex).includes(m.map)) m.map.dispose()
        m.dispose()
      }
    })
  }

  // 수렴청정의 발을 내리고 걷는다. 발은 궁에 걸린 물건이라 궁을 다시 지으면
  // 새로 찾는다 — 그래서 상태를 들고 있다가 setPalace 뒤에 다시 걸어 준다.
  let veilOn = false
  function applyVeil() {
    const bal = palaceGroup?.getObjectByName('sullyeom')
    if (bal) bal.visible = veilOn
  }
  function setVeil(on) { veilOn = !!on; applyVeil() }

  function setPalace(def) {
    activePalace = def
    if (palaceGroup) {
      scene.remove(palaceGroup)
      disposeGroup(palaceGroup)
    }
    palaceGroup = buildPalace(THREE, tex, def)
    palaceGroup.traverse(o => {
      if (o.isMesh) { o.receiveShadow = true; o.castShadow = o.userData.castShadow ?? !o.userData.noOcclude }
    })
    scene.add(palaceGroup)
    atmosphere.setPalace(def)
    applyVeil()   // 궁을 다시 지었으니 발을 다시 걸어 준다
    // 첫 프레임 렌더 전에도 가림 판정을 정확히 하려면 월드 행렬이 미리 계산돼 있어야
    // 한다 — renderer.render() 가 매 프레임 다시 해 주지만, 그건 이 함수가 끝난 다음이다.
    palaceGroup.updateMatrixWorld(true)
    faded = new Set()
    player.position.set(def.spawn.x, 1.9, def.spawn.z)
    snapCamera = true
    // 궁을 바꿀 때마다 불도 끈다 — 안 그러면 불탄 궁에서 다음 궁(이어)으로 넘어갔을 때
    // 옛 세계좌표에 불씨가 남아 허공에 떠 보인다. 불이 필요한 궁은 그 비트가 다시 setSources() 를 부른다
    fire.setSources([])
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth
    const h = canvas.clientHeight || innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const stats = { fps: 0, calls: 0 }
  let frames = 0
  let mark = performance.now()
  let lastFrameT = performance.now()
  let lastPX = player.position.x
  let lastPZ = player.position.z

  // 왕이 걷는 방향으로 돈다 — 매 프레임 새 위치와 지난 위치의 차를 본다.
  // movement.js 의 판정을 여기서 다시 하지 않는다: 걸었는지 아닌지는 위치가
  // 실제로 움직였는지만 보고 안다(값이 작으면 제자리로 본다).
  const FACE_EPS = 0.003
  function updateKingMotion(dt, t) {
    if (!king) return
    const dx = player.position.x - lastPX
    const dz = player.position.z - lastPZ
    const moved = Math.hypot(dx, dz)
    const walking = moved > FACE_EPS
    // **즉시 돌지 않는다.** 자판은 여덟 방향뿐이라 W 에서 A 로 바꾸면 90도가 한
    // 프레임에 돌았고, 그것이 「발걸음이 좌우로 움직여서 부자연스럽다」의 정체였다.
    if (walking) {
      kingFacing.rotation.y = turnToward(kingFacing.rotation.y, Math.atan2(dx, dz), dt)
    }
    // 발소리. 여기서 간격을 세지 않는다 — 이 함수는 「지금 걷고 있는가」와 「지금이
    // 몇 시인가」만 넘기고, 몇 밀리초마다 한 걸음인지는 엔진(systems/audio.js)이 정한다.
    // 프레임을 세면 성능 좋은 기계에서만 발소리가 빨라진다.
    audio?.stepped(t, { walking, running: running?.() === true })
    // 카메라를 넘긴다 — 판이 카메라를 마주 보고, 걷는 방향과 카메라가 이루는
    // 각도가 앞·비스듬·옆·뒤 중 어느 그림을 쓸지 정한다(sprite-person.js).
    updateSway(king.pivot, dt, { walking, running: running?.() === true })
    lastPX = player.position.x
    lastPZ = player.position.z
  }

  function render() {
    const t = performance.now()
    const dt = Math.min(t - lastFrameT, 100)   // 탭을 오래 벗어났다 돌아와도 한 번에 확 까딱이지 않게 자른다
    lastFrameT = t
    fire.update(t, reducedMotion)
    atmosphere.update(t, player.position, reducedMotion)
    crisis.update(crisisStage,t,reducedMotion)
    for (let i = 0; i < markerCount; i++) {
      markers[i].position.y = (markers[i].userData.baseY ?? MARKER_Y) + (reducedMotion ? 0 : Math.sin(t * 0.0026 + i) * 0.08)
    }
    // 카메라를 먼저 세운다 — 인물의 빌보드가 이 프레임의 카메라 위치를 보고
    // 돌기 때문이다. 뒤에 세우면 한 프레임 늦은 자리를 보고, 첫 프레임에는
    // 아직 원점에 있는 카메라를 본다.
    const danger = cinematic.camera?.mode === 'danger'
    const audience = cinematic.camera?.mode === 'audience'
    const viewAngle = audience ? 0 : orbit
    const distance = (danger ? 10 : audience ? 11 : CAM_DIST) * zoom
    const targetShot = {
      x: player.position.x + Math.sin(viewAngle) * distance + Math.cos(viewAngle) * 1.6,
      y: (danger ? 5.6 : audience ? 5.1 : CAM_HEIGHT) * Math.sqrt(zoom),
      z: player.position.z + Math.cos(viewAngle) * distance - Math.sin(viewAngle) * 1.6,
      lookY: danger ? CAM_LOOK_Y + 0.45 : CAM_LOOK_Y,
    }
    cameraShot = reducedMotion || snapCamera ? targetShot : interpolateCameraShot(cameraShot, targetShot, 1 - Math.exp(-dt / 120))
    snapCamera = false
    camera.position.set(cameraShot.x, cameraShot.y, cameraShot.z)
    camera.lookAt(player.position.x, cameraShot.lookY, player.position.z)
    if (openingView) {
      const narrow = camera.aspect < 1
      camera.position.set(narrow ? 33 : 35, narrow ? 23 : 20, narrow ? 54 : 50)
      camera.lookAt(narrow ? -2 : -12, 4.5, 3)
    }
    updateKingMotion(dt, t)
    // 신하는 임금 쪽을 본다. 예전에는 모두 +z 한 방향만 보고 서 있어, 임금이
    // 앞에 와도 뒤통수를 보이는 사람이 있었다. 알현 장면에서 각을 못 박아 둔
    // 사람(yaw)만 예외다 — 걸어 들어오는 동안은 걷는 방향을 본다.
    for (const e of npcMeshes.values()) {
      const dx = player.position.x - e.anchor.position.x
      const dz = player.position.z - e.anchor.position.z
      const want = e.yaw != null ? e.yaw
        : (Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : e.anchor.rotation.y)
      e.anchor.rotation.y = turnToward(e.anchor.rotation.y, want, dt)
      updateSway(e.pivot, dt, { walking: e.walking })
    }

    // 가림도 이 프레임의 카메라 위치로 잰다 — 위에서 이미 세워 두었다. player 는 지붕 밑을 걸어 다닐 수 있으니 방을 옮길 때만이
    // 아니라 매 프레임 다시 잰다.
    if (palaceGroup && !openingView) {
      faded = updatePalaceOcclusion(THREE, palaceGroup, camera.position, player.position.x, player.position.z, faded)
    }
    renderer.render(scene, camera)

    frames++
    const now = performance.now()
    if (now - mark >= 1000) {
      stats.fps = Math.round((frames * 1000) / (now - mark))
      stats.calls = renderer.info.render.calls
      frames = 0
      mark = now
    }
  }

  resize()
  addEventListener('resize', resize)

  return {
    THREE, scene, camera, renderer, player, fire,
    setPalace, setPickupMarkers, pickGround, resize, render, stats, setVeil,
    setKingAge, setNpcs, placeNpc, setProps, setMood, setCinematic, setReducedMotion,
    worldAxis, setOpeningView, rotateView, resetView,
    setInteractionCues,
    setCrisis(stage) { crisisStage = stage },
    dispose() {
      removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', orbitDown)
      canvas.removeEventListener('pointermove', orbitMove)
      canvas.removeEventListener('pointerup', orbitUp)
      canvas.removeEventListener('pointercancel', orbitUp)
      canvas.removeEventListener('contextmenu', noMenu)
      canvas.removeEventListener('wheel', onWheel)
      motionQuery?.removeEventListener('change', motionChange)
      atmosphere.dispose()
      crisis.dispose()
      fire.dispose()
      if (palaceGroup) disposeGroup(palaceGroup)
      for (const texture of Object.values(tex)) texture.dispose()
      cueRing.geometry.dispose(); cueRing.material.dispose()
      for (const material of markerCache.values()) { material.map?.dispose(); material.dispose() }
      if (king) disposePerson(king.pivot)
      for (const person of npcMeshes.values()) disposePerson(person.pivot)
      setProps([])
      renderer.dispose()
    },
  }
}
