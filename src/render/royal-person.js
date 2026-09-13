import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// A small articulated figure, built locally. All six roles work without downloads.
export const RANK_SPECS = {
  king: { model: 'king', robe: 0xa42632 },
  regent: { model: 'regent', robe: 0x456c60 },
  senior: { model: 'senior', robe: 0x9b423f },
  mid: { model: 'mid', robe: 0x287b83 },
  messenger: { model: 'messenger', robe: 0x446798 },
}
export const modelsReady = () => Promise.resolve()

export function buildPerson(T, spec = {}) {
  const king = spec.model === 'king'
  const child = spec.ageStage === 'child'
  const elder = spec.model === 'regent'
  const pivot = new T.Group()
  const mesh = new T.Group()
  pivot.add(mesh)
  const mat = (color, roughness = .85, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness })
  const robe = mat(spec.robe ?? (king ? 0xa42632 : 0x287b83))
  const silk = mat(king ? 0xc54043 : spec.robe ?? 0x348e90)
  const skin = mat(elder ? 0xdba97f : 0xf0c29b)
  const hair = mat(0x202732)
  const gold = mat(0xd9b669, .48, .35)
  const white = mat(0xf3e7d1)
  const eye = mat(0x282527)
  const blush = mat(0xe5a18a)
  function add(parent, geo, material, x, y, z, scale) {
    const o = new T.Mesh(geo, material)
    o.position.set(x, y, z)
    if (scale) o.scale.set(...scale)
    o.castShadow = true; o.receiveShadow = true
    parent.add(o)
    return o
  }
  const sphere = (parent, material, x, y, z, sx, sy, sz) => add(parent, new T.SphereGeometry(1, 16, 12), material, x, y, z, [sx, sy, sz])
  const box = (parent, material, x, y, z, w, h, d, radius = .06) => add(parent, new RoundedBoxGeometry(w, h, d, 2, radius), material, x, y, z)
  const tube = (parent, points, radius, material) => add(parent, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 16, radius, 5, false), material, 0, 0, 0)

  // Coordinates are measured from the soles; fit after all headwear is present.
  const legs = []
  for (const [index, side] of [-1, 1].entries()) {
    const leg = new T.Group(); leg.name = index === 0 ? 'left-leg' : 'right-leg'
    leg.position.set(side * .21, .75, 0); mesh.add(leg); legs.push(leg)
    add(leg, new T.CylinderGeometry(.14, .14, .53, 10), hair, 0, -.24, 0)
    box(leg, hair, 0, -.63, .10, .30, .24, .54, .09)
    box(leg, gold, 0, -.50, .01, .29, .04, .30, .015)
  }
  const body = new T.Group(); body.name = 'robe'; mesh.add(body)
  const profile = [[.49,.36],[.57,.45],[.56,.61],[.46,1.05],[.42,1.30],[.48,1.63],[.40,1.82],[.24,1.88]]
  const cloth = add(body, new T.LatheGeometry(profile.map(([r,y]) => new T.Vector2(r,y)), 28), robe, 0, 0, 0)
  cloth.scale.z = .70
  for (const side of [-1,1]) {
    tube(body, [[side*.13,1.83,.21],[side*.25,1.64,.31],[0,1.42,.34]], .040, white)
    tube(body, [[side*.43,.44,.22],[side*.39,.88,.25],[side*.28,1.22,.28]], .012, silk)
  }
  const belt = add(body, new T.CylinderGeometry(.445,.45,.105,28), hair, 0,1.25,0)
  belt.scale.z = .74
  for (let i=0;i<9;i++) {
    const a = i / 8 * Math.PI
    box(body, gold, Math.cos(a)*.44,1.25,Math.sin(a)*.338,.085,.075,.025,.01)
  }
  const badge = add(body, new T.CircleGeometry(king ? .21 : .16,32), gold,0,1.57,.347)
  if (!king) badge.rotation.z = Math.PI / 4
  add(body,new T.TorusGeometry(king ? .186 : .13,.012,6,32),robe,0,1.57,.355)
  // Curled cloud-and-dragon motif: readable engraving at the play camera's scale.
  tube(body,[[-.08,1.48,.363],[.07,1.49,.363],[.10,1.58,.363],[-.06,1.62,.363],[-.08,1.68,.363],[.04,1.69,.363]],.014,robe)
  for (const side of [-1,1]) {
    const disk = add(body,new T.CircleGeometry(.135,24),gold,side*.47,1.70,0)
    disk.rotation.y = side*Math.PI/2
  }
  const arms = []
  for (const side of [-1,1]) {
    const arm = new T.Group(); arm.position.set(side*.45,1.69,0); mesh.add(arm); arms.push(arm)
    const sleeve = add(arm,new T.CylinderGeometry(.21,.27,.70,16),robe,side*.09,-.28,0)
    sleeve.rotation.z = side*.20; sleeve.scale.z = .85
    const cuff = add(arm,new T.CylinderGeometry(.24,.25,.065,16),white,side*.16,-.61,0)
    cuff.rotation.z = side*.2; cuff.scale.z = .85
    sphere(arm,skin,side*.18,-.72,.035,.13,.16,.13)
  }

  const head = new T.Group(); head.position.y = 2.15; mesh.add(head)
  const headWidth = child ? .43 : .38
  box(head,skin,0,0,0,headWidth*2,.76,.65,.22)
  sphere(head,hair,0,.23,-.07,headWidth*1.03,.29,.32)
  for (const side of [-1,1]) {
    sphere(head,skin,side*(headWidth+.015),-.025,-.015,.09,.135,.095)
    sphere(head,eye,side*.15,.015,.326,.034,child?.052:.038,.018)
    sphere(head,white,side*.15-.008,.03,.342,.008,.010,.004)
    sphere(head,blush,side*.245,-.10,.313,.064,.028,.007)
    const brow = box(head,hair,side*.15,.13,.328,.14,.027,.018,.01)
    brow.rotation.z = side*.09
  }
  sphere(head,skin,0,-.058,.337,.067,.088,.073)
  tube(head,[[-.055,-.218,.32],[0,-.229,.327],[.055,-.218,.32]],.012,mat(0x9c6250))
  if (elder || (!child && spec.model === 'senior')) {
    for (const side of [-1,1]) tube(head,[[0,-.16,.34],[side*.10,-.19,.34],[side*.16,-.16,.32]],.018,hair)
    sphere(head,hair,0,-.34,.20,.16,.21,.12)
  }
  if (king) {
    box(head,hair,0,.44,-.045,.73,.27,.64,.10)
    box(head,hair,0,.62,-.11,.57,.26,.47,.10)
    for (const side of [-1,1]) {
      const wing = sphere(head,hair,side*.20,.80,-.24,.145,.28,.075)
      wing.rotation.z = -side*.20
      tube(head,[[side*.10,.58,-.15],[side*.19,.81,-.15],[side*.25,.96,-.21]],.009,gold)
    }
    box(head,gold,0,.46,.279,.18,.075,.019,.01)
  } else if (elder) {
    add(head,new T.CylinderGeometry(.38,.42,.28,16),hair,0,.46,-.035)
    add(head,new T.CylinderGeometry(.66,.66,.035,24),hair,0,.345,-.035)
    for (const side of [-1,1]) tube(head,[[side*.32,.34,.0],[side*.31,-.25,.10],[0,-.40,.20]],.016,hair)
  } else {
    box(head,hair,0,.45,-.07,.70,.25,.60,.08)
    box(head,hair,0,.61,-.15,.56,.20,.42,.06)
    for (const side of [-1,1]) {
      const wing=box(head,hair,side*.62,.53,-.16,.66,.14,.07,.045)
      wing.rotation.z=side*.13
    }
  }

  // Merge each rigid joint by material: detail does not require one draw per bead.
  function mergeRigid(group) {
    group.updateMatrixWorld(true)
    const buckets = new Map()
    for (const child of [...group.children]) {
      if (!child.isMesh) continue
      child.updateMatrix()
      const geo=child.geometry.clone().applyMatrix4(child.matrix)
      const list=buckets.get(child.material) ?? []; list.push(geo); buckets.set(child.material,list)
      group.remove(child); child.geometry.dispose()
    }
    for (const [material, geos] of buckets) {
      const merged=mergeGeometries(geos.map(g=>g.index?g.toNonIndexed():g),false)
      const o=new T.Mesh(merged,material); o.castShadow=true; o.receiveShadow=true; group.add(o)
      geos.forEach(g=>g.dispose())
    }
  }
  for (const rigid of [...legs, body, ...arms, head]) mergeRigid(rigid)
  mesh.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(mesh)
  const height = spec.height ?? (child ? 2.35 : 2.89)
  const scale = height / (bounds.max.y-bounds.min.y)
  mesh.scale.setScalar(scale)
  mesh.position.y = -1.8 - bounds.min.y*scale
  pivot.userData.motion = { legs, arms, body, phase:0, strength:0 }
  return { pivot, mesh, topY: height-1.8 }
}

export function updateSway(pivot, dt, { walking=false, running=false } = {}) {
  const m=pivot.userData.motion
  if (!m) return
  const seconds=Math.max(0,Math.min(dt,100))/1000
  m.phase += seconds*(running?12:7)
  m.strength += ((walking ? (running ? .60 : .36) : 0)-m.strength)*(1-Math.exp(-seconds*12))
  const step=Math.sin(m.phase)*m.strength
  m.legs[0].rotation.x=step; m.legs[1].rotation.x=-step
  m.arms[0].rotation.x=-step*.55; m.arms[1].rotation.x=step*.55
  m.body.rotation.z=step*.035
}

export function disposePerson(pivot) {
  const materials=new Set()
  pivot.traverse(o=>{ o.geometry?.dispose(); if(o.material) materials.add(o.material) })
  for (const material of materials) material.dispose()
}
