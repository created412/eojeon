"""Build the 2026-10-05 Suno game score from preserved, authorized MP3 downloads.

python tools/bgm-from-suno.py
Requires numpy and imageio-ffmpeg. Does not contact Suno or generate music.
Source IDs, prompts and settings: assets/bgm/suno-2026-10-05/briefs.json.
"""
from pathlib import Path
import importlib.util
import json
import hashlib
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/bgm'
SOURCES = OUT / 'suno-2026-10-05'
spec = importlib.util.spec_from_file_location('audio_helpers', ROOT / 'tools/bgm-from-teacher.py')
audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)


def loop_window(x):
    """Find compatible texture/energy at two boundaries 28–36 seconds apart.

    This is acoustic matching, not a claim of automatic musical bar detection.
    Avoid the opening and final cadence. Crossfade the chosen seam afterward.
    """
    hop = audio.SR // 10
    n = len(x) // hop
    blocks = x[:n * hop].reshape(n, hop)
    energy = np.sqrt(np.mean(blocks ** 2, axis=1))
    spectrum = abs(np.fft.rfft(blocks * np.hanning(hop), axis=1))
    edges = [2, 8, 20, 40, 80, 160, 320, 640, 1200]
    bands = np.stack([np.log1p(spectrum[:, a:b].mean(axis=1) * 10)
                      for a, b in zip(edges, edges[1:])], axis=1)
    bands /= np.maximum(np.linalg.norm(bands, axis=1, keepdims=True), 1e-6)
    best = None
    # Compare a full second, so one fortuitous zero crossing cannot win.
    for a in range(150, min(550, n - 380), 2):
        for duration in range(280, 361, 2):
            b = a + duration
            if b + 14 >= n or min(energy[a:a+10].mean(), energy[b:b+10].mean()) < .008:
                continue
            spectral = np.mean((bands[a:a+10] - bands[b:b+10]) ** 2)
            level = np.mean(abs(np.log((energy[a:a+10]+1e-5) / (energy[b:b+10]+1e-5))))
            score = spectral * 20 + level * .15
            if best is None or score < best[0]: best = score, a / 10, duration / 10
    if best is None: raise ValueError('No non-silent loop candidate')
    return best[1:]


def main():
    keys = ['theme', 'act1', 'act2', 'act3', 'act4', 'act5', 'march', 'tension', 'council', 'ending']
    missing = [k for k in keys if not (SOURCES / f'{k}-source.mp3').exists()]
    if missing: raise SystemExit('Missing downloads: ' + ', '.join(missing))
    report = []
    for key in keys:
        source = SOURCES / f'{key}-source.mp3'
        x = audio.decode(str(source), 0, 180)
        at, duration = loop_window(x)
        segment = x[round(at*audio.SR):]
        y = audio.rotate_to_quiet(audio.seamless(segment, duration, 1.2))
        path = OUT / f'{key}.ogg'
        measured = audio.encode(y, str(path), kbps=22)
        report.append(dict(key=key, source=source.name, start=at, duration=duration,
                           overlap=1.2, measuredSourceLufs=measured, targetLufs=-20,
                           bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        print(key, round(duration, 1), path.stat().st_size, flush=True)
    # Two restrained one-shot cadences from the newly composed ending, not the old score.
    source = SOURCES / 'ending-source.mp3'
    x = audio.decode(str(source), 0, 180)
    for key, tail, duration, fade in [('actend', 18, 9, 2.8), ('loss', 10, 8, 4)]:
        at = len(x)/audio.SR - tail
        y = audio.shape(x[round(at*audio.SR):round((at+duration)*audio.SR)], .08, fade)
        path = OUT / f'{key}.ogg'
        measured = audio.encode(y, str(path), kbps=22)
        report.append(dict(key=key, source=source.name, start=at, duration=duration,
                           loop=False, targetLufs=-20, measuredSourceLufs=measured,
                           bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (SOURCES / 'edits.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Total:', sum(r['bytes'] for r in report), 'bytes')


if __name__ == '__main__': main()
