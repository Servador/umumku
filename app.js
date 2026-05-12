/* ============================================================
   KASIRKU ATK — app.js
   Logika utama: Login, Produk, Rekap, Export ke Google Sheet
   ============================================================ */

"use strict";

// ── KONFIGURASI GOOGLE APPS SCRIPT ──────────────────────────
// GANTI nilai ini setelah deploy Google Apps Script!
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDXZbhdjxeX5_3Rt7lIa-A5KJFHqbTE3kOrywsAWO0COwFQizSl9w9XOMqRjGl-2yF/exec";

// ── AKUN LOGIN (Hardcode sederhana) ─────────────────────────
// Untuk keamanan lebih, pindahkan ke Apps Script
const USERS = {
  admin: { password: "admin123", role: "admin",  name: "Administrator" },
  user:  { password: "user123",  role: "user",   name: "Staff ATK"     },
  umum:  { password: "umum123",  role: "user",   name: "Bagian Umum"   },
  sdm:   { password: "sdm123",   role: "user",   name: "Bagian SDM"    },
  keu:   { password: "keu123",   role: "user",   name: "Bagian Keuangan" },
  prod:  { password: "prod123",  role: "user",   name: "Bagian Produksi" },
};

// ── STATE APLIKASI ───────────────────────────────────────────
let state = {
  user:      null,   // objek user yang sedang login
  division:  "",     // divisi yang dipilih
  bulan:     "",     // bulan yang dipilih
  tahun:     new Date().getFullYear().toString(), // tahun
  kategori:  "ATK",  // kategori aktif: ATK atau CS
  kelolaKat: "ATK",  // kategori kelola aktif
  rekapTab:  "ATK",  // tab rekap aktif
  rekap:     [],     // array item rekap/keranjang
  products:  [],     // daftar produk
  editId:    null,   // id produk yang sedang diedit
  qtyTarget: null,   // produk yang sedang dipilih qty-nya
};

// ── DATA PRODUK DEFAULT ──────────────────────────────────────
const DEFAULT_PRODUCTS = [
  // ATK
  { id: 1,  kategori: "ATK", nama: "Ballpoint Pilot BPS-GP",         harga: 5000,  satuan: "Pcs",  gambar: "" },
  { id: 2,  kategori: "ATK", nama: "Kertas HVS A4 80gr",             harga: 50000, satuan: "Rim",  gambar: "" },
  { id: 3,  kategori: "ATK", nama: "Map Snelhechter",                 harga: 8000,  satuan: "Pcs",  gambar: "" },
  { id: 4,  kategori: "ATK", nama: "Stapler Kenko Max",               harga: 35000, satuan: "Pcs",  gambar: "" },
  { id: 5,  kategori: "ATK", nama: "Isi Staples No.10",               harga: 4000,  satuan: "Box",  gambar: "" },
  { id: 6,  kategori: "ATK", nama: "Spidol Whiteboard Snowman",       harga: 7500,  satuan: "Pcs",  gambar: "" },
  { id: 7,  kategori: "ATK", nama: "Penggaris Besi 30cm",             harga: 15000, satuan: "Pcs",  gambar: "" },
  { id: 8,  kategori: "ATK", nama: "Amplop Coklat A4",                harga: 20000, satuan: "Pack", gambar: "" },
  { id: 9,  kategori: "ATK", nama: "Tipe-X Snowman Cair",             harga: 6000,  satuan: "Pcs",  gambar: "" },
  { id: 10, kategori: "ATK", nama: "Binder Clip 41mm",                harga: 12000, satuan: "Box",  gambar: "" },
  { id: 11, kategori: "ATK", nama: "Gunting Besar",                   harga: 18000, satuan: "Pcs",  gambar: "" },
  { id: 12, kategori: "ATK", nama: "Pulpen Gel Faber Castell",        harga: 8000,  satuan: "Pcs",  gambar: "" },
  // CS (Computer Supply)
  { id: 13, kategori: "CS",  nama: "Toner Printer HP LaserJet",       harga: 350000,satuan: "Pcs",  gambar: "" },
  { id: 14, kategori: "CS",  nama: "Kertas HVS F4 80gr",              harga: 55000, satuan: "Rim",  gambar: "" },
  { id: 15, kategori: "CS",  nama: "Flash Disk 16GB",                 harga: 75000, satuan: "Pcs",  gambar: "" },
  { id: 16, kategori: "CS",  nama: "Mouse USB Optical",               harga: 85000, satuan: "Pcs",  gambar: "" },
  { id: 17, kategori: "CS",  nama: "Keyboard USB Standard",           harga: 125000,satuan: "Pcs",  gambar: "" },
  { id: 18, kategori: "CS",  nama: "Kabel Data USB Type-C 1m",        harga: 35000, satuan: "Pcs",  gambar: "" },
  { id: 19, kategori: "CS",  nama: "CD/DVD Blank Verbatim",           harga: 5000,  satuan: "Pcs",  gambar: "" },
  { id: 20, kategori: "CS",  nama: "Ribbon Printer Dot Matrix",       harga: 45000, satuan: "Pcs",  gambar: "" },
];


