"""설명서 그림(assets/howto/*.png) → src/ui/howto-data.js.

    python tools/pack-howto.py

2026-09-29 선생님: 「이 게임 설명서가 전혀 친절하지 않아. 하나하나 그림을 보며
설명하듯 게임화면과 연계된 힉스필드 그림으로 만들어서 순서대로 하나씩 설명하듯이
알려줘. 설명을 길게하라는게 아니라 직관적인 게임 화면 관련된 그림들로 만들라고.」

그전까지 「이렇게 합니다」는 글 아홉 줄이 한꺼번에 쏟아지는 화면이었다. 조작을 모르는
학생이 그 아홉 줄을 읽고 시작할 리 없다 — 읽어야 할 것이 많을수록 아무도 안 읽는다.
그래서 **한 걸음에 그림 한 장, 글 한 줄**로 바꾼다. 글을 늘리지 않는 것이 요점이다.

Higgsfield gpt_image_2_5 로 그린 재구성 그림이다. 장면 그림(scene-art)과 달리 이쪽은
**뜻을 가리키는 그림**이라 한 화면에 하나씩만 나오고, 캡션 대신 한 줄 설명이 붙는다.
그래도 재구성이라는 사실은 화면 아래 고지로 남는다(ui/controls-hint.js).

크기: 폭 720 · WebP 품질 70. 설명서는 한 번 보고 지나가는 화면이라 장면 그림(800/72)
보다 조금 더 줄인다 — 13MB 한 장에 들어가야 하는 파일이다.
"""
import base64, io, os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'howto'
OUT_JS = ROOT / 'src' / 'ui' / 'howto-data.js'

# 열쇠는 controls-hint.js 의 단계와 1:1 로 맞춘다. 이름이 어긋나면 그 단계만 그림 없이
# 뜬다(그래도 글은 남는다 — 그림은 덤이지 뼈대가 아니다).
# 열쇠를 낙타등(camelCase)으로 두는 까닭: 이 저장소는 화면 뿌리 클래스 이름을 다른
# 모듈이 빌려 쓰지 못하게 시험으로 막는다(tests/ui/class-namespace.test.js). 'walk' ·
# 'speak' 처럼 짧고 흔한 이름은 언젠가 어느 모듈의 뿌리가 되고, 그날 이 파일이 걸린다 —
# 실제로 'council' 과 'speak' 로 두 번 걸렸다. 낙타등은 CSS 클래스가 될 일이 없다.
ART = {
    'stepYard':   '임금이 넓은 궁궐 마당을 가로질러 걸어가는 뒷모습',
    'stepScroll': '바닥에 떨어진 두루마리 문서를 집어 드는 손',
    'stepChest':  '뚜껑을 연 문서함 안에 두루마리와 서책이 늘어서 있다',
    'stepCourt':  '어전에 늘어선 신하들, 한 사람이 문서를 들고 앞으로 나선다',
    'stepLamp':   '등잔 아래 벼루에 걸쳐 둔 붓과 펼쳐 둔 종이',
}


def main():
    out, total = {}, 0
    for key, alt in ART.items():
        p = SRC / f'{key}.png'
        if not p.exists():
            print(f'  ! 없다: assets/howto/{key}.png — 건너뛴다')
            continue
        im = Image.open(p).convert('RGB')
        im.thumbnail((720, 720))
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=70, method=6)
        data = buf.getvalue()
        total += len(data)
        out[key] = {'src': 'data:image/webp;base64,' + base64.b64encode(data).decode(), 'alt': alt}
        print(f'  {key:9} {im.width}x{im.height}  {len(data)/1024:6.1f} KB')

    lines = [
        '// 자동 생성 — 손으로 고치지 마라. `python tools/pack-howto.py` 로 다시 만든다.\n',
        '//\n',
        '// 「이렇게 합니다」의 단계 그림. Higgsfield 로 그린 재구성 그림이다.\n',
        '// 글을 늘리는 대신 그림으로 가리킨다 — 왜 그렇게 했는지는 tools/pack-howto.py 에.\n',
        f'// 합계 {total/1024:.0f} KB. 바깥 요청 0건을 지키려고 base64 로 싣는다.\n',
        'export const HOWTO_ART = {\n',
    ]
    for k, v in out.items():
        lines.append(f'  {k}: {{ src: "{v["src"]}", alt: "{v["alt"]}" }},\n')
    lines.append('}\n')
    OUT_JS.write_text(''.join(lines), encoding='utf8')
    print(f'합계 {total/1024:.0f} KB -> {OUT_JS.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
