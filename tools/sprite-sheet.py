"""Seedance 걷기 영상 → 인물 스프라이트 시트.

영상 한 편에는 같은 인물이 네 방향(앞·비스듬·옆·뒤)으로 나란히 서서 제자리걸음을 한다
(배경은 단색 마젠타). 이 스크립트가
  1) 프레임을 뽑고 마젠타를 지워 알파를 만든다(가장자리 마젠타 번짐도 뺀다),
  2) 네 인물을 세로 빈 띠로 가른다,
  3) 옆모습의 움직임으로 한 걸음 주기를 찾아 그 한 주기에서 FRAMES 장을 고르게 뽑는다,
  4) 행 = 방향, 열 0 = 서 있는 자세(영상 첫 프레임 = 기준 그림), 열 1..FRAMES = 걸음 프레임인 시트(WebP)로 붙인다. 발끝은 칸 아래 PAD 줄에 맞춘다.

사용: python tools/sprite-sheet.py <영상.mp4> <출력.webp> [--flip 0,1,0,0]
  --flip  방향마다 좌우를 뒤집을지. 시트의 비스듬·옆은 화면 **오른쪽**을 봐야 한다 — facing.js 가 mirror=false 일 때 인물이 +x(화면 오른쪽)를 보는 것으로 계산한다. 기준 그림을 오른쪽으로 그리게 해 두어 보통은 뒤집지 않는다.
출력 옆에 <출력>.json 으로 칸 크기·주기를 적는다.
"""
import sys, os, json, glob, subprocess, tempfile, argparse
import numpy as np
from PIL import Image, ImageFilter
import imageio_ffmpeg

CELL_W, CELL_H, PAD = int(os.environ.get('CELL_W', 128)), int(os.environ.get('CELL_H', 256)), 5
FRAMES = int(os.environ.get('FRAMES', 8))
VIEWS = ['front', 'three_q', 'side', 'back']


def frames_of(mp4):
    d = tempfile.mkdtemp()
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-loglevel', 'error', '-y', '-i', mp4, os.path.join(d, '%03d.png')], check=True)
    return [np.asarray(Image.open(f).convert('RGB')).astype(np.float32) for f in sorted(glob.glob(os.path.join(d, '*.png')))]