// ── KONVERSI URL GOOGLE DRIVE ────────────────────────────────
// Google Drive "uc?export=view" sering diblok CORS. 
// Thumbnail API Google bekerja untuk file publik tanpa CORS issue.
function convertDriveUrl(url) {
  if (!url) return "";
  if (!url.includes("drive.google.com")) return url;

  let fileId = null;
  // Format: /file/d/FILE_ID/view  atau  /file/d/FILE_ID/preview
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) fileId = m1[1];
  // Format: ?id=FILE_ID atau open?id=FILE_ID
  if (!fileId) {
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
  }
  if (!fileId) return url;
  // Thumbnail API — bekerja tanpa CORS issue untuk file publik
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=s400`;
}


// Gambar fallback berdasarkan kategori
function imgFallback(kategori) {
  return kategori === "CS"
    ? "https://placehold.co/200x200/070d0b/6ee7b7?text=CS"
    : "https://placehold.co/200x200/070d0b/34d399?text=ATK";
}


window.addEventListener("DOMContentLoaded", () => {
  loadProducts();     // Muat produk dari localStorage (jika ada)
  renderProducts();   // Tampilkan kartu produk
  updateStats();      // Update angka statistik dashboard
});

// Muat produk: dari localStorage dulu, kalau kosong pakai default
function loadProducts() {
  const stored = localStorage.getItem("kasirku_products");
  state.products = stored ? JSON.parse(stored) : [...DEFAULT_PRODUCTS];
}

// Simpan produk ke localStorage
function saveProducts() {
  localStorage.setItem("kasirku_products", JSON.stringify(state.products));
}


// ============================================================
//  2. LOGIN & LOGOUT
// ============================================================
function doLogin() {
  const username = document.getElementById("inp-user").value.trim().toLowerCase();
  const password = document.getElementById("inp-pass").value;
  const errEl    = document.getElementById("login-error");

  const found = USERS[username];

  // Cek username & password
  if (!found || found.password !== password) {
    errEl.classList.remove("hidden");
    shake(document.querySelector(".login-card"));
    return;
  }

  errEl.classList.add("hidden");

  // Simpan data user ke state
  state.user = { username, role: found.role, name: found.name };

  // Tampilkan info user di UI
  document.getElementById("sidebar-uname").textContent = found.name;
  document.getElementById("sidebar-role").textContent  = found.role.toUpperCase();
  document.getElementById("sidebar-avatar").textContent = found.name[0].toUpperCase();
  document.getElementById("topbar-role").textContent   = found.role.toUpperCase();

  // Tampilkan/sembunyikan fitur admin
  const adminEls = document.querySelectorAll(".admin-only");
  adminEls.forEach(el => {
    if (found.role === "admin") el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  // Ganti layar login → app
  document.getElementById("screen-login").classList.remove("active");
  document.getElementById("screen-app").classList.add("active");

  showToast(`Selamat datang, ${found.name}! 👋`, "success");
  showSection("dashboard");
}

function doLogout() {
  state.user     = null;
  state.division = "";
  state.rekap    = [];

  document.getElementById("screen-app").classList.remove("active");
  document.getElementById("screen-login").classList.add("active");
  document.getElementById("inp-user").value = "";
  document.getElementById("inp-pass").value = "";

  showToast("Berhasil keluar. Sampai jumpa!", "info");
}

// Tekan Enter untuk login
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && document.getElementById("screen-login").classList.contains("active")) {
    doLogin();
  }
});


// ============================================================
//  3. NAVIGASI
// ============================================================
function showSection(name) {
  // Sembunyikan semua section
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  // Aktifkan section yang dipilih
  document.getElementById(`sec-${name}`).classList.add("active");

  // Update title topbar
  const titles = {
    dashboard: "Dashboard",
    produk:    "Katalog Produk",
    rekap:     "Rekap Permintaan",
    kelola:    "Kelola Barang",
  };
  document.getElementById("topbar-title").textContent = titles[name] || name;

  // Render ulang konten sesuai section
  if (name === "produk")  renderProducts();
  if (name === "rekap")   renderRekap();
  if (name === "kelola")  renderKelola();
  if (name === "dashboard") updateStats();

  // Tutup sidebar di mobile
  document.getElementById("sidebar").classList.remove("open");
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// Set divisi aktif
function setDivision(val) {
  state.division = val;
  document.getElementById("stat-divisi").textContent = val || "–";
  checkSetupReady();
  if (val) showToast(`Divisi aktif: ${val}`, "info");
}

function setBulan(val) {
  state.bulan = val;
  checkSetupReady();
}

function setTahun(val) {
  state.tahun = val;
}

// Cek apakah divisi & bulan sudah dipilih → update UI
function checkSetupReady() {
  const ready = state.division && state.bulan;
  const statusEl = document.getElementById("setup-status");
  const banner   = document.getElementById("banner-divisi");
  if (statusEl) {
    statusEl.textContent = ready ? "✓ Siap" : "Belum lengkap";
    statusEl.className   = ready ? "setup-status ready" : "setup-status pending";
  }
  if (banner) {
    banner.style.display = ready ? "none" : "";
  }
  // Update topbar sesi
  const sesiEl = document.getElementById("topbar-sesi");
  if (sesiEl && ready) {
    sesiEl.textContent = `${state.division} · ${state.bulan} ${state.tahun}`;
  }
}

// Set kategori katalog (ATK / CS)
function setKategori(kat) {
  state.kategori = kat;
  // update tab aktif
  document.querySelectorAll("#tab-atk, #tab-cs").forEach(t => t.classList.remove("active"));
  const tabEl = document.getElementById(kat === "ATK" ? "tab-atk" : "tab-cs");
  if (tabEl) tabEl.classList.add("active");
  // update judul
  const titleEl = document.getElementById("produk-title");
  if (titleEl) titleEl.innerHTML = kat === "ATK"
    ? `Katalog <span>ATK</span>`
    : `Katalog <span>Computer Supply</span>`;
  renderProducts();
}

// Set tab rekap
function setRekapTab(tab) {
  state.rekapTab = tab;
  ["ATK","CS","ALL"].forEach(t => {
    const el = document.getElementById(`rekaptab-${t.toLowerCase()}`);
    if (el) el.classList.toggle("active", t === tab);
  });
  renderRekap();
}

// Set tab kelola
function setKelolaTab(kat) {
  state.kelolaKat = kat;
  document.querySelectorAll("#kelola-tab-atk, #kelola-tab-cs").forEach(t => t.classList.remove("active"));
  const el = document.getElementById(kat === "ATK" ? "kelola-tab-atk" : "kelola-tab-cs");
  if (el) el.classList.add("active");
  renderKelola();
}

// Navigasi cepat dari dashboard ke katalog + set kategori
function mulaiPilihBarang(kat) {
  if (!state.division || !state.bulan) {
    showToast("⚠️ Isi Divisi dan Bulan terlebih dahulu!", "error");
    // Highlight setup card
    const card = document.getElementById("setup-card");
    if (card) { card.style.animation="none"; card.offsetHeight; card.style.animation="pulseWarn .4s ease 2"; }
    return;
  }
  setKategori(kat);
  showSection("produk");
}

// Tutorial modal
function showTutorial() {
  document.getElementById("modal-tutorial").classList.remove("hidden");
}
function closeTutorial() {
  document.getElementById("modal-tutorial").classList.add("hidden");
}
function switchTutTab(tab, btn) {
  document.querySelectorAll(".tut-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tut-tab").forEach(el => el.classList.remove("active"));
  document.getElementById(`tut-${tab}`).classList.add("active");
  btn.classList.add("active");
}
function copyCodeGs() {
  const code = document.getElementById("code-gs-text").textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast("✅ Kode berhasil disalin!", "success");
  });
}

// Preview gambar di modal
function previewGambar(url) {
  const converted = convertDriveUrl(url);
  const previewWrap = document.getElementById("modal-img-preview");
  const previewImg  = document.getElementById("preview-img");
  if (url) {
    previewImg.src = converted || url;
    previewWrap.classList.remove("hidden");
  } else {
    previewWrap.classList.add("hidden");
  }
}


// ============================================================
//  4. RENDER PRODUK
// ============================================================
function renderProducts() {
  const grid   = document.getElementById("product-grid");
  const search = (document.getElementById("search-produk")?.value || "").toLowerCase();

  // Update sesi bar
  document.getElementById("sesi-divisi").textContent = state.division || "–";
  document.getElementById("sesi-bulan").textContent  = state.bulan   || "–";
  document.getElementById("sesi-tahun").textContent  = state.tahun   || "–";

  // Filter berdasarkan kategori aktif + pencarian
  const filtered = state.products.filter(p => {
    const katMatch = (p.kategori || "ATK") === state.kategori;
    const nameMatch = p.nama.toLowerCase().includes(search);
    return katMatch && nameMatch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="color:var(--text-3);padding:40px;text-align:center;grid-column:1/-1">
      Produk tidak ditemukan 🔍</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const kat      = p.kategori || "ATK";
    const imgSrc   = convertDriveUrl(p.gambar) || imgFallback(kat);
    const fallback = imgFallback(kat);
    return `
    <div class="product-card" onclick="openQtyModal(${p.id})">
      <div class="card-cat-badge badge-${kat.toLowerCase()}">${kat}</div>
      <div class="card-img-wrap">
        <img src="${imgSrc}" alt="${p.nama}"
             onerror="this.onerror=null;this.src='${fallback}'"/>
        <div class="card-overlay">➕</div>
      </div>
      <div class="card-body">
        <div class="card-name">${p.nama}</div>
        <div class="card-satuan">per ${p.satuan}</div>
        <div class="card-price">${formatRp(p.harga)}</div>
      </div>
    </div>`;
  }).join("");
}


// ============================================================
//  5. MODAL PILIH JUMLAH (QTY)
// ============================================================
function openQtyModal(productId) {
  // Cek apakah divisi sudah dipilih
  if (!state.division) {
    document.getElementById("notif-division").classList.remove("hidden");
    showToast("⚠️ Pilih divisi terlebih dahulu!", "error");
    return;
  }
  document.getElementById("notif-division").classList.add("hidden");

  const p = state.products.find(x => x.id === productId);
  if (!p) return;

  state.qtyTarget = p;

  document.getElementById("qty-product-name").textContent = `${p.nama} — ${formatRp(p.harga)} / ${p.satuan}`;
  document.getElementById("qty-input").value = 1;
  document.getElementById("qty-ket").value   = "";
  document.getElementById("modal-qty").classList.remove("hidden");
}

function closeQtyModal() {
  document.getElementById("modal-qty").classList.add("hidden");
  state.qtyTarget = null;
}

function confirmAddToRekap() {
  const p   = state.qtyTarget;
  if (!p) return;

  const vol = parseInt(document.getElementById("qty-input").value) || 1;
  const ket = document.getElementById("qty-ket").value.trim();

  // Tambah ke array rekap
  state.rekap.push({
    id:        Date.now(),
    productId: p.id,
    kategori:  p.kategori || "ATK",
    nama:      p.nama,
    tarif:     p.harga,
    satuan:    p.satuan,
    bagian:    state.division,
    bulan:     state.bulan,
    tahun:     state.tahun,
    // Permintaan
    permVol:   vol,
    permSat:   p.satuan,
    permRp:    p.harga * vol,
    // Koreksi
    korVol:    vol,
    korSat:    p.satuan,
    korRp:     p.harga * vol,
    ket:       ket,
  });

  closeQtyModal();
  updateStats();
  showToast(`✅ ${p.nama} ditambahkan ke rekap!`, "success");
}


// ============================================================
//  6. RENDER TABEL REKAP
// ============================================================
function renderRekap() {
  const tbody = document.getElementById("rekap-body");

  // Update meta info
  const metaEl = document.getElementById("rekap-meta");
  if (metaEl && state.division && state.bulan) {
    metaEl.textContent = `${state.division} · ${state.bulan} ${state.tahun}`;
  }

  // Filter berdasarkan tab aktif
  const filtered = state.rekapTab === "ALL"
    ? state.rekap
    : state.rekap.filter(x => (x.kategori || "ATK") === state.rekapTab);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-3)">
      Belum ada permintaan. Pilih barang dari Katalog Produk.</td></tr>`;
    updateTotals(filtered);
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    const katColor = (item.kategori || "ATK") === "CS" ? "var(--accent2)" : "var(--accent)";
    return `
    <tr>
      <td style="color:var(--text-3);font-family:var(--font-mono)">${idx + 1}</td>
      <td style="font-weight:600">
        <span style="font-size:10px;background:${katColor === "var(--accent2)" ? "var(--accent2-dim)" : "var(--accent-dim)"};
          color:${katColor};padding:2px 6px;border-radius:4px;margin-right:6px;font-family:var(--font-mono)">
          ${item.kategori || "ATK"}</span>${item.nama}
      </td>
      <td style="font-family:var(--font-mono);color:var(--accent)">${formatRp(item.tarif)}</td>
      <td>
        <span style="background:var(--accent-dim);color:var(--accent);
          padding:3px 9px;border-radius:20px;font-size:11px;
          font-family:var(--font-mono)">${item.bagian}</span>
      </td>
      <td><input type="number" value="${item.permVol}" min="1"
           onchange="updateRekap(${item.id},'permVol',this.value)"/></td>
      <td><input type="text" value="${item.permSat}"
           onchange="updateRekap(${item.id},'permSat',this.value)"/></td>
      <td style="font-family:var(--font-mono);color:var(--accent2)"
           id="pRp-${item.id}">${formatRp(item.permRp)}</td>
      <td><input type="number" value="${item.korVol}" min="0"
           onchange="updateRekap(${item.id},'korVol',this.value)"/></td>
      <td><input type="text" value="${item.korSat}"
           onchange="updateRekap(${item.id},'korSat',this.value)"/></td>
      <td style="font-family:var(--font-mono);color:var(--accent2)"
           id="kRp-${item.id}">${formatRp(item.korRp)}</td>
      <td><input type="text" value="${item.ket}"
           placeholder="–"
           onchange="updateRekap(${item.id},'ket',this.value)"/></td>
      <td>
        <button class="btn-del" onclick="deleteRekap(${item.id})">✕</button>
      </td>
    </tr>`;
  }).join("");

  updateTotals(filtered);
}

