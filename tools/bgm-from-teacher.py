"""「어전」 배경 음악 — 선생님이 직접 만든 한 곡에서 열한 곡을 뜬다.

선생님 지시(2026-09-26): 「BGM 내가 넣은거로 바꾸기: Beneath_the_Bronze_Bell.mp3」.
그래서 이 파일은 더 이상 소리를 '짓지' 않는다 — 선생님의 곡을 **자르고 잇는** 일만 한다.

곡의 생김새(분석 결과): 120 BPM, 4/4, **8초(4마디) 악절**이 스물두 번 이어진다. 악절의 첫박은
0.089초 + 8초×n 에 있다(어택 봉우리로 재었다). 그리고 곡 자체가 어둡게 시작해 밝아지고 촘촘해지고
다시 어두워졌다가 가장 크게 터진 뒤 한 음으로 사그라진다 — 게임의 다섯 막이 지나가는 길과 같다.

그래서 다섯 막은 이 곡의 **연속된 다섯 악장**이다. 「하나의 주제, 다섯 막의 변주」가 비유가 아니라
사실이 된다. 이음매는 모두 악절의 첫박에 놓고, 꼬리를 머리에 등가전력(equal-power)으로 겹쳐
0.8~1.2초 크로스페이드한다 — 루프가 도는 자리에서 딸깍이거나 주저앉지 않게.

겹침에 대하여: 179초로 열한 곡을 뜨려면 어딘가는 겹쳐야 한다. 그래서 **같은 화면에서 같이 울릴 수
있는 곡끼리는 절대 겹치지 않게** 갈랐다(acts.js 의 비트 종류를 세어 확인했다).
  · tension 은 4·5막에서만 울린다 → 3막 자리(72~96초)에서 뜬다.
  · march 는 1·2·3·5막에서 울린다 → 4막 자리(112~136초)에서 뜬다(4막에는 행렬·이어가 없다).
  · council 은 다섯 막 모두에서 울린다 → 어느 막의 자리도 쓰지 않고, 곡의 마지막 여음을
    낱알(grain)로 잘라 겹쳐 쌓은 **박자 없는 지속음**으로 따로 짓는다.
  · theme 은 제목 화면에서만 울린다 → 1·2막 자리와 겹쳐도 만나지 않는다.

쓰기: python tools/bgm-from-teacher.py "<선생님 mp3 경로>" assets/bgm
"""
import json, os, subprocess, sys
import numpy as np
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
SR = 48000            # Opus 의 제 속도 — 두 번 리샘플하지 않는다
OFF = 0.089           # 악절 첫박의 어긋남(측정값)
BAR = 8.0             # 악절 한 도막


def phrase(n):
    """n 번째 악절의 첫박 — 이음매는 늘 여기다."""
    return OFF + BAR * n


