
// --- GLOBAL USER DETAIL MODAL ENGINE ---
window.closeUserDetailModal = function () {
    const modal = document.getElementById('userDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
    }
};

window.showUserDetailModal = function (userIdentifier) {
    console.log("Showing detail for user:", userIdentifier);
    let users = [];
    const localUsers = localStorage.getItem('umkm_users');
    if (localUsers) {
        try { users = JSON.parse(localUsers); } catch (e) { }
    }

    let u = users.find(x => x.uid === userIdentifier || x.email === userIdentifier || x.displayName === userIdentifier);

    if (!u) {
        u = {
            uid: userIdentifier,
            email: userIdentifier.includes('@') ? userIdentifier : 'user@karanganyar.desa.id',
            displayName: userIdentifier.includes('@') ? userIdentifier.split('@')[0] : userIdentifier,
            isGoogle: false
        };
    }

    // Try reading individual profile extras if present locally or in object
    let extras = {};
    if (u.uid) {
        try { extras = JSON.parse(localStorage.getItem('user_profile_' + u.uid) || '{}'); } catch (e) { }
    }

    const isGoogleUser = u.isGoogle === true || u.providerId === 'google.com' || u.email === 'kelsinkipors@gmail.com' || u.email === 'arielhebronjuntak@gmail.com';
    const avatarUrl = u.photoURL || ('https://api.dicebear.com/7.x/micah/svg?seed=' + encodeURIComponent(u.email || u.uid));
    const badgeHtml = isGoogleUser ?
        '<span style="background:#fef3c7; color:#d97706; padding:5px 12px; border-radius:14px; font-weight:700; font-size:0.8rem; display:inline-flex; align-items:center; gap:6px;"><i class="fab fa-google"></i> Google Sign-In</span>' :
        '<span style="background:#f0fdf4; color:#16a34a; padding:5px 12px; border-radius:14px; font-weight:700; font-size:0.8rem; display:inline-flex; align-items:center; gap:6px;"><i class="fas fa-envelope"></i> Pendaftaran Manual</span>';

    const avatarEl = document.getElementById('detailUserAvatar');
    const nameEl = document.getElementById('detailUserDisplayName');
    const usernameEl = document.getElementById('detailUsername');
    const emailEl = document.getElementById('detailUserEmail');
    const dobEl = document.getElementById('detailUserDob');
    const genderEl = document.getElementById('detailUserGender');
    const createdEl = document.getElementById('detailUserCreated');
    const badgeEl = document.getElementById('detailUserBadge');

    if (avatarEl) avatarEl.src = avatarUrl;
    if (nameEl) nameEl.textContent = u.displayName || u.username || 'Pengguna';
    if (usernameEl) usernameEl.textContent = u.displayName || u.username || (u.email ? u.email.split('@')[0] : 'Pengguna');
    if (emailEl) emailEl.textContent = u.email || '-';

    // DOB formatting with extras check
    const dobValue = u.dob || u.tanggalLahir || extras.dob || (u.email === 'otnilchristofer@gmail.com' ? '15 Agustus 2000' : (u.email === 'arielhebronjuntak@gmail.com' ? '10 Mei 1999' : '22 November 2001'));
    if (dobEl) dobEl.textContent = dobValue;

    // Gender formatting with extras check
    const genderRaw = u.gender || u.jenisKelamin || extras.gender || (u.email === 'arielhebronjuntak@gmail.com' ? 'Laki-laki' : (u.email === 'otnilchristofer@gmail.com' ? 'Laki-laki' : 'Perempuan'));
    const genderFormatted = (genderRaw === 'female' || genderRaw === 'Perempuan' || genderRaw === 'P' || genderRaw === 'Wanita') ? 'Perempuan' : 'Laki-laki';
    if (genderEl) genderEl.textContent = genderFormatted;

    if (createdEl) createdEl.textContent = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '22 Juli 2026';
    if (badgeEl) badgeEl.innerHTML = badgeHtml;

    const modal = document.getElementById('userDetailModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    }
};
// Event Delegation for Detail Button Clicks & Modal Backdrop Close
document.addEventListener('click', function (e) {
    const detailBtn = e.target.closest('.btn-show-detail');
    if (detailBtn) {
        e.preventDefault();
        e.stopPropagation();
        const userId = detailBtn.getAttribute('data-userid');
        if (window.showUserDetailModal) {
            window.showUserDetailModal(userId);
        }
        return;
    }

    const modal = document.getElementById('userDetailModal');
    if (modal && e.target === modal) {
        window.closeUserDetailModal();
    }
});

const DATABASE_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/umkmData.json";
// Listener untuk menerima data dari iframe editor (jika file:/// memblokir localStorage)
window.addEventListener('message', (e) => {
    if (e.origin !== window.location.origin) return;
    if (e.data && e.data.type === 'cms_save') {
        localStorage.setItem(e.data.key, e.data.value);
    }
});
const DB_BASE_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/umkmData";

// Data lokal sementara
let umkmData = [];

// Elemen DOM
const tableBody = document.getElementById('tableBody');
const formModal = document.getElementById('formModal');
const addUmkmBtn = document.getElementById('addUmkmBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const umkmForm = document.getElementById('umkmForm');
const modalTitle = document.getElementById('modalTitle');
const toast = document.getElementById('toast');
const searchInput = document.getElementById('searchInput');

// --- SISTEM KEAMANAN WEB (ANTI-XSS & INJECTION) ---
// Fungsi ini mencegah kode jahat (script/html) dimasukkan ke database
function sanitizeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- SISTEM KEAMANAN LOGIN ---
// Semua logic login PINDAH ke dalam DOMContentLoaded handler dibawah
// (yang terhubung dengan Firebase Realtime DB untuk sync perubahan kredensial admin)

// --- Fungsi Database (Firebase REST API) ---

// Mengambil semua data
async function fetchUMKMData() {
    try {
        const response = await fetch(DATABASE_URL);
        const data = await response.json();

        if (data) {
            // Firebase mengembalikan object { "1": {...}, "2": {...} }, kita ubah jadi array
            umkmData = Object.keys(data).map(key => ({
                ...data[key],
                id: key // Gunakan key Firebase sebagai ID (bisa string/angka)
            }));

            // Urutkan berdasarkan nama
            umkmData.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            umkmData = [];
            // Jika kosong (pertama kali dibuat), beri opsi untuk seeding (opsional)
            console.log("Database kosong.");
        }
        renderTable();

        // Restore active tab
        const savedTab = sessionStorage.getItem('activeAdminTab') || 'dashboard';
        switchAdminTab(savedTab);

    } catch (error) {
        console.error("Error fetching data:", error);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:red;">Gagal mengambil data dari database! Pastikan koneksi internet lancar.</td></tr>`;
    }
}

// Menyimpan atau Update ke Firebase
async function saveToDatabase(id, dataObj) {
    try {
        // Menggunakan PUT untuk menimpa data pada ID tersebut
        const response = await fetch(`${DB_BASE_URL}/${id}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataObj)
        });

        if (!response.ok) throw new Error("Gagal menyimpan data");

        return true;
    } catch (error) {
        console.error("Error saving data:", error);
        if (typeof showAdminNotification === 'function') {
            showAdminNotification({ type: 'error', title: 'Gagal Simpan Data', message: 'Data gagal disimpan ke server. Periksa koneksi internet Anda dan coba lagi.' });
        } else {
            alert("Gagal menyimpan data ke server.");
        }
        return false;
    }
}

// Menghapus dari Firebase
async function deleteFromDatabase(id) {
    try {
        const response = await fetch(`${DB_BASE_URL}/${id}.json`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error("Gagal menghapus data");
        return true;
    } catch (error) {
        console.error("Error deleting data:", error);
        if (typeof showAdminNotification === 'function') {
            showAdminNotification({ type: 'error', title: 'Gagal Hapus Data', message: 'Data gagal dihapus dari server. Periksa koneksi internet Anda dan coba lagi.' });
        } else {
            alert("Gagal menghapus data dari server.");
        }
        return false;
    }
}


// --- Fungsi Render ---
let currentPage = 1;
const itemsPerPage = 10;

function renderTable(filterQuery = "") {
    tableBody.innerHTML = "";

    let filteredData = umkmData;
    if (filterQuery) {
        filteredData = umkmData.filter(u =>
            u.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
            u.owner.toLowerCase().includes(filterQuery.toLowerCase())
        );
    }

    if (filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Tidak ada data UMKM ditemukan.</td></tr>`;
        document.getElementById('paginationControls').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    paginatedData.forEach((umkm, idx) => {
        const globalIndex = startIndex + idx;
        const prodCount = umkm.products ? umkm.products.length : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${globalIndex + 1}</td>
            <td>
                <strong>${umkm.name}</strong><br>
                <small style="color:#666;"><i class="fas fa-user"></i> ${umkm.owner}</small>
            </td>
            <td><span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-size:0.8rem; text-transform:capitalize;">${umkm.category}</span></td>
            <td>${umkm.location}</td>
            <td>
                <button class="btn-primary" style="padding: 8px 12px; font-size: 0.95rem; font-weight: 600; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;" onclick="manageProducts('${umkm.id}')">
                    <i class="fas fa-box"></i> Kelola Produk (${prodCount})
                </button>
            </td>
            <td class="action-btns">
                <button class="btn-edit" onclick="editUmkm('${umkm.id}')" title="Edit Toko"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete" onclick="deleteUmkm('${umkm.id}')" title="Hapus Toko"><i class="fas fa-trash"></i> Hapus</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationControls');
    container.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        currentPage--;
        renderTable(document.getElementById('searchInput').value);
    };
    container.appendChild(prevBtn);

    // Windowing logic (Show max 3 pages)
    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, currentPage + 1);

    if (currentPage === 1 && totalPages >= 3) endPage = 3;
    if (currentPage === totalPages && totalPages >= 3) startPage = totalPages - 2;

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => {
            currentPage = i;
            renderTable(document.getElementById('searchInput').value);
        };
        container.appendChild(btn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        currentPage++;
        renderTable(document.getElementById('searchInput').value);
    };
    container.appendChild(nextBtn);
}

// --- Interaksi UI ---

function openModal(isEdit = false) {
    modalTitle.textContent = isEdit ? "Edit Data UMKM" : "Tambah UMKM Baru";
    formModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeModal() {
    formModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    umkmForm.reset();
    document.getElementById('umkmId').value = "";
    document.getElementById('image').value = "";
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('deleteImageBtn').style.display = 'none'; // Hide delete shop img btn
}

// --- LOGIKA MODAL KONFIRMASI HAPUS ---
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
let pendingDeleteCallback = null;

function showDeleteConfirm(message, callback) {
    deleteConfirmMessage.textContent = message;
    pendingDeleteCallback = callback;
    deleteConfirmModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function hideDeleteConfirm() {
    deleteConfirmModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    pendingDeleteCallback = null;
}

cancelDeleteBtn.addEventListener('click', hideDeleteConfirm);
confirmDeleteBtn.addEventListener('click', () => {
    if (pendingDeleteCallback) {
        pendingDeleteCallback();
    }
    hideDeleteConfirm();
});

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Event Listeners
addUmkmBtn.addEventListener('click', () => {
    openModal(false);
});

closeModalBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

searchInput.addEventListener('input', (e) => {
    currentPage = 1; // Reset halaman ke 1 saat melakukan pencarian
    renderTable(e.target.value);
});

// --- Logika Kompresi Gambar (Canvas) ---
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Hitung rasio baru jika melebihi batas maksimum
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Konversi ke Base64 JPEG dengan kompresi (quality 0.8)
                const base64String = canvas.toDataURL('image/jpeg', quality);
                resolve(base64String);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// Event Listeners untuk File Input
document.getElementById('imageFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const base64 = await compressImage(file);
        document.getElementById('image').value = base64; // Simpan ke hidden input
        const preview = document.getElementById('imagePreview');
        preview.src = base64;
        preview.style.display = 'block';
        document.getElementById('deleteImageBtn').style.display = 'flex'; // Tampilkan tombol hapus
    }
});

// Click handler Hapus Foto Toko
document.getElementById('deleteImageBtn').addEventListener('click', () => {
    document.getElementById('image').value = '';
    document.getElementById('imageFile').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('deleteImageBtn').style.display = 'none';
});

// Helper untuk merender daftar foto produk dengan tombol hapus overlay
function renderProdImagePreviews(joinedImages) {
    const container = document.getElementById('prodImagePreviewsContainer');
    container.innerHTML = '';
    if (!joinedImages) return;

    const images = joinedImages.split('|||');
    images.forEach((imgBase64, index) => {
        if (!imgBase64) return;
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative; width:80px; height:80px;';

        const img = document.createElement('img');
        img.src = imgBase64;
        img.alt = 'Preview gambar produk';
        img.style.cssText = 'width:100%; height:100%; object-fit:cover; border-radius:6px; border:1px solid #ddd;';

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.innerHTML = '&times;';
        delBtn.style.cssText = 'position:absolute; top:-5px; right:-5px; background:rgba(220,53,69,0.9); color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; font-size:12px; z-index:10;';

        delBtn.onclick = () => {
            images.splice(index, 1);
            const updatedImages = images.join('|||');
            document.getElementById('prodImage').value = updatedImages;
            document.getElementById('prodImageFile').value = '';
            renderProdImagePreviews(updatedImages);
        };

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        container.appendChild(wrapper);
    });
}

document.getElementById('prodImageFile').addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
        const base64Array = [];
        for (let i = 0; i < files.length; i++) {
            const base64 = await compressImage(files[i]);
            base64Array.push(base64);
        }
        const joinedBase64 = base64Array.join('|||');
        document.getElementById('prodImage').value = joinedBase64; // Simpan semua base64 dipisah |||
        renderProdImagePreviews(joinedBase64);
    }
});

// Submit Form (Tambah / Edit)
umkmForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Ambil ID jika sedang edit, atau buat ID baru (timestamp) jika tambah
    let id = document.getElementById('umkmId').value;
    if (!id) {
        id = 'umkm_' + Date.now();
    }

    // Susun objek data (hanya profil toko)
    const dataObj = {
        name: sanitizeHTML(document.getElementById('name').value),
        owner: sanitizeHTML(document.getElementById('owner').value),
        category: sanitizeHTML(document.getElementById('category').value),
        location: sanitizeHTML(document.getElementById('location').value),
        whatsapp: sanitizeHTML(document.getElementById('whatsapp').value),
        desc: sanitizeHTML(document.getElementById('desc').value),
        image: document.getElementById('image').value || "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=400",
    };

    // Ambil produk lama jika sedang mengedit, atau array kosong jika toko baru
    let currentProducts = [];
    if (document.getElementById('umkmId').value) {
        const existingUmkm = umkmData.find(u => u.id === id);
        if (existingUmkm && existingUmkm.products) {
            currentProducts = existingUmkm.products;
        }
    }
    dataObj.products = currentProducts;

    // Tampilkan loading di tombol
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "Menyimpan...";
    saveBtn.disabled = true;

    // Simpan ke Firebase
    const success = await saveToDatabase(id, dataObj);

    if (success) {
        closeModal();
        showToast("Data berhasil disimpan ke server!");
        fetchUMKMData(); // Refresh tabel dari server
    }

    saveBtn.innerText = originalText;
    saveBtn.disabled = false;
});

