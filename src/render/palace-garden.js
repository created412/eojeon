import * as THREE from 'three'

// Decorative planting stays beyond walkable rooms and doors. Repeated geometry
// is instanced so an entire grove costs only a handful of draw calls.
export function buildPalaceGarden(def) {
  const root = new THREE.Group()
  const terrain=new THREE.Mesh(new THREE.PlaneGeometry(350,350),new THREE.MeshLambertMaterial({color:0x60674e}))
  terrain.rotation.x=-Math.PI/2;terrain.position.y=-.06;terrain.receiveShadow=true;terrain.userData.noOcclude=true
  root.add(terrain)
  const batches = new Map()
  const shapes = {
    leaf: new THREE.IcosahedronGeometry(1, 0),
    trunk: new THREE.CylinderGeometry(.65, 1, 1, 7),
    rock: new THREE.DodecahedronGeometry(1, 0),
    grass: new THREE.ConeGeometry(1, 1, 5),
  }
  function put(shape, color, p, s, ry=0, rz=0) {
    const key=shape+color
    if(!batches.has(key)) batches.set(key,{shape,color,items:[]})
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,rz))
    batches.get(key).items.push(new THREE.Matrix4().compose(new THREE.Vector3(...p),q,new THREE.Vector3(...s)))
  }
  const random=n=>{ const v=Math.sin(n*127.1+311.7)*43758.5453; return v-Math.floor(v) }
  const greens=[0x283b30,0x344739,0x3c5040,0x4b5d48]
  function pine(x,z,i,scale=1) {
    const h=(6.3+random(i)*3.4)*scale
    put('trunk',0x514739,[x,h*.4,z],[.24*scale,h*.8,.24*scale],0,.06)
    for(let j=0;j<10;j++) {
      const a=j*2.4+i, y=h*(.48+j*.045)
      const reach=(j<7?1.7-j*.06:.65)*scale
      const dx=Math.cos(a)*reach, dz=Math.sin(a)*reach
      put('trunk',0x514739,[x+dx*.5,y-.3,z+dz*.5],[.075*scale,reach*1.1,.075*scale],Math.PI/2-a,1.08)
      for(let k=0;k<12;k++) {
        const r=random(i*37+j*11+k), b=k*2.399
        const spread=(.45+r*.75)*scale
        put('leaf',greens[(i+j+k)%greens.length],
          [x+dx+Math.cos(b)*spread,y+(r-.4)*.43*scale,z+dz+Math.sin(b)*spread],
          [(.32+r*.28)*scale,(.20+r*.24)*scale,(.30+r*.35)*scale],b)
      }
    }
  }
  const {w,d}=def.ground
  // Trees behind the palace wall give every camera heading a finished horizon.
  for(let i=0;i<42;i++) {
    const a=i/42*Math.PI*2
    const x=Math.cos(a)*(w*.5+5+random(i+60)*6)
    const z=Math.sin(a)*(d*.5+7+random(i+90)*6)
    pine(x,z,i,1+random(i+30)*.35)
  }
  // Keep the historical palace's internal courtyards legible and uncluttered.
  for(let i=0;i<72;i++) {
    const side=i%2?-1:1
    const x=side*(w*.5-2.4-random(i+80)*1.5)
    const z=(random(i+100)-.5)*(d-8)
    if(def.rooms.some(r=>Math.abs(x-r.x)<r.w*.5+2.5 && Math.abs(z-r.z)<r.d*.5+3)) continue
    put('rock',0x979c8b,[x,.2,z],[.45+random(i)*.4,.3,.4],i)
    for(let j=0;j<3;j++) put('grass',0x68816a,[x+.5+j*.18,.16,z+.3],[.15,.36+random(i+j)*.22,.13],j)
    if(i%9===0) pine(x,z,i,.72)
  }
  for(const {shape,color,items} of batches.values()) {
    const mesh=new THREE.InstancedMesh(shapes[shape].clone(),new THREE.MeshLambertMaterial({color}),items.length)
    items.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix))
    mesh.instanceMatrix.needsUpdate=true
    mesh.castShadow=true; mesh.receiveShadow=true
    mesh.userData.noOcclude=true
    mesh.userData.castShadow=true
    root.add(mesh)
  }
  Object.values(shapes).forEach(g=>g.dispose())
  return root
}

export function makeHallSign(label) {
  const c=document.createElement('canvas'); c.width=512;c.height=160
  const g=c.getContext('2d')
  g.fillStyle='#192321';g.fillRect(0,0,512,160)
  g.strokeStyle='#c5af77';g.lineWidth=7;g.strokeRect(7,7,498,146)
  g.strokeStyle='#648279';g.lineWidth=2;g.strokeRect(19,19,474,122)
  g.font='bold 78px Batang, serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f0dbab'
  g.fillText(label,256,84,450)
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace
  return new THREE.Mesh(new THREE.PlaneGeometry(3.25,1.02),new THREE.MeshLambertMaterial({map:texture}))
}
