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
  /** Dish search. Functions because they carry counts. */
  readonly cari: {
    readonly label: string
    readonly placeholder: string
    readonly semua: (total: number) => string
    readonly hasil: (found: number, total: number) => string
    readonly kosong: (query: string) => string
    readonly menyebut: (count: number) => string
  }
  /** Locally saved recipe versions — PRD §6.6. */
  readonly simpan: {
    readonly judul: string
    readonly penjelasan: string
    readonly namaLabel: string
    readonly namaPlaceholder: string
    readonly tombol: string
    readonly kosong: string
    readonly muat: string
    readonly hapus: string
    /** Suffixes that complete the accessible name. Every saved version renders
        a Use and a Delete button; named by the bare verb alone they are
        indistinguishable to a screen reader, which hears the same two words
        repeated once per version. Visible verb + this = the full name, so the
        visible text still begins it (WCAG 2.5.3 Label in Name). */
    readonly muatNama: (nama: string) => string
    readonly hapusNama: (nama: string) => string
    readonly gagal: string
    readonly perluUbah: string
  }
  /** The worked example on the landing page. PRD §2's own illustration —
      move the santan and watch the number move — performed rather than
      described. */
  readonly contoh: {
    readonly judul: string
    readonly lede: string
    readonly geser: string
    readonly langkah1: string
    readonly langkah2: string
    readonly langkah3: string
    readonly totalLabel: string
    readonly jujur: string
    readonly buka: string
  }
  readonly plate: {
    readonly perPorsi: string
    readonly seluruhResep: string
    /** Names the per-portion / whole-recipe choice as a group. */
    readonly dasarPerhitungan: string
    readonly porsi: string
    readonly estimasi: string
    readonly ubahTakaran: string
    readonly beratMentah: string
    readonly beratMatang: string
    readonly tidakDiketahui: string
    /** Which of the two weights the numbers above belong to. Without this the
        pair invites the conclusion that gaining weight in the pan gains
        nutrients with it. */
    readonly dasarBerat: string
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
    /** The cooking-method choice — the assumption the reader could not touch. */
    readonly caraMasak: string
    readonly caraMasakAsli: string
    readonly caraMasakDiganti: string
    readonly caraMasakPenjelasan: string
  }
  readonly gaps: {
    readonly judul: string
    readonly ringkasLengkap: string
    readonly ringkasTidakLengkap: string
    readonly bahanHilang: string
    readonly nilaiHilang: string
    readonly faktorHilang: string
    /** Legend for the marker on an incomplete total. Visible text, not a
        tooltip — a title attribute never appears on a touch screen. */
    readonly tandaBelumLengkap: string
  }
  /** Spoken after a recomputation. Sighted readers see every bar and total
      move together; without this the same change is silent. */
  readonly diperbarui: (nutrien: string, jumlah: string, dasar: string) => string
  readonly adequacy: {
    readonly judul: string
    readonly penjelasan: string
    readonly kelompok: string
    readonly tidakDibandingkan: string
    /** The operation, stated where it is performed. A bare percentage with an
        unnamed denominator reads as a budget meter, which PRD §5 forbids. */
    readonly rumus: string
    readonly dari: (akg: string) => string
  }
  readonly trace: {
    readonly judul: string
    readonly per100: string
    readonly retensi: string
    readonly disesuaikan: string
    readonly tanpaPenyesuaian: string
    readonly sumbanganTotal: string
    /** The arithmetic, stated where it is performed. Every operand was on
        screen and the operation joining them was not, so a row read as four
        facts rather than one calculation. */
    readonly rumus: string
    readonly rumusCatatan: string
    readonly basisBerat: string
    readonly retensiArti: string
    readonly retensiTanpaArti: string
    readonly yieldJudul: string
    readonly yieldArti: string
    readonly yieldTidakDipakai: string
  }
  readonly disclaimer: string
}

