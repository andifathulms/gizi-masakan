/**
 * Serve ./out under the production basePath, so the pre-push check exercises
 * the same URLs GitHub Pages will. PRD §12.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const PORT = Number(process.env.PORT ?? 4321)
const BASE_PATH = process.env.GIZI_BASE_PATH ?? '/gizi-masakan'
const ROOT = new URL('../out/', import.meta.url).pathname

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
}

async function resolveFile(pathname) {
  const candidates = [pathname, join(pathname, 'index.html'), `${pathname}.html`]
  for (const candidate of candidates) {
    const full = join(ROOT, normalize(candidate))
    if (!full.startsWith(ROOT)) continue
    try {
      const info = await stat(full)
      if (info.isFile()) return full
    } catch {
      /* try next candidate */
    }
  }
  return null
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let pathname = decodeURIComponent(url.pathname)

  if (BASE_PATH && pathname === BASE_PATH) {
    res.writeHead(302, { location: `${BASE_PATH}/` })
    res.end()
    return
  }
  if (BASE_PATH && !pathname.startsWith(`${BASE_PATH}/`)) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end(`Not found. The site is served under ${BASE_PATH}/`)
    return
  }
  pathname = BASE_PATH ? pathname.slice(BASE_PATH.length) : pathname

  const file = await resolveFile(pathname || '/')
  if (!file) {
    const notFound = await resolveFile('/404.html')
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(notFound ? await readFile(notFound) : 'Not found')
    return
  }

  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  res.end(await readFile(file))
}).listen(PORT, () => {
  console.log(`preview  http://localhost:${PORT}${BASE_PATH}/`)
})
