"""막의 질문 화면 그림(assets/act-question/*.png) → src/ui/act-question-data.js.

Higgsfield gpt_image_2_5 로 그린 **재구성 그림**이다 — 사진도, 그 시대의 기록화도 아니다.
화면(ui/act-question.js)이 그림 아래에 그 사실을 한 줄로 적는다(caption).

tools/pack-scene-art.py 와 같은 꼴이되 두 가지가 다르다:
  1. 이 그림은 화면을 가득 채우는 바탕이라 800px 로는 모자란다 — 1280px 로 싣는다.
  2. 대신 용량 상한(110KB)을 품질로 지킨다. 품질을 한 칸씩 내리며 상한에 들어가는
     첫 값을 고른다. 게임 전체가 HTML 한 장(9.5MB, 빌드 상한 13MB)이라 다섯 장이
     500KB 를 넘으면 안 된다.

사용: python tools/pack-act-question.py
"""
import base64, io, json, os
from PIL import Image

WIDTH = 1280
MAX_KB = 110

# 열쇠 → (파일, alt, caption, 그림을 뽑은 말)
# prompt 는 주석으로 함께 남긴다 — 다시 뽑아야 할 때 같은 그림을 다시 얻기 위해서다.
ART = {
    'act1': (
        '빈 어좌 앞에 길게 드리운 어른의 그림자',
        '※ 재구성 그림입니다 — Higgsfield 로 그렸습니다. 1863년의 그 자리를 찍은 사진이 아닙니다.',
        'Quiet painterly historical reconstruction painting, soft muted warm earth tones, oil-on-canvas digital painting style, hazy diffused daylight. Interior of a late Joseon Korean royal palace throne hall: an empty ornate wooden royal throne chair on a raised dais, dark lacquer and faded red-gold, heavy carved canopy above. On the polished wooden floor in front of the throne, a single long dark shadow of a standing adult stretches toward the viewer - the person casting it is out of frame and not visible. Dust motes in the shaft of light. Nobody is in the room. Completely wordless image: absolutely no text, no letters, no writing, no signage, no hangul, no Latin characters, no numbers. No modern objects. No visible faces. No gore. Wide cinematic composition, atmospheric, contemplative, melancholy.',
    ),
    'act2': (
        '굳게 닫힌 궁궐 정문과 그 앞에 새로 선 낮은 비석',
        '※ 재구성 그림입니다 — Higgsfield 로 그렸습니다. 특정한 문도, 특정한 척화비도 아닙니다.',
        'Quiet painterly historical reconstruction painting, soft muted earth tones, oil-on-canvas digital painting style, overcast grey daylight. Exterior of a late Joseon Korean palace main gate: massive wooden double doors, firmly shut and barred, beneath a tiled roof gatehouse with faded dancheong paintwork, stone wall on both sides. In the empty dirt courtyard directly in front of the closed gate stands one small newly-erected low stone stele, a plain grey granite pillar about chest height on a simple stone base, its surface completely blank and unengraved. No people. Completely wordless image: absolutely no text, no letters, no carved inscription, no writing, no hangul, no Chinese characters, no Latin characters. No modern objects. No gore. Wide cinematic composition, stern and closed, contemplative.',
    ),
    'act3': (
        '아무도 없는 편전, 문이 활짝 열려 빛만 들어오는 빈 방',
        '※ 재구성 그림입니다 — Higgsfield 로 그렸습니다. 1873년의 편전을 찍은 사진이 아닙니다.',
        'Quiet painterly historical reconstruction painting, pale luminous warm tones, oil-on-canvas digital painting style. Interior of an empty late Joseon Korean palace council chamber: bare polished wooden floor, plain papered walls, low wooden ceiling beams, a low writing desk pushed aside. The tall lattice-and-paper sliding doors along one wall stand wide open onto an empty stone terrace, and bright morning light floods in across the floor in long geometric slabs. The room is completely empty of people. Completely wordless image: absolutely no text, no letters, no writing, no signage, no hangul, no Chinese characters, no Latin characters. No modern objects. No visible faces. No gore. Wide cinematic composition, still, expectant, quiet.',
    ),
    'act4': (
        '볕에 널린 쌀 가마니와 그 곁에 흩어진 누런 겨와 회색 모래',
        '※ 재구성 그림입니다 — Higgsfield 로 그렸습니다. 섞인 비율을 나타낸 것은 아닙니다.',
        'Quiet painterly historical reconstruction still-life painting, warm dusty ochre tones, oil-on-canvas digital painting style, strong low afternoon sunlight. Close ground-level view in a bare late Joseon Korean courtyard of packed earth: several coarse straw-rope rice sacks lying open on the ground, pale white rice grains spilling from a torn mouth. Beside the spilled rice, clearly separate small heaps of yellow-brown husk chaff and coarse grey sand, their different textures plainly visible. Dry straw scattered around. No people at all. Completely wordless image: absolutely no text, no letters, no writing, no stamps, no labels, no hangul, no Chinese characters, no Latin characters. No modern objects. No gore. Wide cinematic composition, plain, heavy, unsettling.',
    ),
    'act5': (
        '동트기 전 궁 마당, 꺼져 가는 등불과 어지러운 발자국',
        '※ 재구성 그림입니다 — Higgsfield 로 그렸습니다. 1884년 새벽의 궁을 찍은 사진이 아닙니다.',
        'Quiet painterly historical reconstruction painting, cold blue pre-dawn twilight with a faint warm amber glow, oil-on-canvas digital painting style. Empty courtyard of a late Joseon Korean palace just before sunrise: wide expanse of packed earth and stone paving, tiled roof halls silhouetted dark against a deep indigo sky with the first pale light at the horizon. Two or three paper lanterns on wooden poles, their flames guttering out, thin smoke rising. Across the dusty ground, a confusion of overlapping hurried footprints going in many directions, and a dropped straw sandal. No people at all. Completely wordless image: absolutely no text, no letters, no writing, no banners, no hangul, no Chinese characters, no Latin characters. No modern objects. No gore, no blood, no weapons. Wide cinematic composition, aftermath, hushed, ambiguous.',
    ),
}

