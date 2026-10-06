import * as THREE from 'three'
import { buildFigure, FIGURE_HEIGHT } from './yard-props.js'

// 달아나는 판에서 뒤를 쫓는 무리 — 4막의 난병, 5막의 군사.
//
// 2026-10-06 선생님: 「임오군란 군병들의 디자인이 거지같아. 힉스필드로 군병들을 제대로 만들어.」
// 그전에는 원기둥에 공을 얹은 그림자 아홉이었다. 이제 4막의 무리는 진짜 사람 꼴이다:
// 창을 든 구식 군인 · 횃불과 환도를 든 군인 · 몽둥이를 멘 도성의 백성. 교과서(115쪽)가 적는
// 그대로다 — 「구식 군인들의 봉기에 도시 빈민들도 합세하였다.」
//
// ⚠ 이름 없는 무리다. 특정한 사람을 그린 것이 아니다.
// ⚠ 모델은 뼈대 없는 한 덩어리 메시다(yard-props.js 의 buildFigure). 걷는 동작은 없고, 선 자리에서
//   들썩이고 좌우로 흔들린다 — 무리는 통째로 밀려온다(stageEvent 가 자리를 준다).
// ⚠ 모델이 아직 풀리지 않은 첫 순간에는 예전의 그림자가 대신 선다. 빈 마당이 쫓아오지는 않는다.

// 아홉 자리(셋씩 세 줄). 군인 여섯에 백성 셋 — 앞줄에 창과 횃불이 선다.
const CROWD = [
  'rioter_spear', 'rioter_torch', 'rioter_spear',
  'rioter_town', 'rioter_spear', 'rioter_torch',
  'rioter_torch', 'rioter_town', 'rioter_spear',
]
// 5막에서 쫓아오는 것은 청의 군사다(갑신정변 사흘째, 청군이 창덕궁으로 들어온다).
const FIGURES = { crowd: CROWD, soldiers: Array(9).fill('qing_soldier') }

// 자리마다 조금씩 어긋나게 — 줄 맞춰 선 군대가 아니라 몰려오는 무리다.
const JITTER = [[0, 0, 0], [.22, .3, .18], [-.18, .12, -.14], [.3, -.2, .1], [-.12, .26, -.2], [.16, -.1, .16], [-.28, .2, .08], [.1, .34, -.1], [-.2, -.16, .2]]

export function createCrisis(scene) {
  const group = new THREE.Group()
  group.visible = false
  scene.add(group)
  const actors = []
  for (let i = 0; i < 9; i++) {
    const root = new THREE.Group()
    const [jx, jz, jr] = JITTER[i]
    root.position.set((i % 3 - 1) * 1.7 + jx, 0, -Math.floor(i / 3) * 1.6 + jz)
    root.rotation.y = jr
    // 그림자(모델이 풀리기 전, 그리고 모델이 없는 5막의 군사)
    const shade = new THREE.Group()
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(.3, .47, 1.65, 7), new THREE.MeshLambertMaterial({ color: i % 2 ? 0x444a4b : 0x5f6660 }))
    coat.position.y = 1.15
    const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 7, 6), new THREE.MeshLambertMaterial({ color: 0xb39476 }))
    head.position.y = 2.17
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .10, 10), new THREE.MeshLambertMaterial({ color: 0x20282a }))
    hat.position.y = 2.33
    shade.add(coat, head, hat)
    root.add(shade)
    const figures = {}
    for (const [type, ids] of Object.entries(FIGURES)) {
      const fig = buildFigure(THREE, ids[i], FIGURE_HEIGHT * (ids[i] === 'rioter_town' ? .96 : 1))
      fig.visible = false
      // 횃불 든 군인은 제 불빛을 든다 — 밤의 궁에서 무리가 어디 있는지가 보인다.
      if (ids[i] === 'rioter_torch') {
        const flame = new THREE.PointLight(0xffa24a, 9, 9, 2)
        flame.position.set(.74, FIGURE_HEIGHT * .92, .16)
        fig.add(flame)
        fig.userData.flame = flame
        // 불꽃 — 모델을 만들 때 불길은 메시가 되지 못했다. 횃불 머리에 작은 불꽃을 얹는다.
        const fire = new THREE.Group()
        const outer = new THREE.Mesh(new THREE.ConeGeometry(.085, .28, 7), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .9 }))
        const inner = new THREE.Mesh(new THREE.ConeGeometry(.045, .18, 6), new THREE.MeshBasicMaterial({ color: 0xffe08a }))
        inner.position.y = -.03
        fire.add(outer, inner)
        fire.position.set(.74, FIGURE_HEIGHT * .905, .1)
        fig.add(fire)
        fig.userData.fire = fire
      }
      root.add(fig)
      figures[type] = fig
    }
    group.add(root)
    actors.push({ root, shade, figures, baseYaw: jr })
  }
  const warning = new THREE.PointLight(0xe18953, 12, 13, 2)
  warning.position.y = 2.5; group.add(warning)
  return {
    update(stage, time, reduced) {
      group.visible = !!stage && stage.type !== 'fire'
      if (!stage) return
      group.position.set(stage.x, 0, stage.z); group.rotation.y = stage.yaw
      actors.forEach((a, i) => {
        const fig = a.figures[stage.type] ?? null
        const ready = !!fig?.userData.ready
        for (const f of Object.values(a.figures)) f.visible = f === fig && ready
        a.shade.visible = !ready
        const k = time * .009 + i * 1.7
        a.root.position.y = reduced ? 0 : Math.abs(Math.sin(k)) * .07
        a.root.rotation.z = reduced ? 0 : Math.sin(k * .5) * .035
        a.root.rotation.y = a.baseYaw + (reduced ? 0 : Math.sin(k * .31) * .12)
        const flame = fig?.userData.flame
        if (flame) flame.intensity = reduced ? 9 : 8 + Math.sin(time * .021 + i) * 1.6 + Math.sin(time * .057 + i * 3) * .9
        const fire = fig?.userData.fire
        if (fire && !reduced) fire.scale.set(1 + Math.sin(time * .03 + i) * .12, 1 + Math.sin(time * .047 + i * 2) * .22, 1 + Math.cos(time * .033 + i) * .12)
      })
    },
    dispose() { scene.remove(group); group.traverse(o => { o.geometry?.dispose(); o.material?.dispose() }) },
  }
}