// Update field rekap ketika user mengedit inline
function updateRekap(id, field, value) {
  const item = state.rekap.find(x => x.id === id);
  if (!item) return;

  // Konversi ke angka jika perlu
  if (["permVol", "korVol"].includes(field)) {
    item[field] = parseInt(value) || 0;
  } else {
    item[field] = value;
  }

  // Hitung ulang Rp permintaan & koreksi
  item.permRp = item.tarif * item.permVol;
  item.korRp  = item.tarif * item.korVol;

  // Update tampilan sel Rp langsung (tanpa render ulang seluruh tabel)
  const pRpEl = document.getElementById(`pRp-${id}`);
  const kRpEl = document.getElementById(`kRp-${id}`);
  if (pRpEl) pRpEl.textContent = formatRp(item.permRp);
  if (kRpEl) kRpEl.textContent = formatRp(item.korRp);

  updateTotals();
  updateStats();
}

function deleteRekap(id) {
  state.rekap = state.rekap.filter(x => x.id !== id);
  renderRekap();
  updateStats();
  showToast("Item dihapus dari rekap", "info");
}

function clearRekap() {
  if (!confirm("Yakin hapus semua rekap?")) return;
  state.rekap = [];
  renderRekap();
  updateStats();
  showToast("Rekap dikosongkan", "info");
}

