function surface(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return { c, g: c.getContext('2d') }
}

export function woodGrain(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#78443d'
  g.fillRect(0, 0, size, size)
  for (let i = 0; i < size; i += 2) {
    g.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`
    g.beginPath()
    g.moveTo(i + Math.random() * 3, 0)
    g.lineTo(i + Math.random() * 3, size)
    g.stroke()
  }
  return c
}

export function dancheong(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#1d4f43'
  g.fillRect(0, 0, size, size)
  const bands = ['#984e40', '#3d8170', '#d9c69a', '#3a6273']
  const h = size / bands.length
  bands.forEach((col, i) => {
    g.fillStyle = col
    g.fillRect(0, i * h, size, h * 0.62)
  })
  g.globalAlpha = 0.5
  g.strokeStyle = '#e8e2d4'
  g.lineWidth = 2
  for (let x = 0; x < size; x += size / 8) {
    g.beginPath()
    g.arc(x + size / 16, size / 2, size / 20, 0, Math.PI * 2)
    g.stroke()
  }
  g.globalAlpha = 1
  return c
}

export function roofTile(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#40575e'
  g.fillRect(0, 0, size, size)
  const step = size / 8
  for (let x = 0; x < size; x += step) {
    const grd = g.createLinearGradient(x, 0, x + step, 0)
    grd.addColorStop(0, 'rgba(255,255,255,0.10)')
    grd.addColorStop(0.5, 'rgba(0,0,0,0.00)')
    grd.addColorStop(1, 'rgba(0,0,0,0.28)')
    g.fillStyle = grd
    g.fillRect(x, 0, step, size)
  }
  return c
}

export function baksok(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#b8b7a4'
  g.fillRect(0, 0, size, size)
  const step = size / 4
  g.strokeStyle = 'rgba(0,0,0,0.22)'
  g.lineWidth = 2
  for (let y = 0; y < size; y += step) {
    const off = (y / step) % 2 ? step / 2 : 0
    for (let x = -step; x < size; x += step) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`
      g.fillRect(x + off, y, step, step)
      g.strokeRect(x + off, y, step, step)
    }
  }
  return c
}

export function changhoji(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#efe6cf'
  g.fillRect(0, 0, size, size)

  // 문살 — 예전에는 굵은 격자 하나였다. 실제 창호는 가는 살이 촘촘하고, 아래쪽에
  // 굵은 틀(궁판)이 있다. 살을 가늘고 촘촘하게 하고 결을 얹으면 종이 느낌이 산다.
  const step = size / 10
  g.strokeStyle = '#9b7b52'
  g.lineWidth = Math.max(1, size / 150)
  for (let i = step; i < size; i += step) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, size); g.stroke()
    g.beginPath(); g.moveTo(0, i); g.lineTo(size, i); g.stroke()
  }
  // 문틀 — 네 변을 굵게
  g.strokeStyle = '#6d5232'
  g.lineWidth = Math.max(2, size / 40)
  g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, size - g.lineWidth, size - g.lineWidth)
  // 궁판 — 아래 5분의 1은 나무 판
  g.fillStyle = '#7d6242'
  g.fillRect(0, size * 0.82, size, size * 0.18)

  // 종이의 결 — 아주 옅게. 이것이 없으면 평평한 색면으로 보인다.
  g.globalAlpha = 0.05
  g.strokeStyle = '#b09a72'
  g.lineWidth = 1
  for (let i = 0; i < size; i += 3) {
    g.beginPath(); g.moveTo(0, i); g.lineTo(size, i + (i % 6 ? 1 : -1)); g.stroke()
  }
  g.globalAlpha = 1
  return c
}

// 마루 — 방 안 바닥. 예전에는 색 하나(0x6b5236)였고, 그래서 넓은 갈색 판으로만
// 보였다. 긴 널을 깔고 못 자국과 결을 넣는다.
export function maru(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#6b5236'
  g.fillRect(0, 0, size, size)
  const planks = 4
  const h = size / planks
  for (let i = 0; i < planks; i++) {
    // 널마다 색을 조금씩 다르게 — 같은 나무가 아니다
    const v = 1 + ((i * 37) % 11) / 45
    g.fillStyle = `rgb(${Math.round(107 * v)},${Math.round(82 * v)},${Math.round(54 * v)})`
    g.fillRect(0, i * h, size, h - 1)
    // 널 사이 틈
    g.fillStyle = '#2b2016'
    g.fillRect(0, i * h + h - Math.max(2, size / 90), size, Math.max(2, size / 90))
    // 결
    g.globalAlpha = 0.34
    g.strokeStyle = '#4a3826'
    g.lineWidth = 1
    for (let k = 0; k < 4; k++) {
      const y = i * h + 3 + k * (h / 5)
      g.beginPath()
      g.moveTo(0, y)
      g.bezierCurveTo(size * 0.3, y + 2, size * 0.6, y - 2, size, y + 1)
      g.stroke()
    }
    g.globalAlpha = 1
  }
  return c
}
