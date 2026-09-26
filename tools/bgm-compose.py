"""【쓰지 않는다】 2026-09-26 선생님 지시(「BGM 내가 넣은거로 바꾸기」)로 배경 음악은 전부
선생님이 직접 만든 곡에서 뜬다. 지금 쓰는 도구는 tools/bgm-from-teacher.py 다.
이 파일은 그 전의 길(공유마당 CC BY 국악기 실연)을 기록으로 남겨 둔 것이다 — 돌리면
선생님의 곡을 덮어쓴다.

「어전」 배경 음악 — 공유마당 CC BY 국악기 연주로 아홉 곡을 짓는다.

재료: 한국저작권위원회 「국악기」 시리즈(CC BY 4.0, 공유마당). 정악대금·거문고·해금·가야금·대아쟁·
      장단장구·소리북·징의 실제 연주 악구다. AI 가 만든 소리가 아니다 — 국악은 AI 가 가장 못 만드는 소리다.

방법: 악구마다 크로마로 으뜸음을 재어 같은 조(E)로 옮기고(rubberband, 길이 유지) 정악의 호흡대로 겹친다.
      다섯 막의 곡은 모두 같은 주제(T0)의 변주다 — 악기와 빠르기만 바뀐다.

쓰기: python tools/bgm-compose.py <재료폴더> <출력폴더>
      재료폴더에 clips/tonal.json(악구 목록과 조성 분석)이 있어야 한다. 받는 법은 assets/bgm/README.md.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 44100
NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
ROOT = 'E'          # 모든 곡을 한 조로 모은다 — 곡이 바뀌어도 귀에 어긋나지 않게


def load_rows(base):
    rows = json.load(open(os.path.join(base, 'clips', 'tonal.json'), encoding='utf-8'))
    out = {}
    for r in rows:
        name = r['title'].split('_', 1)[1]
        r['file'] = os.path.join(base, os.path.basename(os.path.dirname(r['file'])), os.path.basename(r['file']))
        out[name] = r
    return out


def semitones(row, tonic=ROOT):
    d = (NOTE.index(tonic) - NOTE.index(row['tonic'])) % 12
    return d - 12 if d > 6 else d


def clip(rows, name, seconds, gain, fade_in=1.0, fade_out=2.0, tune=True, start=0.0, speed=1.0):
    row = rows[name]
    f = []
    if start: f.append(f'atrim=start={start:.2f}')
    if speed != 1.0: f.append(f'rubberband=tempo={speed:.4f}')
    if tune:
        st = semitones(row)
        if st: f.append(f'rubberband=pitch={2 ** (st / 12):.6f}')
    f += [f'afade=t=in:st=0:d={fade_in:.2f}',
          f'afade=t=out:st={max(0.01, seconds - fade_out):.2f}:d={fade_out:.2f}',
          f'volume={gain:.3f}']
    out = subprocess.run([FF, '-v', 'error', '-i', row['file'], '-t', f'{seconds:.2f}',
                          '-af', ','.join(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True)
    x = np.frombuffer(out.stdout, dtype=np.float32).copy()
    need = int(seconds * SR)
    return np.pad(x, (0, max(0, need - len(x))))[:need]


def mix(rows, seconds, parts):
    """parts: (악구이름, 시작초, 길이, 음량, 페이드인, 페이드아웃, 옵션dict)"""
    track = np.zeros(int(seconds * SR), dtype=np.float32)
    for p in parts:
        name, at, dur, gain, fi, fo = p[:6]
        opt = p[6] if len(p) > 6 else {}
        x = clip(rows, name, dur, gain, fi, fo, **opt)
        i = int(at * SR)
        x = x[:max(0, len(track) - i)]
        track[i:i + len(x)] += x
    peak = float(np.max(np.abs(track))) or 1.0
    if peak > 0.9: track *= 0.9 / peak
    return track


# ── 아홉 곡 ────────────────────────────────────────────────────────────────
# 주제(T0)의 선율을 다섯 막이 나눠 받는다. 1막은 대금 홀로, 2막은 해금이 받고, 3막은 가야금이 밝게,
# 4막은 아쟁이 낮게 비틀고, 5막은 거문고 한 줄만 남는다.
TRACKS = {
    # 제목·막 시작·엔딩 — 대금 셋이 숨쉬고 거문고가 악구 머리를 짚는다(선생님이 고른 후보 「가」)
    'theme': (50.0, [
        ('정악대금13', 0.0, 18.0, 0.70, 1.6, 3.0), ('정악대금5', 18.6, 17.5, 0.66, 2.2, 3.0),
        ('정악대금7', 36.0, 14.0, 0.62, 2.0, 5.0),
        ('거문고_13', 0.0, 5.0, 0.34, 0.1, 2.2), ('거문고_25', 18.4, 6.5, 0.30, 0.1, 3.0),
        ('거문고_13', 36.0, 5.0, 0.28, 0.1, 2.5),
        ('해금31', 22.0, 16.0, 0.16, 4.0, 7.0)]),
    # 1막 1863 겨울 아침 — 대금 홀로, 사이가 넓다
    'act1': (64.0, [
        ('정악대금7', 0.0, 15.0, 0.62, 2.5, 4.0), ('거문고_13', 0.0, 5.0, 0.26, 0.1, 2.5),
        ('정악대금13', 20.0, 17.0, 0.60, 2.5, 4.5), ('거문고_47', 20.0, 5.0, 0.24, 0.1, 2.5),
        ('정악대금5', 42.0, 18.0, 0.58, 3.0, 6.0), ('해금51', 44.0, 18.0, 0.13, 5.0, 8.0)]),
    # 2막 1866~71 양요 — 해금이 주제를 받고 소리북이 느리게 맥박을 친다
    'act2': (64.0, [
        ('해금61', 0.0, 20.0, 0.46, 2.5, 4.0), ('해금51', 18.0, 16.0, 0.40, 3.0, 5.0),
        ('정악대금13', 32.0, 18.0, 0.46, 3.0, 5.0), ('해금65', 46.0, 17.0, 0.36, 4.0, 7.0),
        ('소리북1', 0.0, 15.6, 0.30, 1.0, 4.0, {'tune': False}),
        ('소리북1', 30.0, 15.6, 0.26, 2.0, 5.0, {'tune': False}),
        ('거문고_43', 16.0, 6.0, 0.22, 0.2, 3.0)]),
    # 3막 1873~76 친정 — 가야금이 밝게, 장구가 가볍게
    'act3': (64.0, [
        ('가야금_25현가야금29', 0.0, 21.0, 0.52, 2.0, 4.0),
        ('가야금_25현가야금21', 20.0, 12.0, 0.46, 2.0, 3.5),
        ('정악대금11', 30.0, 12.0, 0.48, 2.5, 4.0),
        ('가야금_25현가야금19', 42.0, 13.0, 0.46, 2.5, 5.0),
        ('장단장구19', 2.0, 20.0, 0.22, 2.0, 5.0, {'tune': False, 'speed': 0.85}),
        ('장단장구19', 34.0, 20.0, 0.20, 3.0, 6.0, {'tune': False, 'speed': 0.85}),
        ('거문고_25', 0.0, 6.5, 0.20, 0.2, 3.0)]),
    # 4막 1882 임오 — 아쟁이 낮게 긁고 북이 무겁다
    'act4': (64.0, [
        ('대아쟁_개나리활대21', 0.0, 24.0, 0.44, 3.0, 5.0),
        ('대아쟁_개나리활대13', 22.0, 15.0, 0.42, 3.0, 5.0),
        ('해금59', 34.0, 18.0, 0.30, 4.0, 6.0),
        ('대아쟁_개나리활대17', 46.0, 17.0, 0.40, 4.0, 8.0),
        ('소리북5', 4.0, 22.0, 0.26, 2.0, 6.0, {'tune': False, 'speed': 0.8}),
        ('소리북5', 34.0, 22.0, 0.24, 3.0, 7.0, {'tune': False, 'speed': 0.8})]),
    # 5막 1884 갑신 — 거문고 한 줄과 긴 쉼
    'act5': (64.0, [
        ('거문고_33', 0.0, 16.0, 0.50, 2.0, 5.0),
        ('거문고_55', 22.0, 17.0, 0.46, 2.5, 6.0),
        ('거문고_67', 46.0, 16.0, 0.42, 3.0, 8.0),
        ('해금35', 10.0, 12.0, 0.12, 4.0, 6.0), ('해금59', 40.0, 18.0, 0.13, 5.0, 8.0),
        ('정주7', 0.0, 14.0, 0.30, 0.5, 6.0, {'tune': False})]),
    # 행렬 — 임금의 행차. 태평소는 빼고(교실 스피커에서 찌른다) 징·북·대금으로
    'march': (40.0, [
        ('장단장구11', 0.0, 20.0, 0.34, 0.6, 2.0, {'tune': False, 'speed': 0.95}),
        ('장단장구11', 19.5, 20.5, 0.34, 0.5, 3.0, {'tune': False, 'speed': 0.95}),
        ('징1', 0.0, 16.6, 0.26, 0.3, 4.0, {'tune': False}),
        ('징1', 20.0, 16.6, 0.26, 0.3, 5.0, {'tune': False}),
        ('정악대금17', 4.0, 12.0, 0.40, 1.5, 3.0), ('정악대금13', 22.0, 16.0, 0.40, 2.0, 4.0)]),
    # 촉박 — 불길·난군·정변. 빠른 장단과 북, 해금의 떨림
    'tension': (50.0, [
        ('장단장구25', 0.0, 17.0, 0.44, 0.4, 1.5, {'tune': False, 'speed': 1.25}),
        ('장단장구25', 13.0, 17.0, 0.44, 0.6, 1.5, {'tune': False, 'speed': 1.25}),
        ('장단장구13', 26.0, 12.0, 0.42, 0.6, 1.5, {'tune': False, 'speed': 1.3}),
        ('장단장구25', 36.0, 14.0, 0.44, 0.6, 2.5, {'tune': False, 'speed': 1.25}),
        ('소리북15', 0.0, 13.1, 0.34, 0.3, 2.0, {'tune': False, 'speed': 1.2}),
        ('소리북15', 24.0, 13.1, 0.34, 0.5, 2.0, {'tune': False, 'speed': 1.2}),
        ('해금71', 8.0, 4.1, 0.26, 0.6, 1.5), ('해금75', 30.0, 3.1, 0.26, 0.5, 1.2),
        ('대아쟁_개나리활대29', 0.0, 18.3, 0.22, 2.0, 5.0),
        ('대아쟁_개나리활대29', 30.0, 18.3, 0.22, 2.0, 6.0)]),
    # 어전회의·훈령·보존 선택 — 고르는 동안의 긴장. 박자가 없다
    'council': (40.0, [
        ('해금59', 0.0, 18.0, 0.26, 4.0, 6.0), ('해금51', 16.0, 14.0, 0.22, 5.0, 6.0),
        ('대아쟁_말총활대7', 24.0, 16.0, 0.20, 5.0, 8.0),
        ('거문고_41', 2.0, 8.0, 0.16, 0.3, 4.0), ('거문고_53', 26.0, 8.0, 0.14, 0.3, 5.0)]),
}

# 짧은 여운 두 개 — 기록을 잃는 순간과 막이 끝나는 자리
STINGERS = {
    'loss': (9.0, [('해금65', 0.0, 9.0, 0.5, 0.2, 6.0)]),
    'actend': (11.0, [('정악대금5', 0.0, 11.0, 0.52, 0.8, 6.0),
                      ('정주3', 0.0, 11.0, 0.34, 0.2, 7.0, {'tune': False})]),
}


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else '.'
    out_dir = sys.argv[2] if len(sys.argv) > 2 else 'assets/bgm'
    os.makedirs(out_dir, exist_ok=True)
    rows = load_rows(base)
    total = 0
    for name, (seconds, parts) in {**TRACKS, **STINGERS}.items():
        track = mix(rows, seconds, parts)
        raw = tempfile.mktemp(suffix='.f32')
        track.tofile(raw)
        wav = os.path.join(out_dir, name + '.wav')
        subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw,
                        '-af', 'loudnorm=I=-20:TP=-3:LRA=11', wav], check=True)
        ogg = os.path.join(out_dir, name + '.ogg')
        # 20kbps 모노 Opus — 대금·거문고처럼 길게 울리는 소리에서는 24k 와 태블릿 스피커로 구별되지 않고,
        # 곡이 열한 개라 용량 차이(약 0.8MB)가 상한에 그대로 걸린다.
        subprocess.run([FF, '-v', 'error', '-y', '-i', wav, '-c:a', 'libopus', '-b:a', '20k',
                        '-vbr', 'constrained', '-ac', '1', ogg], check=True)
        os.remove(raw); os.remove(wav)
        size = os.path.getsize(ogg)
        total += size
        print(f'  {name:8s} {seconds:5.1f}s {size // 1024:4d} KB')
    print(f'합계 {total // 1024} KB · base64 로 약 {int(total * 4 / 3) // 1024} KB')


if __name__ == '__main__':
    main()
