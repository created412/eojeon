import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
const packed={}
for(const id of ['heungseon','choeikhyeon','sinheon','gojong','kimokgyun']){
 const bytes=await sharp(`assets/portraits-cutout/${id}.png`).trim().resize({width:500,height:720,fit:'inside'}).webp({quality:78,alphaQuality:90}).toBuffer()
 await writeFile(`assets/portraits-cutout/${id}.webp`,bytes)
 packed[id]='data:image/webp;base64,'+bytes.toString('base64')
 console.log(id,bytes.length)
}
await writeFile('src/ui/portrait-cutouts-data.js','// Background-removal edits; original historical media remains separately viewable.\nexport const PORTRAIT_CUTOUTS = '+JSON.stringify(packed)+'\n')
