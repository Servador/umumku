# 📖 TUTORIAL PEMASANGAN — KASIRKU ATK
## Sistem Permintaan Alat Tulis Kantor Perhutani

---

## 📁 STRUKTUR FOLDER

```
kasirku-atk/
├── index.html     ← Halaman utama website
├── style.css      ← Semua styling (dark mode modern)
├── app.js         ← Logika aplikasi (login, produk, rekap)
├── code.gs        ← Google Apps Script (backend spreadsheet)
└── TUTORIAL.md    ← Panduan ini
```

---

## 🚀 CARA 1: JALANKAN LOKAL (Tanpa internet, untuk testing)

1. Buka folder `kasirku-atk/`
2. Double-klik `index.html`
3. Website langsung terbuka di browser
4. **Login:**
   - Admin: `admin` / `admin123`
   - User: `user` / `user123`
   - Divisi: `umum/sdm/keu/prod` + password masing-masing `123`

> **Catatan:** Fitur "Kirim ke Spreadsheet" memerlukan koneksi ke Google Apps Script. Gunakan tombol "Download CSV" sebagai alternatif.

---

## ☁️ CARA 2: INTEGRASI GOOGLE SPREADSHEET

### LANGKAH 1 — Buat Google Spreadsheet

1. Buka [Google Drive](https://drive.google.com)
2. Klik **+ Baru → Google Spreadsheet**
3. Beri nama: `KASIRKU ATK - Perhutani`
4. Perhatikan URL-nya:
   ```
   https://docs.google.com/spreadsheets/d/XXXX_ID_SPREADSHEET_XXXX/edit
   ```
5. **Salin ID** yang ada di antara `/d/` dan `/edit`  
   Contoh: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

---

### LANGKAH 2 — Buat Google Apps Script

1. Dari spreadsheet, klik menu **Ekstensi → Apps Script**
2. Hapus kode bawaan yang ada
3. **Paste seluruh isi file `code.gs`**
4. Di baris paling atas, ganti:
   ```javascript
   const SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET_ANDA";
   ```
   menjadi ID spreadsheet Anda, contoh:
   ```javascript
   const SPREADSHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms";
   ```
5. Klik **💾 Simpan** (Ctrl+S)
6. Beri nama project: `KasirkuATK`

---

### LANGKAH 3 — Test Koneksi (Opsional tapi disarankan)

1. Di Apps Script editor, pilih fungsi `testSimpan` dari dropdown
2. Klik tombol **▶ Jalankan**
3. Izinkan akses Google Account Anda
4. Buka spreadsheet → cek apakah tab "Rekap ATK" muncul dengan data test

---

### LANGKAH 4 — Deploy Web App

1. Di Apps Script, klik **Deploy → Deployment baru**
2. Klik ⚙️ ikon lalu pilih **Aplikasi web**
3. Isi pengaturan:
   ```
   Deskripsi       : KASIRKU ATK v1.0
   Jalankan sebagai: Saya (akun Google Anda)
   Siapa yang punya: Semua orang (Anyone)
   ```
4. Klik **Deploy**
5. **Salin URL Web App** yang muncul  
   Contoh: `https://script.google.com/macros/s/AKfycb.../exec`

---

### LANGKAH 5 — Hubungkan URL ke Website

1. Buka file `app.js` dengan teks editor (Notepad, VS Code, dll)
2. Temukan baris ini di bagian atas:
   ```javascript
   const APPS_SCRIPT_URL = "GANTI_DENGAN_URL_APPS_SCRIPT_ANDA";
   ```
3. Ganti dengan URL yang Anda salin tadi:
   ```javascript
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Simpan file `app.js`

---

### LANGKAH 6 — Test Pengiriman Data

1. Buka `index.html` di browser
2. Login dengan akun admin/user
3. Pilih divisi (misal: Umum)
4. Klik produk → masukkan jumlah → klik Tambahkan
5. Buka menu **Rekap Permintaan**
6. Klik tombol **↑ Kirim ke Sheet**
7. Buka Google Spreadsheet → tab **Rekap ATK** → data harus muncul!

---

## 🌐 CARA 3: DEPLOY KE INTERNET (Agar bisa diakses semua orang)

### Opsi A: Google Apps Script sebagai Web App (Paling mudah)

1. Buka Apps Script yang sudah dibuat
2. Tambahkan fungsi HTML host di `code.gs`:

   ```javascript
   function doGet(e) {
     // Jika tidak ada parameter, tampilkan halaman
     if (!e.parameter.action) {
       return HtmlService.createHtmlOutputFromFile('index')
         .setTitle('KASIRKU ATK');
     }
     // Jika ada parameter action, proses sebagai API
     return respond({ status: "ok" });
   }
   ```

3. Upload `index.html` ke Apps Script:
   - Di panel kiri Apps Script, klik **+** → **File HTML**
   - Beri nama `index` (tanpa .html)
   - Paste isi `index.html`

4. Redeploy: **Deploy → Kelola deployment → Edit → Deploy**
5. URL Apps Script Anda sekarang adalah URL website!

### Opsi B: GitHub Pages (Gratis, lebih mudah)

1. Daftar di [github.com](https://github.com)
2. Buat repository baru (misal: `kasirku-atk`)
3. Upload file: `index.html`, `style.css`, `app.js`
4. Pergi ke **Settings → Pages**
5. Source: **Deploy from a branch → main → / (root)**
6. Klik **Save**
7. Website live di: `https://NAMA_ANDA.github.io/kasirku-atk`

### Opsi C: Netlify Drop (Paling cepat, 1 menit!)

1. Buka [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag & drop **folder** `kasirku-atk/`
3. Langsung online! URL otomatis dibuat.

---

## 👥 AKUN LOGIN BAWAAN

| Username | Password  | Role  | Keterangan         |
|----------|-----------|-------|--------------------|
| admin    | admin123  | Admin | Akses penuh        |
| user     | user123   | User  | Akses standar      |
| umum     | umum123   | User  | Bagian Umum        |
| sdm      | sdm123    | User  | Bagian SDM         |
| keu      | keu123    | User  | Bagian Keuangan    |
| prod     | prod123   | User  | Bagian Produksi    |

> **Untuk mengubah password**, edit variabel `USERS` di bagian atas `app.js`

---

## 🔑 PERBEDAAN ADMIN vs USER

| Fitur                  | Admin | User |
|------------------------|-------|------|
| Lihat katalog produk   | ✅    | ✅   |
| Pilih barang           | ✅    | ✅   |
| Lihat rekap            | ✅    | ✅   |
| Kirim ke spreadsheet   | ✅    | ✅   |
| Download CSV           | ✅    | ✅   |
| **Tambah barang baru** | ✅    | ❌   |
| **Edit barang**        | ✅    | ❌   |
| **Hapus barang**       | ✅    | ❌   |

---

## 🛠️ KUSTOMISASI

### Mengganti Logo / Nama
Di `index.html`, cari dan ganti:
```html
<div class="login-badge">PERHUTANI</div>
<h1 class="login-title">KASIRKU<span class="accent">ATK</span></h1>
```

### Menambah Divisi Baru
Di `index.html`, tambahkan option di select divisi:
```html
<option value="IT">IT</option>
<option value="Hukum">Hukum</option>
```

### Mengganti Warna Aksen
Di `style.css`, ubah variabel:
```css
--accent: #f5c842;  /* Kuning emas (default Perhutani) */
/* Ganti dengan warna lain, misal: */
--accent: #22c55e;  /* Hijau */
--accent: #3b82f6;  /* Biru */
```

### Menambah Produk Permanen
Di `app.js`, tambahkan objek ke array `DEFAULT_PRODUCTS`:
```javascript
{
  id: 13,
  nama: "Nama Barang",
  harga: 10000,
  satuan: "Pcs",
  gambar: "URL_GAMBAR"
}
```

---

## ❓ TROUBLESHOOTING

**Q: Tombol "Kirim ke Sheet" tidak bekerja?**  
A: Pastikan:
- URL Apps Script sudah diisi di `app.js`
- Apps Script di-deploy sebagai "Anyone" (bukan hanya akun tertentu)
- Coba buka URL Apps Script langsung di browser, harus muncul JSON

**Q: Data tidak muncul di Spreadsheet?**  
A: Jalankan `testSimpan()` dari Apps Script editor untuk diagnosa. Cek Logs (View → Logs).

**Q: Gambar produk tidak muncul?**  
A: URL gambar mungkin tidak bisa diakses. Gunakan URL gambar publik (Google Drive: klik kanan → Dapatkan link → Ubah ke "Siapa saja yang memiliki link").

**Q: Ingin simpan produk permanen (tidak hilang saat refresh)?**  
A: Produk sudah tersimpan di `localStorage` browser. Data akan hilang jika cache browser dibersihkan. Untuk penyimpanan permanen, gunakan Google Spreadsheet sebagai sumber data produk.

---

## 📞 KONTAK & DUKUNGAN

Untuk pertanyaan teknis lebih lanjut, hubungi:
- Tim IT Perhutani
- Atau dokumentasi Google Apps Script: [developers.google.com/apps-script](https://developers.google.com/apps-script)

---

*KASIRKU ATK v1.0 — Sistem Permintaan Alat Tulis Kantor Perhutani*  
*Dibangun dengan HTML, CSS, JavaScript Vanilla + Google Apps Script*