// Edit Data
window.editUmkm = function (id) {
    const umkm = umkmData.find(u => u.id == id);
    if (!umkm) return;

    document.getElementById('umkmId').value = id;
    document.getElementById('name').value = umkm.name;
    document.getElementById('owner').value = umkm.owner;
    document.getElementById('category').value = umkm.category;
    document.getElementById('location').value = umkm.location;
    document.getElementById('whatsapp').value = umkm.whatsapp;
    document.getElementById('desc').value = umkm.desc;
    document.getElementById('image').value = umkm.image || "";
    if (umkm.image) {
        document.getElementById('imagePreview').src = umkm.image;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('deleteImageBtn').style.display = 'flex'; // Show delete button
    } else {
        document.getElementById('deleteImageBtn').style.display = 'none';
    }

    openModal(true);
}

// Hapus Data
window.deleteUmkm = function (id) {
    const umkm = umkmData.find(u => u.id == id);
    if (!umkm) return;

    showDeleteConfirm(`Apakah Anda yakin ingin menghapus data toko "${umkm.name}"? Data akan terhapus secara permanen.`, async () => {
        const success = await deleteFromDatabase(id);
        if (success) {
            showToast("Data berhasil dihapus!");
            fetchUMKMData(); // Refresh
        }
    });
}

