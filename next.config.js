/**
 * Static export for GitHub Pages. PRD §12.
 *
 * basePath must match the repository name; set GIZI_BASE_PATH="" for a
 * user-page or custom-domain deploy. `pnpm preview` reads the same value so
 * the local check runs under the production basePath.
 */
const basePath = process.env.GIZI_BASE_PATH ?? '/gizi-masakan'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

module.exports = nextConfig
