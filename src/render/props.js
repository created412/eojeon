// 장면에 놓이는 물건. 지금은 도끼 하나다.
//
// 왜 도끼인가. 1876년 최익현은 상소를 올리며 궐문 앞에 **도끼를 놓고 엎드렸다** —
// 지부복궐(持斧伏闕). 「내 말을 들어주시든지, 이 도끼로 내 목을 치시든지」라는 뜻이다.
// 글로 「강경한 반대 상소를 올렸다」고 적는 것과, 도끼가 바닥에 놓인 것을 보는 것은
// 학생에게 전혀 다른 일이다(선생님 지적 10번: "역사처럼 도끼들고 오거나").
//
// 1873년 계유상소에는 도끼가 없었다. 도끼는 1876년 개항 반대 상소의 것이다 —
// 그래서 이 물건은 그 자리에만 놓인다(data/acts.js 의 axe-sangso 비트).

// 바닥 윗면. render/palace.js 의 BASE_H(0.04) + FLOOR_H(0.06) 과 같은 값이다.
const FLOOR_TOP = 0.10

export function buildAxe(THREE) {
  const g = new THREE.Group()
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b5236 })
  const iron = new THREE.MeshLambertMaterial({ color: 0x8d949a })

  // 자루 — 바닥에 뉘어 놓는다. 세워 두면 「들고 있다」로 보인다.
  const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 1.5, 8), wood)
  haft.rotation.z = Math.PI / 2
  haft.position.set(0, FLOOR_TOP + 0.05, 0)
  g.add(haft)

  // 날 — 자루 한쪽 끝에. 위에서 내려다보는 카메라라 두께보다 넓이가 보인다.
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.46), iron)
  blade.position.set(0.72, FLOOR_TOP + 0.06, 0)
  g.add(blade)
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.5), iron)
  edge.position.set(0.9, FLOOR_TOP + 0.055, 0)
  g.add(edge)

  // 자루 끝의 가죽끈 — 작지만 이게 있어야 「막대기 하나」로 안 보인다
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8),
    new THREE.MeshLambertMaterial({ color: 0x3f3227 }))
  grip.rotation.z = Math.PI / 2
  grip.position.set(-0.6, FLOOR_TOP + 0.05, 0)
  g.add(grip)

  g.userData.noOcclude = true   // 바닥에 붙은 물건이다 — 가림 판정이 지우면 안 된다
  return g
}

export const PROPS = { axe: buildAxe }

export function buildProp(THREE, id) {
  const make = PROPS[id]
  return make ? make(THREE) : null
}