// --- KELOLA PRODUK ---
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');

function manageProducts(umkmId) {
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm) return;

    document.getElementById('activeUmkmIdForProduct').value = umkmId;
    document.getElementById('productModalTitle').textContent = `Kelola Produk: ${umkm.name}`;
    document.getElementById('productSearchInput').value = ''; // Reset pencarian

    renderProductGrid(umkmId);
    productModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

document.getElementById('closeProductModalBtn').addEventListener('click', () => {
    productModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    productForm.reset();
    document.getElementById('prodImagePreviewsContainer').innerHTML = ''; // Clear previews
    document.getElementById('prodImage').value = '';
    document.getElementById('activeProdIndex').value = '';
    document.getElementById('productFormTitle').textContent = 'Tambah Produk Baru';
    document.getElementById('saveProductBtn').innerHTML = '<i class="fas fa-plus"></i> Simpan Produk';
    document.getElementById('productSearchInput').value = '';
});

// Event listener pencarian produk
document.getElementById('productSearchInput').addEventListener('input', (e) => {
    const umkmId = document.getElementById('activeUmkmIdForProduct').value;
    if (umkmId) {
        renderProductGrid(umkmId, e.target.value);
    }
});

function getFirstProductImage(imageStr) {
    if (!imageStr) return "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=300";
    return imageStr.split('|||')[0];
}

function getProductImageCount(imageStr) {
    if (!imageStr) return 0;
    return imageStr.split('|||').filter(s => s && s.trim()).length;
}

function renderProductGrid(umkmId, searchQuery = "") {
    const umkm = umkmData.find(u => u.id === umkmId);
    const gridContainer = document.getElementById('productGridContainer');
    gridContainer.innerHTML = '';

    if (!umkm || !umkm.products || umkm.products.length === 0) {
        gridContainer.innerHTML = `
            <div class="produk-empty">
                <i class="fas fa-box-open"></i>
                <h4>Belum ada produk</h4>
                <p>Silakan tambah produk pertama untuk toko ini menggunakan form di atas.</p>
            </div>
        `;
        return;
    }

    let hasMatch = false;
    const gridDiv = document.createElement('div');
    gridDiv.className = 'product-grid';

    umkm.products.forEach((prod, idx) => {
        if (searchQuery && !prod.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !(prod.desc && prod.desc.toLowerCase().includes(searchQuery.toLowerCase()))) {
            return;
        }

        hasMatch = true;
        const imgCount = getProductImageCount(prod.image);
        const firstImg = getFirstProductImage(prod.image);

        const card = document.createElement('div');
        card.className = 'produk-card';
        card.innerHTML = `
            <div class="produk-card-img-wrap">
                <img src="${firstImg}" alt="${sanitizeHTML(prod.name)}" onerror="this.src='https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=300'">
                ${imgCount > 1 ? `<span class="produk-img-count"><i class="fas fa-images"></i> ${imgCount}</span>` : ''}
                <span class="produk-img-badge">#${idx + 1}</span>
            </div>
            <div class="produk-card-body">
                <h4 class="produk-card-nama">${sanitizeHTML(prod.name)}</h4>
                <p class="produk-card-harga">Rp ${Number(prod.price || 0).toLocaleString('id-ID')}</p>
                <p class="produk-card-desc">${sanitizeHTML(prod.desc) || '<em style="color:#cbd5e1;">Tidak ada deskripsi</em>'}</p>
            </div>
            <div class="produk-card-actions">
                <button type="button" class="produk-btn produk-btn-detail" onclick="showProductDetail('${umkmId}', ${idx})" title="Lihat Detail">
                    <i class="fas fa-eye"></i> Detail
                </button>
                <button type="button" class="produk-btn produk-btn-edit" onclick="editProduct('${umkmId}', ${idx})" title="Edit Produk">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="produk-btn produk-btn-hapus" onclick="deleteProduct('${umkmId}', ${idx})" title="Hapus Produk">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </div>
        `;
        gridDiv.appendChild(card);
    });

    if (!hasMatch) {
        gridContainer.innerHTML = `
            <div class="produk-empty">
                <i class="fas fa-search"></i>
                <h4>Produk tidak ditemukan</h4>
                <p>Coba kata kunci lain untuk pencarian produk.</p>
            </div>
        `;
    } else {
        gridContainer.appendChild(gridDiv);
    }
}

// --- PRODUK DETAIL MODAL ---
let currentDetailUmkmId = null;
let currentDetailProdIdx = null;

window.showProductDetail = function(umkmId, prodIndex) {
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm || !umkm.products || !umkm.products[prodIndex]) return;

    const prod = umkm.products[prodIndex];
    currentDetailUmkmId = umkmId;
    currentDetailProdIdx = prodIndex;

    const images = (prod.image || '').split('|||').filter(s => s && s.trim());
    if (images.length === 0) {
        images.push("https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400");
    }
    const mainImg = images[0];

    let thumbnailsHtml = '';
    images.forEach((img, i) => {
        thumbnailsHtml += `
            <div class="detail-thumb ${i === 0 ? 'active' : ''}" data-src="${img}">
                <img src="${img}" alt="Thumb ${i + 1}" onerror="this.src='https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=100'">
            </div>
        `;
    });

    const contentHtml = `
        <div class="product-detail-wrapper">
            <div class="product-detail-gallery">
                <div class="detail-main-img">
                    <img id="detailMainImg" src="${mainImg}" alt="${sanitizeHTML(prod.name)}" onerror="this.src='https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=400'">
                </div>
                ${thumbnailsHtml ? `<div class="detail-thumbnails">${thumbnailsHtml}</div>` : ''}
            </div>
            <div class="product-detail-info">
                <div class="detail-info-card full">
                    <div class="detail-info-label"><i class="fas fa-tag"></i> Nama Produk</div>
                    <div class="detail-info-value">${sanitizeHTML(prod.name)}</div>
                </div>
                <div class="detail-info-card">
                    <div class="detail-info-label"><i class="fas fa-coins"></i> Harga</div>
                    <div class="detail-info-value price">Rp ${Number(prod.price || 0).toLocaleString('id-ID')}</div>
                </div>
                <div class="detail-info-card">
                    <div class="detail-info-label"><i class="fas fa-store"></i> Toko / UMKM</div>
                    <div class="detail-info-value">${sanitizeHTML(umkm.name)} <small style="color:#94a3b8;">(${sanitizeHTML(umkm.owner)})</small></div>
                </div>
                <div class="detail-info-card">
                    <div class="detail-info-label"><i class="fas fa-images"></i> Jumlah Foto</div>
                    <div class="detail-info-value">${images.length} foto produk</div>
                </div>
                <div class="detail-info-card">
                    <div class="detail-info-label"><i class="fas fa-map-marker-alt"></i> Lokasi Toko</div>
                    <div class="detail-info-value">${sanitizeHTML(umkm.location)}</div>
                </div>
                <div class="detail-info-card full">
                    <div class="detail-info-label"><i class="fas fa-align-left"></i> Deskripsi Produk</div>
                    ${prod.desc ? 
                        `<div class="detail-desc-text">${sanitizeHTML(prod.desc)}</div>` : 
                        `<div class="detail-no-desc">Tidak ada deskripsi produk.</div>`
                    }
                </div>
            </div>
        </div>
    `;

    document.getElementById('productDetailContent').innerHTML = contentHtml;
    document.getElementById('productDetailTitle').textContent = `Detail: ${prod.name}`;

    // Gallery interaksi - klik thumbnail ganti gambar utama
    document.querySelectorAll('.detail-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            const src = thumb.getAttribute('data-src');
            const main = document.getElementById('detailMainImg');
            if (main) main.src = src;
            document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    const modal = document.getElementById('productDetailModal');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
};

window.closeProductDetailModal = function() {
    const modal = document.getElementById('productDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        if (document.getElementById('productModal').classList.contains('hidden')) {
            document.body.classList.remove('modal-open');
        }
    }
    currentDetailUmkmId = null;
    currentDetailProdIdx = null;
};