def background_chroma(frame):
    # 영상마다 배경이 조금씩 다르다 — 순마젠타가 아니라 보랏빛으로 나온 것, 가장자리만 분홍으로 밝아진 것(비네팅)도 있다.
    # 그래서 배경 색도 후보를 여럿 둔다: 테두리 중앙값 · 위쪽 가운데 띠 중앙값 · 순마젠타.
    def chroma(px):
        c = np.median(px.reshape(-1, 3), axis=0)
        return c / max(c.max(), 1)
    W = frame.shape[1]
    border = np.concatenate([frame[:6].reshape(-1, 3), frame[-6:].reshape(-1, 3), frame[:, :6].reshape(-1, 3), frame[:, -6:].reshape(-1, 3)])
    return np.array([chroma(border), chroma(frame[:8, W // 3: 2 * W // 3]), [1.0, 0.0, 1.0]])


def key(rgb, bgcs):
    hi = np.maximum(rgb.max(axis=2), 1)[..., None]
    c = rgb / hi
    # 색도(밝기로 나눈 색)가 배경 후보 가운데 가장 가까운 것과 얼마나 먼가 — 발밑의 어두운 분홍 그늘도 같은 색도라 배경으로 빠진다.
    d = np.min([np.linalg.norm(c - b, axis=2) for b in bgcs], axis=0)
    alpha = np.clip((d - 0.16) / 0.14, 0, 1)
    return rgb, alpha


def split_columns(alphas, n=4):
    occ = np.max([a.max(axis=0) for a in alphas], axis=0) > 0.5
    runs, start = [], None
    for x, v in enumerate(occ):
        if v and start is None: start = x
        if not v and start is not None: runs.append([start, x]); start = None
    if start is not None: runs.append([start, len(occ)])
    runs = [r for r in runs if r[1] - r[0] >= 24]      # 가장자리 잡티
    # 소매·깃 끝이 떨어져 생긴 작은 조각은 가까운 덩어리에 붙인다
    while len(runs) > n:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = int(np.argmin(gaps)); runs[i] = [runs[i][0], runs[i + 1][1]]; del runs[i + 1]
    if len(runs) == n:
        return runs
    # 소매가 옆 인물과 닿아 빈 띠가 없다 — 네 등분 자리 근처에서 인물이 가장 얇은 세로줄로 가른다.
    W = alphas[0].shape[1]
    thick = np.max([(a > 0.5).sum(axis=0) for a in alphas[::6]], axis=0)
    cuts = [0]
    for k in range(1, n):
        c = round(k * W / n); lo, hi = c - 70, c + 70
        cuts.append(lo + int(np.argmin(thick[lo:hi])))
    cuts.append(W)
    return [[cuts[i], cuts[i + 1]] for i in range(n)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mp4'); ap.add_argument('out')
    ap.add_argument('--flip', default='0,0,0,0')
    ap.add_argument('--quality', type=int, default=70)
    ap.add_argument('--skip', type=int, default=4, help='앞의 몇 프레임은 버린다(첫 장면이 흔들린다)')
    a = ap.parse_args()
    flips = [s == '1' for s in a.flip.split(',')]

    raw = frames_of(a.mp4)
    bgc = background_chroma(raw[0])
    keyed = [key(f, bgc) for f in raw]
    alphas = [k[1] for k in keyed]
    cols = split_columns(alphas)

    # 걸음 주기 — 옆모습(움직임이 가장 크다) 알파의 차이가 가장 작아지는 간격.
    x0, x1 = cols[2]
    side = np.array([al[:, x0:x1] for al in alphas])
    s0 = a.skip
    best = None
    for p in range(10, min(60, len(side) - s0 - 4)):
        n = len(side) - s0 - p
        d = float(np.mean([np.abs(side[s0 + i] - side[s0 + i + p]).mean() for i in range(n)]))
        if best is None or d < best[1] - 1e-6: best = (p, d)
    period = best[0]
    # 첫 주기 안에서 FRAMES 장. 제자리 걸음이 조금씩 흐르는 영상도 있어 가운데 주기를 쓴다.
    start = s0 + max(0, (len(side) - s0 - period) // 2)
    pick = [0] + [start + round(i * period / FRAMES) for i in range(FRAMES)]   # 0 = 서 있는 자세

    H = raw[0].shape[0]
    # 방향마다 선택 프레임 전체의 경계 상자(합집합) — 칸 안에서 인물이 떨지 않게 한 번만 정한다.
    boxes = []
    for (cx0, cx1) in cols:
        m = np.max([alphas[i][:, cx0:cx1] for i in pick], axis=0) > 0.3
        ys, xs = np.where(m)
        boxes.append((cx0 + xs.min(), ys.min(), cx0 + xs.max() + 1, ys.max() + 1))
    tallest = max(b[3] - b[1] for b in boxes)
    widest = max(b[2] - b[0] for b in boxes)
    scale = min((CELL_H - 2 * PAD) / tallest, (CELL_W - 2) / widest)

    sheet = Image.new('RGBA', (CELL_W * len(pick), CELL_H * len(VIEWS)), (0, 0, 0, 0))
    for v, (bx0, by0, bx1, by1) in enumerate(boxes):
        cxm = (bx0 + bx1) / 2
        for c, i in enumerate(pick):
            rgb, al = keyed[i]
            # 알파는 반만 남긴다(0/255) — 게임은 alphaTest 로 자르므로 반투명 가장자리는 쓰이지 않고, 딱 끊긴 알파가 훨씬 작게 압축된다.
            # 가장자리 한 화소를 깎는다 — 마젠타와 섞인 테두리가 보랏빛 윤곽선으로 남지 않게.
            hard = np.asarray(Image.fromarray(((al > 0.45) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
            rgba = np.dstack([rgb * hard[..., None], hard * 255]).astype(np.uint8)
            im = Image.fromarray(rgba, 'RGBA').crop((bx0, by0, bx1, by1))
            if flips[v]: im = im.transpose(Image.FLIP_LEFT_RIGHT)
            w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
            im = im.resize((w, h), Image.BOX)
            ox = c * CELL_W + (CELL_W - w) // 2
            oy = v * CELL_H + CELL_H - PAD - h            # 발끝을 칸 아래 PAD 줄에
            sheet.alpha_composite(im, (ox, oy))
    sheet.save(a.out, 'WEBP', quality=a.quality, method=6)
    meta = {'cell': {'w': CELL_W, 'h': CELL_H, 'pad': PAD}, 'frames': FRAMES, 'idleColumn': 0, 'views': VIEWS,
            'periodFrames': period, 'fps': 24, 'cycleMs': round(period / 24 * 1000)}
    json.dump(meta, open(os.path.splitext(a.out)[0] + '.json', 'w'), indent=1)
    print(a.out, os.path.getsize(a.out) // 1024, 'KB', meta['cycleMs'], 'ms cycle', 'cols', cols)


if __name__ == '__main__':
    main()
