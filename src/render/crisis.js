import * as THREE from 'three'

export function createCrisis(scene) {
  const group = new THREE.Group()
  group.visible = false
  scene.add(group)
  const actors = []
  // Anonymous silhouettes visualize the advancing front, not historical individuals.
  for (let i=0;i<9;i++) {
    const person = new THREE.Group()
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(.3,.47,1.65,7),new THREE.MeshLambertMaterial({color:i%2?0x444a4b:0x5f6660}))
    coat.position.y = 1.15
    const head = new THREE.Mesh(new THREE.SphereGeometry(.22,7,6),new THREE.MeshLambertMaterial({color:0xb39476}))
    head.position.y = 2.17
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.10,10),new THREE.MeshLambertMaterial({color:0x20282a}))
    hat.position.y=2.33
    person.add(coat,head,hat)
    person.position.set((i%3-1)*1.3,0,-Math.floor(i/3)*1.3)
    group.add(person); actors.push(person)
  }
  const warning = new THREE.PointLight(0xe18953,12,13,2)
  warning.position.y=2.5; group.add(warning)
  return {
    update(stage,time,reduced) {
      group.visible = !!stage && stage.type !== 'fire'
      if (!stage) return
      group.position.set(stage.x,0,stage.z); group.rotation.y=stage.yaw
      actors.forEach((p,i) => { p.position.y = reduced ? 0 : Math.abs(Math.sin(time*.009+i))*.06 })
    },
    dispose() { scene.remove(group); group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()}) },
  }
}
