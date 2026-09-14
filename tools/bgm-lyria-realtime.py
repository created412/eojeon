import asyncio, os, sys, wave
from google import genai
from google.genai import types

OUT = sys.argv[1]; SECONDS = float(sys.argv[2]); BPM = int(sys.argv[3]); PROMPTS = sys.argv[4:]
client = genai.Client(api_key=os.environ['GEMINI_API_KEY'], http_options={'api_version': 'v1alpha'})

async def main():
    pcm = bytearray()
    target = int(48000 * 2 * 2 * SECONDS)
    async with client.aio.live.music.connect(model='models/lyria-realtime-exp') as session:
        async def receive():
            async for msg in session.receive():
                sc = getattr(msg, 'server_content', None)
                if sc and sc.audio_chunks:
                    for ch in sc.audio_chunks: pcm.extend(ch.data)
                    if len(pcm) >= target: return
                elif getattr(msg, 'filtered_prompt', None):
                    print('filtered', msg.filtered_prompt); 
        weighted = [types.WeightedPrompt(text=p, weight=1.0) for p in PROMPTS]
        await session.set_weighted_prompts(prompts=weighted)
        await session.set_music_generation_config(config=types.LiveMusicGenerationConfig(bpm=BPM, temperature=1.0, guidance=4.5, density=0.35, brightness=0.3))
        await session.play()
        await asyncio.wait_for(receive(), timeout=SECONDS * 4 + 60)
    with wave.open(OUT, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(48000); w.writeframes(bytes(pcm[:target]))
    print('wrote', OUT, len(pcm) / (48000 * 4), 's')

asyncio.run(main())