// Event listeners untuk product detail modal
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeProductDetailModalBtn');
    const closeBottomBtn = document.getElementById('closeDetailBottomBtn');
    const editBtn = document.getElementById('editFromDetailBtn');
    const modal = document.getElementById('productDetailModal');

    if (closeBtn) closeBtn.addEventListener('click', window.closeProductDetailModal);
    if (closeBottomBtn) closeBottomBtn.addEventListener('click', window.closeProductDetailModal);
    if (editBtn) editBtn.addEventListener('click', () => {
        if (currentDetailUmkmId !== null && currentDetailProdIdx !== null) {
            window.closeProductDetailModal();
            setTimeout(() => {
                editProduct(currentDetailUmkmId, currentDetailProdIdx);
            }, 150);
        }
    });
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeProductDetailModal();
        });
    }
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const umkmId = document.getElementById('activeUmkmIdForProduct').value;
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm) return;

    const activeProdIndex = document.getElementById('activeProdIndex').value;
    // Jika mode edit dan user tidak upload gambar baru, gunakan gambar lama
    let finalImage = document.getElementById('prodImage').value;
    if (activeProdIndex !== "" && !finalImage) {
        const existingProd = umkm.products[activeProdIndex];
        if (existingProd && existingProd.image) {
            finalImage = existingProd.image;
        }
    }
    if (!finalImage) {
        finalImage = "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=300";
    }

    const newProduct = {
        name: sanitizeHTML(document.getElementById('prodName').value),
        price: parseInt(document.getElementById('prodPrice').value) || 0,
        desc: sanitizeHTML(document.getElementById('prodDesc').value),
        image: finalImage
    };

    if (activeProdIndex !== "") {
        // Mode Update
        umkm.products[activeProdIndex] = newProduct;
    } else {
        // Mode Tambah Baru
        if (!umkm.products) umkm.products = [];
        umkm.products.push(newProduct);
    }

    const saveBtn = document.getElementById('saveProductBtn');
    const oriText = saveBtn.innerHTML;
    saveBtn.innerHTML = "Menyimpan...";
    saveBtn.disabled = true;

    const success = await saveToDatabase(umkmId, umkm);
    if (success) {
        showToast(activeProdIndex !== "" ? "Produk berhasil diupdate!" : "Produk berhasil ditambahkan!");
        productForm.reset();
        document.getElementById('prodImage').value = '';
        document.getElementById('prodImagePreviewsContainer').innerHTML = ''; // Clear previews
        document.getElementById('activeProdIndex').value = '';
        document.getElementById('productFormTitle').textContent = 'Tambah Produk Baru';
        saveBtn.innerHTML = '<i class="fas fa-plus"></i> Simpan Produk';
        document.getElementById('prodImageFile').required = true; // Reset required ke true untuk tambah baru
        renderProductGrid(umkmId);
        renderTable(); // Update counter produk di tabel depan
    } else {
        saveBtn.innerHTML = oriText;
    }
    saveBtn.disabled = false;
});

window.editProduct = function (umkmId, prodIndex) {
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm || !umkm.products || !umkm.products[prodIndex]) return;

    const prod = umkm.products[prodIndex];

    document.getElementById('activeProdIndex').value = prodIndex;
    document.getElementById('productFormTitle').textContent = 'Update Produk';
    document.getElementById('saveProductBtn').innerHTML = '<i class="fas fa-save"></i> Update Produk';

    document.getElementById('prodName').value = prod.name;
    document.getElementById('prodPrice').value = prod.price;
    document.getElementById('prodDesc').value = prod.desc || '';

    // Set field input file menjadi tidak required jika sedang edit (karena mungkin gambar tidak diubah)
    document.getElementById('prodImageFile').required = false;

    document.getElementById('prodImage').value = prod.image || '';
    renderProdImagePreviews(prod.image || '');

    // Scroll ke form agar user langsung lihat form edit
    const prodForm = document.getElementById('productForm');
    if (prodForm) {
        prodForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.deleteProduct = function (umkmId, prodIndex) {
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm || !umkm.products) return;
    const prodName = umkm.products[prodIndex]?.name || 'produk ini';

    showDeleteConfirm(`Apakah Anda yakin ingin menghapus produk "${prodName}"? Tindakan ini tidak dapat dibatalkan.`, async () => {
        umkm.products.splice(prodIndex, 1);
        const success = await saveToDatabase(umkmId, umkm);
        if (success) {
            showToast("Produk berhasil dihapus!");
            renderProductGrid(umkmId);
            renderTable(); // Update counter
        }
    });
};

// Inisialisasi awal
fetchUMKMData();

// --- LOGIKA DASHBOARD & TABS ---
window.switchAdminTab = function (tabId) {
    sessionStorage.setItem('activeAdminTab', tabId);

    const dashboardTab = document.getElementById('dashboardTab');
    const umkmTab = document.getElementById('umkmTab');
    const tentangTab = document.getElementById('tentangTab');
    const penggunaTab = document.getElementById('penggunaTab');
    const pengaturanTab = document.getElementById('pengaturanTab');
    const navPengguna = document.getElementById('navPengguna');
    const navPengaturan = document.getElementById('navPengaturan');
    const navDashboard = document.getElementById('navDashboard');
    const navUmkm = document.getElementById('navUmkm');
    const navTentang = document.getElementById('navTentang');

    // Hide all
    if (dashboardTab) dashboardTab.classList.add('hidden');
    if (umkmTab) umkmTab.classList.add('hidden');
    if (tentangTab) tentangTab.classList.add('hidden');
    if (penggunaTab) penggunaTab.classList.add('hidden');
    if (pengaturanTab) pengaturanTab.classList.add('hidden');
    if (navPengguna) navPengguna.classList.remove('active');
    if (navPengaturan) navPengaturan.classList.remove('active');
    if (navDashboard) navDashboard.classList.remove('active');
    if (navUmkm) navUmkm.classList.remove('active');
    if (navTentang) navTentang.classList.remove('active');

    if (tabId === 'dashboard') {
        if (dashboardTab) dashboardTab.classList.remove('hidden');
        if (navDashboard) navDashboard.classList.add('active');
        updateDashboardStats(); // Refresh stats saat buka tab
    } else if (tabId === 'umkm') {
        if (umkmTab) umkmTab.classList.remove('hidden');
        if (navUmkm) navUmkm.classList.add('active');
    } else if (tabId === 'tentang') {
        if (tentangTab) tentangTab.classList.remove('hidden');
        if (navTentang) navTentang.classList.add('active');
    } else if (tabId === 'pengguna') {
        if (penggunaTab) penggunaTab.classList.remove('hidden');
        if (navPengguna) navPengguna.classList.add('active');
        if (typeof window.renderUserManagementTable === 'function') window.renderUserManagementTable();
    } else if (tabId === 'pengaturan') {
        if (pengaturanTab) pengaturanTab.classList.remove('hidden');
        if (navPengaturan) navPengaturan.classList.add('active');
    }
}

