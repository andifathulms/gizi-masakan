import { notFound } from 'next/navigation'
import { enabledSources, excludedSources } from '@/lib/sources/manifest'
import { fdcRelease, loadFdcTable, unmatchedIngredients } from '@/lib/sources/fdc/load'
import { NUTRIENTS } from '@/lib/nutrition/nutrients'
import { allDerivedYields, factors } from '@/lib/nutrition/factors'
import { urtStatus } from '@/lib/portion'
import { AKG_CITATION, AKG_CITATION_URL, AKG_KELOMPOK, AKG_KELOMPOK_TIDAK_DIMUAT, AKG_TRANSCRIBED_ON } from '@/lib/akg'
import { RECIPES } from '@/lib/resep'
import { copyFor, isLocale, LOCALES, type Locale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/metadata'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : 'id'
  const copy = copyFor(locale)
  return pageMetadata({ locale, title: copy.nav.metode, description: copy.lede.metode, path: 'metode' })
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-rim/15 pt-block">
      <h2 className="font-display text-xl text-rim">{title}</h2>
      <div className="mt-3 max-w-prose space-y-3 text-base">{children}</div>
    </section>
  )
}

/**
 * Method disclosure — PRD §6.7. Which release, which nutrients, which factors,
 * how URT weights are measured, and what TKPI would add and why it is not used.
 *
 * Linked from every plate, not buried.
 */
