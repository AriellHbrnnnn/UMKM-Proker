
// --- GLOBAL USER DETAIL MODAL ENGINE ---
window.closeUserDetailModal = function() {
    const modal = document.getElementById('userDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
    }
};

window.showUserDetailModal = function(userIdentifier) {
    console.log("Showing detail for user:", userIdentifier);
    let users = [];
    const localUsers = localStorage.getItem('umkm_users');
    if (localUsers) {
        try { users = JSON.parse(localUsers); } catch(e) {}
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
        try { extras = JSON.parse(localStorage.getItem('user_profile_' + u.uid) || '{}'); } catch(e) {}
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

    if (createdEl) createdEl.textContent = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '22 Juli 2026';
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
document.addEventListener('click', function(e) {
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
const loginOverlay = document.getElementById('loginOverlay');
const mainAdminContainer = document.getElementById('mainAdminContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Cek apakah sudah login
if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
    loginOverlay.classList.add('hidden');
    mainAdminContainer.classList.remove('hidden');
}

// Handle submit login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;

    // Kredensial (Sesuai kesepakatan)
    if (user === 'padukuhankaranganyar' && pass === 'Admin2026') {
        sessionStorage.setItem('isAdminLoggedIn', 'true');
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
            mainAdminContainer.classList.remove('hidden');
            // Re-trigger layout untuk menghindari bug render
            window.dispatchEvent(new Event('resize')); 
        }, 500); // Tunggu animasi fade out
    } else {
        loginError.classList.remove('hidden');
        // Getarkan form sedikit (efek error)
        loginForm.style.transform = 'translateX(5px)';
        setTimeout(() => loginForm.style.transform = 'translateX(-5px)', 100);
        setTimeout(() => loginForm.style.transform = 'translateX(5px)', 200);
        setTimeout(() => loginForm.style.transform = 'translateX(0)', 300);
    }
});

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
        alert("Gagal menyimpan data ke server.");
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
        alert("Gagal menghapus data dari server.");
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
window.editUmkm = function(id) {
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
window.deleteUmkm = function(id) {
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
    
    renderProductTable(umkmId);
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
        renderProductTable(umkmId, e.target.value);
    }
});

