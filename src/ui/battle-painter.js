// 선생님(2026-10-06): 「힉스필드를 이용해서 진짜 게임같이」.
// 이름 없는 병사의 복식·움직임과 화약 효과는 전투를 읽기 위한 재구성이다.
// 판정은 각 systems 모듈에만 둔다. 그림의 시간은 호출자가 넘긴 게임 시계다.
export function drawInfantry(g, x, y, scale, { side = 'french', phase = 0, held = false, facing = -1 } = {}) {
  g.save(); g.translate(x, y); g.scale(scale * facing, scale)
  const stride = held ? 0 : Math.sin(phase) * 5
  const bob = held ? 3 : Math.abs(Math.cos(phase)) * 1.1
  g.fillStyle = '#080b0b50'; g.beginPath(); g.ellipse(0, 1, 12, 3, 0, 0, Math.PI * 2); g.fill()
  g.translate(0, bob)
  const korean = side === 'korean'
  g.strokeStyle = korean ? '#a6aaa1' : '#667b83'; g.lineWidth = 5; g.lineCap = 'round'
  for (const sign of [-1, 1]) {
    g.beginPath(); g.moveTo(sign * 3, -16); g.lineTo(sign * 3 + stride * sign * .5, -8); g.lineTo(sign * 3 - stride * sign, -1); g.stroke()
    g.strokeStyle = '#181b1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(sign * 3 - stride * sign, -1); g.lineTo(sign * 3 - stride * sign + 4, -1); g.stroke()
    g.strokeStyle = korean ? '#a6aaa1' : '#667b83'; g.lineWidth = 5
  }
  const coat = g.createLinearGradient(-7, -30, 7, -14)
  coat.addColorStop(0, korean ? '#f0e9d5' : '#3f5360'); coat.addColorStop(1, korean ? '#a8ab9d' : '#172b3b')
  g.fillStyle = coat; g.beginPath(); g.moveTo(-6, -32); g.quadraticCurveTo(0, -35, 6, -31); g.lineTo(8, -15); g.lineTo(-8, -15); g.closePath(); g.fill()
  g.strokeStyle = '#d4c9a8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4, -31); g.lineTo(4, -17); g.stroke()
  g.fillStyle = '#211e19'; g.fillRect(-8, -18, 16, 2); g.fillRect(-7, -24, 5, 6)
  g.fillStyle = '#b99b7d'; g.beginPath(); g.ellipse(1, -37, 4, 5, -.12, 0, Math.PI * 2); g.fill(); g.fillRect(3, -38, 3, 2)
  g.fillStyle = korean ? '#252720' : '#1d3040'; g.beginPath(); g.moveTo(-5, -39); g.lineTo(-4, -44); g.lineTo(4, -43); g.lineTo(6, -39); g.closePath(); g.fill()
  g.strokeStyle = '#121e23'; g.lineWidth = 2; g.beginPath(); g.moveTo(-5, -39); g.lineTo(korean ? 9 : 7, -39); g.stroke()
  // Long musket and bayonet; elbows remain visible against the coat.
  g.strokeStyle = '#574331'; g.lineWidth = 3; g.beginPath(); g.moveTo(-4, -20); g.lineTo(19, -32); g.stroke()
  g.strokeStyle = '#adb6b2'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(4, -26); g.lineTo(28, -38); g.stroke()
  g.strokeStyle = korean ? '#d9d8c6' : '#3c5260'; g.lineWidth = 4; g.beginPath(); g.moveTo(-3, -29); g.lineTo(3, -23); g.lineTo(10, -28); g.stroke()
  g.fillStyle = '#c5a486'; g.beginPath(); g.arc(10, -28, 2, 0, Math.PI * 2); g.fill()
  g.restore()
}

export function drawBlast(g, x, y, radius, progress, water = false) {
  const k = Math.max(0, Math.min(1, progress))
  g.save(); g.translate(x, y)
  if (water) {
    g.strokeStyle = `rgba(221,243,245,${1 - k})`; g.lineWidth = 2.5
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(0, 1 + i * 3, 8 + k * radius * (1 + i * .3), 3 + k * 11, 0, 0, Math.PI * 2); g.stroke() }
  } else if (k < .45) {
    const glow = g.createRadialGradient(0, 0, 0, 0, 0, radius)
    glow.addColorStop(0, `rgba(255,245,197,${1 - k * 2})`); glow.addColorStop(.3, `rgba(244,159,71,${.8 - k})`); glow.addColorStop(1, '#e76d1800')
    g.fillStyle = glow; g.fillRect(-radius, -radius, radius * 2, radius * 2)
  }
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.399, spread = radius * (.15 + k * .7)
    const dx = Math.cos(angle) * spread, dy = -Math.abs(Math.sin(angle)) * spread - k * radius * .65
    g.fillStyle = water ? `rgba(209,235,236,${(1 - k) * .6})` : `rgba(${76 + i * 4},${77 + i * 3},${69 + i * 3},${(1 - k) * .36})`
    g.beginPath(); g.ellipse(dx, dy, water ? 3 + (1 - k) * 5 : radius * (.17 + k * .4), water ? 7 + (1 - k) * 12 : radius * (.14 + k * .34), angle, 0, Math.PI * 2); g.fill()
    if (!water) { g.fillStyle = `rgba(190,158,109,${1 - k})`; g.fillRect(Math.cos(angle) * radius * k * 1.5, Math.sin(angle) * radius * k - radius * k * (1 - k), 3, 2) }
  }
  g.restore()
}

export function drawCover(g, image, width, height) {
  if (!image?.complete || !image.naturalWidth) return false
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const w = image.naturalWidth * scale, h = image.naturalHeight * scale
  g.drawImage(image, (width - w) / 2, (height - h) / 2, w, h)
  return true
}
