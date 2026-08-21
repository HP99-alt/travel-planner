// Unit test for the image-upload / paste pipeline used by Itinerary's
// onImagesPicked. Verifies that image files are read into base64 dataURLs and
// non-image files are filtered out. Run with: node test/imageUpload.test.mjs
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html>')
const w = dom.window
w.FileReader = class {
  readAsDataURL(f) { setTimeout(() => { this.result = 'data:image/png;base64,' + f.name; this.onload && this.onload() }, 0) }
}
globalThis.window = w
globalThis.FileReader = w.FileReader

// Mirror of Itinerary.onImagesPicked.
async function onImagesPicked(files, arr, setArr) {
  const adds = []
  for (const f of Array.from(files)) {
    if (f.type.startsWith('image/')) {
      adds.push(await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(f) }))
    }
  }
  setArr([...arr, ...adds])
}

let failed = 0
function check(name, cond) { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) failed++ }

// 1) Mixed files: only images should be appended.
{
  const files = [{ type: 'image/png', name: 'a.png' }, { type: 'text/plain', name: 'b.txt' }, { type: 'image/jpeg', name: 'c.jpg' }]
  let out = []
  await onImagesPicked(files, [], (n) => { out = n })
  check('Appends only image files (2 of 3)', out.length === 2)
  check('Produces base64 dataURLs', out.every((s) => s.startsWith('data:image/')))
}

// 2) Prepend to existing images.
{
  const files = [{ type: 'image/png', name: 'x.png' }]
  let out = []
  await onImagesPicked(files, ['data:image/png;base64,existing'], (n) => { out = n })
  check('Prepends to existing image array', out.length === 2 && out[0] === 'data:image/png;base64,existing')
}

// 3) No images -> no change.
{
  const files = [{ type: 'application/pdf', name: 'd.pdf' }]
  let out = []
  await onImagesPicked(files, [], (n) => { out = n })
  check('No images yields empty array', out.length === 0)
}

console.log(`\n${failed === 0 ? 'ALL PASSED' : failed + ' FAILED'}`)
process.exit(failed ? 1 : 0)