const ID: Copy = {
  siteName: 'Gizi Masakan',
  tagline: 'Gizi masakan Indonesia, dengan resep yang diasumsikan ditampilkan di bawahnya.',
  tagline5: 'Gizi masakan Indonesia',
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
  cari: {
    label: 'Cari masakan',
    placeholder: 'Cari masakan, bahan, atau kategori…',
    semua: (total) => `${total} masakan`,
    hasil: (found, total) => `${found} dari ${total} masakan`,
    kosong: (query) =>
      `Tidak ada masakan yang cocok dengan "${query}". Yang ada di sini baru sebagian kecil dari masakan Indonesia — kalau belum ketemu, kemungkinan besar memang belum ditulis.`,
    menyebut: (count) => `menyebut ${count} hal yang tidak bisa dihitung`,
  },
  simpan: {
    judul: 'Simpan versi Anda',
    penjelasan:
      'Simpan takaran Anda sendiri untuk masakan ini di perangkat ini. Tidak ada yang dikirim ke mana pun, dan tidak ada catatan harian — ini menyimpan resep, bukan yang Anda makan.',
    namaLabel: 'Nama versi',
    namaPlaceholder: 'Misalnya: versi rumah',
    tombol: 'Simpan',
    kosong: 'Belum ada versi tersimpan untuk masakan ini.',
    muat: 'Pakai',
    hapus: 'Hapus',
    muatNama: (nama) => `takaran dari versi ${nama}`,
    hapusNama: (nama) => `versi ${nama}`,
    gagal: 'Peramban ini menolak menyimpan. Kalau Anda memakai mode penyamaran, penyimpanan lokal biasanya dimatikan.',
    perluUbah: 'Ubah dulu salah satu takaran di atas, baru ada yang bisa disimpan.',
  },
  contoh: {
    judul: 'Satu angka, dari awal sampai akhir',
    lede: 'Nasi uduk memakai santan encer. Geser takarannya dan lihat angkanya bergerak — inilah cara kerja seluruh situs ini, jadi tidak ada yang perlu dipercaya begitu saja.',
    geser: 'Santan encer',
    langkah1: 'Ambil beratnya, bagi 100',
    langkah2: 'Kalikan nilai energi santan per 100 g',
    langkah3: 'Itulah sumbangan santan ke energi seluruh resep',
    totalLabel: 'Energi seluruh resep, semua bahan dijumlahkan',
    jujur: 'Berat resepnya perkiraan, belum ditimbang. Nilai santannya dari basis data Amerika. Keduanya disebut di halaman masakannya.',
    buka: 'Buka nasi uduk dengan takaran ini →',
  },
  plate: {
    perPorsi: 'Per porsi',
    seluruhResep: 'Seluruh resep',
    dasarPerhitungan: 'Angka dihitung untuk',
    porsi: 'porsi',
    estimasi: 'Angka ini dari resep di bawah. Ubah takarannya kalau resep Anda berbeda.',
    ubahTakaran: 'Ubah takaran',
    beratMentah: 'Berat mentah',
    beratMatang: 'Berat matang',
    tidakDiketahui: 'tidak diketahui',
    dasarBerat:
      'Angka gizi di atas dihitung dari berat mentah. Berat matang berbeda karena air masuk atau keluar waktu dimasak — itu tidak menambah atau mengurangi gizinya.',
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
    caraMasak: 'Cara masak',
    caraMasakAsli: 'seperti di resep',
    caraMasakDiganti: 'diganti — berat matang jadi tidak diketahui',
    caraMasakPenjelasan:
      'Cara masak menentukan faktor retensi, jadi mengubahnya mengubah angka gizinya. Pilihannya adalah operasi USDA untuk kelompok bahan yang sama; faktor yield resep ini hanya berlaku untuk cara masak aslinya, jadi kalau diganti berat matangnya jadi tidak diketahui dan disebut sebagai kekosongan.',
  },
  gaps: {
    judul: 'Yang tidak terhitung',
    ringkasLengkap: 'Semua bahan dan nilai gizinya ada. Tidak ada yang dihilangkan.',
    ringkasTidakLengkap: 'Angka ini belum lengkap. Yang kurang disebutkan di bawah.',
    bahanHilang: 'Bahan tanpa data',
    nilaiHilang: 'Nilai gizi kosong',
    faktorHilang: 'Faktor pengolahan kosong',
    tandaBelumLengkap: '† angka ini belum lengkap — yang kurang disebut di "Yang tidak terhitung" di bawah.',
  },
  diperbarui: (nutrien, jumlah, dasar) => `Diperbarui. ${nutrien} ${dasar}: ${jumlah}.`,
  adequacy: {
    judul: 'Terhadap angka kecukupan gizi',
    penjelasan:
      'Berapa bagian dari angka kecukupan harian yang disumbang satu porsi ini. Bukan jatah yang terpakai.',
    kelompok: 'Kelompok umur dan jenis kelamin',
    tidakDibandingkan: 'tidak dibandingkan',
    rumus: 'Persennya = jumlah satu porsi ÷ angka kecukupan harian kelompok yang dipilih. Angka pembaginya ditulis di sebelah tiap persen, jadi bisa dicek.',
    dari: (akg) => `dari ${akg}`,
  },
  trace: {
    judul: 'Asal angkanya',
    per100: 'per 100 g',
    retensi: 'Retensi',
    disesuaikan: 'disesuaikan',
    tanpaPenyesuaian: 'tanpa penyesuaian',
    sumbanganTotal: 'Sumbangan',
    rumus: 'Sumbangan = berat ÷ 100 × nilai per 100 g × faktor retensi',
    rumusCatatan:
      'Tiap baris di bawah adalah rumus itu sekali jalan. Kalikan sendiri kalau mau mengecek — angkanya dibulatkan untuk ditampilkan, jadi hasilnya bisa meleset sedikit di digit terakhir.',
    basisBerat:
      'Berat yang dipakai adalah berat mentah, dan nilai per 100 g juga untuk bahan mentah. Keduanya harus sepasang.',
    retensiArti:
      'Faktor retensi = berapa bagian nutrien ini yang bertahan lewat cara masak tersebut. ×0,80 berarti sekitar 80% tersisa.',
    retensiTanpaArti:
      '"Tanpa penyesuaian" berarti nilainya dipakai apa adanya karena USDA tidak menerbitkan faktornya — bukan klaim bahwa 100% bertahan.',
    yieldJudul: 'Yield',
    yieldArti:
      'Faktor yield mengubah berat, bukan gizi. Beras hampir tiga kali lipat beratnya karena menyerap air; kalorinya tidak ikut naik. Karena itu kolom ini tidak masuk ke perhitungan di sebelahnya.',
    yieldTidakDipakai: 'tidak dipakai di rumus ini',
  },
  disclaimer:
    'Proyek pribadi. Nilai bahan adalah pendekatan dari basis data Amerika (USDA FoodData Central) untuk bahan Indonesia. Angka masakan adalah perkiraan dari resep yang ditampilkan. Bukan nasihat medis atau nasihat gizi.',
}

