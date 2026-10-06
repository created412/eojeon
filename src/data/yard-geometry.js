// 선생님(2026-10-06): 「궁궐 파란 물 위를 그냥 걸을 수 있어 물 위 못걷게 수정」
// 보이는 물길과 연못을 이동·길 찾기·사람 배치가 함께 피한다.
// 다리 판과 물 위에 걸친 정자 마루만 보행면으로 남긴다.
export function pavilionFloor(pavilion) {
  return { ...pavilion, w: pavilion.w - .9, d: pavilion.d - .9 }
}

function bounds({ x, z, w, d }) {
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }
}

function waterExceptFloor(id, water, floor) {
  const b = bounds(water)
  if (!floor) return [{ id, ...b }]
  const f = bounds(floor)
  const x0 = Math.max(b.x0, f.x0), x1 = Math.min(b.x1, f.x1)
  const z0 = Math.max(b.z0, f.z0), z1 = Math.min(b.z1, f.z1)
  if (x0 >= x1 || z0 >= z1) return [{ id, ...b }]
  return [
    { id, x0: b.x0, x1: x0, z0: b.z0, z1: b.z1 },
    { id, x0: x1, x1: b.x1, z0: b.z0, z1: b.z1 },
    { id, x0, x1, z0: b.z0, z1: z0 },
    { id, x0, x1, z0: z1, z1: b.z1 },
  ].filter(r => r.x1 > r.x0 && r.z1 > r.z0)
}

export function yardWaterObstacles(yard = {}) {
  const out = [], b = yard.bridge, p = yard.pond
  if (b) out.push(...waterExceptFloor('water:stream',
    { x: b.x, z: b.z, w: b.streamW, d: b.streamD }, b))
  if (p) out.push(...waterExceptFloor('water:pond', p,
    p.pavilion ? pavilionFloor(p.pavilion) : null))
  return out
}
