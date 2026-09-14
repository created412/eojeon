# 대사 음성을 게임에 싣는다 — 내려받기 · 줄이기 · 글자마다 시각 붙이기.
#
#   python tools/pack-voice.py
#
# 입력 : tools/voice/lines.json (node tools/voice-lines.mjs)
#        tools/voice/urls.txt   ("<index> <result_url>" 한 줄에 하나 — lee text2speech_v2 · ElevenLabs 결과)
# 출력 : src/data/voice-data.js  { key: { src, ms, t: [글자마다 나타날 시각(ms)] } }
#        tools/voice/report.txt  줄마다 인식 일치율 — 낮으면 발음이 뭉개졌거나 싱크가 틀렸을 수 있다
#
# 싱크를 「정확히」 맞추는 방법: 음성을 faster-whisper 로 다시 받아 적어 단어마다 시작·끝 시각을 얻고,
# 받아 적은 글자와 원문 글자를 difflib 로 짝지어 원문 글자마다 시각을 옮긴다. 짝이 없는 글자는
# 앞뒤 시각 사이를 고르게 나눈다. 대화판(ui/speak.js)은 음성의 currentTime 이 그 시각을 지난
# 글자까지만 찍는다 — 글자가 말보다 앞서거나 뒤처지지 않는다.
import base64, difflib, io, json, re, sys, urllib.request
from pathlib import Path
import av
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
VOICE = ROOT / 'tools' / 'voice'
CACHE = VOICE / 'mp3'
CACHE.mkdir(parents=True, exist_ok=True)
lines = json.loads((VOICE / 'lines.json').read_text(encoding='utf-8'))
# 내려받은 파일은 열쇠(voiceKey) 이름으로 tools/voice/mp3 에 남는다 — 대사 순서가 바뀌어도 다시 받지 않는다.
# 새 줄의 주소는 tools/voice/urls-key.txt ("<key> <result_url>") 에 적는다.
urls = {}
_f = VOICE / 'urls-key.txt'
if _f.exists():
    for row in _f.read_text(encoding='utf-8').splitlines():
        if row.strip():
            k, u = row.split()
            urls[k] = u

HANGUL = re.compile(r'[가-힣0-9]')

def shrink(raw):
    # 모노 · 22050Hz · 32kbps MP3. 말소리는 이 정도로도 또렷하고, 원본의 사분의 일 남짓이 된다.
    # 게임이 파일 하나(dist/어전.html)로 오프라인에서 돌아야 해서 음성 71줄이 그 파일 안에 들어간다.
    src = av.open(io.BytesIO(raw))
    out_buf = io.BytesIO()
    out = av.open(out_buf, 'w', format='mp3')
    st = out.add_stream('libmp3lame', rate=22050)
    st.bit_rate = 32000
    st.layout = 'mono'
    rs = av.AudioResampler(format='s16p', layout='mono', rate=22050)
    for frame in src.decode(audio=0):
        for f in rs.resample(frame):
            for p in st.encode(f): out.mux(p)
    for f in rs.resample(None):
        for p in st.encode(f): out.mux(p)
    for p in st.encode(None): out.mux(p)
    out.close()
    return out_buf.getvalue()

def duration_ms(raw):
    c = av.open(io.BytesIO(raw))
    s = c.streams.audio[0]
    total = 0
    for f in c.decode(audio=0): total += f.samples / f.sample_rate
    return round(total * 1000)

model = WhisperModel('small', device='cpu', compute_type='int8')

def recognize(raw, prompt):
    segs, _ = model.transcribe(io.BytesIO(raw), language='ko', word_timestamps=True, beam_size=5,
                               initial_prompt=prompt)
    rec, rec_t = [], []
    for s in segs:
        for w in s.words or []:
            cs = HANGUL.findall(w.word)
            for k, ch in enumerate(cs):
                rec.append(ch)
                rec_t.append((w.start + (w.end - w.start) * (k + .5) / len(cs)) * 1000)
    return rec, rec_t