// Update baris total di tfoot
function updateTotals(arr) {
  const list = arr || state.rekap;
  const totalPerm = list.reduce((s, x) => s + x.permRp, 0);
  const totalKor  = list.reduce((s, x) => s + x.korRp, 0);

  document.getElementById("total-permintaan-rp").textContent = formatRp(totalPerm);
  document.getElementById("total-koreksi-rp").textContent    = formatRp(totalKor);
}


// ============================================================
//  7. STATISTIK DASHBOARD
// ============================================================
function updateStats() {
  const totalPerm = state.rekap.reduce((s, x) => s + x.permRp, 0);

  document.getElementById("stat-produk").textContent = state.products.length;
  document.getElementById("stat-rekap").textContent  = state.rekap.length;
  document.getElementById("stat-total").textContent  = formatRp(totalPerm);
  document.getElementById("stat-divisi").textContent = state.division || "–";
}


// ============================================================
//  8. KELOLA BARANG (Admin)
// ============================================================
function renderKelola() {
  const list = document.getElementById("kelola-list");
  const filtered = state.products.filter(p => (p.kategori || "ATK") === state.kelolaKat);

  if (filtered.length === 0) {
    list.innerHTML = `<div style="color:var(--text-3);padding:40px;text-align:center;grid-column:1/-1">Belum ada barang di kategori ${state.kelolaKat}.</div>`;
    return;
  }

  list.innerHTML = filtered.map(p => {
    const imgSrc  = convertDriveUrl(p.gambar) || imgFallback(p.kategori || "ATK");
    const fallback = imgFallback(p.kategori || "ATK");
    return `
    <div class="kelola-card">
      <img class="kelola-img" src="${imgSrc}" alt="${p.nama}"
           onerror="this.onerror=null;this.src='${fallback}'"/>
      <div class="kelola-info">
        <div class="kelola-name">${p.nama}</div>
        <div class="kelola-price">${formatRp(p.harga)} / ${p.satuan}</div>
        <div style="font-size:10px;color:var(--text-3);margin-top:2px;font-family:var(--font-mono)">${p.kategori || "ATK"}</div>
      </div>
      <div class="kelola-actions">
        <button class="btn-edit" onclick="openEditModal(${p.id})">✏️ Edit</button>
        <button class="btn-del"  onclick="deleteProduct(${p.id})">✕ Hapus</button>
      </div>
    </div>`;
  }).join("");
}

