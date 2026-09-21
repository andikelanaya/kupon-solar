/* ==========================================================================
   KONFIGURASI UTAMA
   ========================================================================== */

// 1. Masukkan Web App URL dari Google Apps Script Anda di bawah ini
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-wXl-DXCy_qmg7DX9Uv1_6yElcxtQXtNyy9ufFLgQYZPCPB8-nlUOQfWLfVM_QKA/exec';

// 2. PIN Rahasia untuk Approver (Hanya Anda yang tahu)
const PIN_APPROVER = '1234';

// Variable Global Penyimpanan Data
let dataKupon = [];
let previousPendingCount = 0;

/* ==========================================================================
   INISIALISASI & REAL-TIME POLLING
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Set default tanggal hari ini pada form Maker
    const today = new Date().toISOString().split('T')[0];
    const mkTanggal = document.getElementById('mkTanggal');
    const mkRencana = document.getElementById('mkRencana');
    
    if (mkTanggal) mkTanggal.value = today;
    if (mkRencana) mkRencana.value = today;

    // Ambil data pertama kali saat web dibuka
    ambilDataGlobal();

    // SINKRONISASI REAL-TIME: Ambil data otomatis dari backend setiap 3 detik
    setInterval(ambilDataGlobal, 3000);
});

/* ==========================================================================
   1. NAVIGASI TAB
   ========================================================================== */

function switchTab(tabName) {
    // Sembunyikan semua tab content
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Unactive semua tombol tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Aktifkan tab content yang dipilih
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');

    // Aktifkan tombol tab yang sesuai
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase().includes(tabName.toLowerCase())) {
            btn.classList.add('active');
        }
    });
}

/* ==========================================================================
   2. SISTEM NOTIFIKASI WEB (POP-UP TOAST & EFEK SUARA)
   ========================================================================== */

