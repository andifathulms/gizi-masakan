/**
 * Two locales, Indonesian first. `id` is the default and the one the copy is
 * written in; `en` is a secondary rendering of the same data.
 *
 * Not a translation framework — a small typed dictionary, because the site is
 * mostly numbers and the numbers do not translate.
 */
export const LOCALES = ['id', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'id'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

export interface Copy {
  readonly siteName: string
  readonly tagline: string
  /** Four or five words under the wordmark. The site has to say what it is on
      every page, not only on the one whose heading happens to explain it. */
  readonly tagline5: string
  readonly nav: { masakan: string; bahan: string; metode: string }
  /** The dish index doubles as the landing page — it is what the root
      redirects to — so it carries the proposition, not just a list header. */
  readonly landing: {
    readonly judul: string
    readonly lede: string
    readonly poin: readonly { readonly judul: string; readonly isi: string }[]
  }
  readonly plate: {
    readonly perPorsi: string
    readonly seluruhResep: string
    readonly porsi: string
    readonly estimasi: string
    readonly ubahTakaran: string
    readonly beratMentah: string
    readonly beratMatang: string
    readonly tidakDiketahui: string
  }
  readonly strip: {
    readonly judul: string
    readonly bahan: string
    readonly berat: string
    readonly sumbangan: string
    readonly pilihNutrien: string
    readonly kembalikan: string
    readonly diedit: string
    readonly perkiraan: string
    readonly ditimbang: string
  }
  readonly gaps: {
    readonly judul: string
    readonly ringkasLengkap: string
    readonly ringkasTidakLengkap: string
    readonly bahanHilang: string
    readonly nilaiHilang: string
    readonly faktorHilang: string
  }
  readonly adequacy: {
    readonly judul: string
    readonly penjelasan: string
    readonly kelompok: string
    readonly tidakDibandingkan: string
  }
  readonly trace: {
    readonly judul: string
    readonly per100: string
    readonly retensi: string
    readonly disesuaikan: string
    readonly tanpaPenyesuaian: string
    readonly sumbanganTotal: string
  }
  readonly disclaimer: string
}

const ID: Copy = {
  siteName: 'Gizi Masakan',
  tagline: 'Gizi masakan Indonesia, dengan resep yang diasumsikan ditampilkan di bawahnya.',
  tagline5: 'Gizi masakan Indonesia, dengan resepnya',
  nav: { masakan: 'Masakan', bahan: 'Bahan', metode: 'Metode' },
  landing: {
    judul: 'Gizi masakan Indonesia, dengan resepnya',
    lede: 'Tidak ada satu resep nasi padang yang benar. Jadi setiap angka di sini datang dengan resep yang dipakai untuk menghitungnya — ditampilkan, bisa Anda ubah, dan angkanya ikut bergerak.',
    poin: [
      {
        judul: 'Resepnya ditampilkan, dan bisa diubah',
        isi: 'Ganti santannya dari 50 g jadi 100 g, semua angka ikut berubah. Warna terakota menandai perkiraan dan suntingan Anda.',
      },
      {
        judul: 'Yang tidak terhitung, disebut',
        isi: 'Bahan yang belum ada datanya tetap ditampilkan dan dinamai. Tidak pernah dihapus diam-diam, tidak pernah diisi nol.',
      },
      {
        judul: 'Alat rujukan, bukan pelacak',
        isi: 'Tidak ada total harian, jatah kalori, atau rentetan hari. Pertanyaannya "apakah sudah cukup", bukan "apakah sudah lewat".',
      },
    ],
  },
  plate: {
    perPorsi: 'Per porsi',
    seluruhResep: 'Seluruh resep',
    porsi: 'porsi',
    estimasi: 'Angka ini dari resep di bawah. Ubah takarannya kalau resep Anda berbeda.',
    ubahTakaran: 'Ubah takaran',
    beratMentah: 'Berat mentah',
    beratMatang: 'Berat matang',
    tidakDiketahui: 'tidak diketahui',
  },
  strip: {
    judul: 'Resep yang dipakai',
    bahan: 'Bahan',
    berat: 'Berat',
    sumbangan: 'Sumbangan',
    pilihNutrien: 'Urutkan menurut',
    kembalikan: 'Kembalikan ke resep asli',
    diedit: 'diubah',
    perkiraan: 'perkiraan, belum ditimbang',
    ditimbang: 'ditimbang',
  },
  gaps: {
    judul: 'Yang tidak terhitung',
    ringkasLengkap: 'Semua bahan dan nilai gizinya ada. Tidak ada yang dihilangkan.',
    ringkasTidakLengkap: 'Angka ini belum lengkap. Yang kurang disebutkan di bawah.',
    bahanHilang: 'Bahan tanpa data',
    nilaiHilang: 'Nilai gizi kosong',
    faktorHilang: 'Faktor pengolahan kosong',
  },
  adequacy: {
    judul: 'Terhadap angka kecukupan gizi',
    penjelasan:
      'Berapa bagian dari angka kecukupan harian yang disumbang satu porsi ini. Bukan jatah yang terpakai.',
    kelompok: 'Kelompok umur dan jenis kelamin',
    tidakDibandingkan: 'tidak dibandingkan',
  },
  trace: {
    judul: 'Asal angkanya',
    per100: 'per 100 g',
    retensi: 'Retensi',
    disesuaikan: 'disesuaikan',
    tanpaPenyesuaian: 'tanpa penyesuaian',
    sumbanganTotal: 'Sumbangan',
  },
  disclaimer:
    'Proyek pribadi. Nilai bahan adalah pendekatan dari basis data Amerika (USDA FoodData Central) untuk bahan Indonesia. Angka masakan adalah perkiraan dari resep yang ditampilkan. Bukan nasihat medis atau nasihat gizi.',
}

const EN: Copy = {
  siteName: 'Gizi Masakan',
  tagline: 'Nutrition for Indonesian dishes, with the recipe it assumed shown underneath.',
  tagline5: 'Indonesian dish nutrition, with the recipe',
  nav: { masakan: 'Dishes', bahan: 'Ingredients', metode: 'Method' },
  landing: {
    judul: 'Nutrition for Indonesian dishes, with the recipe shown',
    lede: 'There is no single correct nasi padang. So every number here arrives with the recipe used to calculate it — shown, editable, and the numbers move when you change it.',
    poin: [
      {
        judul: 'The recipe is shown, and editable',
        isi: 'Change the coconut milk from 50 g to 100 g and every number moves. Terracotta marks estimates and your own edits.',
      },
      {
        judul: 'What cannot be counted is named',
        isi: 'An ingredient with no data still gets a row and a name. Never quietly dropped, never filled in with a zero.',
      },
      {
        judul: 'A reference, not a tracker',
        isi: 'No daily totals, no calorie budget, no streaks. The question is "am I getting enough", never "have I gone over".',
      },
    ],
  },
  plate: {
    perPorsi: 'Per portion',
    seluruhResep: 'Whole recipe',
    porsi: 'portions',
    estimasi: 'These numbers come from the recipe below. Change the weights if yours differs.',
    ubahTakaran: 'Edit weights',
    beratMentah: 'Raw weight',
    beratMatang: 'Cooked weight',
    tidakDiketahui: 'not known',
  },
  strip: {
    judul: 'The recipe this assumed',
    bahan: 'Ingredient',
    berat: 'Weight',
    sumbangan: 'Contribution',
    pilihNutrien: 'Rank by',
    kembalikan: 'Reset to the authored recipe',
    diedit: 'edited',
    perkiraan: 'estimate, not weighed',
    ditimbang: 'weighed',
  },
  gaps: {
    judul: 'What is not counted',
    ringkasLengkap: 'Every ingredient and every value is present. Nothing was dropped.',
    ringkasTidakLengkap: 'These numbers are incomplete. What is missing is named below.',
    bahanHilang: 'Ingredients with no data',
    nilaiHilang: 'Missing nutrient values',
    faktorHilang: 'Missing cooking factors',
  },
  adequacy: {
    judul: 'Against the Indonesian reference intakes',
    penjelasan:
      'How much of the daily figure one portion contributes. Not an allowance being spent.',
    kelompok: 'Age and sex group',
    tidakDibandingkan: 'not compared',
  },
  trace: {
    judul: 'Where the number came from',
    per100: 'per 100 g',
    retensi: 'Retention',
    disesuaikan: 'adjusted',
    tanpaPenyesuaian: 'unadjusted',
    sumbanganTotal: 'Contribution',
  },
  disclaimer:
    'A personal project. Ingredient values are US-database approximations (USDA FoodData Central) for Indonesian ingredients. Dish numbers are estimates from the recipe shown. Not medical or dietary advice.',
}

export function copyFor(locale: Locale): Copy {
  return locale === 'en' ? EN : ID
}
