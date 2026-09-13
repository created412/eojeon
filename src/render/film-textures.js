import * as base from './textures.js'

const random = n => { const v=Math.sin(n*12.9898+78.233)*43758.5453; return v-Math.floor(v) }
function grain(canvas, seed, count=18000) {
  const g=canvas.getContext('2d'), size=canvas.width
  for(let i=0;i<count;i++) {
    const v=random(i+seed)
    g.fillStyle=v>.5?'rgba(238,227,204,.08)':'rgba(21,23,22,.12)'
    g.fillRect(random(i*3+seed)*size,random(i*7+seed)*size,1+v*1.7,1+v*1.2)
  }
  return canvas
}
export function woodGrain(size=512) {
  const c=base.woodGrain(size),g=c.getContext('2d')
  g.fillStyle='rgba(37,29,24,.35)';g.fillRect(0,0,size,size)
  for(let i=0;i<size;i+=3) {
    g.strokeStyle=`rgba(18,11,8,${.08+random(i)*.17})`;g.lineWidth=.7
    g.beginPath();g.moveTo(i,0);g.bezierCurveTo(i+random(i)*8,size*.3,i-random(i+5)*8,size*.6,i,size);g.stroke()
  }
  for(let i=0;i<18;i++) {
    g.strokeStyle='rgba(179,139,101,.12)';g.lineWidth=1
    g.beginPath();g.ellipse(random(i+4)*size,random(i+7)*size,1.5+random(i)*3,9+random(i+8)*22,.03,0,Math.PI*2);g.stroke()
  }
  return grain(c,19)
}
export function dancheong(size=512) {
  const c=base.dancheong(size),g=c.getContext('2d')
  g.fillStyle='rgba(43,41,33,.35)';g.fillRect(0,0,size,size)
  for(let x=size/16;x<size;x+=size/8) for(let petal=0;petal<6;petal++) {
    const a=petal*Math.PI/3
    g.strokeStyle='#a99a77';g.lineWidth=1.5;g.beginPath()
    g.ellipse(x+Math.cos(a)*size*.017,size*.5+Math.sin(a)*size*.017,size*.018,size*.009,a,0,Math.PI*2);g.stroke()
  }
  return grain(c,41,12000)
}
export function roofTile(size=512) {
  const c=base.roofTile(size),g=c.getContext('2d')
  g.fillStyle='rgba(24,27,30,.65)';g.fillRect(0,0,size,size)
  const step=size/8
  for(let x=0;x<size;x+=step) {
    const ridge=g.createLinearGradient(x,0,x+step,0)
    ridge.addColorStop(0,'rgba(187,199,202,.18)');ridge.addColorStop(.45,'rgba(30,35,37,0)');ridge.addColorStop(1,'rgba(9,13,17,.24)')
    g.fillStyle=ridge;g.fillRect(x,0,step,size)
    for(let y=0;y<size;y+=size/6) {
      const seam=y+((x/step)%2)*size/12
      g.fillStyle='rgba(8,13,16,.5)';g.fillRect(x,seam,step,2)
      g.fillStyle='rgba(180,192,192,.18)';g.fillRect(x,seam+2,step,1)
    }
  }
  return grain(c,76,24000)
}
export function baksok(size=512) {
  const c=document.createElement('canvas');c.width=c.height=size
  const g=c.getContext('2d');g.fillStyle='#50554d';g.fillRect(0,0,size,size)
  const step=size/4
  for(let y=0;y<size;y+=step) for(let x=-step;x<size;x+=step) {
    const off=(y/step)%2?step/2:0
    const v=Math.round(116+random(x*3+y)*27)
    g.fillStyle=`rgb(${v},${v},${v-8})`
    g.fillRect(x+off+2,y+2,step-4,step-4)
    g.strokeStyle='rgba(219,216,195,.20)';g.lineWidth=1
    g.beginPath();g.moveTo(x+off+3,y+step-4);g.lineTo(x+off+3,y+3);g.lineTo(x+off+step-4,y+3);g.stroke()
    if(random(x-y)>.55) {
      g.strokeStyle='rgba(39,42,36,.28)';g.lineWidth=.8
      g.beginPath();g.moveTo(x+off+step*.3,y);g.lineTo(x+off+step*.46,y+step*.22);g.lineTo(x+off+step*.37,y+step*.4);g.stroke()
    }
  }
  return grain(c,109,32000)
}
export function changhoji(size=256) {
  const c=base.changhoji(size),g=c.getContext('2d')
  g.fillStyle='rgba(74,62,44,.15)';g.fillRect(0,0,size,size)
  return grain(c,159,9000)
}
export function maru(size=512) {
  const c=base.maru(size),g=c.getContext('2d')
  g.fillStyle='rgba(36,25,20,.2)';g.fillRect(0,0,size,size)
  return grain(c,199,20000)
}
