"""이미 실어 둔 그림(data URI)을 화면에 맞는 크기로 다시 줄인다 — 원본을 다시 받지 않고.

2026-09-19 · 단일 HTML 이 상한(13MB)에 닿았다. 역사 사진은 화면에서 높이 260px 로 보이는데
960px·품질 78 로 실려 있었고, 피드백 그림은 1024px·품질 86 이었다. 보이는 크기에 맞춰 줄인다.
pack-historical-media.mjs · pack-feedback-media.cjs 의 설정도 같은 값으로 맞춰 두었다.

사용: python tools/recompress-embedded.py
"""
import base64, io, re
from PIL import Image

TARGETS = [
    # 파일, 최대 폭, 최대 높이, 품질
    ('src/ui/historical-media-data.js', 760, 800, 70),
    ('src/ui/feedback-media-data.js', 820, 820, 76),
]

URI = re.compile(r'data:image/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)')

for path, mw, mh, q in TARGETS:
    s = open(path, encoding='utf-8').read()
    before = len(s)

    def shrink(m):
        raw = base64.b64decode(m.group(2))
        im = Image.open(io.BytesIO(raw))
        has_alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
        im = im.convert('RGBA' if has_alpha else 'RGB')
        im.thumbnail((mw, mh), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=q, method=6)
        out = buf.getvalue()
        if len(out) >= len(raw):        # 더 커지면 그대로 둔다
            return m.group(0)
        return 'data:image/webp;base64,' + base64.b64encode(out).decode()

    s = URI.sub(shrink, s)
    open(path, 'w', encoding='utf-8').write(s)
    print(path, before // 1024, 'KB ->', len(s) // 1024, 'KB')
