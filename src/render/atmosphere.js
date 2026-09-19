import * as THREE from 'three'

// Decorative scenery only. Palace coordinates and access rules remain authoritative.
export function createAtmosphere(scene) {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { zenith: { value: new THREE.Color('#274861') }, horizon: { value: new THREE.Color('#b7bdba') } },
    vertexShader: 'varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 direction; uniform vec3 zenith; uniform vec3 horizon; void main(){ float h=clamp(normalize(direction).y,0.,1.); gl_FragColor=vec4(mix(horizon,zenith,pow(h,.45)),1.); }',
  })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 12), skyMaterial)
  dome.renderOrder = -10
  scene.add(dome)
  const scenery = new THREE.Group()
  scene.add(scenery)
  const lamps = []
  const localLights = Array.from({ length: 3 }, () => {
    const light = new THREE.PointLight(0xffb35e, 18, 15, 2)
    scene.add(light)
    return light
  })
  const moteGeo = new THREE.BufferGeometry()
  const positions = new Float32Array(120 * 3)
  for (let i = 0; i < 120; i++) {
    positions[i * 3] = Math.sin(i * 13.7) * 35
    positions[i * 3 + 1] = 1 + (i % 17) * .4
    positions[i * 3 + 2] = Math.cos(i * 7.1) * 40
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xf4d69a, size: .055, transparent: true, opacity: .45, depthWrite: false }))
  scene.add(motes)
  let night = false
  let mood = 'day', birds = null, smoke = null, birdPath = null, smokeSources = []
  const smokePose = new THREE.Object3D()
  function smokeVisibility() {
    if (smoke) smoke.visible = mood === 'dawnwinter' || mood === 'night'
  }
  function setMood(name) {
    mood = name
    smokeVisibility()
    night = name === 'night' || name === 'fire'
    const colours = {
      dawnwinter: ['#526e88', '#bbc0bb'], day: ['#5a7c95', '#c3ccc9'],
      daybreak: ['#594a67', '#ca9581'], night: ['#050e25', '#263c58'], fire: ['#190c17', '#73311f'],
    }[name] ?? ['#2d678a', '#c4d5d4']
    skyMaterial.uniforms.zenith.value.set(colours[0])
    skyMaterial.uniforms.horizon.value.set(colours[1])
    motes.material.color.set(name === 'fire' ? '#ff883c' : '#f4d69a')
    motes.material.opacity = night ? .6 : .25
  }
  function setPalace(def) {
    scenery.traverse(o => { o.geometry?.dispose(); o.material?.dispose() })
    scenery.clear()
    lamps.length = 0
    birds = null; smoke = null
    birdPath = def.yard?.birds
    smokeSources = (def.yard?.smokeSources ?? []).filter(s =>
      def.rooms.some(r => r.id === s.room && !r.burnt))
    // 궁 담 위로 가끔 지나는 새 셋 — 날개 두 획을 한 번에 그려 인물 모델 비용을 보태지 않는다.
    if (birdPath) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(36), 3))
      birds = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x35414a }))
      birds.name = 'yardBirds'
      scenery.add(birds)
    }
    // 온돌 굴뚝 연기는 불꽃이 아니다 — 겨울·밤에만 아주 옅게, 같은 구 도형 여덟을 돌려 쓴다.
    if (smokeSources.length) {
      smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshLambertMaterial({ color: 0xd0d5d1, transparent: true, opacity: .12, depthWrite: false }), smokeSources.length * 8)
      smoke.name = 'chimneySmoke'
      scenery.add(smoke)
    }
    animateYard(0)
    smokeVisibility()
    // Layered ridges beyond the playable wall; no claim to survey-grade geography.
    for (let layer = 0; layer < 3; layer++) {
      const ridge = new THREE.PlaneGeometry(420, 160, 84, 28)
      const points = ridge.attributes.position
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i)
        const depth=(points.getY(i)+80)/160
        const envelope=Math.pow(Math.sin(Math.PI*depth),1.35)
        const height=13+layer*5+19*Math.sin(x*.019+layer*1.8)**2
          + 6*Math.sin(x*.061+depth*3+layer)**2
        points.setZ(i,envelope*height-1)
      }
      ridge.computeVertexNormals()
      const mountain = new THREE.Mesh(ridge, new THREE.MeshLambertMaterial({
        color: [0x566361, 0x74817e, 0x8b9797][layer], side: THREE.DoubleSide,
      }))
      mountain.rotation.x=-Math.PI/2
      mountain.position.z = -def.ground.d / 2 - 92 - layer * 40
      scenery.add(mountain)
    }
    for (const room of def.rooms.filter(r => !r.burnt)) {
      for (const side of [-1, 1]) {
        const lamp = new THREE.Group()
        lamp.position.set(room.x + side * room.w * .3, 0, room.z + room.d * .36 + .5)
        const post = new THREE.Mesh(new THREE.CylinderGeometry(.07,.10,2.7,6), new THREE.MeshLambertMaterial({ color: 0x412c21 }))
        post.position.y = 1.35
        const box = new THREE.Mesh(new THREE.BoxGeometry(.48,.7,.48), new THREE.MeshBasicMaterial({ color: 0xffd894 }))
        box.position.y = 2.65
        const cap = new THREE.Mesh(new THREE.ConeGeometry(.48,.24,4), new THREE.MeshLambertMaterial({ color: 0x322b25 }))
        cap.rotation.y = Math.PI / 4; cap.position.y = 3.12
        lamp.add(post,box,cap)
        scenery.add(lamp)
        lamps.push(lamp.position.clone().setY(2.7))
      }
    }
  }
  function animateYard(time) {
    if (birds) {
      const phase = (time * .001) % 85
      birds.visible = phase < 45
      const p = birds.geometry.attributes.position
      for (let i = 0; i < 3; i++) {
        const x = birdPath.x + (Math.min(phase / 45, 1) - .5) * (birdPath.w - 4) + (i - 1) * .9
        const z = birdPath.z + (i - 1) * Math.min(.35, birdPath.d / 5)
        const y = birdPath.y + i * .25, wing = .18 + Math.sin(time * .002 + i) * .09
        p.setXYZ(i * 4, x - .45, y + wing, z)
        p.setXYZ(i * 4 + 1, x, y, z + .12)
        p.setXYZ(i * 4 + 2, x, y, z + .12)
        p.setXYZ(i * 4 + 3, x + .45, y + wing, z)
      }
      p.needsUpdate = true
      birds.geometry.computeBoundingSphere()
    }
    if (smoke) {
      smokeSources.forEach((s, j) => {
        for (let i = 0; i < 8; i++) {
          const rise = (time * .00007 + i / 8) % 1
          smokePose.position.set(s.x + rise * .55, s.y + .15 + rise * 3.4, s.z + Math.sin(rise * 4 + j) * .2)
          // 처음과 끝에서 작아지게 해 연기 덩이가 되감기는 순간이 도드라지지 않게 한다.
          smokePose.scale.setScalar(.03 + Math.sin(rise * Math.PI) * .36)
          smokePose.updateMatrix()
          smoke.setMatrixAt(j * 8 + i, smokePose.matrix)
        }
      })
      smoke.instanceMatrix.needsUpdate = true
      smoke.computeBoundingSphere()
    }
  }
  function update(time, player, reduced) {
    dome.position.set(player.x, 0, player.z)
    // 기존 먼지와 같은 reducedMotion 값을 쓴다 — 켜는 순간의 자리·날개·연기 크기까지 멈춘다.
    if (!reduced) animateYard(time)
    if (!reduced) motes.position.y = Math.sin(time * .0002) * .4
    const nearest = [...lamps].sort((a,b) => a.distanceToSquared(player)-b.distanceToSquared(player))
    localLights.forEach((light,i) => {
      light.visible = !!nearest[i]
      if (nearest[i]) light.position.copy(nearest[i])
      light.intensity = (night ? 24 : 9) * (reduced ? 1 : 1 + .05 * Math.sin(time * .005 + i))
    })
  }
  function dispose() {
    scenery.traverse(o => { o.geometry?.dispose(); o.material?.dispose() })
    scene.remove(scenery,dome,motes,...localLights)
    dome.geometry.dispose(); skyMaterial.dispose(); moteGeo.dispose(); motes.material.dispose()
  }
  return { setMood, setPalace, update, dispose }
}
