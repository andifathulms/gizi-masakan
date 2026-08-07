/**
 * The sitemap, built from the same lists the routes are.
 *
 * `LOCALES` and `recipeIds()` are what generateStaticParams uses, so a dish
 * added to data/recipes appears here without anyone remembering to add it —
 * a sitemap maintained by hand drifts from the site, and a drifted sitemap
 * points crawlers at pages that do not exist.
 *
 * Each entry carries its locale alternates, so the id and en pairs are
 * declared as translations here as well as in each page's head.
 */
import type { MetadataRoute } from 'next'
import { LOCALES } from '@/lib/i18n'
import { recipeIds } from '@/lib/resep'
import { pageUrl } from '@/lib/metadata'

export const dynamic = 'force-static'

/** Every path after the locale, in the order a reader would meet them. */
function paths(): string[] {
  return ['masakan', ...recipeIds().map((id) => `masakan/${id}`), 'bahan', 'metode']
}

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    paths().map((path) => ({
      url: pageUrl(`${locale}/${path}`),
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((other) => [other, pageUrl(`${other}/${path}`)]),
        ),
      },
      // The dish index is the entry point; everything else is equal to it.
      priority: path === 'masakan' ? 1 : 0.8,
    })),
  )
}
