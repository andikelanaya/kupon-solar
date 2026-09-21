// Ganti dengan Web App URL dari Google Apps Script milikmu jika ada
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-wXl-DXCy_qmg7DX9Uv1_6yElcxtQXtNyy9ufFLgQYZPCPB8-nlUOQfWLfVM_QKA/exec';

// Array lokal untuk menyimpan data transaksi
let dataKupon = [];

document.addEventListener('DOMContentLoaded', () => {
    // Set default tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('mkTanggal')) document.getElementById('mkTanggal').value = today;
    if (document.getElementById('mkRencana')) document.getElementById('mkRencana').value = today;
    
    ambilDataGlobal();
});

// 1. Switch Tab Menu
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');

    // Aktifkan style tombol
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.innerText.toLowerCase().includes(tabName.toLowerCase())) {
            btn.classList.add('active');
        }
    });
}

// 2. Simpan Data dari Tab MAKER (Status Awal: Pending Approval)
function handleSimpanMaker(e) {
    e.preventDefault();

    const btn = document.getElementById('btnSubmitMaker');
    btn.disabled = true;
    btn.innerText = 'Menyimpan...';

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
        ket: document.getElementById('mkKet').value,
        status: 'Pending Approval' // Menunggu disetujui
    };

    if (SCRIPT_URL !== 'PASTE_URL_GOOGLE_APPS_SCRIPT_DI_SINI' && SCRIPT_URL.trim() !== '') {
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(() => {
            alert(`Pengajuan Berhasil! No Kupon: ${autoKupon}. Menunggu Approval.`);
            document.getElementById('formMaker').reset();
            ambilDataGlobal();
            switchTab('approval');
        })
        .catch(err => {
            console.error("Error mengirim data:", err);
            // Fallback simpan lokal jika koneksi gagal
            dataKupon.push(payload);
            renderAll();
            switchTab('approval');
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerText = 'Simpan & Kirim Approval';
        });
    } else {
        // Mode Simpan Lokal (Tanpa Database)
        dataKupon.push(payload);
        alert(`Pengajuan Berhasil! No Kupon: ${autoKupon}. Silakan disetujui pada tab Approval.`);
        document.getElementById('formMaker').reset();
        renderAll();
        btn.disabled = false;
        btn.innerText = 'Simpan & Kirim Approval';
        switchTab('approval');
    }
}

// 3. Ambil Data Global
function ambilDataGlobal() {
    if (SCRIPT_URL === 'PASTE_URL_GOOGLE_APPS_SCRIPT_DI_SINI' || SCRIPT_URL.trim() === '') {
        renderAll();
        return;
    }

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                dataKupon = data;
            }
            renderAll();
        })
        .catch(err => {
            console.error("Error mengambil data:", err);
            renderAll();
        });
}

// 4. Render Ulang Seluruh Komponen Tampilan
function renderAll() {
    updateDashboardStats();
    renderApprovalList();
    renderRekapTable(dataKupon.filter(d => d.status === 'Disetujui' || d.status === 'Finish'));
}

// 5. Update Statistik Dashboard
function updateDashboardStats() {
    const total = dataKupon.length;
    const pending = dataKupon.filter(d => d.status === 'Pending Approval').length;
    const approved = dataKupon.filter(d => d.status === 'Disetujui' || d.status === 'Finish').length;

    if (document.getElementById('statTotal')) document.getElementById('statTotal').innerText = total;
    if (document.getElementById('statApproval')) document.getElementById('statApproval').innerText = pending;
    if (document.getElementById('statDisetujui')) document.getElementById('statDisetujui').innerText = approved;
    if (document.getElementById('statSelesai')) document.getElementById('statSelesai').innerText = approved;
}

