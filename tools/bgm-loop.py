import wave, numpy as np, av, sys
def read(p):
    w=wave.open(p); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).reshape(-1,2).astype(np.float32)/32768; return x
def rms_windows(x,sr=48000,win=2):
    n=sr*win; return [round(float(np.sqrt((x[i:i+n]**2).mean())),3) for i in range(0,len(x)-n+1,n)]
def make(src,out,skip,length,fade=4.0,sr=48000):
    x=read(src); print(src,'rms per 2s',rms_windows(x)[:6],'...',rms_windows(x)[-3:])
    a=x[int(skip*sr):int((skip+length+fade)*sr)]
    L=int(length*sr); F=int(fade*sr)
    body=a[:L].copy(); tail=a[L:L+F]
    ramp=np.linspace(0,1,F)[:,None]
    body[:F]=body[:F]*ramp+tail*(1-ramp)   # 끝을 처음에 겹쳐 반복 이음새를 지운다
    peak=np.abs(body).max(); body=body/peak*0.89
    mono=body.mean(axis=1)
    o=av.open(out,'w',format='ogg'); st=o.add_stream('libopus',rate=48000); st.bit_rate=32000; st.layout='mono'
    fr=av.AudioFrame.from_ndarray((mono*32767).astype(np.int16)[None,:],format='s16',layout='mono'); fr.sample_rate=48000
    rs=av.AudioResampler(format='s16',layout='mono',rate=48000)
    for f in rs.resample(fr):
        for p in st.encode(f): o.mux(p)
    for p in st.encode(None): o.mux(p)
    o.close(); import os; print(out,round(os.path.getsize(out)/1024),'KB',length,'s')
make('main.wav','bgm-main.ogg',skip=6,length=94)
make('tension.wav','bgm-tension.ogg',skip=5,length=54)