def decode(src, start, dur, tempo=1.0):
    """mp3 의 한 토막을 모노 float 로 꺼낸다. tempo>1 이면 길이만 줄이고 음높이는 지킨다."""
    af = ['aresample=' + str(SR)]
    if tempo != 1.0:
        af.append(f'rubberband=tempo={tempo:.5f}')
    out = subprocess.run([FF, '-v', 'error', '-ss', f'{start:.4f}', '-t', f'{dur:.4f}', '-i', src,
                          '-af', ','.join(af), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True)
    if out.returncode:
        raise SystemExit(out.stderr.decode('utf-8', 'replace'))
    return np.frombuffer(out.stdout, dtype=np.float32).astype(np.float64)


def seamless(x, seconds, xfade=1.0):
    """꼬리를 머리에 겹쳐 딱 seconds 초의 도는 곡으로 만든다(등가전력 크로스페이드).

    x 는 seconds+xfade 초보다 길어야 한다. 앞 xfade 구간을 「그 구간 자신」과
    「한 바퀴 뒤에 이어질 소리」의 합으로 바꾸면, seconds 초 뒤 머리로 돌아가도
    소리가 끊기지 않는다.
    """
    n, k = int(seconds * SR), int(xfade * SR)
    if len(x) < n + k:
        raise SystemExit(f'토막이 짧다: {len(x)/SR:.2f}s < {(n+k)/SR:.2f}s')
    u = np.arange(k) / k
    rise, fall = np.sin(u * np.pi / 2), np.cos(u * np.pi / 2)
    y = x[:n].copy()
    y[:k] = x[:k] * rise + x[n:n + k] * fall
    return y


def rotate_to_quiet(y, guard=0.006, window=0.010):
    """도는 곡의 **시작점을 가장 조용한 자리로 돌려 놓는다.**

    왜 이 손질이 필요한가: 크로스페이드로 이어 놓은 파형은 수학적으로는 이미 이어져 있는데,
    Opus 는 파일의 맨 앞과 맨 끝을 0 에서 띄우고 0 으로 내려 앉히며 부호화한다(앞의 pre-skip,
    끝의 padding). 그래서 루프가 도는 자리에 아주 짧은 딸깍이 남는다 — 재어 보니 곡 안 어디보다
    센 고역 도약이었다. 도는 곡은 어디서 시작해도 같은 곡이므로, 그 이음매를 **곡에서 가장 조용한
    10ms** 로 굴려 보내고 앞뒤에 6ms 씩 여닫는 기울기를 준다. 그 자리에서는 부호기의 앞뒤 흔들림이
    귀에 닿지 않는다.

    첫 재생이 악절의 첫박에서 시작하지 않게 되지만, 음악은 1.4초에 걸쳐 서서히 올라오고(FADE_MS)
    루프는 몇 분을 돈다 — 스물네 초마다 딸깍이는 것보다 낫다.
    """
    n = len(y)
    w = int(window * SR)
    e = np.convolve(y ** 2, np.ones(w) / w, mode='same')
    p = int(np.argmin(e))
    z = np.arange(max(0, p - w), min(n - 1, p + w))          # 그 근처의 영교차로 붙인다
    if len(z):
        p = int(z[np.argmin(np.abs(y[z]))])
    y = np.concatenate([y[p:], y[:p]])
    g = int(guard * SR)
    u = np.arange(g) / g
    y[:g] *= np.sin(u * np.pi / 2)
    y[-g:] *= np.cos(u * np.pi / 2)
    return y


def shape(x, fade_in=0.05, fade_out=1.6):
    """한 번만 울리는 여운 — 앞을 살짝 열고 뒤를 완전히 닫는다."""
    y = x.copy()
    a, b = int(fade_in * SR), int(fade_out * SR)
    if a: y[:a] *= np.linspace(0, 1, a) ** 0.5
    if b: y[-b:] *= np.cos(np.linspace(0, 1, b) * np.pi / 2) ** 1.5
    return y


def lowpass(x, cut, order=2):
    """저역 통과 — 지속음의 쇠 맛을 덜어 낸다."""
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(order, cut / (SR / 2), btype='low', output='sos'), x)


def drone(src, start, end, seconds, xfade=1.2, seed=412):
    """어전회의의 지속음 — 곡의 마지막 여음을 낱알(grain)로 잘라 겹쳐 쌓는다.

    왜 시간 늘이기(rubberband)가 아니라 낱알인가: 다섯 배로 늘이면 쇳소리가 낀다.
    같은 음에서 뜬 낱알 열 남은 개를 서로 다른 위상으로 겹쳐 쌓으면, 활을 여러 대가
    나누어 긋는 것처럼 **끊기지 않는 한 음**이 된다. 박자가 사라지는 것이 여기서는
    목적이다 — 어전회의에는 맥박이 없어야 한다(bgm.js).

    낱알의 길이와 간격을 반드시 **흐트러뜨려야** 한다. 처음에 0.5초 낱알을 0.25초마다
    고르게 쌓았더니 봉투에 4.00Hz 봉우리가 밴드 평균의 21배로 솟았다 — 귀에는 기계가
    떠는 소리다. 길이를 0.7~1.4초로, 간격을 지수분포로 흩뿌려 그 봉우리를 없앴다.
    """
    rng = np.random.default_rng(seed)
    pool = decode(src, start, end - start)
    total = int((seconds + xfade + 0.5) * SR)
    y = np.zeros(total + SR * 4)
    at = 0.0
    while at < total / SR + 1.0:
        g = int(rng.uniform(0.7, 1.4) * SR)
        i = int(rng.integers(0, len(pool) - g))
        piece = pool[i:i + g] * np.hanning(g)
        r = np.sqrt((piece ** 2).mean())
        if r > 1e-6:
            piece /= r                 # 낱알마다 세기를 고르게 — 원본이 사그라지는 소리라서
        n0 = int(at * SR)
        y[n0:n0 + g] += piece
        at += rng.exponential(0.09)    # 규칙을 두지 않는다 — 규칙이 곧 박자가 된다
    y = y[:total]
    t = np.arange(total) / SR
    y *= 0.55 + 0.30 * np.sin(2 * np.pi * 0.055 * t + 1.1) + 0.15 * np.sin(2 * np.pi * 0.031 * t)
    y = lowpass(y, 2600.0)
    y *= 0.12 / max(np.sqrt((y ** 2).mean()), 1e-9)
    return seamless(y, seconds, xfade)


