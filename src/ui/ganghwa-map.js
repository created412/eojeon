// 강화도 지도 — 실제 해안선을 대강이나마 그린 지도다.
//
// 왜 다시 그리는가. 선생님 지적 4번: **「강화도 지도도 제대로된 지도가 아니야.」**
// 예전 그림은 타원 하나였다 — 바다 위에 알 하나를 놓고 「강화도」라 적어 둔 것이라,
// 학생이 그 섬이 어디에 붙어 있는 섬인지 알 길이 없었다. 그런데 이 단원에서
// 강화도가 중요한 까닭이 바로 **어디에 있느냐**다: 한강 어귀에 놓여 있어서, 그 섬을
// 잡으면 한양으로 들어가는 물길이 막힌다. 위치가 곧 내용인 자리에서 위치를 지웠던 셈이다.
//
// 좌표는 경위도로 적고 여기서 화면에 옮긴다(project). 그래서 지도를 넓히거나
// 줄여도 표지가 따라 움직인다 — 예전에는 비트 데이터가 화면 비율(0~1)을 직접
// 들고 있어서, 지도를 손대는 순간 표지들이 엉뚱한 바다에 떠 있었다.
//
// Natural Earth 현대 해안선을 사용한다. 19세기 복원도와 구별해 화면에 출처를 적는다.

// 지도가 담는 범위 — 경기만. 강화도·교동도·석모도·영종도·김포·한양이 다 들어온다.
import { COAST_RINGS } from './ganghwa-coast-data.js'
export const BOX = { lon0: 126.18, lon1: 127.12, lat0: 37.36, lat1: 37.92 }

// 위도 37.6도에서 경도 1도는 위도 1도의 약 0.79배 길이다. 그 비를 지켜야 섬이
// 옆으로 늘어나지 않는다.
const LON_SCALE = Math.cos((37.64 * Math.PI) / 180)

export const MAP_W = 360
export const MAP_H = Math.round(
  MAP_W * ((BOX.lat1 - BOX.lat0) / ((BOX.lon1 - BOX.lon0) * LON_SCALE)))

export function project(lon, lat, w = MAP_W, h = MAP_H) {
  return {
    x: ((lon - BOX.lon0) / (BOX.lon1 - BOX.lon0)) * w,
    y: ((BOX.lat1 - lat) / (BOX.lat1 - BOX.lat0)) * h,
  }
}

// 장계가 가리키는 자리. 비트 데이터(data/acts.js)는 이 이름만 적는다.
// offmap 인 곳은 이 지도 밖이다 — 평양은 여기서 북쪽으로 사백 리다.
export const PLACES = {
  ganghwabu:    { lon: 126.485, lat: 37.747, name: '강화부' },
  gapgot:       { lon: 126.537, lat: 37.744, name: '갑곶' },
  gwangseongbo: { lon: 126.535, lat: 37.663, name: '광성보' },
  chojijin:     { lon: 126.523, lat: 37.617, name: '초지진' },
  jeongjoksan:  { lon: 126.487, lat: 37.630, name: '정족산성' },
  yeongjongjin: { lon: 126.512, lat: 37.494, name: '영종진' },
  ganghwaSea:   { lon: 126.586, lat: 37.560, name: '강화 앞바다' },
  hanyang:      { lon: 126.977, lat: 37.579, name: '한양' },
  pyeongyang:   { offmap: 'north', name: '평양' },
}

