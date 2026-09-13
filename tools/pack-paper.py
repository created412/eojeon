# 생성한 종이·배경 그림을 게임에 실을 수 있게 줄이고 묶는다.
#
#   python tools/pack-paper.py
#
# 입력 : assets/paper/*.png        (Higgsfield 로 만든 원본, 개당 5~7MB)
# 출력 : src/ui/paper-data.js      (WebP data URI)
#
# 왜 base64 인가: 이 게임은 파일 하나로 나가고 **외부 요청이 0건**이어야 한다.
# 학교 망에서 바깥 주소를 막아도 그대로 돌아가야 하기 때문이다.

import base64, io, os
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(os.environ.get('SPRITE_ROOT') or Path(__file__).resolve().parent.parent)
SRC = ROOT / 'assets' / 'paper'
OUT_JS = ROOT / 'src' / 'ui' / 'paper-data.js'

# (키, 파일, 최대 너비, 품질, 어두운 바탕을 잘라낼 것인가)
PLAN = [
    ('hanji',   'hanji.png',           1000, 78, False),   # 대화판 바탕
    ('janggye', 'janggye.png',          760, 80, True),    # 장계 한 장 — 종이만 남긴다
    ('injeongjeon', 'bg-injeongjeon.png', 1500, 74, False), # 어전 배경
    ('court',   'bg-court.png',        1500, 74, False),   # 조정 배경
]


def trim_dark(im, thresh=70, inset=0.055):
    """어두운 바탕에 놓인 종이만 남긴다 — 우리 화면 위에 얹으려면 종이만 있어야 한다.

    가장자리를 조금 더 잘라 낸다(inset). 찢긴 종이 끝은 어둡고 울퉁불퉁해서, 그
    부분이 글 밑에 깔리면 첫 줄이 잘려 보인다 — 선생님이 그 화면을 찍어 보내셨다.
    """
    a = np.asarray(im.convert('L'))
    mask = a > thresh
    ys = np.flatnonzero(mask.any(axis=1))
    xs = np.flatnonzero(mask.any(axis=0))
    if ys.size == 0 or xs.size == 0:
        return im
    x0, x1 = int(xs[0]), int(xs[-1]) + 1
    y0, y1 = int(ys[0]), int(ys[-1]) + 1
    dx = int((x1 - x0) * inset)
    dy = int((y1 - y0) * inset)
    return im.crop((x0 + dx, y0 + dy, x1 - dx, y1 - dy))


def main():
    entries, total = [], 0
    for key, name, maxw, q, trim in PLAN:
        p = SRC / name
        if not p.exists():
            print(f'  ! 없다: {p.name} — 건너뛴다')
            continue
        im = Image.open(p).convert('RGB')
        if trim:
            im = trim_dark(im)
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=q, method=6)
        data = buf.getvalue()
        total += len(data)
        print(f'  {key:12} {im.width}x{im.height}  {len(data)/1024:6.1f} KB')
        entries.append((key, 'data:image/webp;base64,' + base64.b64encode(data).decode()))

    OUT_JS.write_text(
        '// 자동 생성 — 손으로 고치지 마라. `python tools/pack-paper.py` 로 다시 만든다.\n'
        '// 한지·장계·배경. 외부 요청 0건을 지키려고 base64 로 소스에 싣는다.\n'
        f'// 합계 {total/1024:.0f} KB\n'
        'export const PAPER = {\n'
        + ''.join(f'  {k}: {v!r},\n'.replace("'", '"') for k, v in entries)
        + '}\n', encoding='utf8')
    print(f'합계 {total/1024:.0f} KB -> {OUT_JS.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
