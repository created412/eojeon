const fs=require('node:fs'),path=require('node:path');
(async()=>{
 fs.mkdirSync('assets/maps',{recursive:true});
 const source='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson';
 const cached='.superpowers/ne-land.json';let land;
 if(fs.existsSync(cached))land=JSON.parse(fs.readFileSync(cached));else{const r=await fetch(source);if(!r.ok)throw Error(r.status);const s=await r.text();fs.writeFileSync(cached,s);land=JSON.parse(s)}
 const box=[126.18,37.36,127.12,37.92],rings=[];
 function clip(poly,axis,bound,sign){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=sign*(a[axis]-bound)>=0,ib=sign*(b[axis]-bound)>=0;if(ia)out.push(a);if(ia!==ib){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>j===axis?bound:v+(b[j]-v)*t))}}return out}
 for(const feature of land.features){const polys=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;for(const poly of polys){let ring=poly[0];const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);if(Math.max(...xs)<box[0]||Math.min(...xs)>box[2]||Math.max(...ys)<box[1]||Math.min(...ys)>box[3])continue;for(const [axis,bound,sign] of [[0,box[0],1],[0,box[2],-1],[1,box[1],1],[1,box[3],-1]]){ring=clip(ring,axis,bound,sign);if(!ring.length)break}if(ring.length>2)rings.push(ring.map(p=>p.map(v=>+v.toFixed(5))))}}
 fs.writeFileSync('src/ui/ganghwa-coast-data.js','// Natural Earth 1:10m land; clipped to 경기만. Public domain. Modern coastline.\nexport const COAST_RINGS='+JSON.stringify(rings)+'\n');
 fs.writeFileSync('assets/maps/provenance.json',JSON.stringify({source,license:'Public domain',retrieved:'2026-09-11',processing:'Bounding-box clip, decimal rounding; modern coastline, not 19th-century shoreline',vertices:rings.reduce((n,r)=>n+r.length,0)},null,2));
 await import('./pack-brush-guides.mjs');
 console.log({rings:rings.length,vertices:rings.reduce((n,r)=>n+r.length,0)});
})().catch(e=>{console.error(e);process.exitCode=1});