function openAddModal() {
  state.editId = null;
  document.getElementById("modal-title").textContent = "Tambah Barang";
  document.getElementById("modal-id").value     = "";
  document.getElementById("modal-nama").value   = "";
  document.getElementById("modal-harga").value  = "";
  document.getElementById("modal-satuan").value = "";
  document.getElementById("modal-gambar").value = "";
  document.getElementById("modal-barang").classList.remove("hidden");
}

function openEditModal(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;

  state.editId = id;
  document.getElementById("modal-title").textContent  = "Edit Barang";
  document.getElementById("modal-id").value      = p.id;
  document.getElementById("modal-nama").value    = p.nama;
  document.getElementById("modal-harga").value   = p.harga;
  document.getElementById("modal-satuan").value  = p.satuan;
  document.getElementById("modal-gambar").value  = p.gambar;
  document.getElementById("modal-kategori").value= p.kategori || "ATK";
  // preview
  previewGambar(p.gambar);
  document.getElementById("modal-barang").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal-barang").classList.add("hidden");
  state.editId = null;
}

function saveBarang() {
  const nama    = document.getElementById("modal-nama").value.trim();
  const harga   = parseInt(document.getElementById("modal-harga").value) || 0;
  const satuan  = document.getElementById("modal-satuan").value.trim() || "Pcs";
  const kategori= document.getElementById("modal-kategori").value || "ATK";
  const rawUrl  = document.getElementById("modal-gambar").value.trim();
  const gambar  = rawUrl; // simpan URL asli, konversi saat render

  if (!nama) { showToast("Nama barang wajib diisi!", "error"); return; }
  if (!harga) { showToast("Harga wajib diisi!", "error"); return; }

  if (state.editId) {
    const idx = state.products.findIndex(x => x.id === state.editId);
    if (idx !== -1) {
      state.products[idx] = { ...state.products[idx], nama, harga, satuan, gambar, kategori };
    }
    showToast("Barang berhasil diperbarui ✅", "success");
  } else {
    const newId = Date.now();
    state.products.push({ id: newId, kategori, nama, harga, satuan, gambar });
    showToast("Barang berhasil ditambahkan ✅", "success");
  }

  saveProducts();
  closeModal();
  renderKelola();
  updateStats();
}