function renderProductTable(umkmId, searchQuery = "") {
    const umkm = umkmData.find(u => u.id === umkmId);
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';
    
    if (!umkm || !umkm.products || umkm.products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">Belum ada produk. Silakan tambah.</td></tr>`;
        return;
    }
    
    let hasMatch = false;
    
    umkm.products.forEach((prod, idx) => {
        // Filter berdasarkan pencarian
        if (searchQuery && !prod.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return; // Skip jika tidak cocok
        }
        
        hasMatch = true;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${prod.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
            <td><strong>${prod.name}</strong><br><small>${prod.desc || ''}</small></td>
            <td>Rp ${prod.price.toLocaleString('id-ID')}</td>
            <td>
                <button class="btn-edit" onclick="editProduct('${umkmId}', ${idx})" title="Edit Produk"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete" onclick="deleteProduct('${umkmId}', ${idx})" title="Hapus Produk"><i class="fas fa-trash"></i> Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    if (!hasMatch) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">Produk tidak ditemukan.</td></tr>`;
    }
}

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const umkmId = document.getElementById('activeUmkmIdForProduct').value;
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm) return;
    
    const newProduct = {
        name: sanitizeHTML(document.getElementById('prodName').value),
        price: parseInt(document.getElementById('prodPrice').value),
        desc: sanitizeHTML(document.getElementById('prodDesc').value),
        image: document.getElementById('prodImage').value || "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=300"
    };
    
    const activeProdIndex = document.getElementById('activeProdIndex').value;
    
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
        renderProductTable(umkmId);
        renderTable(); // Update counter produk di tabel depan
    } else {
        saveBtn.innerHTML = oriText;
    }
    saveBtn.disabled = false;
});

window.editProduct = function(umkmId, prodIndex) {
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
};

window.deleteProduct = function(umkmId, prodIndex) {
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm || !umkm.products) return;
    
    showDeleteConfirm(`Apakah Anda yakin ingin menghapus produk "${umkm.products[prodIndex].name}"?`, async () => {
        umkm.products.splice(prodIndex, 1);
        const success = await saveToDatabase(umkmId, umkm);
        if (success) {
            showToast("Produk dihapus!");
            renderProductTable(umkmId);
            renderTable(); // Update counter
        }
    });
};

// Inisialisasi awal
fetchUMKMData();

// --- LOGIKA DASHBOARD & TABS ---
window.switchAdminTab = function(tabId) {
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
    if(dashboardTab) dashboardTab.classList.add('hidden');
    if(umkmTab) umkmTab.classList.add('hidden');
    if(tentangTab) tentangTab.classList.add('hidden');
    if(penggunaTab) penggunaTab.classList.add('hidden');
    if(pengaturanTab) pengaturanTab.classList.add('hidden');
    if(navPengguna) navPengguna.classList.remove('active');
    if(navPengaturan) navPengaturan.classList.remove('active');
    if(navDashboard) navDashboard.classList.remove('active');
    if(navUmkm) navUmkm.classList.remove('active');
    if(navTentang) navTentang.classList.remove('active');

    if (tabId === 'dashboard') {
        if(dashboardTab) dashboardTab.classList.remove('hidden');
        if(navDashboard) navDashboard.classList.add('active');
        updateDashboardStats(); // Refresh stats saat buka tab
    } else if (tabId === 'umkm') {
        if(umkmTab) umkmTab.classList.remove('hidden');
        if(navUmkm) navUmkm.classList.add('active');
    } else if (tabId === 'tentang') {
        if(tentangTab) tentangTab.classList.remove('hidden');
        if(navTentang) navTentang.classList.add('active');
    } else if (tabId === 'pengguna') {
        if(penggunaTab) penggunaTab.classList.remove('hidden');
        if(navPengguna) navPengguna.classList.add('active');
        if(typeof window.renderUserManagementTable === 'function') window.renderUserManagementTable();
    } else if (tabId === 'pengaturan') {
        if(pengaturanTab) pengaturanTab.classList.remove('hidden');
        if(navPengaturan) navPengaturan.classList.add('active');
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
const DEFAULT_ADMIN_USER = "padukuhankaranganyar";
const DEFAULT_ADMIN_PASS = "Admin2026";

function getStoredAdminCredentials() {
    const stored = localStorage.getItem('umkm_admin_creds');
    if (stored) {
        try { return JSON.parse(stored); } catch(e) {}
    }
    return { user: DEFAULT_ADMIN_USER, pass: DEFAULT_ADMIN_PASS, email: "admin.karanganyar@gmail.com" };
}

function saveAdminCredentials(user, pass, email) {
    const creds = { user, pass, email };
    localStorage.setItem('umkm_admin_creds', JSON.stringify(creds));
    if (typeof firebase !== 'undefined' && firebase.database) {
        try { firebase.database().ref('admin_credentials').set(creds); } catch(e) {}
    }
}

function isSessionLocked() {
    const token = localStorage.getItem('umkm_admin_session_token');
    const sessionLoggedIn = sessionStorage.getItem('isAdminLoggedIn') === 'true';
    return !token || !sessionLoggedIn;
}

window.lockAdminSession = function() {
    localStorage.removeItem('umkm_admin_session_token');
    sessionStorage.removeItem('isAdminLoggedIn');
    const loginOverlay = document.getElementById('loginOverlay');
    const mainAdminContainer = document.getElementById('mainAdminContainer');
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (mainAdminContainer) mainAdminContainer.classList.add('hidden');
};

// Check session lock on startup
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const mainAdminContainer = document.getElementById('mainAdminContainer');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (isSessionLocked()) {
        window.lockAdminSession();
    } else {
        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (mainAdminContainer) mainAdminContainer.classList.remove('hidden');
    }

    // Attach Login Listener
    if (loginForm) {
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            const inputUser = document.getElementById('loginUser').value.trim();
            const inputPass = document.getElementById('loginPass').value.trim();
            const currentCreds = getStoredAdminCredentials();

            if (inputUser === currentCreds.user && inputPass === currentCreds.pass) {
                const token = 'admin_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('umkm_admin_session_token', token);
                sessionStorage.setItem('isAdminLoggedIn', 'true');

                if (loginError) loginError.classList.add('hidden');
                if (loginOverlay) loginOverlay.classList.add('hidden');
                if (mainAdminContainer) mainAdminContainer.classList.remove('hidden');
                window.dispatchEvent(new Event('resize'));
            } else {
                if (loginError) loginError.classList.remove('hidden');
            }
        };
    }

    // Attach Logout Listeners
    const logoutBtn1 = document.getElementById('sidebarLogoutBtn');
    const logoutBtn2 = document.getElementById('topHeaderLogoutBtn');
    if (logoutBtn1) logoutBtn1.onclick = window.lockAdminSession;
    if (logoutBtn2) logoutBtn2.onclick = window.lockAdminSession;

    // Attach Settings Form
    const adminCredsForm = document.getElementById('adminCredentialsForm');
    if (adminCredsForm) {
        const currentCreds = getStoredAdminCredentials();
        const settingAdminUser = document.getElementById('settingAdminUser');
        if (settingAdminUser) settingAdminUser.value = currentCreds.user;

        adminCredsForm.onsubmit = (e) => {
            e.preventDefault();
            const userVal = document.getElementById('settingAdminUser').value.trim();
            const oldPassVal = document.getElementById('settingOldPass').value.trim();
            const newPassVal = document.getElementById('settingNewPass').value.trim();
            const confirmPassVal = document.getElementById('settingConfirmPass').value.trim();

            if (oldPassVal !== currentCreds.pass) {
                alert("Password lama yang Anda masukkan salah!");
                return;
            }
            if (newPassVal.length < 6) {
                alert("Password baru minimal 6 karakter!");
                return;
            }
            if (newPassVal !== confirmPassVal) {
                alert("Konfirmasi password baru tidak cocok!");
                return;
            }

            saveAdminCredentials(userVal, newPassVal, currentCreds.email);
            alert("Kredensial Admin berhasil diperbarui! Silakan gunakan password baru untuk login berikutnya.");
            document.getElementById('settingOldPass').value = '';
            document.getElementById('settingNewPass').value = '';
            document.getElementById('settingConfirmPass').value = '';
        };
    }
});

// --- USER MANAGEMENT ENGINE (REALTIME REGISTERED USERS) ---
// --- USER MANAGEMENT ENGINE WITH REALTIME FIREBASE SYNC ---
// --- USER MANAGEMENT ENGINE WITH REALTIME FIREBASE SYNC ---
window.renderUserManagementTable = async function(searchQuery = '') {
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
    } catch(e) {
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
        } catch(err) {}
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
        
        const methodBadge = isGoogleUser ? 
            '<span style="background:#fef3c7; color:#d97706; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.78rem; display:inline-flex; align-items:center; gap:5px;"><i class="fab fa-google"></i> Google</span>' :
            '<span style="background:#f0fdf4; color:#16a34a; padding:4px 10px; border-radius:12px; font-weight:700; font-size:0.78rem; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-envelope"></i> Manual</span>';

        tr.innerHTML = `
            <td><img src="${avatarUrl}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid #e2e8f0;"></td>
            <td><b>${u.displayName || u.username || 'Pengguna'}</b></td>
            <td>${u.email || '-'}</td>
            <td>${methodBadge}</td>
            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : 'Terdaftar'}</td>
            <td><span style="color:#16a34a; font-weight:700; font-size:0.85rem;"><i class="fas fa-check-circle"></i> Aktif</span></td>
            <td>
                <button type="button" class="btn-show-detail" data-userid="${u.uid || u.email}" style="background:#e0f2fe; color:#0284c7; border:1px solid #7dd3fc; padding:6px 16px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.82rem; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s ease;">
                    <i class="fas fa-eye"></i> Detail
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.deleteUserFromAdmin = async function(userIdentifier) {
    if (!userIdentifier) return;
    
    if (confirm("Apakah Anda yakin ingin menghapus akun pengguna ini dari database?")) {
        try {
            // 1. Delete from Firebase Realtime Database REST API
            await fetch(`https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users/${userIdentifier}.json`, {
                method: 'DELETE'
            });
        } catch(e) {
            console.warn("REST delete error:", e);
        }

        // 2. Delete from Firebase SDK if available
        if (typeof firebase !== 'undefined' && firebase.database) {
            try { firebase.database().ref('users/' + userIdentifier).remove(); } catch(e) {}
        }

        // 3. Delete from LocalStorage
        let users = [];
        const localUsers = localStorage.getItem('umkm_users');
        if (localUsers) {
            try { users = JSON.parse(localUsers); } catch(e) {}
        }
        users = users.filter(u => u.uid !== userIdentifier && u.email !== userIdentifier);
        localStorage.setItem('umkm_users', JSON.stringify(users));

        // 4. Remove User Scoped Data (Cart, Wishlist, Biodata)
        localStorage.removeItem('umkm_cart_' + userIdentifier);
        localStorage.removeItem('umkm_wishlist_' + userIdentifier);
        localStorage.removeItem('umkm_biodata_' + userIdentifier);

        // 5. Re-render Table
        await window.renderUserManagementTable();
        alert("Akun pengguna dan data profilnya telah berhasil dihapus dari database!");
    }
};

