"""Keep V23 dialogue, then continue its Suno recording independently of picture loops."""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
import wave
import numpy as np
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 48000
MOVIE = ROOT / 'assets/video/eojeon-prologue-v23.mp4'
SOURCE = ROOT / 'assets/bgm/suno-2026-10-05/theme-source.mp3'
OUT = ROOT / 'assets/video/eojeon-prologue-continuous.m4a'
OFFSET = -2.1  # V23 at 50s corresponds to original Suno at 47.9s.
LENGTH = 128
LOOP_START = 59

def decode(path):
    data = subprocess.check_output([FFMPEG, '-v', 'error', '-i', str(path),
        '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'])
    return np.frombuffer(data, '<f4').reshape(-1, 2)

original = decode(MOVIE)
song = decode(SOURCE)
start, end = 50 * SR, 54 * SR
reference = song[round((50 + OFFSET) * SR):round((54 + OFFSET) * SR)]
correlation = float(np.corrcoef(original[start:end].ravel(), reference.ravel())[0, 1])
assert correlation > .99, 'The source must be the exact music used in V23.'
gain = float(np.sum(original[start:end] * reference) / np.sum(reference * reference))
master = np.zeros((LENGTH * SR, 2), dtype=np.float32)
master[:55 * SR] = original[:55 * SR]
# Preserve the original time mapping, without restarting the song at the picture loop.
for begin, finish in [(54, LENGTH)]:
    part = song[round((begin + OFFSET) * SR):round((finish + OFFSET) * SR)] * gain
    master[begin * SR:finish * SR] = part
mix = np.linspace(0, 1, SR, endpoint=False, dtype=np.float32)[:, None]
master[54 * SR:55 * SR] = original[54 * SR:55 * SR] * (1 - mix) + master[54 * SR:55 * SR] * mix
# Only after 128 seconds, repeat music without replaying narration. The last four
# seconds blend into 55..59; playback resumes at 59, beyond the blended section.
cross = np.linspace(0, 1, 4 * SR, endpoint=False, dtype=np.float32)[:, None]
master[-4 * SR:] = master[-4 * SR:] * (1 - cross) + master[55 * SR:59 * SR] * cross
with tempfile.TemporaryDirectory(prefix='eojeon-audio-') as directory:
    wav = Path(directory) / 'master.wav'
    with wave.open(str(wav), 'wb') as target:
        target.setnchannels(2); target.setsampwidth(2); target.setframerate(SR)
        target.writeframes(np.rint(master * 32768).clip(-32768, 32767).astype('<i2').tobytes())
    subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', str(wav), '-c:a', 'aac',
        '-b:a', '160k', '-movflags', '+faststart', str(OUT)], check=True)
report = {'video': MOVIE.name, 'soundtrack': OUT.name, 'duration': LENGTH,
    'musicLoopStart': LOOP_START, 'musicSource': str(SOURCE.relative_to(ROOT)),
    'sourceOffsetSeconds': OFFSET, 'matchedCorrelation': correlation, 'matchedGain': gain,
    'first54Seconds': 'Original V23 mix, including dialogue',
    'seconds54to55': 'One-second transition to the same source at its matching time',
    'musicLoopCrossfadeSeconds': [124, 128], 'bytes': OUT.stat().st_size,
    'sha256': hashlib.sha256(OUT.read_bytes()).hexdigest()}
(OUT.parent / 'continuous-audio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
