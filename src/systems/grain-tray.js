// 급료 가마의 낟알판 — 손으로 겨와 모래를 골라내는 자리의 판정.
//
// 2026-09-25 선생님: 「손으로 하는 일을 늘립니다 … 쌀에서 겨와 모래 골라내기(4막),
// 장계 도착 순서 맞추기(2·3막).」 4막 무위영은 그림 한 장과 「돌아간다」 단추뿐이어서,
// 학생이 하는 일이 읽는 것밖에 없었다. 겨와 모래를 제 손으로 집어내야 「이것이 급료다」가
// 글이 아니라 일이 된다. 화면(ui/ration.js)은 여기서 나온 판정을 그릴 뿐이다.
//
// ⚠ 비율을 주장하지 않는다. systems/prices.js 가 절대 쌀값을 화면에서 지운 것과 같은
//    이유다 — 「쌀 몇 알에 겨 몇 알」은 사료로 확인할 수 없다. 아래 CHAFF·SAND 수는
//    손으로 골라내는 일이 지루하지도, 한 번 누르고 끝나지도 않게 이 화면이 고른 수이고,
//    그 사실을 MIX_NOTE 가 화면에 그대로 적는다. 교과서가 확인해 주는 것은 「겨와 모래가
//    섞여 있었다」까지이고, 「겨」는 『매천야록』까지 올라간다(acts.js 의 soldierNote).
//    그러니 여기 수를 고쳐도 역사 서술은 달라지지 않는다 — 달라지면 그것이 잘못이다.
// ⚠ 시계를 붙이지 않는다. 촉박은 C1·C2·C3 세 번뿐이라는 것이 이 게임의 규칙이고
//    (ui/ration.js 의 같은 경고), 그래서 이 파일에는 시간을 재는 값이 하나도 없다.
//    남은 알 수만 센다 — 늦게 고르는 학생이 손해를 보는 자리가 아니다.
// ⚠ 쌀을 잘못 눌러도 벌하지 않는다. 이것은 반응 속도 시험이 아니라 역사 수업이다.
//    그래서 pick() 은 쌀을 「집어내지 않고」 한 줄 알려 주기만 한다.

// 낟알판의 좌표계. 화면 픽셀이 아니라 이 단위로만 셈한다 — 캔버스가 몇 px 이든
// ui 쪽에서 한 번만 곱하면 되고, 시험은 화면 없이 이 좌표로 짚어 볼 수 있다.
export const TRAY_W = 100
export const TRAY_H = 62

// 집는 손가락은 낟알보다 굵다. 낟알 반지름(약 2)보다 넉넉히 두어, 겨를 노렸는데
// 빈 곳이 눌리는 일이 없게 한다. 칸 간격(약 6.25)의 절반보다 크지만 hitAt() 이
// 「가장 가까운 것」을 고르므로 옆 낟알을 잘못 집지는 않는다.
export const PICK_RADIUS = 3.4

export const DEFAULTS = {
  total: 138,   // 120~150 알 — 한 화면에 들어오면서 손이 몇 번은 가야 하는 수
  chaff: 15,    // 누런 껍질
  sand: 10,     // 거칠고 각진 알갱이
  cols: 16,
  seed: 1882,
}

export const MIX_NOTE =
  '※ 손으로 골라내 보기 위한 재구성입니다. 낟알을 늘어놓은 것도, 겨와 모래를 몇 알로 둘지도 이 화면이 정한 것이고, 당시 섞인 비율을 나타낸 것은 아닙니다.'

export const RICE_NUDGE = '그건 쌀이다. 쌀은 남겨 둔다.'

