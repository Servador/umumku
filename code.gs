// ============================================================
//  KASIRKU ATK — code.gs
//  Google Apps Script — Backend penerima data dari website
//  
//  CARA PAKAI:
//  1. Buka Google Spreadsheet Anda
//  2. Extensions → Apps Script
//  3. Paste seluruh kode ini
//  4. Deploy → New Deployment → Web App
//  5. Copy URL-nya ke app.js (variabel APPS_SCRIPT_URL)
// ============================================================

// ── ID Spreadsheet Anda (dari URL: docs.google.com/spreadsheets/d/ID_INI/edit)
const SPREADSHEET_ID = "GANTI_DENGAN_ID_SPREADSHEET_ANDA";

// ── Nama sheet (tab) untuk menyimpan rekap
const SHEET_NAME = "Rekap ATK";


// ============================================================
//  HANDLE REQUEST POST (dari website)
// ============================================================
function doPost(e) {
  try {
    // Parse JSON yang dikirim dari website
    const data = JSON.parse(e.postData.contents);

    if (data.action === "saveRekap") {
      return saveRekap(data);
    }

    return respond({ status: "error", message: "Aksi tidak dikenal" });

  } catch (err) {
    return respond({ status: "error", message: err.toString() });
  }
}


// ============================================================
//  HANDLE REQUEST GET (opsional: cek status)
// ============================================================
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status:  "ok",
      message: "KASIRKU ATK Apps Script aktif ✅",
      time:    new Date().toLocaleString("id-ID")
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
//  SIMPAN REKAP KE SPREADSHEET
// ============================================================
function saveRekap(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_NAME);

  // Buat sheet baru jika belum ada
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    buatHeader(sheet);  // Buat baris header
  }

  // Cek apakah sheet kosong (belum ada header)
  if (sheet.getLastRow() === 0) {
    buatHeader(sheet);
  }

  // ── Tambah baris separator / info pengiriman ──────────────
  sheet.appendRow([
    "",
    `━━ PENGIRIMAN: ${data.timestamp} ━━`,
    "",
    `User: ${data.user}`,
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ]);

  // Styling baris separator
  const sepRow = sheet.getLastRow();
  sheet.getRange(sepRow, 1, 1, 11)
    .setBackground("#1a1e2a")
    .setFontColor("#f5c842")
    .setFontWeight("bold");

  // ── Masukkan setiap item rekap ────────────────────────────
  data.items.forEach(item => {
    sheet.appendRow([
      item.no,
      item.nama,
      item.tarif,
      item.bagian,
      item.permVol,
      item.permSat,
      item.permRp,
      item.korVol,
      item.korSat,
      item.korRp,
      item.ket,
    ]);
  });

  // ── Baris total ───────────────────────────────────────────
  const totalPerm = data.items.reduce((s, x) => s + x.permRp, 0);
  const totalKor  = data.items.reduce((s, x) => s + x.korRp, 0);

  sheet.appendRow([
    "", "TOTAL", "", data.division,
    "", "", totalPerm,
    "", "", totalKor,
    ""
  ]);

  // Styling baris total
  const totalRow = sheet.getLastRow();
  sheet.getRange(totalRow, 1, 1, 11)
    .setBackground("#0f1117")
    .setFontColor("#f5c842")
    .setFontWeight("bold");

  // Format kolom harga sebagai Currency IDR
  const dataStart = sepRow + 1;
  const dataEnd   = totalRow;

  // Format kolom Tarif (C), Perm Rp (G), Kor Rp (J)
  [3, 7, 10].forEach(col => {
    sheet.getRange(dataStart, col, dataEnd - dataStart + 1, 1)
      .setNumberFormat("\"Rp \"#,##0");
  });

  // Auto-resize kolom
  sheet.autoResizeColumns(1, 11);

  return respond({ status: "success", message: "Data berhasil disimpan!", rows: data.items.length });
}


// ============================================================
//  BUAT BARIS HEADER DI SHEET
// ============================================================
function buatHeader(sheet) {
  // Baris header utama
  sheet.appendRow([
    "No",
    "Jenis Barang",
    "Tarif (Rp)",
    "Bagian / Bidang",
    "Perm Vol",
    "Perm Sat",
    "Perm Rp",
    "Kor Vol",
    "Kor Sat",
    "Kor Rp",
    "Keterangan"
  ]);

  // Styling header
  const headerRange = sheet.getRange(1, 1, 1, 11);
  headerRange
    .setBackground("#0d0f12")
    .setFontColor("#f5c842")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  // Merge header kelompok Permintaan (E1:G1)
  // Catatan: jika ingin merge, lakukan manual di spreadsheet
  // karena merge via API lebih rumit

  // Freeze baris header
  sheet.setFrozenRows(1);
}


// ============================================================
//  HELPER: Buat response JSON
// ============================================================
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
//  FUNGSI TEST (jalankan manual dari Apps Script editor)
//  Klik tombol ▶ Run pada fungsi ini untuk test koneksi
// ============================================================
function testSimpan() {
  const dataDummy = {
    action:    "saveRekap",
    user:      "Test User",
    division:  "Umum",
    timestamp: new Date().toLocaleString("id-ID"),
    items: [
      {
        no: 1,
        nama: "Ballpoint Pilot",
        tarif: 5000,
        bagian: "Umum",
        permVol: 10,
        permSat: "Pcs",
        permRp: 50000,
        korVol: 10,
        korSat: "Pcs",
        korRp: 50000,
        ket: "Test data"
      }
    ]
  };

  const result = saveRekap(dataDummy);
  Logger.log(result.getContent());
}