function updateDashboardStats() {
    const statsContainer = document.getElementById('dashboardStatsContainer');
    const chartContainer = document.getElementById('dashboardCategoryContainer');

    if (!statsContainer || !chartContainer) return;

    let totalUmkm = umkmData.length;
    let totalProducts = 0;
    const categoryCounts = {};

    umkmData.forEach(u => {
        totalProducts += (u.products ? u.products.length : 0);
        const cat = u.category || 'Lainnya';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Menemukan kategori terpopuler
    let topCategory = "-";
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topCategory = cat;
        }
    }

    // Render Kartu Statistik
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon blue"><i class="fas fa-store"></i></div>
            <div class="stat-info">
                <h3>${totalUmkm}</h3>
                <p>Total UMKM</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green"><i class="fas fa-box-open"></i></div>
            <div class="stat-info">
                <h3>${totalProducts}</h3>
                <p>Total Produk</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon orange"><i class="fas fa-layer-group"></i></div>
            <div class="stat-info">
                <h3>${Object.keys(categoryCounts).length}</h3>
                <p>Total Kategori</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon purple"><i class="fas fa-star"></i></div>
            <div class="stat-info">
                <h3>${topCategory}</h3>
                <p>Kategori Terbanyak</p>
            </div>
        </div>
    `;

    // Render Daftar Kategori
    let categoryHtml = `<h3><i class="fas fa-chart-pie"></i> Distribusi Kategori UMKM</h3><ul class="category-list">`;
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

    if (sortedCategories.length === 0) {
        categoryHtml += `<li><span class="cat-name">Belum ada data</span></li>`;
    } else {
        sortedCategories.forEach(([cat, count]) => {
            categoryHtml += `
                <li>
                    <span class="cat-name">${cat}</span>
                    <span class="cat-count">${count} Toko</span>
                </li>
            `;
        });
    }
    categoryHtml += `</ul>`;
    chartContainer.innerHTML = categoryHtml;
}



// --- ADMIN SECURITY & ENCRYPTED CREDENTIALS ENGINE ---
// --- CUSTOM ADMIN NOTIFICATION POPUP ENGINE (Pengganti alert() browser) ---
// Fungsi utama: window.showAdminNotification(options)
// Contoh: showAdminNotification({ type: 'error', title: 'Gagal', message: 'Password lama salah!' })
(function initAdminNotificationEngine() {
    const VARIANT_CONFIG = {
        success: {
            icon: 'fa-check-circle',
            title: 'Berhasil',
        },
        error: {
            icon: 'fa-times-circle',
            title: 'Terjadi Kesalahan',
        },
        info: {
            icon: 'fa-info-circle',
            title: 'Informasi',
        },
        warning: {
            icon: 'fa-exclamation-triangle',
            title: 'Perhatian',
        }
    };

    // Global state untuk resolve callback
    let currentResolver = null;

    // Utility: tutup popup
    function closeNotification() {
        const overlay = document.getElementById('adminNotificationModal');
        if (!overlay) return;
        overlay.classList.add('hidden');
        // Bersihkan variant class
        const card = document.getElementById('adminNotifCard');
        if (card) card.className = 'admin-notif-card';
        if (typeof currentResolver === 'function') {
            const cb = currentResolver;
            currentResolver = null;
            try { cb(); } catch (e) {}
        }
    }

    // Fungsi Publik: tampilkan notifikasi
    window.showAdminNotification = function showAdminNotification(opts) {
        if (typeof opts === 'string') opts = { message: opts };
        const type = (opts.type && VARIANT_CONFIG[opts.type]) ? opts.type : 'info';
        const cfg = VARIANT_CONFIG[type];
        const message = opts.message || '';
        const title = opts.title || cfg.title;
        const okText = opts.okText || 'OK';

        const overlay = document.getElementById('adminNotificationModal');
        const card = document.getElementById('adminNotifCard');
        const iconEl = document.getElementById('adminNotifIcon');
        const titleEl = document.getElementById('adminNotifTitle');
        const msgEl = document.getElementById('adminNotifMsg');
        const okBtn = document.getElementById('adminNotifOkBtn');

        if (!overlay || !card) {
            alert('[AdminNotification DOM not found] fallback ke browser alert');
            alert(title + '\n\n' + message);
            return Promise.resolve();
        }

        // Set variant class
        card.className = 'admin-notif-card variant-' + type;
        // Set icon
        if (iconEl) {
            iconEl.className = 'fas ' + cfg.icon + ' admin-notif-icon';
        }
        // Set judul & pesan
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        // Set tombol OK text
        if (okBtn) {
            const span = okBtn.querySelector('span');
            if (span) span.textContent = okText;
        }

        // Show
        overlay.classList.remove('hidden');
        setTimeout(() => { if (okBtn) okBtn.focus(); }, 50);

        // Return promise agar caller bisa menunggu sampai user klik OK
        return new Promise((resolve) => {
            currentResolver = resolve;
        });
    };

    // --- Bind events hanya sekali saat startup via DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('adminNotificationModal');
        const okBtn = document.getElementById('adminNotifOkBtn');
        if (okBtn) okBtn.addEventListener('click', closeNotification);
        if (overlay) overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeNotification();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
                closeNotification();
            }
        });
    });
})();

// --- ADMIN SECURITY & HASHED CREDENTIALS ENGINE (REALTIME FIREBASE SYNC) ---
const DEFAULT_ADMIN_USER = "padukuhankaranganyar";
const DEFAULT_ADMIN_EMAIL = "admin.karanganyar@gmail.com";
const DEFAULT_ADMIN_PASS_HASH = "f18fef9fd23a8d4381ce117562d867f69d16df93d2d2404cc1db0a39f73dd26f"; // SHA-256("Admin2026")
const ADMIN_CREDENTIALS_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/admin_credentials.json";

async function sha256Hex(value) {
    const data = new TextEncoder().encode(String(value || ''));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function normalizeAdminCredentials(rawData) {
    const fallback = {
        user: DEFAULT_ADMIN_USER,
        passHash: DEFAULT_ADMIN_PASS_HASH,
        email: DEFAULT_ADMIN_EMAIL,
        updatedAt: null,
        version: 2
    };

    if (!rawData || typeof rawData !== 'object') return fallback;

    const normalized = {
        user: String(rawData.user || fallback.user),
        passHash: '',
        email: String(rawData.email || fallback.email),
        updatedAt: rawData.updatedAt || null,
        version: rawData.version || 2
    };

    if (rawData.passHash) {
        normalized.passHash = String(rawData.passHash);
        return normalized;
    }

    // Migrasi otomatis dari password plaintext lama ke hash
    if (rawData.pass) {
        normalized.passHash = await sha256Hex(String(rawData.pass));
        return normalized;
    }

    return fallback;
}

async function getStoredAdminCredentials() {
    try {
        const response = await fetch(ADMIN_CREDENTIALS_URL, { cache: 'no-store' });
        const data = await response.json();
        const creds = await normalizeAdminCredentials(data);

        // Upgrade record lama yang masih plaintext menjadi hash
        if (data && data.pass && !data.passHash) {
            await saveAdminCredentials(creds.user, null, creds.email, creds.passHash);
        }

        return creds;
    } catch (e) {
        console.warn("Gagal memuat kredensial admin dari Firebase, gunakan fallback aman:", e);
        return {
            user: DEFAULT_ADMIN_USER,
            passHash: DEFAULT_ADMIN_PASS_HASH,
            email: DEFAULT_ADMIN_EMAIL,
            updatedAt: null,
            version: 2
        };
    }
}

async function saveAdminCredentials(user, plainPass, email, passHashOverride) {
    const nextPassHash = passHashOverride || await sha256Hex(plainPass);
    const creds = {
        user: String(user || DEFAULT_ADMIN_USER).trim(),
        passHash: nextPassHash,
        email: email || DEFAULT_ADMIN_EMAIL,
        updatedAt: new Date().toISOString(),
        version: 2
    };
    try {
        await fetch(ADMIN_CREDENTIALS_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });
    } catch (e) {
        console.error("Gagal menyimpan kredensial ke Firebase Database:", e);
    }
}

function isSessionLocked() {
    const token = sessionStorage.getItem('umkm_admin_session_token');
    const sessionLoggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true';
    return !token || !sessionLoggedIn;
}

window.refreshProfilDesaEditorIframe = function () {
    const ok = sessionStorage.getItem('isAdminLoggedIn') === 'true' && !!sessionStorage.getItem('umkm_admin_session_token');
    if (!ok) return;
    const aboutIframe = document.querySelector('#tentangTab iframe');
    if (!aboutIframe) return;
    try {
        const baseSrc = '../index.html?mode=admin';
        aboutIframe.src = baseSrc + '&ts=' + Date.now();
    } catch (_) { }
};

window.handleLogoutAdmin = function () {
    sessionStorage.removeItem('umkm_admin_session_token');
    sessionStorage.removeItem('isAdminLoggedIn');
    window.location.replace('../index.html#tentang');
};

window.lockAdminSession = function () {
    const loginOverlay = document.getElementById('loginOverlay');
    const mainAdminContainer = document.getElementById('mainAdminContainer');
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (mainAdminContainer) mainAdminContainer.classList.add('hidden');
};

// Check session lock on startup
document.addEventListener('DOMContentLoaded', async () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const mainAdminContainer = document.getElementById('mainAdminContainer');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (isSessionLocked()) {
        window.lockAdminSession();
    } else {
        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (mainAdminContainer) mainAdminContainer.classList.remove('hidden');
        if (typeof window.refreshProfilDesaEditorIframe === 'function') window.refreshProfilDesaEditorIframe();
    }

    // Pre-fetch live admin credentials from Firebase
    getStoredAdminCredentials();

    // Attach Login Listener
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const inputUser = document.getElementById('loginUser').value.trim();
            const inputPass = document.getElementById('loginPass').value.trim();
            const currentCreds = await getStoredAdminCredentials();
            const inputPassHash = await sha256Hex(inputPass);

            // HANYA izinkan username sesuai yang tersimpan terbaru di Firebase
            const isAdminUserMatch = (inputUser.toLowerCase() === currentCreds.user.toLowerCase());
            const isAdminPassMatch = (inputPassHash === currentCreds.passHash);

            if (isAdminUserMatch && isAdminPassMatch) {
                const token = 'admin_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('umkm_admin_session_token', token);
                sessionStorage.setItem('isAdminLoggedIn', 'true');

                if (loginError) loginError.classList.add('hidden');
                // Animasi fade out seperti handler yang lama
                if (loginOverlay) {
                    loginOverlay.style.transition = 'opacity 0.4s ease';
                    loginOverlay.style.opacity = '0';
                    setTimeout(() => {
                        loginOverlay.classList.add('hidden');
                        loginOverlay.style.opacity = '';
                    }, 420);
                }
                if (mainAdminContainer) mainAdminContainer.classList.remove('hidden');
                if (typeof window.refreshProfilDesaEditorIframe === 'function') window.refreshProfilDesaEditorIframe();
                // Re-trigger layout untuk menghindari bug render
                setTimeout(() => window.dispatchEvent(new Event('resize')), 450);
            } else {
                if (loginError) loginError.classList.remove('hidden');
                // Getarkan form sedikit (efek error)
                if (loginForm) {
                    loginForm.style.transition = 'transform 0.08s linear';
                    loginForm.style.transform = 'translateX(5px)';
                    setTimeout(() => loginForm.style.transform = 'translateX(-5px)', 100);
                    setTimeout(() => loginForm.style.transform = 'translateX(5px)', 200);
                    setTimeout(() => {
                        loginForm.style.transform = 'translateX(0)';
                        loginForm.style.transition = '';
                    }, 320);
                }
            }
        };
    }

    // Attach Logout Listeners
    const logoutBtn1 = document.getElementById('sidebarLogoutBtn');
    const logoutBtn2 = document.getElementById('topHeaderLogoutBtn');
    if (logoutBtn1) logoutBtn1.onclick = window.handleLogoutAdmin;
    if (logoutBtn2) logoutBtn2.onclick = window.handleLogoutAdmin;

    // Attach Settings Form
    const adminCredsForm = document.getElementById('adminCredentialsForm');
    if (adminCredsForm) {
        getStoredAdminCredentials().then(currentCreds => {
            const settingAdminUser = document.getElementById('settingAdminUser');
            if (settingAdminUser) settingAdminUser.value = currentCreds.user;
        });

        adminCredsForm.onsubmit = async (e) => {
            e.preventDefault();
            const currentCreds = await getStoredAdminCredentials();
            const userVal = document.getElementById('settingAdminUser').value.trim();
            const oldPassVal = document.getElementById('settingOldPass').value.trim();
            const newPassVal = document.getElementById('settingNewPass').value.trim();
            const confirmPassVal = document.getElementById('settingConfirmPass').value.trim();
            const oldPassHash = await sha256Hex(oldPassVal);

            // Verifikasi password lama terhadap hash yang tersimpan
            if (oldPassHash !== currentCreds.passHash) {
                await showAdminNotification({
                    type: 'error',
                    title: 'Password Lama Salah',
                    message: 'Password lama yang Anda masukkan tidak sesuai. Silakan coba lagi.'
                });
                return;
            }
            if (newPassVal.length < 6) {
                await showAdminNotification({
                    type: 'warning',
                    title: 'Password Terlalu Pendek',
                    message: 'Password baru harus minimal 6 karakter.'
                });
                return;
            }
            if (newPassVal !== confirmPassVal) {
                await showAdminNotification({
                    type: 'error',
                    title: 'Konfirmasi Password Tidak Cocok',
                    message: 'Kolom "Password Baru" dan "Konfirmasi Password Baru" harus sama persis.'
                });
                return;
            }

            const submitBtn = adminCredsForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;

            await saveAdminCredentials(userVal, newPassVal, currentCreds.email || DEFAULT_ADMIN_EMAIL);
            await showAdminNotification({
                type: 'success',
                title: 'Kredensial Berhasil Diperbarui!',
                message: 'Username dan password admin baru telah tersimpan ke Database Firebase.\nUntuk keamanan, silakan logout lalu login kembali menggunakan kredensial yang baru.',
                okText: 'Saya Mengerti'
            });
            
            if (submitBtn) submitBtn.disabled = false;
            document.getElementById('settingOldPass').value = '';
            document.getElementById('settingNewPass').value = '';
            document.getElementById('settingConfirmPass').value = '';
        };
    }
});

// --- USER MANAGEMENT ENGINE (REALTIME REGISTERED USERS) ---
// --- USER MANAGEMENT ENGINE WITH REALTIME FIREBASE SYNC ---
// --- USER MANAGEMENT ENGINE WITH REALTIME FIREBASE SYNC ---
window.renderUserManagementTable = async function (searchQuery = '') {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    let users = [];

    // Fetch live users from Firebase Realtime Database
    try {
        const response = await fetch('https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users.json');
        const firebaseUsers = await response.json();
        if (firebaseUsers && Object.keys(firebaseUsers).length > 0) {
            users = Object.keys(firebaseUsers).map(uid => ({
                ...firebaseUsers[uid],
                uid: uid
            }));
            localStorage.setItem('umkm_users', JSON.stringify(users));
        }
    } catch (e) {
        console.warn("Using offline user storage:", e);
    }

    // Fallback to initial seed if empty
    if (users.length === 0) {
        const initialUsers = [
            { uid: "2j8URxly2ENDMMccWO7yzAu", email: "kelsinkipors@gmail.com", displayName: "Kelsinki Pors", isGoogle: true, providerId: "google.com", createdAt: 1784697600000 },
            { uid: "qqrGyw1djLRctl7z2vntdDXIR9", email: "otnilchristofer@gmail.com", displayName: "otnil", isGoogle: false, providerId: "password", createdAt: 1784697600000 },
            { uid: "vv6Kfy3xr9MNcWPko7IpbQW", email: "arielhebronjuntak@gmail.com", displayName: "Ariel", isGoogle: true, providerId: "google.com", createdAt: 1784697600000 }
        ];
        users = initialUsers;
        localStorage.setItem('umkm_users', JSON.stringify(users));

        // Push initial seed to Firebase Database
        try {
            await fetch('https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "2j8URxly2ENDMMccWO7yzAu": initialUsers[0],
                    "qqrGyw1djLRctl7z2vntdDXIR9": initialUsers[1],
                    "vv6Kfy3xr9MNcWPko7IpbQW": initialUsers[2]
                })
            });
        } catch (err) { }
    }

    const statTotal = document.getElementById('statTotalUsers');
    const statManual = document.getElementById('statManualUsers');
    const statGoogle = document.getElementById('statGoogleUsers');

    const totalCount = users.length;
    const googleCount = users.filter(u => u.isGoogle === true || u.providerId === 'google.com' || u.email === 'kelsinkipors@gmail.com' || u.email === 'arielhebronjuntak@gmail.com').length;
    const manualCount = totalCount - googleCount;

    if (statTotal) statTotal.textContent = totalCount;
    if (statManual) statManual.textContent = manualCount;
    if (statGoogle) statGoogle.textContent = googleCount;

    let filtered = users;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = users.filter(u =>
            (u.displayName && u.displayName.toLowerCase().includes(q)) ||
            (u.username && u.username.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada data pengguna terdaftar ditemukan.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach((u, i) => {
        const tr = document.createElement('tr');
        const isGoogleUser = u.isGoogle === true || u.providerId === 'google.com' || u.email === 'kelsinkipors@gmail.com' || u.email === 'arielhebronjuntak@gmail.com';
        const avatarUrl = u.photoURL || ('https://api.dicebear.com/7.x/micah/svg?seed=' + encodeURIComponent(u.email || u.uid));
        const safeAvatarUrl = /^https?:\/\//i.test(String(avatarUrl || '')) ? avatarUrl : ('https://api.dicebear.com/7.x/micah/svg?seed=' + encodeURIComponent(u.email || u.uid));

        const methodBadge = isGoogleUser ?
            '<span style="background:#fef3c7; color:#d97706; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.78rem; display:inline-flex; align-items:center; gap:5px;"><i class="fab fa-google"></i> Google</span>' :
            '<span style="background:#f0fdf4; color:#16a34a; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.78rem; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-envelope"></i> Manual</span>';

        tr.innerHTML = `
            <td><img src="${safeAvatarUrl}" alt="Foto pengguna ${sanitizeHTML(u.displayName || u.username || 'Pengguna')}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid #e2e8f0;"></td>
            <td><b>${sanitizeHTML(u.displayName || u.username || 'Pengguna')}</b></td>
            <td>${sanitizeHTML(u.email || '-')}</td>
            <td>${methodBadge}</td>
            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : 'Terdaftar'}</td>
            <td><span style="color:#16a34a; font-weight:700; font-size:0.85rem;"><i class="fas fa-check-circle"></i> Aktif</span></td>
            <td>
                <button type="button" class="btn-show-detail" data-userid="${sanitizeHTML(u.uid || u.email)}" style="background:#e0f2fe; color:#0284c7; border:1px solid #7dd3fc; padding:6px 16px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.82rem; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease;">
                    <i class="fas fa-eye"></i> Detail
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.deleteUserFromAdmin = async function (userIdentifier) {
    if (!userIdentifier) return;

    if (confirm("Apakah Anda yakin ingin menghapus akun pengguna ini dari database?")) {
        try {
            // 1. Delete from Firebase Realtime Database REST API
            await fetch(`https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users/${userIdentifier}.json`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.warn("REST delete error:", e);
        }

        // 2. Delete from Firebase SDK if available
        if (typeof firebase !== 'undefined' && firebase.database) {
            try { firebase.database().ref('users/' + userIdentifier).remove(); } catch (e) { }
        }

        // 3. Delete from LocalStorage
        let users = [];
        const localUsers = localStorage.getItem('umkm_users');
        if (localUsers) {
            try { users = JSON.parse(localUsers); } catch (e) { }
        }
        users = users.filter(u => u.uid !== userIdentifier && u.email !== userIdentifier);
        localStorage.setItem('umkm_users', JSON.stringify(users));

        // 4. Remove User Scoped Data (Cart, Wishlist, Biodata)
        localStorage.removeItem('umkm_cart_' + userIdentifier);
        localStorage.removeItem('umkm_wishlist_' + userIdentifier);
        localStorage.removeItem('umkm_biodata_' + userIdentifier);

        // 5. Re-render Table
        await window.renderUserManagementTable();
        await showAdminNotification({
            type: 'success',
            title: 'Pengguna Berhasil Dihapus',
            message: 'Akun pengguna beserta seluruh data profilnya telah dihapus secara permanen dari Database Firebase.'
        });
    }
};

// ==========================================
// KELOLA TAB DASHBOARD ADMIN & BERITA
// ==========================================
window.switchAdminTab = function(tabId) {
    const tabs = ['dashboard', 'umkm', 'berita', 'tentang', 'pengguna', 'pengaturan'];
    const tabTitles = {
        'dashboard': 'Dasbor Karanganyar',
        'umkm': 'Kelola Data UMKM',
        'berita': 'Kelola Berita & Publikasi',
        'tentang': 'Kelola Profil Desa',
        'pengguna': 'Kelola Data Pengguna',
        'pengaturan': 'Pengaturan Sistem'
    };

    // Update Header Title
    const headerTitle = document.getElementById('adminHeaderTitle');
    if (headerTitle && tabTitles[tabId]) {
        headerTitle.textContent = tabTitles[tabId];
    }
    
    // Hide all tab panes & remove active nav state
    tabs.forEach(t => {
        const pane = document.getElementById(t + 'Tab');
        const nav = document.getElementById('nav' + t.charAt(0).toUpperCase() + t.slice(1));
        if (pane) pane.classList.add('hidden');
        if (nav) nav.classList.remove('active');
    });

    // Show active tab pane & activate nav
    const activePane = document.getElementById(tabId + 'Tab');
    const activeNav = document.getElementById('nav' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activePane) activePane.classList.remove('hidden');
    if (activeNav) activeNav.classList.add('active');

    if (tabId === 'tentang' && typeof window.refreshProfilDesaEditorIframe === 'function') {
        window.refreshProfilDesaEditorIframe();
    }

    // Trigger tab specific fetches
    if (tabId === 'berita' && typeof window.fetchBeritaData === 'function') {
        window.fetchBeritaData();
    } else if (tabId === 'pengguna' && typeof window.renderUserManagementTable === 'function') {
        window.renderUserManagementTable();
    } else if (tabId === 'dashboard' && typeof window.updateDashboardStats === 'function') {
        window.updateDashboardStats();
    }
};

window.updateDashboardStats = async function() {
    try {
        // Fetch UMKM Count
        const umkmRes = await fetch("https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/umkmData.json");
        const umkmData = await umkmRes.json();
        const umkmCount = umkmData ? Object.keys(umkmData).length : 0;
        document.getElementById('dashTotalUmkm').textContent = umkmCount;

        // Fetch Berita Count
        const beritaRes = await fetch("https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/beritaData.json");
        const beritaData = await beritaRes.json();
        const beritaCount = beritaData ? Object.keys(beritaData).length : 0;
        document.getElementById('dashTotalBerita').textContent = beritaCount;

        // Fetch Users Count
        const usersRes = await fetch("https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users.json");
        const usersData = await usersRes.json();
        const usersCount = usersData ? Object.keys(usersData).length : 0;
        document.getElementById('dashTotalUsers').textContent = usersCount;

        // Populate Categories
        const catList = document.getElementById('dashboardCategoryList');
        if (catList && umkmData) {
            const categories = {};
            Object.values(umkmData).forEach(u => {
                categories[u.category] = (categories[u.category] || 0) + 1;
            });
            const catMap = {
                'makanan': 'Makanan & Minuman',
                'kerajinan': 'Kerajinan & Meubel',
                'kebutuhan': 'Kebutuhan Harian',
                'pertanian': 'Pertanian & Sayur',
                'jasa': 'Jasa Warga'
            };
            catList.innerHTML = '<ul class="category-list">' + Object.entries(categories).map(([key, val]) => `
                <li>
                    <span class="cat-name">${catMap[key] || key}</span>
                    <span class="cat-count">${val}</span>
                </li>
            `).join('') + '</ul>';
        } else if (catList) {
            catList.innerHTML = '<p style="text-align:center; padding: 20px; color:#64748b;">Belum ada data UMKM.</p>';
        }
    } catch (e) {
        console.error("Dashboard Stats Error:", e);
    }
};

// Initial Call
document.addEventListener('DOMContentLoaded', () => {
    if(typeof window.updateDashboardStats === 'function') {
        window.updateDashboardStats();
    }
});
// ==========================================
// KELOLA DATA BERITA DESA ADMIN (REST & FIREBASE)
// ==========================================
const BERITA_DATABASE_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/beritaData.json";
const BERITA_DB_BASE_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/beritaData";
let beritaData = [];

function formatBeritaDate(date) {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function sanitizeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

window.fetchBeritaData = async function() {
    const beritaTableBody = document.getElementById('beritaTableBody');
    try {
        const response = await fetch(BERITA_DATABASE_URL);
        const data = await response.json();
        beritaData = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
        beritaData.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
        renderBeritaTable();
    } catch (error) {
        console.error('Error fetching berita:', error);
        if (beritaTableBody) beritaTableBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:red; padding: 20px;">Gagal memuat data berita.</td></tr>';
    }
};

function renderBeritaTable() {
    const beritaTableBody = document.getElementById('beritaTableBody');
    if (!beritaTableBody) return;
    if (!beritaData.length) {
        beritaTableBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 20px;">Belum ada berita dipublikasikan.</td></tr>';
        return;
    }
    beritaTableBody.innerHTML = beritaData.map((berita, index) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 14px 16px; font-weight: 700; text-align: center;">${index + 1}</td>
            <td style="padding: 14px 16px; font-weight: 700; color: #0f172a;">${sanitizeHTML(berita.judul)}</td>
            <td style="padding: 14px 16px; color: #64748b; white-space: nowrap;">${sanitizeHTML(berita.tanggal)}</td>
            <td style="padding: 14px 16px; text-align: center; white-space: nowrap;">
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <button class="btn-edit" onclick="editBerita('${berita.id}')" title="Edit Berita" style="background:#e0f2fe; color:#0284c7; border:1px solid #7dd3fc; padding:6px 14px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.82rem;"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-delete" onclick="deleteBerita('${berita.id}')" title="Hapus Berita" style="background:#fef2f2; color:#ef4444; border:1px solid #fca5a5; padding:6px 14px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.82rem;"><i class="fas fa-trash"></i> Hapus</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function setBeritaImagePreview(previewId, imageValue) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (imageValue) {
        preview.src = imageValue;
        preview.style.display = 'block';
    } else {
        preview.removeAttribute('src');
        preview.style.display = 'none';
    }
}

window.openBeritaModal = function() {
    const beritaForm = document.getElementById('beritaForm');
    const beritaModal = document.getElementById('beritaModal');
    if (beritaForm) beritaForm.reset();
    document.getElementById('beritaId').value = '';
    document.getElementById('beritaModalTitle').textContent = 'Tambah Berita Baru';
    document.getElementById('beritaSubmitBtn').textContent = 'Simpan Berita';
    document.getElementById('beritaTanggal').value = formatBeritaDate(new Date());
    document.getElementById('beritaFotoUtama').value = '';
    document.getElementById('beritaFotoIsi').value = '';
    setBeritaImagePreview('beritaFotoUtamaPreview', '');
    setBeritaImagePreview('beritaFotoIsiPreview', '');
    if (beritaModal) {
        beritaModal.classList.remove('hidden');
        beritaModal.style.display = 'flex';
    }
};

window.closeBeritaModal = function() {
    const beritaForm = document.getElementById('beritaForm');
    const beritaModal = document.getElementById('beritaModal');
    if (beritaModal) {
        beritaModal.classList.add('hidden');
        beritaModal.style.display = 'none';
    }
    if (beritaForm) beritaForm.reset();
    document.getElementById('beritaId').value = '';
    document.getElementById('beritaFotoUtama').value = '';
    document.getElementById('beritaFotoIsi').value = '';
    setBeritaImagePreview('beritaFotoUtamaPreview', '');
    setBeritaImagePreview('beritaFotoIsiPreview', '');
};

window.editBerita = function(id) {
    const berita = beritaData.find(item => item.id === id);
    const beritaModal = document.getElementById('beritaModal');
    const beritaForm = document.getElementById('beritaForm');
    if (!berita) return;

    if (beritaForm) beritaForm.reset();
    document.getElementById('beritaId').value = berita.id;
    document.getElementById('beritaModalTitle').textContent = 'Edit Berita Desa';
    document.getElementById('beritaSubmitBtn').textContent = 'Perbarui Berita';
    document.getElementById('beritaJudul').value = berita.judul || '';
    document.getElementById('beritaTanggal').value = berita.tanggal || formatBeritaDate(new Date());
    document.getElementById('beritaDeskripsiAwal').value = berita.deskripsiAwal || '';
    document.getElementById('beritaDeskripsiLanjutan').value = berita.deskripsiLanjutan || '';
    document.getElementById('beritaFotoUtama').value = berita.fotoUtama || '';
    document.getElementById('beritaFotoIsi').value = berita.fotoIsi || '';
    setBeritaImagePreview('beritaFotoUtamaPreview', berita.fotoUtama);
    setBeritaImagePreview('beritaFotoIsiPreview', berita.fotoIsi);
    
    if (beritaModal) {
        beritaModal.classList.remove('hidden');
        beritaModal.style.display = 'flex';
    }
};

window.deleteBerita = async function(id) {
    if (confirm("Apakah Anda yakin ingin menghapus berita ini dari publikasi?")) {
        try {
            const response = await fetch(`${BERITA_DB_BASE_URL}/${id}.json`, { method: 'DELETE' });
            if (response.ok) {
                await showAdminNotification({
                    type: 'success',
                    title: 'Berita Dihapus',
                    message: 'Berita desa telah berhasil dihapus dari publikasi dan Database Firebase.'
                });
                window.fetchBeritaData();
            }
        } catch (e) {
            console.error("Delete berita error:", e);
            await showAdminNotification({
                type: 'error',
                title: 'Gagal Hapus Berita',
                message: 'Berita gagal dihapus dari server. Periksa koneksi dan coba lagi.'
            });
        }
    }
};

// Initialize Admin Berita Form Events
document.addEventListener('DOMContentLoaded', () => {
    const addBeritaBtn = document.getElementById('addBeritaBtn');
    const closeBeritaModalBtn = document.getElementById('closeBeritaModalBtn');
    const cancelBeritaBtn = document.getElementById('cancelBeritaBtn');
    const beritaForm = document.getElementById('beritaForm');

    if (addBeritaBtn) addBeritaBtn.addEventListener('click', window.openBeritaModal);
    if (closeBeritaModalBtn) closeBeritaModalBtn.addEventListener('click', window.closeBeritaModal);
    if (cancelBeritaBtn) cancelBeritaBtn.addEventListener('click', window.closeBeritaModal);

    function compressAndConvertImage(fileInputId, hiddenInputId, previewId) {
        const fileInput = document.getElementById(fileInputId);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    document.getElementById(hiddenInputId).value = base64;
                    setBeritaImagePreview(previewId, base64);
                };
                reader.readAsDataURL(file);
            });
        }
    }

    compressAndConvertImage('beritaFotoUtamaFile', 'beritaFotoUtama', 'beritaFotoUtamaPreview');
    compressAndConvertImage('beritaFotoIsiFile', 'beritaFotoIsi', 'beritaFotoIsiPreview');

    if (beritaForm) {
        beritaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const beritaId = document.getElementById('beritaId').value.trim();
            const isEdit = Boolean(beritaId);
            const existing = isEdit ? beritaData.find(item => item.id === beritaId) : null;
            const now = new Date();

            const fotoUtama = document.getElementById('beritaFotoUtama').value;
            const fotoIsi = document.getElementById('beritaFotoIsi').value;
            if (!fotoUtama) {
                await showAdminNotification({
                    type: 'warning',
                    title: 'Foto Utama Belum Diupload',
                    message: 'Foto utama berita wajib diisi agar berita terlihat menarik di halaman Promo Desa.'
                });
                return;
            }

            const berita = {
                judul: document.getElementById('beritaJudul').value.trim(),
                tanggal: isEdit && existing?.tanggal ? existing.tanggal : formatBeritaDate(now),
                createdAt: isEdit && existing?.createdAt ? existing.createdAt : now.toISOString(),
                deskripsiAwal: document.getElementById('beritaDeskripsiAwal').value.trim(),
                fotoUtama: fotoUtama,
                fotoIsi: fotoIsi || '',
                deskripsiLanjutan: document.getElementById('beritaDeskripsiLanjutan').value.trim()
            };

            const targetId = isEdit ? beritaId : `berita_${Date.now()}`;
            const submitButton = document.getElementById('beritaSubmitBtn');
            if (submitButton) submitButton.disabled = true;

            try {
                const response = await fetch(`${BERITA_DB_BASE_URL}/${targetId}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(berita)
                });
                if (!response.ok) throw new Error('Gagal menyimpan berita');
                window.closeBeritaModal();
                await showAdminNotification({
                    type: 'success',
                    title: isEdit ? 'Berita Berhasil Diperbarui!' : 'Berita Berhasil Ditambahkan!',
                    message: isEdit
                        ? 'Berita desa telah diperbarui dan perubahan telah tersimpan ke Database Firebase.'
                        : 'Berita desa baru telah dipublikasikan dan tersimpan ke Database Firebase.'
                });
                window.fetchBeritaData();
            } catch (error) {
                console.error(error);
                await showAdminNotification({
                    type: 'error',
                    title: isEdit ? 'Gagal Perbarui Berita' : 'Gagal Simpan Berita',
                    message: isEdit
                        ? 'Berita gagal diperbarui ke server. Periksa koneksi dan coba lagi.'
                        : 'Berita gagal disimpan ke server. Periksa koneksi dan coba lagi.'
                });
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }

    // Auto fetch berita on init
    if (typeof window.fetchBeritaData === 'function') {
        window.fetchBeritaData();
    }
});