// ── 해안선 ────────────────────────────────────────────────────────────────
// 손으로 찍은 근사치다. 모양이 알아볼 만하면 된다 — 이 화면이 하는 일은 「강화도가
// 한강 어귀에 있다」를 눈으로 알리는 것이지 측량이 아니다.
// 동쪽 해안(126.52~126.55)이 곧 염하다 — 갑곶·광성보·초지진이 다 그 줄에 있다.
// 서남쪽은 마니산이 있는 화도 쪽으로 삐죽 나가고, 서해안 가운데는 만이 들어온다.
const GANGHWA = [
  [126.437, 37.792], [126.478, 37.784], [126.512, 37.768], [126.545, 37.750],
  [126.552, 37.724], [126.548, 37.698], [126.540, 37.672], [126.532, 37.646],
  [126.524, 37.622], [126.508, 37.600], [126.486, 37.586], [126.462, 37.578],
  [126.440, 37.586], [126.420, 37.598], [126.400, 37.612], [126.392, 37.632],
  [126.404, 37.648], [126.392, 37.668], [126.376, 37.688], [126.368, 37.712],
  [126.376, 37.740], [126.398, 37.766],
]
const SEONGMO = [
  [126.318, 37.740], [126.352, 37.732], [126.360, 37.700], [126.344, 37.672],
  [126.316, 37.664], [126.300, 37.690], [126.298, 37.720],
]
const GYODONG = [
  [126.238, 37.812], [126.300, 37.808], [126.322, 37.786], [126.300, 37.762],
  [126.252, 37.760], [126.226, 37.782],
]
const YEONGJONG = [
  [126.428, 37.520], [126.492, 37.524], [126.545, 37.512], [126.556, 37.486],
  [126.520, 37.462], [126.462, 37.466], [126.424, 37.492],
]
// 동쪽 뭍 — 김포에서 한양까지. 서쪽 가장자리가 곧 염하(강화해협)의 건너편이다.
const MAINLAND_E = [
  [126.580, 37.920], [127.120, 37.920], [127.120, 37.360], [126.660, 37.360],
  [126.648, 37.410], [126.630, 37.452], [126.640, 37.492], [126.620, 37.540],
  [126.600, 37.582], [126.580, 37.620], [126.568, 37.664], [126.566, 37.706],
  [126.560, 37.744], [126.562, 37.786], [126.570, 37.850],
]
// 서북쪽 뭍 — 황해도 연백. 이 뭍과 위 뭍 사이의 틈이 한강·임진강이 바다로 나가는 어귀다.
const MAINLAND_NW = [
  [126.180, 37.920], [126.556, 37.920], [126.548, 37.856], [126.500, 37.836],
  [126.452, 37.828], [126.404, 37.842], [126.352, 37.836], [126.300, 37.848],
  [126.240, 37.860], [126.180, 37.868],
]
// 한강 — 어귀에서 한양까지. 이 물길이 이 지도의 뜻 전부다.
const HAN_RIVER = [
  [126.55,37.78],[126.62,37.75],[126.68,37.68],[126.73,37.66],
  [126.80,37.60],[126.86,37.56],[126.93,37.52],[127.01,37.52],
]

// 지도 아래에 붙는 두 줄. **캔버스 안에 그리지 않는다** — 360px 안에 한 줄로 넣으면
// 글자가 잘린다(실제로 「…물길이 막」에서 끊겼다). 화면(ui/dispatch-map.js)이
// 글로 붙이면 좁은 태블릿에서 저절로 두 줄이 된다.
export const CAPTION = '강화도는 한강 어귀에 있다 — 이 섬을 잡으면 한양으로 가는 물길이 막힌다'
export const APPROX = 'Natural Earth 1:10m 해안선 · 현대 지형을 바탕으로 한 위치 안내도이며 19세기 해안선 복원도는 아닙니다.'

function path(g, pts, w, h) {
  g.beginPath()
  pts.forEach(([lon, lat], i) => {
    const p = project(lon, lat, w, h)
    if (i === 0) g.moveTo(p.x, p.y)
    else g.lineTo(p.x, p.y)
  })
}

/**
 * marks — [{ at: 'PLACES 의 키' }]. 도착한 장계가 가리키는 자리만 넘긴다.
 * 아직 오지 않은 일은 임금도 이 화면도 모른다.
 */
