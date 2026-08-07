import { notFound } from 'next/navigation'
import { findRecipe, RECIPES } from '@/lib/resep'
import { isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { Piring } from '@/components/plate/Piring'
import { copyFor } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => RECIPES.map((recipe) => ({ locale, id: recipe.id })))
}

/* The dish's own name and description — the same two strings the plate
   renders as its h1 and its lede. */
export function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const locale = isLocale(params.locale) ? params.locale : 'id'
  const recipe = findRecipe(params.id)
  if (!recipe) return {}
  return pageMetadata({
    locale,
    title: recipe.namaId,
    description: recipe.deskripsiId,
    path: `masakan/${recipe.id}`,
  })
}

export default function MasakanDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound()
  const recipe = findRecipe(params.id)
  if (!recipe) notFound()
  return <Piring recipe={recipe} locale={params.locale as Locale} />
}
