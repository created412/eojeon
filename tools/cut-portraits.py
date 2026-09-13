# 턴어라운드 시트에서 **정면 한 사람**을 떼어 대화 화면의 입회 그림으로 만든다.
#
# 왜 필요한가. 선생님: "아버지 흥선대원군이 말할때 흥선대원군 얼굴이 뜨면서
# 말하는 형태여야지, 독립군의 별 인물들 대화하는것처럼."
#
# 새로 그리지 않고 이미 있는 시트에서 잘라 오는 까닭: 그 시트가 3D 인물(GLB)을 만든
# 바로 그 그림이다. 따로 그리면 대화창의 얼굴과 화면에 선 사람이 서로 다른 사람이 된다.
#
#   python tools/cut-portraits.py
#
# 입력 : assets/sheets/*.png       (2752x1536, 정면·비스듬·옆·뒤 넷)
# 출력 : src/ui/portraits-data.js  (WebP data URI)
#        tools/_portraits.png      (사람이 눈으로 확인하는 대조 시트)

import base64, io, os
from pathlib import Path

import numpy as np
from PIL import Image

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module
_cs = import_module('cut-sheets')

ROOT = Path(os.environ.get('SPRITE_ROOT') or Path(__file__).resolve().parent.parent)
SHEETS = ROOT / 'assets' / 'sheets'
OUT_JS = ROOT / 'src' / 'ui' / 'portraits-data.js'
CONTACT = ROOT / 'tools' / '_portraits.png'

# 대화창에 설 사람들. 키는 data/npcs.js 의 rank 와 짝이다(king 은 나이로 갈린다).
CAST = [
    ('king_child', 'king-child.png'),
    ('king_adult', 'king-adult.png'),
    ('regent',     'regent.png'),
    ('senior',     'senior.png'),
    ('mid',        'mid.png'),
    ('messenger',  'messenger.png'),
]

# 입회 그림의 높이. 화면에서 최대 660px 로 서므로 두 배까지 갈 것 없다.
PORTRAIT_H = 620


def cut_front(path):
    im = Image.open(path).convert('RGB')
    rgb = np.asarray(im)
    alpha = np.where(_cs.background_mask(rgb), 0, 255).astype(np.uint8)
    alpha = _cs.clean_feet(rgb, alpha)
    spans = _cs.split_figures(alpha, expected=4)
    x0, x1 = spans[0]                      # 맨 왼쪽이 정면이다
    sub_a = alpha[:, x0:x1]
    ys = np.flatnonzero((sub_a > 8).any(axis=1))
    y0, y1 = int(ys[0]), int(ys[-1])
    out = np.dstack([rgb[y0:y1 + 1, x0:x1], sub_a[y0:y1 + 1]])
    img = Image.fromarray(out, 'RGBA')
    h = PORTRAIT_H
    w = max(1, round(img.width * h / img.height))
    return img.resize((w, h), Image.LANCZOS)


def main():
    entries, shots, total = [], [], 0
    for key, name in CAST:
        src = SHEETS / name
        if not src.exists():
            raise SystemExit(f'시트가 없다: {src}')
        img = cut_front(src)
        buf = io.BytesIO()
        img.save(buf, 'WEBP', quality=86, method=6)
        data = buf.getvalue()
        total += len(data)
        print(f'  {key:12} {img.width}x{img.height}  {len(data)/1024:6.1f} KB')
        entries.append((key, 'data:image/webp;base64,' + base64.b64encode(data).decode()))
        shots.append(img)

    # 대조 시트 — 눈으로 한 번 본다
    pad = 12
    W = sum(s.width for s in shots) + pad * (len(shots) + 1)
    H = PORTRAIT_H + pad * 2
    sheet = Image.new('RGBA', (W, H), (26, 31, 36, 255))
    x = pad
    for s in shots:
        sheet.alpha_composite(s, (x, pad))
        x += s.width + pad
    sheet.convert('RGB').save(CONTACT)

    OUT_JS.write_text(
        '// 자동 생성 — 손으로 고치지 마라. `python tools/cut-portraits.py` 로 다시 만든다.\n'
        '// 턴어라운드 시트(assets/sheets)의 **정면**을 떼어 낸 것이다. 3D 인물(GLB)을 만든\n'
        '// 바로 그 그림이라, 대화창의 얼굴과 화면에 선 사람이 같은 사람이다.\n'
        f'// 합계 {total/1024:.0f} KB · 높이 {PORTRAIT_H}px\n'
        'export const PORTRAITS = {\n'
        + ''.join(f'  {k}: {v!r},\n'.replace("'", '"') for k, v in entries)
        + '}\n', encoding='utf8')
    print(f'합계 {total/1024:.0f} KB -> {OUT_JS.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