# 그림 귀퉁이에 모델이 남긴 서명 같은 자국을 잘라 낸다. 글자가 아니라 얼룩이지만,
# 이 화면은 「글자 없는 그림」이 규칙이라 아예 지운다. (왼·아래 2%)
CROP = {'act5': (0.022, 0.0, 0.0, 0.028)}


def encode(path, key):
    im = Image.open(path).convert('RGB')
    l, t, r, b = CROP.get(key, (0, 0, 0, 0))
    if any((l, t, r, b)):
        w, h = im.size
        im = im.crop((int(w * l), int(h * t), int(w * (1 - r)), int(h * (1 - b))))
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    for q in range(78, 33, -4):
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=q, method=6)
        data = buf.getvalue()
        if len(data) <= MAX_KB * 1024:
            return data, q
    return data, q


out, total = {}, 0
missing = []
for key, (alt, caption, prompt) in ART.items():
    path = f'assets/act-question/{key}.png'
    if not os.path.exists(path):
        missing.append(key)
        print(key, 'missing - skipped')
        continue
    data, q = encode(path, key)
    total += len(data)
    out[key] = {'src': 'data:image/webp;base64,' + base64.b64encode(data).decode(),
                'alt': alt, 'caption': caption}
    print(key, len(data) // 1024, 'KB', f'(q{q})')
print('합계', total // 1024, 'KB')

header = [
    '// 자동 생성 — tools/pack-act-question.py. 고치려면 그 파일을 고치고 다시 돌린다.',
    '//',
    '// 막마다 하나씩 놓이는 질문 화면(ui/act-question.js)의 그림이다. 다섯 장 모두',
    '// Higgsfield **gpt_image_2_5** 로 2026-09-26 에 그린 **재구성 그림**이다 —',
    '// 사진이 아니고, 그 시대에 그려진 기록화도 아니다. 화면이 그 사실을 caption 으로 적는다.',
    '//',
    '// 그림을 뽑을 때 건 조건(다섯 장 공통): 글자·한글·한자·라틴 문자 없음, 근대 이후의',
    '// 물건 없음, 얼굴이 크게 드러나는 인물 없음, 피 없음. 조용한 회화체·조선 후기.',
    '// 각 장의 말(prompt)은 tools/pack-act-question.py 의 ART 에 그대로 적혀 있다.',
    '//',
]
if missing:
    header += [f'// ⚠ 아직 없는 그림: {", ".join(missing)} — 그 막은 그림 없이 뜬다(화면은 부러지지 않는다).',
               '//   assets/act-question/<열쇠>.png 를 놓고 이 packer 를 다시 돌리면 채워진다.',
               '//']

NOTE = '※ 이 그림은 Higgsfield 로 그린 재구성 그림입니다. 사진도, 그 시대의 기록화도 아닙니다.'

with open('src/ui/act-question-data.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(header) + '\n')
    f.write('export const ART_NOTE = ' + json.dumps(NOTE, ensure_ascii=False) + '\n\n')
    f.write('export const ACT_QUESTION_ART = ' + json.dumps(out, ensure_ascii=False) + '\n')
