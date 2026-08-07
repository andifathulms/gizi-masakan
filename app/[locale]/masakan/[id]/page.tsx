import { notFound } from 'next/navigation'
import { findRecipe, RECIPES } from '@/lib/resep'
import { isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { Piring } from '@/components/plate/Piring'

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => RECIPES.map((recipe) => ({ locale, id: recipe.id })))
}

export default function MasakanDetail({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound()
  const recipe = findRecipe(params.id)
  if (!recipe) notFound()
  return <Piring recipe={recipe} locale={params.locale as Locale} />
}
