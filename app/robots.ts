/**
 * robots.txt. Everything is public and everything is meant to be found, so the
 * only thing this does is point at the sitemap — which is the one thing a
 * crawler cannot guess.
 *
 * No disallow rules: there is no admin, no API and no duplicate surface to
 * hide. The trailing-slash pair is handled by the canonical tag on each page.
 */
import type { MetadataRoute } from 'next'
import { pageUrl } from '@/lib/metadata'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: pageUrl('sitemap.xml').replace(/\/$/, ''),
  }
}
