# 생성된 턴어라운드 시트(2752x1536, 인물 넷이 한 줄)를 잘라
# 게임이 쓰는 스프라이트 아틀라스 하나로 묶는다.
#
# 왜 이 스크립트가 저장소에 있는가: 시트는 크레딧을 써서 만든 것이고,
# 아틀라스는 그 시트에서 기계적으로 유도된다. 유도 과정이 코드로 남아 있지 않으면
# 나중에 셀 크기나 압축률을 바꿀 때 다시 손으로 잘라야 한다.
#
#   python tools/cut-sheets.py
#
# 입력 : assets/sheets/*.png
# 출력 : src/render/atlas-data.js  (WebP data URI + 프레임 좌표)
#        tools/_contact.png        (사람이 눈으로 확인하는 대조 시트)

import base64, io, json, os, sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

# SPRITE_ROOT 로 다른 곳을 가리킬 수 있다 — 저장소를 건드리기 전에
# 임시 폴더에서 잘라 보고 눈으로 확인하는 데 쓴다.
ROOT = Path(os.environ.get('SPRITE_ROOT') or Path(__file__).resolve().parent.parent)
SHEETS = ROOT / 'assets' / 'sheets'
OUT_JS = ROOT / 'src' / 'render' / 'atlas-data.js'
CONTACT = ROOT / 'tools' / '_contact.png'

# 시트마다 인물 넷이 이 순서로 서 있다. 게임은 카메라와 인물의 각도로 하나를 고른다.
VIEWS = ['front', 'three_q', 'side', 'back']

# 아틀라스 한 칸. 2의 거듭제곱으로 잡는다 — 밉맵이 필요하기 때문이다.
# (카메라가 늘 같은 거리에 있어 인물이 화면에서 약 74px 로 줄어든다. 밉맵 없이
# 4배 축소하면 계단이 심하게 인다.)
#
# PAD 는 칸 둘레의 빈 띠다. 밉맵은 이웃 칸의 화소를 섞으므로, 여백이 없으면
# 멀리서 볼 때 아랫줄 인물의 머리가 윗줄 인물의 발밑에 번진다.
CELL_W, CELL_H, PAD = 128, 256, 8

# 배경 판정 관용도. 배경(#f4f4f4 근처)과 그 아래 옅은 그림자까지 삼키되
# 인물의 흰 동정(안쪽에 갇혀 있어 채우기가 닿지 못한다)은 남긴다.
BG_TOL = 40

# 등장 순서 = 아틀라스 행 순서. id 는 게임 코드가 쓰는 이름이다.
CAST = [
    ('king_child', 'king-child.png'),
    ('king_adult', 'king-adult.png'),
    ('regent',     'regent.png'),
    ('senior',     'senior.png'),
    ('mid',        'mid.png'),
    ('messenger',  'messenger.png'),
]


def background_mask(rgb):
    """테두리와 이어진 배경 화소를 True 로 돌려준다.

    단순 색 문턱만 쓰면 인물 안쪽의 흰 동정까지 지워진다. 그래서 색이 배경과
    비슷한 화소 중에서도 **테두리에서 걸어서 닿을 수 있는 것**만 배경으로 친다.
    """
    h, w, _ = rgb.shape
    corner = np.concatenate([
        rgb[:24, :24].reshape(-1, 3), rgb[:24, -24:].reshape(-1, 3),
        rgb[-24:, :24].reshape(-1, 3), rgb[-24:, -24:].reshape(-1, 3),
    ])
    bg = np.median(corner, axis=0)
    near = (np.abs(rgb.astype(np.int16) - bg.astype(np.int16)).max(axis=2) <= BG_TOL)

    # 주사선 채우기 — 화소 하나씩이 아니라 가로 구간 단위로 퍼뜨린다.
    filled = np.zeros((h, w), dtype=bool)
    stack = deque()
    for x in range(w):
        if near[0, x]:      stack.append((0, x))
        if near[h - 1, x]:  stack.append((h - 1, x))
    for y in range(h):
        if near[y, 0]:      stack.append((y, 0))
        if near[y, w - 1]:  stack.append((y, w - 1))

    while stack:
        y, x = stack.pop()
        if filled[y, x] or not near[y, x]:
            continue
        row_near, row_fill = near[y], filled[y]
        lo = x
        while lo > 0 and row_near[lo - 1] and not row_fill[lo - 1]:
            lo -= 1
        hi = x
        while hi < w - 1 and row_near[hi + 1] and not row_fill[hi + 1]:
            hi += 1
        row_fill[lo:hi + 1] = True
        for ny in (y - 1, y + 1):
            if 0 <= ny < h:
                seg_near, seg_fill = near[ny, lo:hi + 1], filled[ny, lo:hi + 1]
                idx = np.flatnonzero(seg_near & ~seg_fill)
                # 이어진 구간마다 한 점씩만 넣는다 — 스택이 폭발하지 않게.
                if idx.size:
                    breaks = np.flatnonzero(np.diff(idx) > 1)
                    for start in np.concatenate(([idx[0]], idx[breaks + 1])):
                        stack.append((ny, lo + int(start)))
    return filled