// 6. Render Daftar Kupon yang Membutuhkan APPROVAL
function renderApprovalList() {
    const container = document.getElementById('approvalContainer');
    if (!container) return;

    const listPending = dataKupon.filter(item => item.status === 'Pending Approval');

    if (listPending.length === 0) {
        container.innerHTML = `<p class="empty-text">Tidak ada transaksi yang menunggu approval.</p>`;
        return;
    }

    container.innerHTML = listPending.map((item) => `
        <div class="card" style="border-left: 4px solid #0284c7; margin-bottom: 1rem; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <strong style="font-size: 1.1rem;">${item.kupon}</strong>
                <span class="badge" style="background-color: #fef08a; color: #854d0e; padding: 0.25rem 0.75rem;">Menunggu Approval</span>
            </div>
            <p style="font-size: 0.875rem; margin-bottom: 0.35rem;"><strong>Pengaju:</strong> ${item.nama} (${item.dept})</p>
            <p style="font-size: 0.875rem; margin-bottom: 0.35rem;"><strong>Unit:</strong> ${item.unit} (${item.nopol})</p>
            <p style="font-size: 0.875rem; margin-bottom: 1rem;"><strong>Jumlah Pengajuan:</strong> ${item.pengajuan} Liter</p>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-primary" onclick="prosesApproval('${item.kupon}', 'Disetujui')">✓ Setujui (Approve)</button>
                <button class="btn btn-secondary" style="background-color: #fee2e2; color: #991b1b;" onclick="prosesApproval('${item.kupon}', 'Ditolak')">✕ Tolak</button>
            </div>
        </div>
    `).join('');
}

// 7. Fungsionalitas Eksekusi Approve / Reject
window.prosesApproval = function(noKupon, statusBaru) {
    const index = dataKupon.findIndex(d => d.kupon === noKupon);
    if (index !== -1) {
        dataKupon[index].status = statusBaru;
        if (statusBaru === 'Disetujui') {
            dataKupon[index].aktual = dataKupon[index].pengajuan;
        }
        alert(`Kupon ${noKupon} berhasil di-update menjadi: ${statusBaru}`);
        renderAll(); // Memperbarui tampilan secara langsung
    } else {
        alert("Data kupon tidak ditemukan.");
    }
};

// 8. Render Tabel Rekap Transaksi yang Disetujui
function renderRekapTable(dataList) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    if (!dataList || dataList.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada transaksi yang disetujui.</td></tr>`;
        if (document.getElementById('valPengajuan')) document.getElementById('valPengajuan').innerText = "0.00 L";
        if (document.getElementById('valAktual')) document.getElementById('valAktual').innerText = "0.00 L";
        if (document.getElementById('valSelisih')) document.getElementById('valSelisih').innerText = "0.00 L";
        return;
    }

    let totPengajuan = 0;
    let totAktual = 0;

    tbody.innerHTML = dataList.map(item => {
        const pengajuan = parseFloat(item.pengajuan) || 0;
        const aktual = parseFloat(item.aktual) || 0;

        totPengajuan += pengajuan;
        totAktual += aktual;

        return `
            <tr>
                <td><strong>${item.kupon || '-'}</strong></td>
                <td>${item.tanggal || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td>${pengajuan.toFixed(2)}</td>
                <td>${aktual.toFixed(2)}</td>
                <td><span class="badge" style="background-color: #dcfce7; color: #15803d;">${item.status}</span></td>
                <td><button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">Selesai</button></td>
            </tr>
        `;
    }).join('');

    if (document.getElementById('valPengajuan')) document.getElementById('valPengajuan').innerText = `${totPengajuan.toFixed(2)} L`;
    if (document.getElementById('valAktual')) document.getElementById('valAktual').innerText = `${totAktual.toFixed(2)} L`;
    if (document.getElementById('valSelisih')) document.getElementById('valSelisih').innerText = `${(totAktual - totPengajuan).toFixed(2)} L`;
}

// 9. Filter Tanggal di Tab Rekap
function filterRekap() {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;

    const dataSelesai = dataKupon.filter(d => d.status === 'Disetujui' || d.status === 'Finish');

    if (!start || !end) {
        renderRekapTable(dataSelesai);
        return;
    }

    const filtered = dataSelesai.filter(item => {
        return item.tanggal >= start && item.tanggal <= end;
    });

    renderRekapTable(filtered);
}

// 10. Export CSV
function exportCSV() {
    const dataSelesai = dataKupon.filter(d => d.status === 'Disetujui' || d.status === 'Finish');

    if (dataSelesai.length === 0) {
        alert('Tidak ada data transaksi yang disetujui untuk diexport!');
        return;
    }

    let csv = "No Kupon,Tanggal,Unit,Pengajuan,Aktual,Status\n";
    dataSelesai.forEach(r => {
        csv += `${r.kupon},${r.tanggal},"${r.unit}",${r.pengajuan},${r.aktual},${r.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Kupon_Solar_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}