function deleteProduct(id) {
  if (!confirm("Yakin hapus barang ini?")) return;
  state.products = state.products.filter(x => x.id !== id);
  saveProducts();
  renderKelola();
  updateStats();
  showToast("Barang dihapus", "info");
}


// ============================================================
//  9. EXPORT KE GOOGLE SPREADSHEET
// ============================================================
async function exportToSheet() {
  if (state.rekap.length === 0) {
    showToast("Rekap masih kosong!", "error"); return;
  }

  // Cek apakah URL Apps Script sudah diisi
  if (APPS_SCRIPT_URL === "GANTI_DENGAN_URL_APPS_SCRIPT_ANDA") {
    showToast("⚠️ URL Apps Script belum diisi! Lihat tutorial.", "error");
    return;
  }

  showToast("⏳ Mengirim data ke Google Sheet…", "info");

  // Siapkan payload data
  const payload = {
    action:    "saveRekap",
    user:      state.user?.name || "–",
    division:  state.division || "–",
    bulan:     state.bulan    || "–",
    tahun:     state.tahun    || "–",
    timestamp: new Date().toLocaleString("id-ID"),
    items:     state.rekap.map((item, idx) => ({
      no:       idx + 1,
      kategori: item.kategori || "ATK",
      nama:     item.nama,
      tarif:    item.tarif,
      bagian:   item.bagian,
      permVol:  item.permVol,
      permSat:  item.permSat,
      permRp:   item.permRp,
      korVol:   item.korVol,
      korSat:   item.korSat,
      korRp:    item.korRp,
      ket:      item.ket || "–",
    })),
  };

  try {
    // Kirim POST ke Google Apps Script
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",             // Apps Script perlu no-cors
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // no-cors = response type 'opaque', tidak bisa baca hasilnya
    // tapi data tetap terkirim jika Apps Script sudah benar
    showToast("✅ Data berhasil dikirim ke Google Sheet!", "success");

  } catch (err) {
    console.error("Export error:", err);
    showToast("❌ Gagal mengirim data. Cek konsol untuk detail.", "error");
  }
}