def clean_feet(rgb, alpha):
    """두 다리 사이에 갇힌 배경을 지운다.

    발밑 접지 그림자가 배경보다 짙어서 채우기의 벽이 된다. 그래서 옷자락 아래·
    두 구두 사이의 배경이 바깥과 끊겨 흰 조각으로 남는다. 인물의 **아래 25% 띠**
    에서만, 아주 밝고 색이 없는 화소를 지운다.

    문턱을 195/40 으로 잡은 이유: 갇힌 배경(244~255)과 옅은 그림자(200~240)는
    지우고, 전령의 행전 매듭 같은 밝은 베이지(≈176)는 남긴다. 이 띠 안에는
    여섯 인물 모두 짙은 구두와 옷자락뿐이고, 흰 동정과 사모의 잿빛 날개는
    위쪽에 있어 닿지 않는다.
    """
    ys = np.flatnonzero((alpha > 8).any(axis=1))
    if ys.size == 0:
        return alpha
    top, bot = int(ys[0]), int(ys[-1])
    band = bot - int(round((bot - top) * 0.25))
    strip = rgb[band:bot + 1].astype(np.int16)
    hi, lo = strip.max(axis=2), strip.min(axis=2)
    alpha[band:bot + 1][(hi > 195) & ((hi - lo) < 40)] = 0
    return alpha


def split_figures(alpha, expected=4):
    """열별 불투명 화소 수의 빈 구간을 찾아 인물 넷으로 가른다."""
    colsum = (alpha > 8).sum(axis=0)
    solid = colsum > 0
    spans, start = [], None
    for x, on in enumerate(solid):
        if on and start is None:
            start = x
        elif not on and start is not None:
            spans.append((start, x))
            start = None
    if start is not None:
        spans.append((start, len(solid)))
    # 티끌(배경에 남은 점) 제거 — 폭이 시트의 2% 미만이면 인물이 아니다.
    spans = [s for s in spans if s[1] - s[0] > alpha.shape[1] * 0.02]
    if len(spans) != expected:
        raise SystemExit(f'인물 {expected}명을 기대했는데 {len(spans)}개 구간을 찾았다: {spans}')
    return spans