export default function MetodePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound()
  const locale = params.locale as Locale
  const copy = copyFor(locale)
  const en = locale === 'en'
  const table = loadFdcTable()
  const release = fdcRelease()
  const urt = urtStatus()
  const derived = allDerivedYields()

  /* The pipeline, in the order the numbers are made, each step linked to the
     section that discloses it. The counts are the live ones, read from the
     same modules the rest of the page uses. */
  const alur = [
    {
      id: 'data-bahan',
      judul: 'FDC SR Legacy',
      isi: en ? `${release.release}. Public domain.` : `${release.release}. Domain publik.`,
    },
    {
      id: 'data-bahan',
      judul: en ? 'Ingredient table' : 'Tabel bahan',
      isi: en
        ? `${table.entries.size} ingredients, per 100 g. Missing stays missing, never zero.`
        : `${table.entries.size} bahan, per 100 g. Yang kosong tetap kosong, bukan nol.`,
    },
    {
      id: 'resep',
      judul: en ? 'Recipe' : 'Resep',
      isi: en
        ? `${RECIPES.length} dishes, raw weights, stated as estimates.`
        : `${RECIPES.length} masakan, berat mentah, ditandai sebagai perkiraan.`,
    },
    {
      id: 'pengolahan',
      judul: en ? 'Yield & retention' : 'Yield & retensi',
      isi: en
        ? 'USDA factors, each cited — or marked unadjusted.'
        : 'Faktor USDA, tiap faktor dikutip — atau ditandai tanpa penyesuaian.',
    },
    {
      id: 'apa',
      judul: en ? 'Trace' : 'Jejak',
      isi: en
        ? 'Every contribution, and every gap named.'
        : 'Tiap sumbangan bahan, dan tiap kekosongan disebut.',
    },
  ]

  const isi = [
    ['apa', en ? 'What this is, and is not' : 'Ini apa, dan bukan apa'],
    ['data-bahan', en ? 'Ingredient data' : 'Data bahan'],
    ['sumber', en ? 'Sources and their licences' : 'Sumber dan lisensinya'],
    ['tkpi', en ? 'Why TKPI is not used' : 'Kenapa TKPI tidak dipakai'],
    ['pengolahan', en ? 'Cooking: yield and retention' : 'Pengolahan: yield dan retensi'],
    ['urt', en ? 'Household measures (URT)' : 'Takaran rumah tangga (URT)'],
    ['resep', en ? 'Recipes' : 'Resep'],
    ['akg', en ? 'Reference intakes (AKG)' : 'Angka kecukupan gizi (AKG)'],
    ['privasi', en ? 'Privacy' : 'Privasi'],
  ] as const

  return (
    <div>
      <h1 className="font-display text-3xl text-rim">{copy.nav.metode}</h1>
      <p className="mt-4 max-w-prose text-md text-ink-soft">{copy.lede.metode}</p>

      {/* The disclosure is the project's strongest argument, so it opens with
          the path a number takes rather than with prose. An ordered list,
          because the order is the method. */}
      <ol className="mt-block grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {alur.map((langkah, index) => (
          <li key={langkah.judul} className="relative">
            <a
              href={`#${langkah.id}`}
              className="card-hover flex h-full flex-col rounded-plate border border-rim/25 bg-piring p-4 hover:border-rim"
            >
              <span className="font-mono text-xs text-rim-soft">{index + 1}</span>
              <span className="mt-1 font-display text-md font-medium text-rim">{langkah.judul}</span>
              <span className="mt-1 text-sm text-ink-soft">{langkah.isi}</span>
            </a>
            {index < alur.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 font-semibold text-rim-soft lg:block"
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-section grid grid-cols-[minmax(0,1fr)] gap-block lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label={en ? 'On this page' : 'Di halaman ini'} className="lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-rim-soft">
            {en ? 'On this page' : 'Di halaman ini'}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm lg:flex-col lg:gap-1">
            {isi.map(([id, judul]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-full border border-rim/20 px-3 py-1 text-rim hover:bg-rim-tint lg:rounded-md lg:border-0 lg:px-2"
                >
                  {judul}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-section">
          <Section id="apa" title={en ? 'What this is, and is not' : 'Ini apa, dan bukan apa'}>
            <p>{copy.disclaimer}</p>
            <p>
              {en
                ? 'It is a reference and a lookup. There is no daily total, no calorie budget, no streak, and no logging — deliberately. A tool that adds those becomes a calorie-restriction tool, and calorie-restriction tools can do real harm to people with disordered eating. Adequacy here answers "am I getting enough", never "have I exceeded".'
                : 'Ini alat rujukan dan pencarian. Tidak ada total harian, tidak ada jatah kalori, tidak ada rentetan hari, tidak ada pencatatan — dan itu disengaja. Alat yang menambahkan itu semua berubah jadi alat pembatasan kalori, dan alat semacam itu bisa benar-benar merugikan orang dengan gangguan makan. Kecukupan di sini menjawab "apakah saya sudah cukup", bukan "apakah saya sudah lewat".'}
            </p>
            <p>
              {en
                ? 'Energy appears first because that is what people look for. It is not the headline: it is styled exactly like every other nutrient.'
                : 'Energi muncul pertama karena itu yang paling dicari orang. Bukan berarti energi jadi angka utama — tampilannya sama persis dengan nutrien lain.'}
            </p>
          </Section>

          <Section id="data-bahan" title={en ? 'Ingredient data' : 'Data bahan'}>
            <p>
              {en
                ? `Ingredient values come from ${release.release}. ${table.entries.size} entries were curated from the roughly 7,800 in SR Legacy and mapped to Indonesian kitchen names. The Branded dataset — 1.9 million packaged products — is excluded as a different problem.`
                : `Nilai bahan berasal dari ${release.release}. ${table.entries.size} entri dipilih dari sekitar 7.800 entri SR Legacy dan dipetakan ke nama dapur Indonesia. Dataset Branded — 1,9 juta produk kemasan — tidak dipakai karena persoalannya lain.`}
            </p>
            <p>
              {en
                ? `${NUTRIENTS.length} nutrients are kept, identified by their FDC nutrient numbers. A nutrient FDC has no value for is stored as absent, never as zero, and is named wherever it is used.`
                : `${NUTRIENTS.length} nutrien disimpan, diidentifikasi dengan nomor nutrien FDC. Nutrien yang tidak punya nilai di FDC disimpan sebagai kosong, bukan sebagai nol, dan disebut di mana pun dipakai.`}
            </p>
            <p>
              {en
                ? 'US values are approximations for Indonesian ingredients. Where a variety differs meaningfully — bayam is Amaranthus against FDC’s Spinacia, rawit approximated by serrano, tongkol by cakalang — the ingredient carries a note saying so.'
                : 'Nilai basis data Amerika adalah pendekatan untuk bahan Indonesia. Kalau varietasnya berbeda jauh — bayam itu Amaranthus sementara entri FDC Spinacia, rawit didekati serrano, tongkol didekati cakalang — bahannya membawa catatan yang menyebutkan itu.'}
            </p>
            <p>
              {en
                ? `${unmatchedIngredients().length} Indonesian ingredients have no acceptable source at all — kangkung, lengkuas, kemiri, serai, terasi, gula merah, kecap manis and others. They stay in the recipes and are named as gaps rather than being approximated or deleted.`
                : `${unmatchedIngredients().length} bahan Indonesia sama sekali belum punya sumber yang bisa dipakai — kangkung, lengkuas, kemiri, serai, terasi, gula merah, kecap manis, dan lainnya. Bahan itu tetap ada di resep dan disebut sebagai kekosongan, bukan didekati atau dihapus.`}
            </p>
          </Section>

          <Section id="sumber" title={en ? 'Sources and their licences' : 'Sumber dan lisensinya'}>
            {enabledSources().map((source) => (
              <div key={source.id}>
                <p className="font-medium">
                  {source.name} — {source.licence.label}
                </p>
                <p className="text-chip">{source.licence.reasoning}</p>
              </div>
            ))}
          </Section>

          <Section id="tkpi" title={en ? 'Why TKPI is not used' : 'Kenapa TKPI tidak dipakai'}>
            {excludedSources().map((source) => (
              <div key={source.id} className="space-y-3">
                <p>
                  {en
                    ? `${source.name} would be the better source: it is Indonesian, authoritative, and covers the local varieties FDC approximates badly.`
                    : `${source.name} sebenarnya sumber yang lebih baik: Indonesia, resmi, dan memuat varietas lokal yang didekati FDC dengan buruk.`}
                </p>
                <p>{source.licence.reasoning}</p>
                {source.exclusion && (
                  <>
                    <p>
                      <span className="text-chip">{en ? 'What it would add: ' : 'Yang akan ditambahkannya: '}</span>
                      {source.exclusion.whatItWouldAdd}
                    </p>
                    <p>
                      <span className="text-chip">{en ? 'If permission ever arrives: ' : 'Kalau izin suatu saat didapat: '}</span>
                      {source.exclusion.howItCouldChange}
                    </p>
                  </>
                )}
                <p className="text-chip">
                  {en
                    ? 'An adapter for it ships in the codebase, disabled behind the licence gate and containing no TKPI values. The build refuses to run if that entry is removed or enabled.'
                    : 'Adapternya tetap ada di kode, dimatikan di balik gerbang lisensi dan tidak memuat satu pun nilai TKPI. Build akan menolak jalan kalau entri itu dihapus atau diaktifkan.'}
                </p>
              </div>
            ))}
          </Section>

          <Section id="pengolahan" title={en ? 'Cooking: yield and retention' : 'Pengolahan: yield dan retensi'}>
            <p>
              {en
                ? 'Cooking changes weight, and it changes nutrients. The two are handled separately: a yield factor converts raw weight to cooked weight, and a retention factor says how much of a nutrient survives.'
                : 'Memasak mengubah berat, dan mengubah kandungan gizi. Keduanya ditangani terpisah: faktor yield mengubah berat mentah jadi berat matang, faktor retensi menyebut berapa banyak nutrien yang bertahan.'}
            </p>
            <p>{factors.retentionCitation}</p>
            <p>
              {en
                ? 'USDA publishes no retention factor for energy, protein, fat, carbohydrate, fibre, sugar, water, cholesterol, selenium, vitamin E or vitamin K. Those nutrients pass through unchanged and are marked unadjusted in the trace. Marked unadjusted is a different claim from "we applied 100%", and the difference matters.'
                : 'USDA tidak menerbitkan faktor retensi untuk energi, protein, lemak, karbohidrat, serat, gula, air, kolesterol, selenium, vitamin E, dan vitamin K. Nutrien itu lewat tanpa perubahan dan ditandai "tanpa penyesuaian" di jejak perhitungan. Ditandai tanpa penyesuaian tidak sama dengan "kami menerapkan 100%", dan bedanya penting.'}
            </p>
            <p>
              {en
                ? 'Neither USDA table covers rice or vegetables, so those yields are derived from FDC’s own raw and cooked entries by dry-matter balance:'
                : 'Kedua tabel USDA tidak memuat beras dan sayur, jadi faktor yield-nya diturunkan dari entri mentah dan matang FDC sendiri lewat keseimbangan bahan kering:'}
            </p>
            <p className="font-mono text-xs">yield = (100 − waterRaw) / (100 − waterCooked)</p>
            <ul className="list-inside list-disc text-chip">
              {derived.map((entry) => (
                <li key={entry.id}>
                  {entry.labelId} — ×{entry.factor} ({en ? 'from FDC ' : 'dari FDC '}
                  {entry.derivation.cookedFdcId})
                </li>
              ))}
            </ul>
          </Section>

          <Section id="urt" title={en ? 'Portions in household measures (URT)' : 'Takaran rumah tangga (URT)'}>
            <p>{urt.pesan}</p>
            <p>
              {en ? 'How they will be measured: ' : 'Cara mengukurnya: '}
              {urt.caraMengukur.alat}
            </p>
            <ol className="list-inside list-decimal text-chip">
              {urt.caraMengukur.prosedur.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Section>

          <Section id="resep" title={en ? 'Recipes' : 'Resep'}>
            <p>
              {en
                ? `${RECIPES.length} recipes, each authored and either cited to a source or explicitly marked as an own composition. None are scraped or copied from a copyrighted cookbook.`
                : `${RECIPES.length} resep, semuanya ditulis sendiri dan masing-masing dikutip sumbernya atau ditandai sebagai susunan sendiri. Tidak ada yang di-scrape atau disalin dari buku masak berhak cipta.`}
            </p>
            <p className="text-edited">
              {en
                ? 'The gram weights in these recipes have not been weighed yet. Every one is marked as an estimate and shown in terracotta, the colour this site reserves for estimates and your own edits. Weighing them is the part of this project that cannot be automated, and it has not been done.'
                : 'Berat bahan di resep-resep ini belum ditimbang. Semuanya ditandai sebagai perkiraan dan ditampilkan dengan warna terakota, warna yang di situs ini dipakai untuk perkiraan dan suntingan Anda sendiri. Menimbangnya adalah bagian proyek ini yang tidak bisa diotomatiskan, dan itu belum dikerjakan.'}
            </p>
          </Section>

          <Section id="akg" title={en ? 'Reference intakes (AKG)' : 'Angka kecukupan gizi (AKG)'}>
            <p>{AKG_CITATION}</p>
            <p>
              <a href={AKG_CITATION_URL} className="text-rim underline underline-offset-4">
                {AKG_CITATION_URL}
              </a>
            </p>
            <p>
              {en
                ? `Transcribed on ${AKG_TRANSCRIBED_ON}. ${AKG_KELOMPOK.length} age and sex groups are carried. A Peraturan Menteri is a peraturan perundang-undangan, expressly outside copyright under UU 28/2014 Pasal 42 — which is exactly why it can be used where TKPI cannot.`
                : `Disalin pada ${AKG_TRANSCRIBED_ON}. ${AKG_KELOMPOK.length} kelompok umur dan jenis kelamin dimuat. Peraturan Menteri termasuk peraturan perundang-undangan, yang dikecualikan dari hak cipta oleh UU 28/2014 Pasal 42 — justru itu sebabnya ini boleh dipakai sementara TKPI tidak.`}
            </p>
            <p className="text-chip">
              {en ? 'Groups not carried: ' : 'Kelompok yang belum dimuat: '}
              {AKG_KELOMPOK_TIDAK_DIMUAT.kelompok.join('; ')}. {AKG_KELOMPOK_TIDAK_DIMUAT.alasan}
            </p>
            <p className="text-chip">
              {en
                ? 'The regulation lists a reference body weight and height per group. Neither is carried here — weight has no place in this tool.'
                : 'Peraturannya memuat berat badan dan tinggi badan rujukan per kelompok. Keduanya tidak dibawa ke sini — berat badan tidak punya tempat di alat ini.'}
            </p>
          </Section>

          <Section id="privasi" title={en ? 'Privacy' : 'Privasi'}>
            <p>
              {en
                ? 'The site makes no network requests after it loads. No analytics, no fonts from a CDN, no API. Everything, including the ingredient data, is bundled. Nothing you type leaves your browser.'
                : 'Situs ini tidak melakukan permintaan jaringan apa pun setelah dimuat. Tidak ada analitik, tidak ada font dari CDN, tidak ada API. Semuanya, termasuk data bahan, dibundel. Apa pun yang Anda ketik tidak keluar dari peramban Anda.'}
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