function showNotification(title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Buat elemen Notifikasi Toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div>
            <strong>🔔 ${title}</strong>
            <p style="font-size:0.85rem; margin-top:0.2rem;">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:white; cursor:pointer; font-weight:bold; font-size:1.1rem;">✕</button>
    `;
    container.appendChild(toast);

    // Memutar Suara Beep Notifikasi Sederhana
    try {
        let ctx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800; // Frekuensi suara (Hz)
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2); // Berbunyi selama 0.2 detik
    } catch (e) {
        console.log("Audio permission pending");
    }

    // Otomatis Hilangkan Pop-up Setelah 6 Detik
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 6000);
}

/* ==========================================================================
   3. SINKRONISASI DATA DARI BACKEND / LOCALSTORAGE
   ========================================================================== */

function ambilDataGlobal() {
    if (SCRIPT_URL !== 'https://script.google.com/macros/s/AKfycby-wXl-DXCy_qmg7DX9Uv1_6yElcxtQXtNyy9ufFLgQYZPCPB8-nlUOQfWLfVM_QKA/exec' && SCRIPT_URL.trim() !== '') {
        fetch(SCRIPT_URL)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    prosesDataBaru(data);
                }
            })
            .catch(err => console.error("Sync Error:", err));
    } else {
        // Fallback jika SCRIPT_URL belum dikonfigurasi (menggunakan Local Storage)
        const localData = JSON.parse(localStorage.getItem('fuel_coupons') || '[]');
        prosesDataBaru(localData);
    }
}

function prosesDataBaru(newData) {
    // Filter pengajuan yang masih berstatus Pending Approval
    const pendingItems = newData.filter(item => item.status === 'Pending Approval');
    const currentPendingCount = pendingItems.length;

    // Deteksi jika ada pengajuan baru yang bertambah dari device lain
    if (currentPendingCount > previousPendingCount) {
        const itemTerbaru = pendingItems[pendingItems.length - 1];
        showNotification(
            'Pengajuan Kupon Baru!', 
            `Kupon ${itemTerbaru.kupon || ''} dari ${itemTerbaru.nama || 'Maker'} (${itemTerbaru.pengajuan || 0} Liter) membutuhkan approval.`
        );
    }

    previousPendingCount = currentPendingCount;
    dataKupon = newData;
    
    // Perbarui seluruh tampilan UI di layar web
    renderAll();
}

/* ==========================================================================
   4. PENANGANAN FORM MAKER (INPUT PENGAJUAN)
   ========================================================================== */

function handleSimpanMaker(e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmitMaker');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Menyimpan...';
    }

    // Buat Format No Kupon Otomatis (misal: KPN-0001)
    const autoKupon = 'KPN-' + String(dataKupon.length + 1).padStart(4, '0');

    const payload = {
        kupon: autoKupon,
        tanggal: document.getElementById('mkTanggal').value,
        nama: document.getElementById('mkNama').value,
        unit: document.getElementById('mkUnit').value,
        nopol: document.getElementById('mkNopol').value,
        dept: document.getElementById('mkDept').value,
        pengajuan: parseFloat(document.getElementById('mkJumlah').value) || 0,
        aktual: 0,
        hmkm: document.getElementById('mkHmKm').value,
        rencana: document.getElementById('mkRencana').value,
        ket: document.getElementById('mkKet') ? document.getElementById('mkKet').value : '',
        status: 'Pending Approval'
    };

    if (SCRIPT_URL !== 'PASTE_URL_GOOGLE_APPS_SCRIPT_DI_SINI' && SCRIPT_URL.trim() !== '') {
        // Kirim pengajuan baru ke Google Apps Script backend
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(() => {
            alert(`✅ Pengajuan Berhasil Ditambahkan!\nNo Kupon: ${autoKupon}`);
            document.getElementById('formMaker').reset();
            ambilDataGlobal(); // Sinkronisasi ulang data
        })
        .catch(err => alert("Gagal menyimpan ke database: " + err))
        .finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Simpan & Kirim Approval';
            }
        });
    } else {
        // Simpan ke Local Storage jika backend belum diatur
        dataKupon.push(payload);
        localStorage.setItem('fuel_coupons', JSON.stringify(dataKupon));
        alert(`✅ Pengajuan Berhasil!\nNo Kupon: ${autoKupon}`);
        document.getElementById('formMaker').reset();
        renderAll();
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Simpan & Kirim Approval';
        }
    }
}

/* ==========================================================================
   5. RENDER UTAMA (DASHBOARD, BADGE, APPROVAL, REKAP)
   ========================================================================== */

function renderAll() {
    // Hitung statistik transaksi
    const total = dataKupon.length;
    const pending = dataKupon.filter(d => d.status === 'Pending Approval').length;
    const approved = dataKupon.filter(d => d.status === 'Disetujui' || d.status === 'Finish').length;

    // Render statistik ke Dashboard
    if (document.getElementById('statTotal')) document.getElementById('statTotal').innerText = total;
    if (document.getElementById('statPending')) document.getElementById('statPending').innerText = pending;
    if (document.getElementById('statApproved')) document.getElementById('statApproved').innerText = approved;

    // Update Badge Angka Merah pada Tab Approval
    const badge = document.getElementById('approvalBadge');
    if (badge) {
        if (pending > 0) {
            badge.innerText = pending;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Render daftar item pada Tab Approval & Rekap
    renderApprovalList();
    renderRekapTable();
}

/* ==========================================================================
   6. RENDER DAFTAR APPROVAL (KARTU PENGAJUAN)
   ========================================================================== */

function renderApprovalList() {
    const container = document.getElementById('approvalContainer');
    if (!container) return;

    const listPending = dataKupon.filter(item => item.status === 'Pending Approval');

    if (listPending.length === 0) {
        container.innerHTML = `<p style="color:#64748b; padding:1rem 0;">Tidak ada transaksi yang menunggu approval.</p>`;
        return;
    }

    container.innerHTML = listPending.map(item => `
        <div class="card" style="border-left: 5px solid #0284c7; margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <strong style="font-size:1.1rem; color:#0f172a;">${item.kupon}</strong>
                <span class="badge badge-pending">Menunggu Approval</span>
            </div>
            <p style="font-size:0.875rem; margin-bottom:0.25rem;"><strong>Pengaju:</strong> ${item.nama} (${item.dept})</p>
            <p style="font-size:0.875rem; margin-bottom:0.25rem;"><strong>Unit:</strong> ${item.unit} (${item.nopol})</p>
            <p style="font-size:0.875rem; margin-bottom:0.75rem;"><strong>Jumlah Pengajuan:</strong> ${item.pengajuan} Liter</p>
            <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-primary" onclick="prosesApprovalWithPIN('${item.kupon}', 'Disetujui')">✓ Setujui (Approve)</button>
                <button class="btn btn-danger" onclick="prosesApprovalWithPIN('${item.kupon}', 'Ditolak')">✕ Tolak</button>
            </div>
        </div>
    `).join('');
}

/* ==========================================================================
   7. PROSES APPROVAL DENGAN PROTEKSI PIN
   ========================================================================== */

function prosesApprovalWithPIN(noKupon, statusBaru) {
    // Minta input PIN dari pengguna
    const inputPin = prompt(`Masukkan PIN Approver untuk ${statusBaru.toLowerCase()} kupon ${noKupon}:`);

    // Batalkan jika tombol Batal / Cancel diklik
    if (inputPin === null) return;

    // Validasi PIN
    if (inputPin !== PIN_APPROVER) {
        alert("❌ PIN Salah! Anda tidak berhak melakukan approval.");
        return;
    }

    if (SCRIPT_URL !== 'PASTE_URL_GOOGLE_APPS_SCRIPT_DI_SINI' && SCRIPT_URL.trim() !== '') {
        // Kirim pembaruan status ke Google Apps Script backend
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateStatus',
                kupon: noKupon,
                status: statusBaru,
                aktual: dataKupon.find(d => d.kupon === noKupon)?.pengajuan || 0
            })
        })
        .then(res => res.json())
        .then(() => {
            alert(`Status kupon ${noKupon} berhasil diubah menjadi: ${statusBaru}`);
            ambilDataGlobal(); // Refresh data terbaru
        })
        .catch(err => alert("Gagal update status: " + err));
    } else {
        // Update di Local Storage jika backend belum ada
        const idx = dataKupon.findIndex(d => d.kupon === noKupon);
        if (idx !== -1) {
            dataKupon[idx].status = statusBaru;
            dataKupon[idx].aktual = dataKupon[idx].pengajuan;
            localStorage.setItem('fuel_coupons', JSON.stringify(dataKupon));
            alert(`Status kupon ${noKupon} berhasil diubah menjadi: ${statusBaru}`);
            renderAll();
        }
    }
}

/* ==========================================================================
   8. RENDER TABEL REKAPITULASI
   ========================================================================== */

function renderRekapTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const listFinished = dataKupon.filter(d => d.status === 'Disetujui' || d.status === 'Finish');

    if (listFinished.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1rem;">Belum ada data transaksi disetujui.</td></tr>`;
        return;
    }

    tbody.innerHTML = listFinished.map(item => `
        <tr>
            <td><strong>${item.kupon}</strong></td>
            <td>${item.tanggal}</td>
            <td>${item.nama}</td>
            <td>${item.unit}</td>
            <td>${item.pengajuan} L</td>
            <td><span class="badge badge-success">${item.status}</span></td>
        </tr>
    `).join('');
}