def encode(x, path, kbps=20):
    """모노 / libopus 20kbps / −20 LUFS. 두 번 재서 한 번의 고정 이득으로만 맞춘다(linear)
    — 여운이 사그라지는 곡을 눌러 평평하게 만들지 않으려면 이 길이어야 한다."""
    peak = np.abs(x).max()
    if peak > 0.99:
        x = x * (0.99 / peak)
    raw = (x * 32767).clip(-32768, 32767).astype('<i2').tobytes()
    inp = ['-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-']
    m = subprocess.run([FF, '-v', 'info', *inp, '-af', 'loudnorm=I=-20:TP=-3:LRA=11:print_format=json',
                        '-f', 'null', '-'], input=raw, capture_output=True)
    txt = m.stderr.decode('utf-8', 'replace')
    js = json.loads(txt[txt.rindex('{'):txt.rindex('}') + 1])
    norm = ('loudnorm=I=-20:TP=-3:LRA=11:linear=true'
            f':measured_I={js["input_i"]}:measured_LRA={js["input_lra"]}'
            f':measured_TP={js["input_tp"]}:measured_thresh={js["input_thresh"]}')
    r = subprocess.run([FF, '-v', 'error', '-y', *inp, '-af', norm,
                        '-c:a', 'libopus', '-b:a', f'{kbps}k', '-vbr', 'on',
                        '-application', 'audio', '-ac', '1', path], input=raw, capture_output=True)
    if r.returncode:
        raise SystemExit(r.stderr.decode('utf-8', 'replace'))
    return float(js['input_i'])


# ── 열한 곡의 자리 ──────────────────────────────────────────────────────
# (이름, 악절번호 시작, 도막 수, 크로스페이드, 비고)
LOOPS = [
    ('theme',   0,  6, 1.2, '곡의 문 — 청동 종과 낮은 현이 열리고 선율이 들어선다'),
    ('act1',    0,  3, 1.0, '1863 겨울 아침 — 가장 어둡고 사이가 넓다'),
    ('act2',    3,  3, 1.0, '1866~71 양요 — 선율이 홀로 올라온다'),
    ('act3',    6,  3, 1.0, '1873~76 친정 — 자리를 잡고 밝아진다'),
    ('act4',   12,  3, 1.0, '1882 임오 — 어두워지고 촘촘해진다'),
    ('act5',   17,  3, 1.0, '1884 갑신 — 가장 크고 밝은 마지막 고비'),
    ('march',  14,  3, 0.9, '행렬·이어 — 낮은 북에서 터지는 자리로 (4막에는 이 비트가 없다)'),
]
TENSION = ('tension', 9, 3, 1.0, 1.14, '촉박·탈출 — 3막의 가장 몰아치는 악절을 14% 빠르게')
SHOTS = [
    ('actend', 164.089, 11.0, 0.05, 2.2, '막이 닫히는 자리 — 종지가 내려앉는다'),
    ('loss',   170.089,  8.9, 0.04, 4.5, '기록을 잃는 순간 — 마지막 한 음이 사그라진다'),
]
COUNCIL = ('council', 160.6, 168.0, 40.0, '어전회의·훈령·보존 — 박자 없는 지속음')


def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    rows = []

    for name, at, bars, xf, why in LOOPS:
        L = BAR * bars
        x = decode(src, phrase(at), L + xf + 0.3)
        y = rotate_to_quiet(seamless(x, L, xf))
        li = encode(y, os.path.join(out, name + '.ogg'))
        rows.append((name, L, phrase(at), phrase(at + bars), li, why))

    name, at, bars, xf, tempo, why = TENSION
    L = BAR * bars / tempo
    x = decode(src, phrase(at), BAR * bars + (xf + 0.4) * tempo, tempo=tempo)
    y = rotate_to_quiet(seamless(x, L, xf))
    li = encode(y, os.path.join(out, name + '.ogg'))
    rows.append((name, L, phrase(at), phrase(at + bars), li, why))

    for name, at, dur, fi, fo, why in SHOTS:
        y = shape(decode(src, at, dur), fi, fo)
        li = encode(y, os.path.join(out, name + '.ogg'))
        rows.append((name, dur, at, at + dur, li, why))

    name, a, b, L, why = COUNCIL
    y = rotate_to_quiet(drone(src, a, b, L))
    li = encode(y, os.path.join(out, name + '.ogg'))
    rows.append((name, L, a, b, li, why))

    print(f'\n{"곡":9s} {"길이":>6s} {"원곡 구간":>16s} {"측정 LUFS":>10s} {"KB":>6s}')
    total = 0
    for name, L, a, b, li, why in rows:
        kb = os.path.getsize(os.path.join(out, name + '.ogg')) / 1024
        total += kb
        print(f'{name:9s} {L:6.1f} {a:7.1f}~{b:7.1f} {li:10.1f} {kb:6.1f}   {why}')
    print(f'{"합계":9s} {"":6s} {"":16s} {"":10s} {total:6.1f}')


if __name__ == '__main__':
    main()
