# Resep

Setiap resep di sini adalah data yang ditulis, bukan hasil scraping dan bukan
salinan dari buku masak berhak cipta. Tiap berkas menyatakan sumbernya:
`own-composition` dengan catatan, atau `citation` dengan sumbernya.

## Status berat bahan — baca ini dulu

**Berat bahan pada resep-resep ini belum ditimbang.** Semua ditandai
`"provenance": "perkiraan"`, dan di layar angkanya muncul dengan warna
terakota — warna yang di proyek ini berarti "perkiraan atau hasil suntingan
pengguna", bukan angka terukur.

PRD §4 menyebut penimbangan sebagai bagian yang tidak bisa diotomatiskan dan
karena itu paling bisa dipertanggungjawabkan. Sampai timbangan dapur benar-benar
dipakai, resep-resep ini adalah kerangka yang jujur: susunan bahannya masuk
akal, perbandingannya wajar, tapi belum ada satu pun gram yang berasal dari
timbangan.

Mengganti `"provenance": "perkiraan"` menjadi `"ditimbang"` hanya boleh
dilakukan bersamaan dengan mengganti angkanya dengan hasil timbangan sungguhan,
dan mencatat tanggalnya di `ditulisPada`.

## Bahan yang sengaja dibiarkan kosong

Beberapa resep memakai bahan yang tidak punya sumber terbuka — kangkung,
lengkuas, kemiri, serai, daun jeruk, terasi, gula merah, kecap manis. Bahan itu
**tetap ditulis di resep** meski tidak ada datanya, karena menghapusnya akan
membuat angka dish-nya terlihat lengkap padahal kurang. Mesin hitung akan
menyebut tiap bahan itu sebagai kekosongan di keluarannya.

Jangan menyelesaikannya dengan menyalin nilai dari TKPI. Lihat PRD §3.

## Bentuk berkas

```jsonc
{
  "id": "nasi-uduk",              // stabil, muncul di URL
  "namaId": "Nasi uduk",
  "porsi": 4,                     // resep utuh menghasilkan berapa porsi
  "bahan": [
    {
      "ingredientId": "beras-putih",   // id di data/ingredients/curated.json
      "beratG": 400,
      "provenance": "perkiraan",
      "pengolahan": {                   // absen berarti bahan dimakan mentah
        "labelId": "Ditanak dengan santan",
        "labelEn": "Cooked in coconut milk",
        "yieldRef": { "kind": "derived", "id": "beras-ditanak" },
        "retentionCode": "0432"         // kode tabel retensi USDA
      }
    }
  ],
  "sumber": { "type": "own-composition", "catatan": "..." },
  "ditulisPada": "2026-08-07"
}
```
