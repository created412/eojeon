import { ARTIFACT_SPOTS } from '../data/artifacts.js'
import { PALACE_LIFE_IDS } from '../systems/palace-discoveries.js'

// 작은 입체 살림 물건. 사람·실존 유물을 흉내 낸 자산이 아니라 게임의 재구성이다.
// NPC 머리 위 표식·자동 이동·필수 활동 표시는 만들지 않는다.
export function buildPalaceDiscoveries(THREE, def) {
  const group = new THREE.Group()
  group.name = 'palace-life-discoveries'
  const material = color => new THREE.MeshLambertMaterial({ color })
  const M = { wood: material(0x5f402b), ivory: material(0xe0d5ae), ink: material(0x252725),
    green: material(0x466754), thread: material(0xc7a465), clay: material(0x805d42) }
  const box = (target, mat, x, y, z, w, h, d) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    mesh.position.set(x, y, z); target.add(mesh); return mesh
  }
  const cylinder = (target, mat, x, y, z, r, h) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), mat)
    mesh.position.set(x, y, z); target.add(mesh); return mesh
  }
  for (const spot of ARTIFACT_SPOTS[def?.id] ?? []) {
    if (!PALACE_LIFE_IDS.includes(spot.id)) continue
    const room = def.rooms.find(r => r.id === spot.room)
    if (!room) continue
    const item = new THREE.Group()
    item.name = spot.id
    item.userData.discovery = spot.id
    item.position.set(room.x + spot.dx, .1, room.z + spot.dz)
    // 낮은 받침은 세 물건의 발견 지점이다. 크기는 사람 한 걸음보다 작게 둔다.
    box(item, M.wood, 0, .3, 0, 1.8, .1, 1.15)
    for (const x of [-.7,.7]) for (const z of [-.4,.4]) box(item, M.wood, x, .15, z, .12, .3, .12)
    if (spot.id === 'life-towel') {
      box(item, M.ivory, -.25, .41, .06, .95, .12, .65)
      box(item, M.ivory, -.25, .49, .09, .92, .04, .58)
      box(item, M.thread, -.25, .515, .26, .89, .015, .025)
      cylinder(item, M.clay, .57, .47, -.1, .24, .24)
      cylinder(item, M.ink, .57, .595, -.1, .2, .012)
    } else if (spot.id === 'life-brush') {
      box(item, M.ivory, -.2, .36, -.02, 1.08, .025, .77)
      box(item, M.ink, -.27, .38, -.17, .59, .012, .018)
      box(item, M.ink, -.37, .38, -.06, .4, .012, .018)
      box(item, M.ink, .58, .41, .16, .38, .12, .49)
      const brush = cylinder(item, M.thread, -.12, .42, .19, .045, .98)
      brush.rotation.z = Math.PI / 2; brush.rotation.y = -.25
      const nib = new THREE.Mesh(new THREE.ConeGeometry(.065,.22,8),M.ink)
      nib.rotation.z = Math.PI / 2; nib.position.set(-.68,.42,.06);item.add(nib)
    } else {
      const cloth = box(item, M.green, -.3, .4, -.03, 1.02, .08, .68)
      cloth.rotation.y = -.13
      box(item, M.ivory, -.22, .448, .09, .28, .013, .36)
      cylinder(item, M.wood, .56, .48, .05, .13, .26)
      cylinder(item, M.thread, .56, .48, .05, .19, .17)
      box(item, M.thread, .14, .38, .1, .58, .015, .022)
    }
    group.add(item)
  }
  return group
}