export function drawGanghwa(g, w = MAP_W, h = MAP_H, marks = []) {
  g.clearRect(0, 0, w, h)
  g.fillStyle = '#aebfc2'
  g.fillRect(0, 0, w, h)

  const land = (pts) => {
    path(g, pts, w, h)
    g.closePath()
    g.fillStyle = '#e7dfc7'
    g.fill()
    g.strokeStyle = '#6c817c'
    g.lineWidth = 1
    g.stroke()
  }
  for(const ring of COAST_RINGS)land(ring)

  // 한강 — 뭍 위에 바닷빛으로 긋는다
  path(g, HAN_RIVER, w, h)
  g.strokeStyle = '#aebfc2'
  g.lineWidth = 5
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.stroke()
  g.strokeStyle = '#809da5'
  g.lineWidth = 2
  g.stroke()

  g.font = '11px system-ui, sans-serif'
  const name = (lon, lat, text, color, dx = 0, dy = 0) => {
    const p = project(lon, lat, w, h)
    g.fillStyle = color
    g.fillText(text, p.x + dx, p.y + dy)
  }
  name(126.408, 37.700, '강화도', '#344c42', -14, 0)
  // 교동도 이름은 섬 아래에 적는다 — 위에 적으면 평양 화살표(지도 밖 표지)와 겹친다
  name(126.252, 37.752, '교동도', '#55655d', -8, 0)
  name(126.300, 37.706, '석모도', '#55655d', -14, 0)
  name(126.452, 37.494, '영종도', '#55655d', -12, 0)
  name(126.720, 37.680, '김포', '#55655d', 0, 0)
  name(126.320, 37.888, '황해도', '#55655d', 0, 0)
  name(126.800, 37.575, '한강', '#3b606b', 0, -6)
  name(126.27,37.52,'서 해','#537680')
  name(126.990,37.86,'북 ↑','#435e60')
  const scale=project(126.24,37.405,w,h),end=project(126.354,37.405,w,h)
  g.strokeStyle='#435e60';g.lineWidth=1.5;g.beginPath();g.moveTo(scale.x,scale.y);g.lineTo(end.x,end.y);g.stroke()
  g.fillStyle='#435e60';g.fillText('약 10 km',scale.x,scale.y-5)

  const hy = project(PLACES.hanyang.lon, PLACES.hanyang.lat, w, h)
  g.fillStyle = '#e0a23a'
  g.beginPath(); g.arc(hy.x, hy.y, 4.5, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#875221'
  g.fillText('한양', hy.x - 12, hy.y - 9)

  const placed = []   // 이미 이름을 적은 자리 — 겹치면 한 칸 내려 적는다
  for (const m of marks) {
    const place = PLACES[m.at]
    if (!place) continue
    if (place.offmap) {
      // 지도 밖이다. 위쪽 가장자리에 화살표로만 세운다 — 없는 자리에 점을 찍어
      // 「평양이 강화도 옆에 있다」고 가르치지 않는다.
      // 위쪽 가장자리에서 조금 내려 세운다 — 맨 위 줄에는 「황해도」가 적혀 있어
      // 겹쳤다. 화살표만으로 「이 위로 한참」을 말한다.
      const x = w * 0.14
      g.strokeStyle = 'rgba(210,80,58,0.9)'
      g.fillStyle = 'rgba(210,80,58,0.9)'
      g.lineWidth = 2
      g.beginPath(); g.moveTo(x, 62); g.lineTo(x, 40); g.stroke()
      g.beginPath(); g.moveTo(x - 5, 47); g.lineTo(x, 37); g.lineTo(x + 5, 47); g.closePath(); g.fill()
      g.font = '11px system-ui, sans-serif'
      g.fillText(place.name + ' — 지도 밖, 북쪽으로', x + 9, 52)
      g.fillText('사백 리', x + 9, 66)
      continue
    }
    const p = project(place.lon, place.lat, w, h)
    g.fillStyle = 'rgba(210,80,58,0.92)'
    g.beginPath(); g.arc(p.x, p.y, 5, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(210,80,58,0.35)'
    g.lineWidth = 2
    g.beginPath(); g.arc(p.x, p.y, 11, 0, Math.PI * 2); g.stroke()
    g.fillStyle = '#e8b0a0'
    g.font = '11px system-ui, sans-serif'
    // 광성보와 초지진처럼 붙어 있는 자리는 이름이 서로를 덮는다 — 겹치면 내려 적는다.
    let dy = 4
    while (placed.some(q => Math.abs(q.x - p.x) < 60 && Math.abs(q.y - (p.y + dy)) < 12)) dy += 14
    placed.push({ x: p.x, y: p.y + dy })
    g.fillText(place.name, p.x + 13, p.y + dy)
  }

}
