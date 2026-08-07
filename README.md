# Gizi Masakan

**Gizi masakan Indonesia, dengan resep yang diasumsikan ditampilkan di bawahnya — karena tidak ada satu nasi padang yang benar.**

Situs statis, tanpa backend, tanpa permintaan jaringan saat dipakai. Cari sebuah
masakan, lihat angkanya, dan tepat di bawahnya lihat daftar bahan dan berat gram
yang menghasilkan angka itu. Ubah santannya dari 50 g jadi 100 g, dan semuanya
bergerak.

Ini alat rujukan, **bukan pelacak**. Tidak ada total harian, jatah kalori,
rentetan hari, atau pencatatan — lihat PRD §5.

---

## Yang sudah jalan

| | |
|---|---|
| Bahan | 70 entri dari USDA FoodData Central SR Legacy, dipetakan ke nama dapur Indonesia |
| Nutrien | 27, dengan nomor nutrien FDC sebagai id |
| Masakan | 12 resep, tiap resep menyebut sumber atau ditandai susunan sendiri |
| Faktor | Retensi USDA Release 6 (270 operasi), yield USDA (54 baris) + 9 turunan |
| AKG | Permenkes 28/2019, 19 kelompok umur dan jenis kelamin |
| Uji | 94 uji: konservasi, kekosongan, retensi, determinisme, transkripsi AKG |
| Data terkirim | 28,3 KB dari anggaran 200 KB |

## Yang belum jalan, dan disebut apa adanya

- **Berat bahan di resep belum ditimbang.** Semua ditandai `perkiraan` dan
  tampil berwarna terakota. Menimbangnya adalah bagian proyek ini yang tidak
  bisa diotomatiskan.
- **Tabel URT masih kosong.** Invarian 9 melarang entri yang tidak diukur, jadi
  porsi ditampilkan dalam gram sampai ada yang benar-benar ditimbang.
- **13 bahan Indonesia belum punya sumber** — kangkung, lengkuas, kemiri, serai,
  terasi, gula merah, kecap manis, dan lainnya. Bahan itu tetap ada di resep dan
  disebut sebagai kekosongan di keluaran, bukan dihapus atau didekati.

## Perintah

```bash
pnpm dev
pnpm build                  # data:validate, next build, lalu .nojekyll
pnpm preview                # sajikan ./out di bawah basePath produksi
pnpm test:run
pnpm test:conservation
pnpm test:gaps
pnpm data:validate
pnpm typecheck && pnpm lint

# hanya untuk pengembangan dan CI terjadwal — tidak pernah bagian dari pnpm build
pnpm fdc:fetch && pnpm fdc:build
pnpm factors:fetch && pnpm factors:build   # perlu poppler-utils
```

## Sumber dan lisensi

| Sumber | Lisensi | Status |
|---|---|---|
| USDA FoodData Central SR Legacy | Karya Pemerintah AS — domain publik | dipakai |
| USDA Table of Nutrient Retention Factors, Release 6 | domain publik | dipakai |
| USDA Table of Cooking Yields for Meat and Poultry | domain publik | dipakai |
| Permenkes RI No. 28 Tahun 2019 (AKG) | peraturan perundang-undangan, UU 28/2014 Pasal 42 | dipakai |
| Tabel URT | pengukuran sendiri | dipakai (masih kosong) |
| Resep | susunan sendiri | dipakai |
| **TKPI (Kemenkes)** | **all rights reserved** | **dikecualikan** |

**TKPI tidak dipakai dan tidak boleh dipakai.** Itu buku berhak cipta, bukan
peraturan perundang-undangan, sehingga di luar pengecualian UU 28/2014 Pasal 42.
Adapternya ada di `lib/sources/tkpi`, tidak memuat satu pun nilai TKPI, dan
memanggil gerbang lisensi lebih dulu — jadi selalu menolak. `pnpm data:validate`
gagal kalau entri TKPI dihapus dari manifes, kalau statusnya diubah, atau kalau
ada jalan pintas yang melewati gerbangnya.

## Yang paling penting dari semuanya

**Tidak ada nilai yang hilang diam-diam.** Bahan tanpa data, nilai gizi yang
kosong, faktor yang tidak ada — semuanya jadi entri di `trace.gaps` dan muncul di
layar. Tidak pernah diganti nol, tidak pernah barisnya dihapus, tidak pernah
diambilkan dari bahan yang mirip.

Alasannya: kegagalan paling berbahaya di kalkulator gizi bukan galat, tapi angka
yang tetap terlihat masuk akal. Sebuah bahan yang dihilangkan diam-diam
menyisakan total yang kelihatan benar dan kurang persis sebanyak yang tak
terlihat siapa pun.

## Struktur

```
lib/nutrition/    inti. murni, deterministik, jalan di Node
  compute.ts      (resep, tabel, faktor) → NutritionTrace
  gaps.ts         deteksi dan penamaan kekosongan — ditulis lebih dulu, bukan belakangan
  retention.ts    dua keadaan saja: disesuaikan-dengan-kutipan, atau tanpa penyesuaian
lib/sources/      adapter. fdc aktif, tkpi mati di balik gerbang lisensi
data/             semua data terkirim, tiap nilai berkutipan dan bertanggal
scripts/          pipeline hanya-pengembangan, dan validator
tests/            konservasi ditegaskan di setiap uji di setiap berkas
```

Baca `PRD.md` untuk lingkupnya dan `CLAUDE.md` untuk cara bekerja di repo ini.

## Penempatan

`main` dibangun dan dipasang lewat GitHub Actions. `basePath` harus sama dengan
nama repositorinya; `.nojekyll` wajib ada di `out/`. Periksa dengan
`pnpm preview` sebelum push.

---

Proyek pribadi. Nilai bahan adalah pendekatan dari basis data Amerika untuk bahan
Indonesia. Angka masakan adalah perkiraan dari resep yang ditampilkan. Bukan
nasihat medis atau nasihat gizi.
