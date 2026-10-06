import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
const out = {}
for (const id of ['jeongjok','gwangseong']) {
  const bytes = await sharp(await readFile(`assets/battle/${id}.png`)).resize({width:1344,withoutEnlargement:true}).webp({quality:78}).toBuffer()
  await writeFile(`assets/battle/${id}.webp`,bytes)
  out[id]='data:image/webp;base64,'+bytes.toString('base64')
  console.log(id,bytes.length)
}
await writeFile('src/ui/battle-art-data.js','// Higgsfield: historical reconstruction, not documentary imagery. See assets/battle/README.md.\nexport const BATTLE_ART = '+JSON.stringify(out)+'\n')
