// 카메라 차폐 — 지붕·기둥·벽이 카메라와 임금 사이를 가리면, 임금이 아니라 그
// 지붕·기둥·벽 쪽이 양보한다. 예전 방식(좌표를 손으로 옮겨 담·기둥을 피하기)은
// 「방 폭의 72% 바깥」이라는 규칙을 남겼지만, 실제로 가리는 것은 벽이 아니라
// 처마(지붕)였다 — 처마 반지름(max(w,d)*0.78)이 벽 반폭보다 넓을 때가 흔해서,
// 벽을 피해도 처마 밑에 그대로 남는 자리가 생겼다. 좌표를 다시 재는 규칙은
// 3단계에서 궁 넷·문서 여덟이 더 들어오면 또 깨진다 — 그래서 좌표가 아니라
// 카메라 쪽에서 고친다: 매 프레임, 카메라와 임금 사이 선분에 걸리는 지오메트리를
// 찾아 안 보이게 하고, 걸리지 않게 되면 되돌린다.

// 임금 모델(character.js)의 발·허리·머리 높이 — player.position.y(=1.9, scene.js)를
// 기준으로 한 세계 좌표 y값이다. character.js 의 AGE.adult 비례에서 셈했다:
//   발(로브 아랫단)  1.9 + (-1.8)         = 0.10
//   허리(옷깃 아래)  1.9 + (-0.25)        = 1.65
//   머리(관 꼭대기)  1.9 + (topY≈1.09)    = 2.99 → 3.0 으로 반올림
export const CHAR_HEIGHTS = [0.10, 1.65, 3.00]

// 지면(PlaneGeometry)은 가리는 것으로 치지 않는다 — 발 높이(0.10)가 지면(y=0)에
// 바짝 붙어 있어, 얕은 각도로 스치듯 지나가는 광선이 목표 지점 바로 앞에서
// 지면과 거짓으로 닿는다(수치상 오차, 실제로 가리는 장면이 아니다).
// 바닥은 가리는 것으로 치지 않는다.
//
// 지면(PlaneGeometry)은 원래부터 제외했다 — 발 높이(0.10)가 지면(y=0)에 바짝 붙어
// 있어 얕은 각도의 광선이 목표 바로 앞에서 지면과 거짓으로 닿는다.
//
// 마루를 깔면서 같은 일이 다시 났다. 마루는 BoxGeometry 라 위 규칙에 안 걸렸고,
// 발로 쏘는 광선이 마루를 뚫고 지나가 **매 프레임 마루가 지워졌다.** 그래서 방
// 안이 기단의 회색 한 판으로만 보였고, 나뭇결을 아무리 진하게 그려도 화면에
// 나타나지 않았다(텍스처 자체는 멀쩡했다 — 따로 그려 보고 알았다).
//
// 바닥은 위에서 내려다보는 이 카메라에서 임금을 가릴 수 없다. 아예 뺀다.
export function isOccludable(object) {
  if (object.userData?.noOcclude) return false
  return object.geometry?.type !== 'PlaneGeometry'
}

// camPos 에서 (charX, h, charZ) 로 가는 광선이 palaceGroup 어딘가에 걸리는지 본다.
// far 를 목표 지점 바로 앞(0.05)에서 끊어, 목표 지점 자체나 그 너머는 걸린 것으로
// 치지 않는다. 세 높이(CHAR_HEIGHTS) 각각에서 걸린 오브젝트를 모두 모은다 —
// 하나라도 걸리면 그 지오메트리는 가리는 것이다.
export function findOccluders(THREE, palaceGroup, camPos, charX, charZ, heights = CHAR_HEIGHTS) {
  const raycaster = new THREE.Raycaster()
  const hit = new Set()
  for (const h of heights) {
    const target = new THREE.Vector3(charX, h, charZ)
    const dir = target.clone().sub(camPos)
    const dist = dir.length()
    if (dist < 1e-6) continue
    dir.normalize()
    raycaster.set(camPos, dir)
    raycaster.near = 0
    raycaster.far = Math.max(dist - 0.05, 0)
    for (const it of raycaster.intersectObjects(palaceGroup.children, true)) {
      if (isOccludable(it.object)) hit.add(it.object)
    }
  }
  return hit
}

