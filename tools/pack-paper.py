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

# (키, 파일, 최대 너비, 품질, 바탕을 잘라낼 밝기 문턱 — False 면 자르지 않는다,
#  돌릴 각도(도, 반시계) — 0 이면 안 돌린다, 가장자리를 더 파고들 비율,
#  검은 바탕을 알파로 지울 것인가)
#
# 문턱을 칸마다 따로 적는 까닭: 그림마다 바탕색이 다르다. 검은 바탕에 놓고 찍은
# 장계는 문턱 70 이면 종이만 깔끔히 남지만, 중간 회색 바탕에 놓인 그림은 그 회색까지
# 「종이」로 잡혀 잘라내야 할 바탕이 카드 밑에 그대로 깔린다.
#
# ── 2026-09-27 · 장계 그림을 두 장으로 다시 그렸다 ─────────────────────────
# 선생님: 「장계를 힉스필드 써서 진짜 장계 올라온 거처럼 만들라는 게 하나도 반영이
# 안 되었어.」 그 말이 맞았다. 어제까지 깔려 있던 janggye-wide.png 는 먹이 너무
# 엷어(종이빛과 거의 같은 회색) 카드 밑에서 그냥 얼룩으로 보였고, 붉은 인장은
# 종이 왼쪽 아래 끝에 있어서 카드가 잘라 먹는 자리에 있었다. 그래서 다시 그렸다.
#
#   janggye-sealed.png — **봉해서 묶은 장계**. 파발이 막 내려놓은 것이다. 접어서
#                        노끈으로 묶고 붉은 인장으로 봉한 꾸러미. 학생이 이것을
#                        누르면 펴진다 — 「도착해서 펴 보는」 그 한 동작이다.
#   janggye-open.png   — **펴 놓은 장계**. 가로로 넓은 한 장이고, 접힌 자국 세 줄이
#                        가로로 지나가며, 세로 붓글씨 줄이 내려 그어져 있고, 오른쪽
#                        위와 왼쪽 아래에 붉은 인장이 찍혀 있다. 카드를 통째로 덮는다.
#
# 옛 janggye.png(세로 한 장)·janggye-wide.png 는 이제 어느 화면도 부르지 않는다 —
# 실어 봐야 파일만 무거워지므로 여기서 뺀다. 원본은 assets/paper/ 에 그대로 남는다.
#
# ⚠ 돌리기(rotate)는 janggye-sealed 에만 쓴다. 그림 속 꾸러미가 비스듬히 누워 있어,
#    그대로 카드에 깔면 종이가 대각선으로 잘린다. 가로로 눕혀 놓고 잘라야 한 줄짜리
#    카드에 꾸러미 하나가 반듯이 들어간다.
#
# 마지막 칸(alpha)은 「검은 바탕을 아예 지울 것인가」다. 돌려 놓은 그림은 네 귀퉁이에
# 검정이 남는데(비스듬히 누운 것을 가로로 돌렸으니 당연하다), 그대로 두면 카드 위에
# 검은 쐐기가 깔린다. 알파로 깎아 내면 꾸러미만 화면에 놓인다.
PLAN = [
    ('hanji',   'hanji.png',           1000, 78, False, 0, 0.055, False),   # 대화판 바탕
    ('janggyeOpen',   'janggye-open.png',   1000, 70, 70, 0,    0.004, False),  # 펴 놓은 장계(가로)
    ('janggyeSealed', 'janggye-sealed.png',  660, 74, 60, 48.5, 0.004, True),   # 봉해 묶은 장계
    ('injeongjeon', 'bg-injeongjeon.png', 1500, 74, False, 0, 0.055, False), # 어전 배경
    ('court',   'bg-court.png',        1500, 74, False, 0, 0.055, False),   # 조정 배경
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


def cut_dark(im, lo=18, hi=58):
    """검은 바탕을 지워 없앤다 — 잘라 내는 것(trim_dark)과 다르다.

    trim_dark 는 네모로 잘라 내므로, 비스듬히 누운 것을 돌려 놓으면 네 귀퉁이의
    검정이 그대로 남는다. 여기서는 밝기로 알파를 깎는다: lo 아래는 완전히 비고,
    hi 위는 그대로 남고, 사이는 부드럽게 이어진다(가장자리가 톱니가 되지 않게).
    종이는 밝기 100을 훌쩍 넘으므로 한 조각도 깎이지 않는다.
    """
    a = np.asarray(im.convert('L')).astype(np.float32)
    alpha = np.clip((a - lo) / float(hi - lo), 0, 1)
    arr = np.array(im.convert('RGBA'))
    arr[..., 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def main():
    entries, total = [], 0
    for key, name, maxw, q, trim, spin, inset, alpha in PLAN:
        p = SRC / name
        if not p.exists():
            print(f'  ! 없다: {p.name} — 건너뛴다')
            continue
        im = Image.open(p).convert('RGB')
        # 돌린 자리에는 검은색을 채운다 — 바로 아래 trim_dark 가 그 검은 테두리를
        # 도로 잘라 내므로, 돌리고 자르면 종이만 반듯이 남는다.
        if spin:
            im = im.rotate(spin, resample=Image.BICUBIC, expand=True, fillcolor=(0, 0, 0))
        if trim:
            im = trim_dark(im, thresh=70 if trim is True else trim, inset=inset)
        if alpha:
            im = cut_dark(im)
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
