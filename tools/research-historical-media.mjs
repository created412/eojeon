import { mkdir, writeFile } from 'node:fs/promises'
const searches=process.argv.slice(2)
await mkdir('.superpowers/media-research',{recursive:true})
for(const term of searches){
  const url=new URL('https://commons.wikimedia.org/w/api.php')
  url.search=new URLSearchParams({action:'query',format:'json',list:'search',srsearch:term,srnamespace:'6',srlimit:'6'})
  const r=await fetch(url);if(!r.ok)throw Error(`${r.status}: ${term}`)
  const json=await r.json()
  console.log(JSON.stringify({term,files:json.query?.search?.map(x=>x.title)}))
  await writeFile(`.superpowers/media-research/${encodeURIComponent(term)}.json`,JSON.stringify(json,null,2))
}