// 카메라가 **건물 안에 들어가 있을 때**는 위의 광선이 아무것도 못 잡는다.
// 상자 안에서 쏜 광선이 만나는 것은 그 상자의 **뒷면**인데, 기본 재질은 앞면만
// 광선에 걸리기 때문이다. 그래서 화면 절반이 벽 안쪽 색으로 덮인 채 통과한다 —
// 카메라를 임금 가까이 당기자(높이 11·거리 14) 스폰 지점에서 바로 났다.
//
// 그래서 광선과 별개로 「카메라를 품고 있는 것」도 함께 숨긴다. 궁 지오메트리는
// 한 번 지으면 움직이지 않으므로 경계 상자를 처음 한 번만 재어 두고 쓴다.
// 「안에 들어가 있는가」가 아니라 「가까운가」로 본다. 카메라가 건물 **위에 얹혀**
// 있어도 그 처마·창방이 화면 아래쪽을 통째로 덮기 때문이다 — 스폰 지점에서 실제로
// 났다: 돈화문의 단청 창방이 카메라에서 3.4 떨어진 채 화면의 40%를 붉게 채웠다.
// 임금은 언제나 14 떨어져 있으므로(scene.js CAM_DIST), 5 안쪽을 걷어 내도
// 임금 주변은 건드리지 않는다.
const NEAR_R = 5.0

function boxOf(THREE, obj) {
  if (!obj.userData._occBox) {
    if (!THREE.Box3) return null
    obj.userData._occBox = new THREE.Box3().setFromObject(obj)
  }
  return obj.userData._occBox
}

export function findNearCamera(THREE, palaceGroup, camPos) {
  const hit = new Set()
  palaceGroup.traverse?.(obj => {
    if (!obj.geometry || !isOccludable(obj)) return
    const b = boxOf(THREE, obj)
    if (!b) return
    // 상자와 점 사이 거리 — 상자 안이면 0 이다
    const dx = Math.max(b.min.x - camPos.x, 0, camPos.x - b.max.x)
    const dy = Math.max(b.min.y - camPos.y, 0, camPos.y - b.max.y)
    const dz = Math.max(b.min.z - camPos.z, 0, camPos.z - b.max.z)
    if (Math.hypot(dx, dy, dz) < NEAR_R) hit.add(obj)
  })
  return hit
}

// 매 프레임(또는 임금이 움직였을 때) 부른다. now 에 걸린 것은 안 보이게 하고,
// 이전엔 걸렸지만 지금은 안 걸리는 것은 되돌린다. faded(Set)는 호출하는 쪽이
// 들고 있다가 다음 프레임에 다시 넘긴다 — 궁을 바꾸면(setPalace) 새 Set 으로
// 갈아 끼운다(옛 궁의 오브젝트를 붙들고 있지 않도록).
export function updatePalaceOcclusion(THREE, palaceGroup, camPos, charX, charZ, faded) {
  const now = findOccluders(THREE, palaceGroup, camPos, charX, charZ)
  for (const obj of findNearCamera(THREE, palaceGroup, camPos)) now.add(obj)
  // A foreground gate must not leave its beam and plaque floating after its
  // roof disappears. Remove the obstructing shell as a unit; keep the floor.
  const cx=camPos.x-charX, cz=camPos.z-charZ
  const length=Math.hypot(cx,cz)
  if(length>.01) for(const obj of [...now]) {
    let hall=obj
    while(hall.parent && !hall.userData.occlusionShell) hall=hall.parent
    if(!hall.userData.occlusionShell) continue
    const forward=((hall.position.x-charX)*cx+(hall.position.z-charZ)*cz)/length
    if(forward>.5) hall.traverse(part=>{
      if(part.geometry && !part.userData.noOcclude) now.add(part)
    })
  }
  for (const obj of now) {
    if (!faded.has(obj)) {
      obj.visible = false
      faded.add(obj)
    }
  }
  for (const obj of [...faded]) {
    if (!now.has(obj)) {
      obj.visible = true
      faded.delete(obj)
    }
  }
  return faded
}
