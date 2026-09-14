import { FEEDBACK_MEDIA } from '../ui/feedback-media-data.js'

// The supplied raster has an opaque background. Clip the display geometry to
// the figure instead of showing a rectangular studio backdrop in the palace.
export const MOTHER_OUTLINE = [[49,2],[53,2],[56,3.5],[57.5,5.5],[58,8],[57,12],[55,14.3],[55,17.6],[60,19],[63,22],[65,27],[69,32],[69,38],[68,43],[72,48],[76,61],[80,75],[85,88],[83,90],[75,91],[75,93],[63,93],[63,95],[60,96],[55,96],[55,97],[49,98],[46,97],[44,96],[44,94],[33,94],[30,93],[25,92],[20,92],[16,91],[15.5,90],[20,78],[23,66],[26,53],[31,44],[34,39],[33,37],[33,30],[32,25],[33,22],[35,20],[39,18],[43,17],[43,14],[40,14],[39,12],[41,9],[42,6],[44,4],[47,2.5]]
export const MOTHER_CLIP = `polygon(${MOTHER_OUTLINE.map(([x,y])=>`${x}% ${y}%`).join(',')})`

export function buildMother(THREE) {
  const pivot = new THREE.Group(), h = 3.05, w = h * 2 / 3
  const shape = new THREE.Shape(MOTHER_OUTLINE.map(([x,y]) => new THREE.Vector2((x / 100 - .5) * w, (1 - y / 100) * h - 1.8)))
  const geometry = new THREE.ShapeGeometry(shape)
  const positions = geometry.attributes.position, uv = geometry.attributes.uv
  for (let i = 0; i < positions.count; i++) uv.setXY(i, positions.getX(i) / w + .5, (positions.getY(i) + 1.8) / h)
  const texture = new THREE.TextureLoader().load(FEEDBACK_MEDIA.mother)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  pivot.add(mesh)
  const shadowGeometry = new THREE.CircleGeometry(.38, 24)
  const shadowMaterial = new THREE.MeshBasicMaterial({color:0x16100c,transparent:true,opacity:.2,depthWrite:false})
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -1.68
  pivot.add(shadow)
  const rotation = new THREE.Quaternion()
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    pivot.parent?.getWorldQuaternion(rotation)
    pivot.quaternion.copy(rotation.invert()).multiply(camera.quaternion)
    pivot.updateMatrixWorld(true)
  }
  pivot.userData.disposeFigure = () => { geometry.dispose(); material.dispose(); texture.dispose(); shadowGeometry.dispose(); shadowMaterial.dispose() }
  return { pivot, mesh, topY: h - 1.8 }
}