// ============================================================
//  10. EXPORT KE CSV (Fallback tanpa internet)
// ============================================================
function exportCSV() {
  if (state.rekap.length === 0) {
    showToast("Rekap masih kosong!", "error"); return;
  }

  const header = [
    "No","Kategori","Jenis Barang","Tarif (Rp)","Bagian/Bidang","Bulan","Tahun",
    "Perm Vol","Perm Sat","Perm Rp",
    "Kor Vol","Kor Sat","Kor Rp",
    "Keterangan"
  ].join(",");

  const rows = state.rekap.map((item, idx) => [
    idx + 1,
    item.kategori || "ATK",
    `"${item.nama}"`,
    item.tarif,
    item.bagian,
    item.bulan || state.bulan,
    item.tahun || state.tahun,
    item.permVol,
    item.permSat,
    item.permRp,
    item.korVol,
    item.korSat,
    item.korRp,
    `"${item.ket || "–"}"`,
  ].join(","));

  const totalPerm = state.rekap.reduce((s, x) => s + x.permRp, 0);
  const totalKor  = state.rekap.reduce((s, x) => s + x.korRp, 0);
  rows.push(`"","","","","TOTAL","","","","",${totalPerm},"","",${totalKor},""`);

  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");

  link.href     = url;
  link.download = `Rekap_${state.division || "Umum"}_${state.bulan || "Bulan"}_${state.tahun}_${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("📥 CSV berhasil didownload!", "success");
}


// ============================================================
//  UTILITAS
// ============================================================

// Format angka ke Rupiah
function formatRp(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}

// Tampilkan notifikasi toast
let toastTimer;
function showToast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className   = `toast ${type}`;
  el.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
}

// Animasi shake untuk login gagal
function shake(el) {
  el.style.animation = "none";
  el.offsetHeight; // trigger reflow
  el.style.animation = "shake .3s ease";
  setTimeout(() => el.style.animation = "", 400);
}

// Tambahkan keyframe shake ke dokumen
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)}
    60%{transform:translateX(-5px)}
    80%{transform:translateX(5px)}
  }
`;
document.head.appendChild(shakeStyle);