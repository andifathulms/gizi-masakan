/**
 * Post-export steps GitHub Pages needs. PRD §12.
 *
 * `.nojekyll` stops Pages running the output through Jekyll, which would strip
 * every `_next/` directory and break the whole site silently.
 */
import { writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUT = new URL('../out/', import.meta.url).pathname

if (!existsSync(OUT)) {
  console.error('  postbuild: no ./out — did next build run?')
  process.exit(1)
}

writeFileSync(join(OUT, '.nojekyll'), '')
console.log('  postbuild: wrote out/.nojekyll')

let bytes = 0
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const info = statSync(path)
    if (info.isDirectory()) walk(path)
    else bytes += info.size
  }
}
walk(OUT)
console.log(`  postbuild: exported ${(bytes / 1024 / 1024).toFixed(2)} MB`)