const EN: Copy = {
  siteName: 'Gizi Masakan',
  tagline: 'Nutrition for Indonesian dishes, with the recipe it assumed shown underneath.',
  tagline5: 'Indonesian dish nutrition',
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
  cari: {
    label: 'Search dishes',
    placeholder: 'Search a dish, an ingredient, or a category…',
    semua: (total) => `${total} dishes`,
    hasil: (found, total) => `${found} of ${total} dishes`,
    kosong: (query) =>
      `Nothing matches "${query}". What is here is a small fraction of Indonesian cooking — if you cannot find it, it most likely has not been written yet.`,
    menyebut: (count) => `names ${count} things it cannot count`,
  },
  simpan: {
    judul: 'Save your version',
    penjelasan:
      'Keep your own weights for this dish on this device. Nothing is sent anywhere, and there is no daily record — this saves a recipe, not what you ate.',
    namaLabel: 'Version name',
    namaPlaceholder: 'For example: how we make it',
    tombol: 'Save',
    kosong: 'No saved versions for this dish yet.',
    muat: 'Use',
    hapus: 'Delete',
    muatNama: (nama) => `the weights from version ${nama}`,
    hapusNama: (nama) => `version ${nama}`,
    gagal: 'This browser refused to save. Local storage is usually switched off in private browsing.',
    perluUbah: 'Change one of the weights above first, then there is something to save.',
  },
  contoh: {
    judul: 'One number, start to finish',
    lede: 'Nasi uduk is cooked with thin coconut milk. Move the amount and watch the number move — this is how the whole site works, so nothing here has to be taken on trust.',
    geser: 'Thin coconut milk',
    langkah1: 'Take its weight, divide by 100',
    langkah2: 'Multiply by the energy in 100 g of coconut milk',
    langkah3: 'That is what the coconut milk contributes to the whole recipe',
    totalLabel: 'Energy for the whole recipe, every ingredient added up',
    jujur: 'The recipe weights are estimates, not weighed. The coconut milk values come from a US database. Both are stated on the dish page.',
    buka: 'Open nasi uduk with these weights →',
  },
  plate: {
    perPorsi: 'Per portion',
    seluruhResep: 'Whole recipe',
    dasarPerhitungan: 'Show numbers for',
    porsi: 'portions',
    estimasi: 'These numbers come from the recipe below. Change the weights if yours differs.',
    ubahTakaran: 'Edit weights',
    beratMentah: 'Raw weight',
    beratMatang: 'Cooked weight',
    tidakDiketahui: 'not known',
    dasarBerat:
      'The nutrition figures above are calculated from the raw weight. The cooked weight differs because water enters or leaves during cooking — that neither adds nor removes nutrients.',
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
    caraMasak: 'Cooking method',
    caraMasakAsli: 'as the recipe has it',
    caraMasakDiganti: 'changed — cooked weight now unknown',
    caraMasakPenjelasan:
      'The cooking method selects the retention factor, so changing it changes the nutrition. The choices are USDA operations for the same food group; this recipe\u2019s yield factor was published for the original method, so changing it leaves the cooked weight unknown and named as a gap.',
  },
  gaps: {
    judul: 'What is not counted',
    ringkasLengkap: 'Every ingredient and every value is present. Nothing was dropped.',
    ringkasTidakLengkap: 'These numbers are incomplete. What is missing is named below.',
    bahanHilang: 'Ingredients with no data',
    nilaiHilang: 'Missing nutrient values',
    faktorHilang: 'Missing cooking factors',
    tandaBelumLengkap: '† this number is incomplete — what is missing is named under "What is not counted" below.',
  },
  diperbarui: (nutrien, jumlah, dasar) => `Updated. ${nutrien} ${dasar}: ${jumlah}.`,
  adequacy: {
    judul: 'Against the Indonesian reference intakes',
    penjelasan:
      'How much of the daily figure one portion contributes. Not an allowance being spent.',
    kelompok: 'Age and sex group',
    tidakDibandingkan: 'not compared',
    rumus: 'The percentage is one portion ÷ the daily reference figure for the selected group. The figure it divides by is printed beside each percentage, so it can be checked.',
    dari: (akg) => `of ${akg}`,
  },
  trace: {
    judul: 'Where the number came from',
    per100: 'per 100 g',
    retensi: 'Retention',
    disesuaikan: 'adjusted',
    tanpaPenyesuaian: 'unadjusted',
    sumbanganTotal: 'Contribution',
    rumus: 'Contribution = weight ÷ 100 × per-100 g value × retention factor',
    rumusCatatan:
      'Each row below is that formula run once. Multiply it through yourself if you want to check — the figures are rounded for display, so the last digit may differ slightly.',
    basisBerat:
      'The weight used is the raw weight, and the per-100 g value is for the raw ingredient too. The two have to be a matched pair.',
    retensiArti:
      'A retention factor is how much of this nutrient survives that cooking method. ×0.80 means roughly 80% remains.',
    retensiTanpaArti:
      '"Unadjusted" means the value is used as published because USDA does not issue a factor — not a claim that 100% survives.',
    yieldJudul: 'Yield',
    yieldArti:
      'A yield factor changes weight, not nutrients. Rice nearly triples in weight because it absorbs water; its calories do not rise with it. That is why this column does not enter the calculation beside it.',
    yieldTidakDipakai: 'not used in this formula',
  },
  disclaimer:
    'A personal project. Ingredient values are US-database approximations (USDA FoodData Central) for Indonesian ingredients. Dish numbers are estimates from the recipe shown. Not medical or dietary advice.',
}

export function copyFor(locale: Locale): Copy {
  return locale === 'en' ? EN : ID
}
