import { mkdir, writeFile, readFile } from 'node:fs/promises'
const titles = [
'Daewongun-1883.jpg','Portraits for Choe Ik-Hyeon by Chae Yong-sin.jpg','Portrait of Shin Heon, author unknown.jpg',
'Sangpyeong Tongbo (常平通寶) – Ho Dae Dang Baek (户大當百) - Scan - Obverse & Reverse.jpg',
'Japanese-Gunboat-Unyo-1875.png','GanghwaTreaty.jpg','Japan Korea Treaty of Amity 26 February 1876.jpg',
'ChemulpoTreaty45.jpg','함평 척화비.jpg','KimOkkyun.jpg','Huang Zun Xian.jpg',
'Courant - Souvenir de Séoul, Corée-10.jpg','Courant - Souvenir de Séoul, Corée-11.jpg',
'Uigwe Encykorea-진찬의궤.jpg','Sujagi.jpg','Flight of Japanese Legation 1882.jpg',
...process.argv.slice(2)]
await mkdir('.superpowers/media-research',{recursive:true})
let selected=titles
try {selected=JSON.parse(await readFile('assets/historical/manifest.json','utf8')).map(m=>m.title)}catch{}
const u=new URL('https://commons.wikimedia.org/w/api.php')
u.search=new URLSearchParams({action:'query',format:'json',titles:selected.map(t=>'File:'+t).join('|'),prop:'imageinfo',iiprop:'url|extmetadata'})
const r=await fetch(u); if(!r.ok)throw Error(r.status)
const j=await r.json();
await writeFile('.superpowers/media-research/metadata.json',JSON.stringify(j,null,2))
await mkdir('assets/historical',{recursive:true})
await writeFile('assets/historical/commons-metadata.json',JSON.stringify(j,null,2)+'\n')
const plain=s=>(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
for(const p of Object.values(j.query.pages)){
 const i=p.imageinfo?.[0],m=i?.extmetadata??{};
 console.log(JSON.stringify({title:p.title,url:i?.url,description:plain(m.ImageDescription?.value),date:plain(m.DateTimeOriginal?.value),author:plain(m.Artist?.value),license:m.LicenseShortName?.value,credit:plain(m.Credit?.value)}))
}