def fit_cell(sprite):
    """인물을 칸의 빈 띠 안쪽에 비례를 지켜 넣는다. 가로 가운데, 세로 아래(발)를 맞춘다."""
    w, h = sprite.size
    scale = min((CELL_W - 2 * PAD) / w, (CELL_H - 2 * PAD) / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))

    # 알파를 곱한 뒤 줄이고 다시 나눈다 — 안 그러면 가장자리에 배경색이 번진다.
    arr = np.asarray(sprite).astype(np.float32)
    a = arr[..., 3:4] / 255.0
    pre = np.concatenate([arr[..., :3] * a, arr[..., 3:4]], axis=2)
    small = np.asarray(
        Image.fromarray(pre.astype(np.uint8), 'RGBA').resize((nw, nh), Image.LANCZOS)
    ).astype(np.float32)
    a2 = np.clip(small[..., 3:4] / 255.0, 1e-4, None)
    out = np.concatenate([np.clip(small[..., :3] / a2, 0, 255), small[..., 3:4]], axis=2)

    cell = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
    cell.paste(Image.fromarray(out.astype(np.uint8), 'RGBA'),
               ((CELL_W - nw) // 2, CELL_H - PAD - nh))
    return cell


def main():
    missing = [f for _, f in CAST if not (SHEETS / f).exists()]
    if missing:
        raise SystemExit(f'시트가 없다: {missing}')

    atlas = Image.new('RGBA', (CELL_W * len(VIEWS), CELL_H * len(CAST)), (0, 0, 0, 0))
    frames, report = {}, []

    for row, (cid, fname) in enumerate(CAST):
        img = Image.open(SHEETS / fname).convert('RGB')
        rgb = np.asarray(img)
        alpha = np.where(background_mask(rgb), 0, 255).astype(np.uint8)
        rgba = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')

        spans = split_figures(alpha)
        sizes = []
        for col, (x0, x1) in enumerate(spans):
            sub = alpha[:, x0:x1].copy()
            clean_feet(rgb[:, x0:x1], sub)
            strip = Image.fromarray(np.dstack([rgb[:, x0:x1], sub]), 'RGBA')
            box = strip.getbbox()          # 위아래 여백까지 잘라낸다
            fig = strip.crop(box)
            sizes.append(f'{fig.width}x{fig.height}')
            atlas.paste(fit_cell(fig), (col * CELL_W, row * CELL_H))
            frames[f'{cid}.{VIEWS[col]}'] = [col * CELL_W, row * CELL_H, CELL_W, CELL_H]
        report.append(f'  {cid:12s} {" ".join(sizes)}')

    print(f'아틀라스 {atlas.width}x{atlas.height}, 프레임 {len(frames)}개')
    print('\n'.join(report))

    atlas.save(CONTACT)   # 눈으로 확인하는 용도 (게임에 실리지 않는다)

    best = None
    for q in (92, 88, 84, 80, 76, 72):
        buf = io.BytesIO()
        atlas.save(buf, 'WEBP', quality=q, method=6, exact=False)
        data = buf.getvalue()
        print(f'  WebP q{q}: {len(data) / 1024:.0f} KB  (base64 {len(data) * 4 / 3 / 1024:.0f} KB)')
        if best is None:
            best = (q, data)
        if len(data) * 4 / 3 <= 700 * 1024:   # base64 로 부풀린 뒤 700KB 예산
            best = (q, data)
            break

    q, data = best
    uri = 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii')
    OUT_JS.write_text(
        '// 자동 생성 — 손으로 고치지 마라. `python tools/cut-sheets.py` 로 다시 만든다.\n'
        f'// 원본: assets/sheets/*.png, 칸 {CELL_W}x{CELL_H}, WebP q{q}, {len(data) / 1024:.0f} KB\n'
        '// 발은 칸 아래에서 pad 만큼 떠 있다 — 빌보드가 그만큼 되짚어 바닥에 붙인다.\n'
        f'export const CELL = {{ w: {CELL_W}, h: {CELL_H}, pad: {PAD} }}\n'
        f'export const ATLAS = {{ w: {CELL_W * len(VIEWS)}, h: {CELL_H * len(CAST)} }}\n'
        f'export const FRAMES = {json.dumps(frames, indent=2)}\n'
        f'export const ATLAS_URI = {json.dumps(uri)}\n',
        encoding='utf-8',
    )
    print(f'-> {OUT_JS.relative_to(ROOT)}  ({OUT_JS.stat().st_size / 1024:.0f} KB)')
    print(f'-> {CONTACT.relative_to(ROOT)}  (확인용)')


if __name__ == '__main__':
    sys.exit(main())