def char_times(line, spoken, raw, dur):
    ref = HANGUL.findall(spoken)
    # 원문을 힌트로 주면 단어 시각이 잘 잡힌다. 다만 힌트가 인식을 엉뚱하게 끌고 가 짝이 거의 안 맞으면
    # 힌트 없이 한 번 더 받아 적는다 — 두 번 가운데 원문과 더 많이 맞는 쪽의 시각을 쓴다.
    best = None
    for prompt in (spoken, None):
        rec, rec_t = recognize(raw, prompt)
        r = difflib.SequenceMatcher(None, ref, rec, autojunk=False).ratio()
        if best is None or r > best[0]: best = (r, rec, rec_t)
        if r >= .5: break
    _, rec, rec_t = best
    times = [None] * len(ref)
    sm = difflib.SequenceMatcher(None, ref, rec, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1): times[i1 + k] = rec_t[j1 + k]
    # 짝 없는 글자 — 앞뒤로 알려진 시각 사이를 고르게 나눈다
    known = [(i, t) for i, t in enumerate(times) if t is not None]
    lead = min(120, dur * .05)
    if not known: known = [(0, lead), (max(0, len(ref) - 1), dur * .95)]
    if known[0][0] != 0: known.insert(0, (0, min(lead, known[0][1])))
    if known[-1][0] != len(ref) - 1: known.append((len(ref) - 1, max(known[-1][1], dur * .95)))
    for (a, ta), (b, tb) in zip(known, known[1:]):
        for i in range(a, b + 1):
            times[i] = ta + (tb - ta) * ((i - a) / (b - a) if b > a else 0)
    for i in range(1, len(times)): times[i] = max(times[i], times[i - 1])   # 뒤로 가지 않는다
    # 원문 줄의 글자마다 — 「」 밖 지문은 곧바로, 따옴표 안 문장부호는 앞 글자와 함께 뜬다
    out, r, inside, last = [], 0, False, 0
    for ch in line:
        if ch == '「': inside = True; out.append(last); continue
        if ch == '」': inside = False; out.append(last); continue
        if inside and HANGUL.match(ch) and r < len(times):
            last = times[r]; r += 1
        out.append(last if inside or ch in '」' else (last if r else 0))
    ratio = sm.ratio()
    return [round(t) for t in out], ratio

data, report = {}, []
for i, L in enumerate(lines):
    # 파일 이름에 목소리 이름을 넣는다 — 배역을 바꾸면(예: 대원군 Gideon → Orion) 예전 녹음을 쓰지 않고 새로 받는다.
    cached = CACHE / f'{L["voice"]}-{L["key"]}.mp3'
    if not cached.exists():
        if f'{L["voice"]}-{L["key"]}' not in urls and L['key'] not in urls:
            report.append(f'{i}	MISSING	{L["npc"]}	{L["text"]}'); print(report[-1]); continue
        cached.write_bytes(urllib.request.urlopen(urls.get(f'{L["voice"]}-{L["key"]}') or urls[L['key']]).read())
    raw = cached.read_bytes()
    small = shrink(raw)
    dur = duration_ms(small)
    t, ratio = char_times(L['line'], L['text'], raw, dur)
    data[L['key']] = {'src': 'data:audio/mpeg;base64,' + base64.b64encode(small).decode(), 'ms': dur, 't': t}
    report.append(f'{i}\t{ratio:.2f}\t{dur}ms\t{len(small)//1024}KB\t{L["npc"]}\t{L["text"]}')
    print(report[-1], flush=True)

js = ('// 자동 생성 — 손으로 고치지 마라. `python tools/pack-voice.py` 로 다시 만든다.\n'
      '// 대사 음성(ElevenLabs · lee text2speech_v2) + 글자마다 나타날 시각(faster-whisper 단어 시각으로 맞춤).\n'
      f'// {len(data)}줄 · 합계 {sum(len(v["src"]) for v in data.values())//1024} KB\n'
      'export const VOICE = ' + json.dumps(data, ensure_ascii=False) + '\n')
(ROOT / 'src' / 'data' / 'voice-data.js').write_text(js, encoding='utf-8')
(VOICE / 'report.txt').write_text('\n'.join(report), encoding='utf-8')
print('packed', len(data), 'of', len(lines))
