"""assets/bgm/*.ogg → src/data/bgm-data.js (base64, 외부 요청 0건).

사용: python tools/pack-bgm.py
곡을 다시 뜨려면 tools/bgm-from-teacher.py 를 먼저 돌린다(assets/bgm/README.md).
"""
import base64, glob, json, os

tracks = {}
for path in sorted(glob.glob('assets/bgm/*.ogg')):
    name = os.path.splitext(os.path.basename(path))[0]
    tracks[name] = 'data:audio/ogg;base64,' + base64.b64encode(open(path, 'rb').read()).decode()
    print(f'  {name:8s} {os.path.getsize(path) // 1024:4d} KB')

out = ('// 자동 생성 — tools/pack-bgm.py 가 assets/bgm 을 싣는다(assets/bgm/README.md). 손으로 고치지 마라.\n'
       '// 재료: 선생님이 직접 만든 곡 Beneath_the_Bronze_Bell.mp3(2026-09-26 제공) 하나뿐이다.\n'
       'export const BGM = ' + json.dumps(tracks, ensure_ascii=False) + '\n')
open('src/data/bgm-data.js', 'w', encoding='utf-8').write(out)
print(f'-> src/data/bgm-data.js ({os.path.getsize("src/data/bgm-data.js") // 1024} KB)')