// 같은 seed 면 같은 판이 나온다 — 시험이 「몇 알이 어디 있다」를 짚을 수 있어야 하고,
// 교실에서 두 학생이 서로 다른 판을 보고 다른 말을 하는 일도 막는다.
function rng(seed) {
  let a = (seed | 0) + 0x6d2b79f5
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

export function createTray(options = {}) {
  const o = { ...DEFAULTS, ...options }
  const total = Math.max(1, Math.round(o.total))
  const debris = Math.max(0, Math.round(o.chaff)) + Math.max(0, Math.round(o.sand))
  if (debris >= total) throw new Error('겨와 모래가 쌀보다 많을 수는 없다 — 급료는 쌀이다')

  const rand = rng(o.seed)
  const cols = Math.max(1, Math.round(o.cols))
  const rows = Math.ceil(total / cols)

  // 어느 자리를 겨·모래로 둘지 먼저 뽑는다. 골고루 흩어져야 한 곳만 문질러서
  // 끝나지 않는다 — 판 전체를 훑게 된다.
  const slots = Array.from({ length: total }, (_, i) => i)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }
  const kindAt = new Array(total).fill('rice')
  for (let i = 0; i < Math.round(o.chaff); i++) kindAt[slots[i]] = 'chaff'
  for (let i = 0; i < Math.round(o.sand); i++) kindAt[slots[Math.round(o.chaff) + i]] = 'sand'

  const cw = TRAY_W / cols
  const ch = TRAY_H / rows
  const grains = []
  for (let i = 0; i < total; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    grains.push({
      id: `g${i}`,
      kind: kindAt[i],
      // 자리를 조금씩 흔든다 — 격자로 줄지어 있으면 낟알이 아니라 표처럼 보인다
      x: clamp((col + 0.5) * cw + (rand() - 0.5) * cw * 0.55, 2, TRAY_W - 2),
      y: clamp((row + 0.5) * ch + (rand() - 0.5) * ch * 0.55, 2, TRAY_H - 2),
      size: 1.5 + rand() * 0.7,
      rot: rand() * Math.PI,
      tone: rand(),
      removed: false,
    })
  }
  return { grains, total, debris }
}

export function debrisLeft(tray) {
  return tray.grains.filter(g => !g.removed && g.kind !== 'rice').length
}

export function isSorted(tray) {
  return debrisLeft(tray) === 0
}

// 누른 자리에서 가장 가까운 낟알. 이미 집어낸 것은 없는 것으로 본다.
export function hitAt(tray, x, y, radius = PICK_RADIUS) {
  let best = null
  let bestD = radius * radius
  for (const g of tray.grains) {
    if (g.removed) continue
    const dx = g.x - x
    const dy = g.y - y
    const d = dx * dx + dy * dy
    if (d <= bestD) { best = g; bestD = d }
  }
  return best
}

// 집는다. 쌀은 집히지 않는다 — 판은 그대로 돌려주고 kind 로만 알려 준다.
export function pick(tray, id) {
  const i = tray.grains.findIndex(g => g.id === id)
  if (i < 0 || tray.grains[i].removed) return { tray, kind: null, taken: false }
  const kind = tray.grains[i].kind
  if (kind === 'rice') return { tray, kind, taken: false }
  const grains = tray.grains.slice()
  grains[i] = { ...grains[i], removed: true }
  return { tray: { ...tray, grains }, kind, taken: true }
}

// 「손이 불편하면 건너뛴다」가 누르는 것. 손가락이 마음대로 움직이지 않는 학생이
// 이 화면에서 갇히면 그 자리에서 수업이 멈춘다 — 골라낸 결과는 똑같이 준다.
export function pickAll(tray) {
  return { ...tray, grains: tray.grains.map(g => (g.kind === 'rice' ? g : { ...g, removed: true })) }
}

export function summary(tray) {
  const gone = k => tray.grains.filter(g => g.removed && g.kind === k).length
  return {
    chaff: gone('chaff'),
    sand: gone('sand'),
    left: tray.grains.filter(g => !g.removed).length,
    total: tray.total,
  }
}

export function countLabel(tray) {
  const n = debrisLeft(tray)
  if (n === 0) return '겨와 모래를 다 골라냈다'
  return `골라낼 것이 ${n}알 남았다`
}

// 다 골라낸 뒤에 화면이 내미는 한 줄. 이 화면의 전부가 여기 있다 — 남은 것이
// 「쌀」이 아니라 「열세 달치 급료」라는 것. 열세 달은 acts.js 의 4막 무위영 대사가
// 이미 말한 수다(『고등 한국사1』 p.115).
export function wageLine(tray, byHand = true) {
  const s = summary(tray)
  const how = byHand ? '골라낸' : '골라낸 것으로 친'
  return `${how} 것 — 겨 ${s.chaff}알, 모래 ${s.sand}알. 남은 ${s.left}알이 열세 달치 급료다.`
}
