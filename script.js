
// ==========================================
// USER STATE MANAGEMENT
// ==========================================

let wishlist = [];
let recentlyViewed = [];
let followedShops = [];
let userCollections = [];

function getUserKey(baseKey) {
    const activeUid = (typeof localStorage !== 'undefined' ? localStorage.getItem('umkm_active_uid') : null) || (typeof currentUser !== 'undefined' && currentUser ? currentUser.uid : null);
    if (activeUid) {
        return baseKey + '_' + activeUid;
    }
    return baseKey + '_guest';
}

function loadUserState() {
    wishlist = JSON.parse(localStorage.getItem(getUserKey('wishlist')) || '[]');
    recentlyViewed = JSON.parse(localStorage.getItem(getUserKey('recentlyViewed')) || '[]');
    userCollections = JSON.parse(localStorage.getItem(getUserKey('userCollections')) || '[]');
    followedShops = JSON.parse(localStorage.getItem(getUserKey('followedShops')) || '[]');
    
    try {
        cart = JSON.parse(localStorage.getItem(getUserKey('umkm_cart'))) || {};
    } catch (e) {
        cart = {};
    }
    if (typeof checkedCartItems !== 'undefined') {
        checkedCartItems = {};
    }

    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof renderCartPage === 'function') renderCartPage();

    // Re-render UI depending on state
    if (typeof renderWishlist === 'function') renderWishlist();
    if (typeof renderTerakhirDilihat === 'function') renderTerakhirDilihat();
    if (typeof renderFavoriteShops === 'function') renderFavoriteShops();
    if (typeof renderUMKM === 'function') renderUMKM();

    if (userCollections.length > 0) {
        document.getElementById('cardCollectionName').innerText = userCollections[0];
        const ucc1 = document.getElementById('userCollectionCard'); if(ucc1) ucc1.style.display = 'block';
    } else {
        const ucc2 = document.getElementById('userCollectionCard'); if(ucc2) ucc2.style.display = 'none';
    }
}

let umkmData = [];
const DATABASE_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/umkmData.json";

// Mengambil data dari Firebase
async function fetchUMKMData() {
    try {
        const response = await fetch(DATABASE_URL);
        const data = await response.json();
        
        if (data) {
            umkmData = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            // Urutkan (opsional)
            // umkmData.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            umkmData = [];
        }
        
        // Setelah data berhasil diambil, render grid
        loadUserState();
        renderUMKM();
        if(typeof renderFavoriteShops === "function") renderFavoriteShops();
        if(typeof renderTerakhirDilihat === "function") renderTerakhirDilihat();
        
        // --- RESTORE SESSION STATE (Refresh-Proof) ---
        // Default ke tentangPage jika belum ada sesi
        const savedPage = sessionStorage.getItem('activePage') || 'tentangPage';
        const savedStoreId = sessionStorage.getItem('activeStoreId');
        const savedProdIndex = sessionStorage.getItem('activeProdIndex');
        
        if (savedPage === 'productPage' && savedStoreId !== null && savedProdIndex !== null) {
            openProductDetail(savedStoreId, parseInt(savedProdIndex, 10));
        } else if (savedPage === 'storePage' && savedStoreId) {
            openStore(savedStoreId);
        } else if (savedPage !== 'tentangPage' && savedPage !== 'homePage') {
            // Only call switchPage if it's different from what was already shown
            switchPage(savedPage, true);
        }
        // If savedPage is tentangPage or homePage, already shown by immediatePageRestore
        
    } catch (error) {
        console.error("Error fetching data:", error);
        const grid = document.getElementById('umkmGrid');
        if(grid) grid.innerHTML = "<p style='text-align:center;width:100%;color:red;'>Gagal memuat data dari server.</p>";
    }
}

// Format Rupiah
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
};

// Elements
const homePage = document.getElementById('homePage');
const beritaPage = document.getElementById('beritaPage');
const storePage = document.getElementById('storePage');
const helpPage = document.getElementById('helpPage');
const tentangPage = document.getElementById('tentangPage');
const termsPage = document.getElementById('termsPage');
const privacyPage = document.getElementById('privacyPage');
const faqPage = document.getElementById('faqPage');
const productPage = document.getElementById('productPage');
const umkmGrid = document.getElementById('umkmGrid');
const storeInfoCard = document.getElementById('storeInfoCard');
const productGrid = document.getElementById('productGrid');
const ulasanContainer = document.getElementById('ulasanContainer');
const galeriContainer = document.getElementById('galeriContainer');
const logoBtn = document.getElementById('logoBtn');
const breadcrumbHomeLinks = document.querySelectorAll('.breadcrumbHome');
const bcStoreName = document.getElementById('bcStoreName');
const categoryItems = document.querySelectorAll('.category-item');
const storeTabBtns = document.querySelectorAll('.store-tabs .tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const helpCenterLinks = document.querySelectorAll('.linkHelpCenter');
const promoDesaLinks = document.querySelectorAll('.linkPromoDesa');
const tentangLinks = document.querySelectorAll('.linkTentang');
const termsLinks = document.querySelectorAll('.linkTerms');
const privacyLinks = document.querySelectorAll('.linkPrivacy');

// Search Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.querySelector('.search-btn');
const popularSearchLinks = document.querySelectorAll('.popular-searches a');

const cartPage = document.getElementById('cartPage');
const profilePage = document.getElementById('profilePage');
const wishlistPage = document.getElementById('wishlistPage');
const favoritesPage = document.getElementById('favoritesPage');

// FORWARD DECLARE globalScrollObserver agar bisa dipakai di switchPage
// (akan di-initialize ulang di setupScrollReveal, tapi harus ada referensi dahulu)
let globalScrollObserver = null;

// Objek untuk menyimpan posisi scroll tiap halaman
const scrollPositions = {};
let previousPageId = 'homePage';

// Fungsi Pindah Halaman & Simpan State (Refresh Proof)
function switchPage(pageId, skipHistory = false) {
    // Simpan posisi scroll halaman yang akan ditinggalkan
    const pages = [homePage, beritaPage, storePage, helpPage, tentangPage, termsPage, privacyPage, faqPage, productPage, cartPage, profilePage, wishlistPage, favoritesPage];
    const activePage = pages.find(p => p && !p.classList.contains('hidden'));
    if (activePage) {
        scrollPositions[activePage.id] = window.scrollY;
        if(activePage.id !== pageId) previousPageId = activePage.id;
    }

    // Dismiss profile dropdown on page transition
    const pDropdownDismiss = document.getElementById('profileDropdown');
    if (pDropdownDismiss) pDropdownDismiss.classList.remove('show');
    const pOverlayDismiss = document.getElementById('profileDropdownOverlay');
    if (pOverlayDismiss) pOverlayDismiss.classList.remove('show');

    // Sembunyikan semua
    pages.forEach(p => {
        if(p) {
            p.classList.add('hidden');
            p.classList.remove('page-enter');
        }
    });

    // Tampilkan yang dituju dengan efek animasi
    const target = document.getElementById(pageId);
    if(target) {
        target.classList.remove('hidden');
        // Trigger reflow untuk mengulang animasi CSS
        void target.offsetWidth; 
        target.classList.add('page-enter');
    }

    // Mode Berita Desa
    if (pageId === 'beritaPage') {
        document.body.classList.add('berita-mode');
        if (typeof window.loadBerita === 'function') window.loadBerita();
    } else {
        document.body.classList.remove('berita-mode');
    }

    // Mode profil desa
    if (pageId === 'tentangPage') {
        document.body.classList.add('village-mode');
        // Panggil animasi jalannya angka statistik & animasi tik huruf hero
        animateCounters();
        triggerHeroTypewriter();
    } else {
        document.body.classList.remove('village-mode');
    }

    // Mode halaman bantuan (tanpa pencarian)
    if (pageId === 'helpPage' || pageId === 'termsPage' || pageId === 'privacyPage' || pageId === 'faqPage') {
        document.body.classList.add('hide-search');
    } else {
        document.body.classList.remove('hide-search');
    }

    // Sembunyikan tombol login/daftar di halaman tertentu
    if (pageId === 'termsPage' || pageId === 'privacyPage') {
        document.body.classList.add('hide-auth-buttons');
    } else {
        document.body.classList.remove('hide-auth-buttons');
    }

    // Mode halaman detail toko (untuk menyembunyikan header utama di mobile)
    if (pageId === 'storePage') {
        document.body.classList.add('store-mode');
    } else {
        document.body.classList.remove('store-mode');
    }

    // Ubah Teks Logo & Kategori Sesuai Halaman Aktif
    const categoryBtnEl = document.querySelector('.category-btn') || document.querySelector('.category-dropdown') || document.getElementById('categoryDropdown');
    if (pageId === 'beritaPage') {
        logoBtn.innerHTML = '<svg class="logo-icon" width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -0.125em;"><rect x="42" y="10" width="16" height="35" rx="4" fill="#2e7d32"/><rect x="42" y="50" width="16" height="35" rx="4" fill="#2e7d32"/><rect x="42" y="90" width="16" height="10" rx="4" fill="#2e7d32"/><path d="M58 50 Q 85 30 90 45 Q 70 65 58 50" fill="#4caf50"/><path d="M42 90 Q 15 70 10 85 Q 30 105 42 90" fill="#4caf50"/></svg> Berita<span>Karanganyar</span>';
        if (categoryBtnEl) categoryBtnEl.style.setProperty('display', 'none', 'important');
        if (searchInput) {
            searchInput.placeholder = 'Cari Berita Karanganyar';
            searchInput.value = '';
        }
    } else if (pageId === 'tentangPage' || pageId === 'helpPage' || pageId === 'termsPage' || pageId === 'privacyPage') {
        logoBtn.innerHTML = '<svg class="logo-icon" width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -0.125em;"><rect x="42" y="10" width="16" height="35" rx="4" fill="#2e7d32"/><rect x="42" y="50" width="16" height="35" rx="4" fill="#2e7d32"/><rect x="42" y="90" width="16" height="10" rx="4" fill="#2e7d32"/><path d="M58 50 Q 85 30 90 45 Q 70 65 58 50" fill="#4caf50"/><path d="M42 90 Q 15 70 10 85 Q 30 105 42 90" fill="#4caf50"/></svg> Padukuhan<span>Karanganyar</span>';
        if (categoryBtnEl) categoryBtnEl.style.removeProperty('display');
        if (searchInput) searchInput.placeholder = 'Cari di Pasar Karanganyar';
    } else {
        logoBtn.innerHTML = '<svg class="logo-icon" width="1em" height="1em" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -0.125em;"><rect x="42" y="10" width="16" height="35" rx="4" fill="#2e7d32"/><rect x="42" y="50" width="16" height="35" rx="4" fill="#2e7d32"/><rect x="42" y="90" width="16" height="10" rx="4" fill="#2e7d32"/><path d="M58 50 Q 85 30 90 45 Q 70 65 58 50" fill="#4caf50"/><path d="M42 90 Q 15 70 10 85 Q 30 105 42 90" fill="#4caf50"/></svg> Pasar<span>Karanganyar</span>';
        if (categoryBtnEl) categoryBtnEl.style.removeProperty('display');
        if (searchInput) searchInput.placeholder = 'Cari di Pasar Karanganyar';
    }

    // Reset animasi scroll reveal jika ada, agar bisa dimainkan ulang saat di-scroll
    if(target) {
        const reveals = target.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        reveals.forEach(r => {
            r.classList.remove('active');
            if (typeof globalScrollObserver !== 'undefined' && globalScrollObserver) {
                globalScrollObserver.unobserve(r);
                globalScrollObserver.observe(r);
            }
        });
    }

    // Simpan ke session storage
    sessionStorage.setItem('activePage', pageId);
    
    // Simpan ke History API agar tombol Back Browser berfungsi
    if (!skipHistory) {
        const pageToHash = {
            'homePage': '#promo',
            'beritaPage': '#berita',
            'termsPage': '#terms',
            'privacyPage': '#privacy',
            'faqPage': '#faq',
            'tentangPage': '#tentang',
            'helpPage': '#help',
            'wishlistPage': '#wishlist',
            'favoritesPage': '#favorites',
            'profilePage': '#profile',
            'cartPage': '#cart'
        };
        const hashStr = pageToHash[pageId] !== undefined ? pageToHash[pageId] : '';
        history.pushState({ pageId: pageId }, "", window.location.pathname + hashStr);
    }
    
    // Tokopedia header mode
    if(pageId === 'homePage' || pageId === 'tentangPage' || pageId === 'beritaPage') {
        document.body.classList.add('home-mode');
    } else {
        document.body.classList.remove('home-mode');
    }
    
    // Update header mode directly
    if(typeof window.updateHeaderMode === 'function') {
        window.updateHeaderMode();
    }
    
    // Pulihkan posisi scroll hanya jika kembali ke halaman utama (homePage)
    if (pageId === 'homePage' && scrollPositions[pageId] !== undefined) {
        // Gunakan setTimeout agar browser selesai me-render layout sebelum menggulir halaman
        setTimeout(() => {
            window.scrollTo(0, scrollPositions[pageId]);
        }, 30);
    } else {
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 30);
    }
}

// LOGIKA TRANSMUTASI SCROLL HEADER (MODAL/HERO TOKOPEDIA STYLE)
window.updateHeaderMode = function() {
    const header = document.querySelector('.header');
    if (!header) return;

    const isHeroPage = document.body.classList.contains('home-mode');
    if (isHeroPage && window.scrollY <= 30 && !document.body.classList.contains('berita-detail-open')) {
        header.classList.add('transparent-mode');
    } else {
        header.classList.remove('transparent-mode');
    }
};

window.addEventListener('scroll', window.updateHeaderMode);

// Tangkap event saat tombol Back/Forward browser ditekan
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.pageId) {
        switchPage(event.state.pageId, true);
    } else {
        // Cek hash URL atau fallback ke activePage di sessionStorage
        const hash = window.location.hash;
        const hashToPage = {
            '#terms': 'termsPage',
            '#privacy': 'privacyPage',
            '#faq': 'faqPage',
            '#tentang': 'tentangPage',
            '#help': 'helpPage',
            '#wishlist': 'wishlistPage',
            '#favorites': 'favoritesPage',
            '#profile': 'profilePage',
            '#cart': 'cartPage',
            '#promo': 'homePage'
        };
        const targetPage = hashToPage[hash] || sessionStorage.getItem('activePage') || 'tentangPage';
        switchPage(targetPage, true);
    }
});

// IMMEDIATE page restore — sebelum async fetch agar tidak ada flash
// Langsung tampilkan halaman yang tersimpan tanpa menunggu data
(function immediatePageRestore() {
    const savedPageNow = sessionStorage.getItem('activePage') || 'tentangPage';
    // Untuk storePage/productPage, jika butuh data UMKM yang belum ter-fetch
    const showPage = (savedPageNow === 'storePage' || savedPageNow === 'productPage') ? 'homePage' : savedPageNow;
    const pageIds = ['homePage', 'storePage', 'helpPage', 'tentangPage', 'termsPage', 'privacyPage', 'faqPage', 'productPage', 'cartPage', 'profilePage', 'wishlistPage', 'favoritesPage'];
    pageIds.forEach(pid => {
        const el = document.getElementById(pid);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(showPage);
    if (target) {
        target.classList.remove('hidden');
        // Apply body classes
        if (showPage === 'tentangPage') {
            document.body.classList.add('village-mode');
            setTimeout(() => triggerHeroTypewriter(), 50);
        }
        if (showPage === 'helpPage') document.body.classList.add('hide-search');
    }
    const pageToHashInit = {
        'homePage': '#promo',
        'termsPage': '#terms',
        'privacyPage': '#privacy',
        'faqPage': '#faq',
        'tentangPage': '#tentang',
        'helpPage': '#help',
        'wishlistPage': '#wishlist',
        'favoritesPage': '#favorites',
        'profilePage': '#profile',
        'cartPage': '#cart'
    };
    const initHash = pageToHashInit[showPage] || '';
    history.replaceState({ pageId: showPage }, "", window.location.pathname + initHash);
})();



// Fungsi Animasi Counter Angka Statistik
// Animate a single counter element from 0 to its target
function animateSingleCounter(counter) {
    const target = +counter.getAttribute('data-target');
    const alreadyDone = counter.getAttribute('data-animated');
    if (alreadyDone === 'true') return;
    counter.setAttribute('data-animated', 'true');
    counter.innerText = '0';
    const duration = 1200; // ms
    const startTime = performance.now();

    function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.round(easeOutQuart(progress) * target);
        if (current >= 1000) {
            counter.innerText = current.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } else {
            counter.innerText = current;
        }
        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            counter.innerText = target >= 1000 ? target.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : target;
        }
    }
    requestAnimationFrame(tick);
}

// Dipanggil saat switchPage ke tentangPage — reset semua counter agar bisa animasi ulang
function animateCounters() {
    const tentangPage = document.getElementById('tentangPage');
    if (!tentangPage) return;
    // Reset semua counter agar animasi bisa diulang
    tentangPage.querySelectorAll('.count-up').forEach(counter => {
        counter.setAttribute('data-animated', 'false');
        counter.innerText = '0';
    });
    // Trigger animasi untuk elemen yang sudah terlihat
    setTimeout(() => {
        tentangPage.querySelectorAll('.count-up').forEach(counter => {
            const rect = counter.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                animateSingleCounter(counter);
            }
        });
    }, 200);
}

let heroTypewriterTimer1 = null;
let heroTypewriterTimer2 = null;

// Animasi Tik Huruf (Typewriter) Real-Time untuk Judul Hero "Kenali lebih dekat Karanganyar"
function triggerHeroTypewriter() {
    const titleEl = document.getElementById('typewriterHeroTitle');
    if (!titleEl) return;

    if (heroTypewriterTimer1) clearTimeout(heroTypewriterTimer1);
    if (heroTypewriterTimer2) clearTimeout(heroTypewriterTimer2);

    const line1Text = "Kenali lebih dekat";
    const line2Text = "Karanganyar";

    titleEl.innerHTML = '<span id="twLine1"></span><br><span id="twLine2" class="tw-green"></span><span class="typewriter-cursor"></span>';

    const line1El = document.getElementById('twLine1');
    const line2El = document.getElementById('twLine2');

    if (!line1El || !line2El) return;

    let idx1 = 0;
    let idx2 = 0;

    function typeLine1() {
        if (idx1 < line1Text.length) {
            line1El.textContent += line1Text.charAt(idx1);
            idx1++;
            heroTypewriterTimer1 = setTimeout(typeLine1, 45);
        } else {
            heroTypewriterTimer2 = setTimeout(typeLine2, 120);
        }
    }

    function typeLine2() {
        if (idx2 < line2Text.length) {
            line2El.textContent += line2Text.charAt(idx2);
            idx2++;
            heroTypewriterTimer2 = setTimeout(typeLine2, 55);
        }
    }

    typeLine1();
}

// IntersectionObserver khusus untuk counter di tentangPage
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateSingleCounter(entry.target);
        }
    });
}, { threshold: 0.3 });

// Pasang observer pada semua counter di tentangPage
document.querySelectorAll('#tentangPage .count-up').forEach(counter => {
    counterObserver.observe(counter);
});

// Render UMKM Grid di Home
let currentCategory = 'all'; // Menyimpan state kategori aktif
function renderUMKM(category = currentCategory, searchQuery = '') {
    currentCategory = category;
    umkmGrid.innerHTML = '';
    
    const lowerQuery = searchQuery.toLowerCase().trim();

    const filteredData = umkmData.filter(item => {
        const matchCategory = category === 'all' || item.category === category;
        const matchSearch = item.name.toLowerCase().includes(lowerQuery) || 
                            item.desc.toLowerCase().includes(lowerQuery) ||
                            item.products.some(p => p.name.toLowerCase().includes(lowerQuery));
        return matchCategory && matchSearch;
    });

    if (filteredData.length === 0) {
        umkmGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                <h3 style="color: #334155; font-size: 1.3rem; margin-bottom: 8px;">Pencarian tidak ditemukan</h3>
                <p style="color: #64748b;">Kami tidak dapat menemukan UMKM atau produk "${searchQuery}". Coba kata kunci lain.</p>
            </div>
        `;
        return;
    }

    filteredData.forEach((umkm, index) => {
        const card = document.createElement('div');
        card.className = 'umkm-card reveal'; // Gunakan reveal untuk animasi scroll
        card.style.transitionDelay = `${(index % 4) * 0.1}s`; // Efek stagger 
        card.onclick = () => openStore(umkm.id);
        
        card.innerHTML = `
            <div class="umkm-img-wrap">
                <img src="${umkm.image}" alt="${umkm.name}">
                <div class="badge-official"><i class="fas fa-check-circle"></i> Desa Official</div>
            </div>
            <div class="umkm-info">
                <h3 class="umkm-name">${umkm.name}</h3>
                <p class="umkm-desc">${umkm.desc}</p>
                <div class="umkm-stats" style="margin-top:8px;">
                    <span><i class="fas fa-map-marker-alt text-danger"></i> ${umkm.location}</span>
                </div>
            </div>
        `;
        umkmGrid.appendChild(card);
        
        // Daftarkan ke observer agar muncul saat di-scroll
        if (typeof globalScrollObserver !== 'undefined') {
            globalScrollObserver.observe(card);
        }
    });
}

// Fungsi Trigger Pencarian
function handleSearch() {
    if (!searchInput) return;
    const query = searchInput.value;
    
    // Jika sedang berada di halaman berita desa, lakukan filter artikel berita
    if (beritaPage && !beritaPage.classList.contains('hidden')) {
        if (typeof window.filterBerita === 'function') {
            window.filterBerita(query);
        }
        return;
    }
    
    // Jika sedang tidak di halaman home, pindah ke home dulu
    if (homePage.classList.contains('hidden')) {
        switchPage('homePage');
    }
    
    renderUMKM('all', query);
    
    // Update active state kategori ke "Semua"
    categoryItems.forEach(c => c.classList.remove('active'));
    const allCat = document.querySelector('.category-item[data-filter="all"]');
    if (allCat) allCat.classList.add('active');
}

// Listener Pencarian Realtime (Memfilter saat pengguna mengetik)
if (searchInput) {
    searchInput.addEventListener('input', () => {
        if (beritaPage && !beritaPage.classList.contains('hidden')) {
            if (typeof window.filterBerita === 'function') {
                window.filterBerita(searchInput.value);
            }
        }
    });
}

// Open Store Details
function openStore(id) {
    const umkm = umkmData.find(item => item.id === id);
    if (!umkm) return;

    // Simpan ke session storage agar toko tidak hilang saat direfresh
    sessionStorage.setItem('activeStoreId', id);
    sessionStorage.removeItem('activeProdIndex');

    // Toggle Pages
    switchPage('storePage');

    // Update Breadcrumb
    bcStoreName.textContent = umkm.name;

    // Reset store search input
    const storeSearchInput = document.getElementById('storeSearchInput');
    if (storeSearchInput) {
        storeSearchInput.value = '';
    }

    // Tentukan badge Official (misalnya warna hijau atau ungu khas e-commerce)
    const officialBadge = `<i class="fas fa-check-circle" style="color: #6a1b9a; font-size: 1rem;"></i>`;

    // Render Store Info Sidebar (Tokopedia Style)
    storeInfoCard.innerHTML = `
        <img src="${umkm.image}" alt="${umkm.name}" class="store-avatar">
        <h2>${officialBadge} ${umkm.name}</h2>
        <p class="online-status">Online 5 Menit Lalu</p>
        <p class="store-location"><i class="fas fa-map-marker-alt"></i> ${umkm.location}</p>
        
        <div class="store-action-buttons">
            <button class="btn-follow" id="btnFollow_${umkm.id}" onclick="toggleFollow('${umkm.id}', '${umkm.name}', '${umkm.image}', event)" ${followedShops.some(s => s.id === umkm.id) ? 'style="background: #f3f4f5; color: #6D7588; border-color: #E5E7E9;"' : ''}>${followedShops.some(s => s.id === umkm.id) ? 'Mengikuti' : 'Ikuti'}</button>
            <button class="btn-chat-outline" onclick="requireAuthForChat('${umkm.whatsapp}', '${umkm.owner}')">Chat</button>
        </div>

        <p style="font-size:0.8rem; text-align:left; margin-top:15px; color:var(--text-muted); line-height: 1.4;">
            ${umkm.desc}
        </p>
    `;
    storeInfoCard.classList.add('reveal');
    if (typeof globalScrollObserver !== 'undefined') {
        globalScrollObserver.observe(storeInfoCard);
    }
    
    // Fungsi render produk terfilter
    const renderProducts = (filteredProducts) => {
        productGrid.innerHTML = '';
        if (filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: white; border-radius: 12px; border: 1px solid var(--border);">
                    <i class="fas fa-search" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 10px;"></i>
                    <h4 style="color: #334155; margin-bottom: 5px;">Produk tidak ditemukan</h4>
                    <p style="color: #64748b; font-size: 0.85rem;">Tidak ada produk di toko ini yang cocok dengan pencarian Anda.</p>
                </div>
            `;
            return;
        }

        filteredProducts.forEach((product, index) => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card reveal';
            productCard.style.transitionDelay = `${(index % 4) * 0.1}s`;
            
            // Generate random sold count and rating for demo effect
            const soldCount = Math.floor(Math.random() * 200) + 10;
            const rating = (Math.random() * 1 + 4).toFixed(1); // 4.0 - 5.0

            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="prod-img">
                <div class="prod-info">
                    <h3 class="prod-name">${product.name}</h3>
                    <p class="prod-price">Rp ${product.price.toLocaleString('id-ID')}</p>
                    
                    <div class="prod-shop">
                        <i class="fas fa-check-circle" style="color:#00AA5B;"></i> ${umkm.location}
                    </div>

                    <div class="prod-stats">
                        <span><i class="fas fa-star" style="color:#ffc400;"></i> ${rating}</span>
                        <span style="color:#d1d5db; margin: 0 5px;">|</span>
                        <span>Terjual ${soldCount}+</span>
                    </div>
                </div>
            `;
            productCard.onclick = () => {
                openProductDetail(umkm.id, index);
            };
            productGrid.appendChild(productCard);
            
            if (typeof globalScrollObserver !== 'undefined') {
                globalScrollObserver.observe(productCard);
            }
        });
    };

    // Render Awal produk
    renderProducts(umkm.products);

    // Setup input handler
    if (storeSearchInput) {
        storeSearchInput.oninput = (e) => {
            const keyword = e.target.value.toLowerCase().trim();
            const filtered = umkm.products.filter(product => 
                product.name.toLowerCase().includes(keyword) || 
                (product.desc && product.desc.toLowerCase().includes(keyword))
            );
            renderProducts(filtered);
        };
    }

    // Render Ulasan (Dummy) — dengan null check
    if (ulasanContainer) {
    ulasanContainer.innerHTML = `
        <div style="border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:15px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <img src="https://ui-avatars.com/api/?name=Budi&background=random" style="width:30px; border-radius:50%;">
                <strong style="font-size:0.9rem;">Budi Warga RT 02</strong>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted);">Sangat memuaskan! Kualitas pelayanan dari ${umkm.name} selalu juara. Pengirimannya juga cepat.</p>
        </div>
        <div style="border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:15px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <img src="https://ui-avatars.com/api/?name=Ani&background=random" style="width:30px; border-radius:50%;">
                <strong style="font-size:0.9rem;">Ani (Pembeli Luar Desa)</strong>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted);">Barang sesuai dengan deskripsi. Sangat merekomendasikan untuk belanja di toko UMKM ini.</p>
        </div>
    `;
    } // end if ulasanContainer


    // Render Galeri (Dummy)
    if (galeriContainer) {
        galeriContainer.innerHTML = `
            <div class="product-card" style="border:none; box-shadow:none;">
                <img src="${umkm.image}" class="prod-img" style="border-radius:var(--radius-sm); cursor:pointer;">
            </div>
            <div class="product-card" style="border:none; box-shadow:none;">
                <img src="https://picsum.photos/id/20/300/300" class="prod-img" style="border-radius:var(--radius-sm); cursor:pointer;">
            </div>
            <div class="product-card" style="border:none; box-shadow:none;">
                <img src="https://picsum.photos/id/40/300/300" class="prod-img" style="border-radius:var(--radius-sm); cursor:pointer;">
            </div>
        `;
    }

    // Reset tab active ke Produk
    storeTabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));
    storeTabBtns[0].classList.add('active'); // Tombol Produk
    document.getElementById('tabProduk').classList.remove('hidden');
}

// Logic Tab di halaman Toko
storeTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Hapus kelas active dari semua tombol & sembunyikan konten
        storeTabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.add('hidden'));
        
        // Aktifkan yang diklik
        const targetId = e.currentTarget.dataset.target;
        e.currentTarget.classList.add('active');
        document.getElementById(targetId).classList.remove('hidden');
    });
});

// Fungsi kembali ke Home atau Tentang
const goHome = (e) => {
    if(e) e.preventDefault();
    
    // Jika tombol logo diklik saat logo adalah "Padukuhan Karanganyar", kembali ke Tentang Karanganyar
    if (e && e.currentTarget === logoBtn && logoBtn.innerHTML.includes('Padukuhan')) {
        switchPage('tentangPage');
        return;
    }

    // Jika navigasi dipicu oleh klik logo atau menu Promo Desa, paksa scroll ke 0 (atas)
    if (e && (e.currentTarget === logoBtn || (e.currentTarget.classList && e.currentTarget.classList.contains('linkPromoDesa')))) {
        scrollPositions['homePage'] = 0;
    }
    switchPage('homePage');
};

logoBtn.addEventListener('click', goHome);
breadcrumbHomeLinks.forEach(link => link.addEventListener('click', goHome));
promoDesaLinks.forEach(link => link.addEventListener('click', goHome));

// Event listener untuk menu footer & link lainnya
tentangLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage('tentangPage');
}));

termsLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage('termsPage');
}));

privacyLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage('privacyPage');
}));

// Fitur Filter Kategori
categoryItems.forEach(item => {
    item.addEventListener('click', () => {
        categoryItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const filter = item.dataset.filter;
        renderUMKM(filter);
    });
});

// Logic Slider Hero Banner (Khusus Halaman Utama UMKM)
const slides = document.querySelectorAll('#homePage .slide');
const dots = document.querySelectorAll('#homePage .dot');
const prevBtn = document.querySelector('#homePage .prev-slide');
const nextBtn = document.querySelector('#homePage .next-slide');
let currentSlide = 0;
let slideInterval;

function goToSlide(index) {
    if(slides.length === 0) return;
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

function nextSlide() {
    goToSlide(currentSlide + 1);
}

function prevSlide() {
    goToSlide(currentSlide - 1);
}

function startSlider() {
    slideInterval = setInterval(nextSlide, 5000);
}

function resetSlider() {
    clearInterval(slideInterval);
    startSlider();
}

if(prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetSlider();
    });

    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetSlider();
    });
}

dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        goToSlide(index);
        resetSlider();
    });
});

startSlider();

// Logic Sistem Login (Prototype)
/* =========================================   AUTH, CART, AND USER PROFILE SYSTEM
========================================= */
// Firebase config & auth diinisialisasi di auth.js (diload sebelum script.js)
// Jangan redeclare const firebaseConfig di sini karena akan menyebabkan SyntaxError
// const auth dan currentUser sudah di-declare di auth.js

// State (hanya yang belum di-declare di auth.js)
// currentUser di-declare di auth.js (diload lebih dulu), script.js hanya referensi
// var currentUser sudah global dari auth.js
let cart = JSON.parse(localStorage.getItem('umkm_cart')) || {}; 

// UI Elements (referensi untuk digunakan di fungsi-fungsi script.js)
const authButtonsContainer = document.getElementById('authButtonsContainer');
const userProfileContainer = document.getElementById('userProfileContainer');
const cartIconBtn = document.getElementById('cartIconBtn');
const cartBadgeCount = document.getElementById('cartBadgeCount');
const userAvatar = document.getElementById('userAvatar');
const userNameDisplay = document.getElementById('userNameDisplay');
const userProfileBtnHeader = document.getElementById('userProfileBtnHeader');
const profileDropdown = document.getElementById('profileDropdown');
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
/* ======================= AVATAR GENERATOR ======================= */
function getRandomAvatar(seed) {
    return `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(seed)}&mouth=smile,laughing&backgroundColor=b6e3f4`;
}

/* ======================= AUTH OBSERVER ======================= */
// CATATAN: onAuthStateChanged sudah di-handle di auth.js
// Script.js hanya memakai variabel currentUser yang di-set oleh auth.js
// Helper reference agar kode lama tidak error:
/* Auth dihandle di auth.js - var auth sudah di-declare di sana */
if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserState(); // INIT USER DATA
            if(authButtonsContainer) {
                authButtonsContainer.classList.add('hidden');
                authButtonsContainer.style.display = 'none';
            }
            if(userProfileContainer) userProfileContainer.classList.remove('hidden');
            if(cartIconBtn) cartIconBtn.classList.remove('hidden');
            
            const fallbackName = user.email ? user.email.split('@')[0] : 'Pengguna';
            const firstName = user.displayName ? user.displayName.split(' ')[0] : fallbackName;
            if(userNameDisplay) userNameDisplay.textContent = firstName;
            
            const dropdownName = document.getElementById('dropdownName');
            if(dropdownName) dropdownName.textContent = user.displayName || fallbackName;
            
            const localAvatar = localStorage.getItem('local_avatar_' + user.uid);
            let avatarUrl = localAvatar || user.photoURL || getRandomAvatar(user.email || user.uid);
            
            // Fix previously saved broken Dicebear URLs in Firebase Auth
            if(avatarUrl.includes('dicebear.com') && avatarUrl.includes('mouth=smile,laugh&')) {
                avatarUrl = avatarUrl.replace('mouth=smile,laugh&', 'mouth=smile,laughing&');
                user.updateProfile({ photoURL: avatarUrl }).catch(()=>console.log('silent fail'));
            }
            
            if (userAvatar) userAvatar.src = avatarUrl;
            
            const dropdownAvatar = document.getElementById('dropdownAvatar');
            if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
            
            const profilePageAvatar = document.getElementById('profilePageAvatar');
            if(profilePageAvatar) profilePageAvatar.src = avatarUrl;
            
            const profileEditAvatar = document.getElementById('profileEditAvatar');
            if(profileEditAvatar) profileEditAvatar.src = avatarUrl;
            
            const profilePageName = document.getElementById('profilePageName');
            if(profilePageName) profilePageName.textContent = user.displayName || fallbackName;
            
            const displayEditName = document.getElementById('displayEditName');
            if(displayEditName) displayEditName.textContent = user.displayName || fallbackName;
            
            const profileEditName = document.getElementById('profileEditName');
            if(profileEditName) profileEditName.value = user.displayName || fallbackName;
            
            const displayEditEmail = document.getElementById('displayEditEmail');
            if(displayEditEmail) displayEditEmail.textContent = user.email || '';
            
            const profileEditEmail = document.getElementById('profileEditEmail');
            if(profileEditEmail) profileEditEmail.value = user.email || '';
            
            if(typeof loadBiodataExtras === 'function') loadBiodataExtras();
            
            if(loginModal) loginModal.classList.add('hidden');
            if(typeof updateCartBadge === 'function') updateCartBadge();
        } else {
            currentUser = null;
            loadUserState(); // INIT USER DATA
            if(authButtonsContainer) {
                authButtonsContainer.classList.remove('hidden');
                authButtonsContainer.style.display = 'flex';
            }
            if(userProfileContainer) userProfileContainer.classList.add('hidden');
            if(cartIconBtn) cartIconBtn.classList.add('hidden');
            if(profileDropdown) profileDropdown.classList.add('hidden');
        }
    });
}

if(userProfileBtnHeader) {
    userProfileBtnHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });
}

window.addEventListener('click', (e) => {
    if (profileDropdown && !profileDropdown.contains(e.target) && userProfileBtnHeader && !userProfileBtnHeader.contains(e.target)) {
        profileDropdown.classList.remove('show');
    }
    if (loginModal && e.target === loginModal) {
        loginModal.classList.add('hidden');
        document.querySelectorAll('#loginModal [id^="authScreen"]').forEach(s => s.classList.add('hidden'));
    }
});

if(dropdownLogoutBtn) {
    dropdownLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('activePage');
        if(auth) auth.signOut();
    });
}

/* ======================= TOKOPEDIA AUTH UI & LOGIC ======================= */
const loginModal = document.getElementById('loginModal');
// Screens
const authScreen1 = document.getElementById('authScreen1');
const authScreen2 = document.getElementById('authScreen2');
const authScreen3 = document.getElementById('authScreen3');
const authScreen4 = document.getElementById('authScreen4');
const authScreen5 = document.getElementById('authScreen5');
const authScreen6 = document.getElementById('authScreen6');
const authScreen7 = document.getElementById('authScreen7');
const authScreen8 = document.getElementById('authScreen8');
const authScreen9 = document.getElementById('authScreen9');

// ======================= AUTH ERROR HELPERS =======================
function showInputError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.style.borderColor = '#f83245'; // Red border
    
    // Check if error message already exists
    let errorEl = input.parentElement.querySelector('.input-error-msg');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'input-error-msg';
        errorEl.style.color = '#f83245';
        errorEl.style.fontSize = '0.8rem';
        errorEl.style.marginTop = '4px';
        input.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
}

function clearInputErrors() {
    document.querySelectorAll('.input-error-msg').forEach(el => el.remove());
    ['authInputEmail1', 'authInputPassword', 'authRegEmail', 'authRegName', 'authRegPassword', 'authForgotEmail'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.style.borderColor = '#E5E7E9';
    });
}

// Inputs
const authInputEmail1 = document.getElementById('authInputEmail1');
const authInputPassword = document.getElementById('authInputPassword');
const authDisplayEmail = document.getElementById('authDisplayEmail');
const authForgotEmail = document.getElementById('authForgotEmail');
const authRegName = document.getElementById('authRegName');
const authRegEmail = document.getElementById('authRegEmail');
const authRegPassword = document.getElementById('authRegPassword');
// Buttons & Links
const authBtnNext = document.getElementById('authBtnNext');
const authBtnOtherMethods = document.getElementById('authBtnOtherMethods');
const authGoToForgot = document.getElementById('authGoToForgot');
const authGoToRegister = document.getElementById('authGoToRegister');
const authBtnLogin = document.getElementById('authBtnLogin');
const authBtnRegister = document.getElementById('authBtnRegister');
const authBtnReset = document.getElementById('authBtnReset');
const googleLoginBtn = document.getElementById('googleLoginBtn');

// Navigation Helpers
window.showAuthScreen = function(screen) {
    if(typeof clearInputErrors === 'function') clearInputErrors();
    const allScreens = document.querySelectorAll('#loginModal [id^="authScreen"]');
    allScreens.forEach(s => {
        s.classList.add('hidden');
    });
    
    let targetEl = null;
    if (typeof screen === 'string') {
        targetEl = document.getElementById(screen);
    } else if (screen && screen.nodeType) {
        targetEl = screen;
    }
    
    if (targetEl) {
        targetEl.classList.remove('hidden');
    }
};
function showAuthScreen(screen) {
    window.showAuthScreen(screen);
}

// Close Buttons
[1,2,3,4,5,6,7,8,9,10].forEach(num => {
    const btn = document.getElementById(`closeModal${num}`);
    if(btn) btn.addEventListener('click', () => {
        if(loginModal) loginModal.classList.add('hidden');
        document.querySelectorAll('#loginModal [id^="authScreen"]').forEach(s => s.classList.add('hidden'));
    });
});

// Back Buttons
['authBackTo1', 'authBackTo1FromMethods', 'authBackTo1FromForgot', 'authBackTo1FromRegister'].forEach(id => {
    const btn = document.getElementById(id);
    if(btn) btn.addEventListener('click', () => showAuthScreen(authScreen1));
});

window.openLoginModal = (toRegister = false) => {
    if(loginModal) {
        loginModal.classList.remove('hidden');
        if(toRegister) {
            showAuthScreen(authScreen5);
        } else {
            const savedAccStr = localStorage.getItem('saved_tokopedia_account');
            if(savedAccStr) {
                const acc = JSON.parse(savedAccStr);
                const nameEl = document.getElementById('savedAccountName');
                const avatarEl = document.getElementById('savedAccountAvatar');
                const emailEl = document.getElementById('savedAccountEmail');
                
                if(nameEl) nameEl.textContent = acc.name || 'Pengguna';
                if(avatarEl) avatarEl.src = acc.photoURL || 'https://ui-avatars.com/api/?name=User&background=random';
                
                let masked = acc.email;
                if(acc.email) {
                    const parts = acc.email.split('@');
                    if(parts.length === 2 && parts[0].length > 2) {
                        masked = parts[0][0] + '*'.repeat(parts[0].length - 2) + parts[0].slice(-1) + '@' + parts[1];
                    }
                }
                if(emailEl) emailEl.textContent = masked;
                showAuthScreen(authScreen6);
            } else {
                showAuthScreen(authScreen1);
                if(authInputEmail1) {
                    authInputEmail1.value = '';
                    authInputEmail1.dispatchEvent(new Event('input'));
                }
            }
        }
    }
};

const headerBtnMasuk = document.querySelector('.btn-masuk');
const headerBtnDaftar = document.querySelector('.btn-daftar');
if(headerBtnMasuk) headerBtnMasuk.addEventListener('click', () => openLoginModal(false));
if(headerBtnDaftar) headerBtnDaftar.addEventListener('click', () => openLoginModal(true));

// Screen 1: Next Logic
if(authInputEmail1 && authBtnNext) {
    authInputEmail1.addEventListener('input', () => {
        if(authInputEmail1.value.trim().length > 0) {
            authBtnNext.style.background = 'var(--primary)';
            authBtnNext.style.color = 'white';
            authBtnNext.style.cursor = 'pointer';
        } else {
            authBtnNext.style.background = '#E5E7E9';
            authBtnNext.style.color = '#B3B9C1';
            authBtnNext.style.cursor = 'not-allowed';
        }
    });
    
    authBtnNext.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.handleScreen1Submit === 'function') {
            window.handleScreen1Submit(e);
        }
    });
}

// Screen 1 Links
if(authGoToForgot) authGoToForgot.addEventListener('click', (e) => {
    e.preventDefault();
    if(authForgotEmail && authInputEmail1) authForgotEmail.value = authInputEmail1.value;
    showAuthScreen(authScreen4);
});
if(authGoToRegister) authGoToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthScreen(authScreen5);
});
if(authBtnOtherMethods) authBtnOtherMethods.addEventListener('click', () => {
    showAuthScreen(authScreen3);
});

// Firebase Auth Actions
if(authBtnLogin) {
    authBtnLogin.addEventListener('click', () => {
        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating login submit to auth_engine.js...");
        return;
    });
}

// Screen 5 links
const authGoToLogin = document.getElementById('authGoToLogin');
if(authGoToLogin) authGoToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showAuthScreen(authScreen1);
});

const googleRegisterBtn = document.getElementById('googleRegisterBtn');
if(googleRegisterBtn) {
    googleRegisterBtn.addEventListener('click', () => {
        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating Google Register to auth_engine.js...");
        return;
    });
}

// Register Flow Logic
const authRegNameGroup = document.getElementById('authRegNameGroup');
const authRegPasswordGroup = document.getElementById('authRegPasswordGroup');
if(authRegEmail && authBtnRegister) {
    authRegEmail.addEventListener('input', () => {
        if(authRegEmail.value.trim().length > 0) {
            authBtnRegister.style.background = 'var(--primary)';
            authBtnRegister.style.color = 'white';
            authBtnRegister.style.cursor = 'pointer';
        } else {
            authBtnRegister.style.background = '#E5E7E9';
            authBtnRegister.style.color = '#B3B9C1';
            authBtnRegister.style.cursor = 'not-allowed';
            if(authRegNameGroup) authRegNameGroup.classList.add('hidden');
            if(authRegPasswordGroup) authRegPasswordGroup.classList.add('hidden');
            authBtnRegister.textContent = "Daftar";
        }
    });
    
    authBtnRegister.addEventListener('click', () => {
        if(typeof clearInputErrors === 'function') clearInputErrors();
        const email = authRegEmail.value.trim();
        if(email.length === 0) {
            if(typeof showInputError === 'function') showInputError('authRegEmail', 'Email tidak boleh kosong.');
            return;
        }
        
        // Step 1: Validate Email and show Name/Password
        if(authRegNameGroup && authRegNameGroup.classList.contains('hidden')) {
            if(!email.includes('@') || !email.includes('.')) {
                if(typeof showInputError === 'function') showInputError('authRegEmail', "Format email tidak valid.");
                return;
            }
            authBtnRegister.textContent = "Memeriksa...";
            auth.fetchSignInMethodsForEmail(email).then((methods) => {
                if(methods.length > 0) {
                    authBtnRegister.textContent = "Daftar";
                    if(typeof showInputError === 'function') showInputError('authRegEmail', "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
                } else {
                    authRegNameGroup.classList.remove('hidden');
                    authRegPasswordGroup.classList.remove('hidden');
                    authBtnRegister.textContent = "Selesaikan Pendaftaran";
                }
            }).catch(e => {
                authBtnRegister.textContent = "Daftar";
                if(e.code === 'auth/operation-not-allowed' || e.code === 'auth/unauthorized-domain') {
                    authRegNameGroup.classList.remove('hidden');
                    authRegPasswordGroup.classList.remove('hidden');
                    authBtnRegister.textContent = "Selesaikan Pendaftaran";
                } else {
                    if(typeof showInputError === 'function') showInputError('authRegEmail', "Kesalahan: " + e.message);
                }
            });
            return;
        }

        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating registration submit to auth_engine.js...");
        return;
    });
}

if(authBtnReset) {
    authBtnReset.addEventListener('click', () => {
        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating forgot password submit to auth_engine.js...");
        return;
    });
}

if(googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating Google Login to auth_engine.js...");
        return;
    });
}

// Logic untuk Layar 6 (Account Picker)
const savedAccountCard = document.getElementById('savedAccountCard');
const deleteSavedAccountBtn = document.getElementById('deleteSavedAccountBtn');
const authGoToLoginFromPicker = document.getElementById('authGoToLoginFromPicker');
const authGoToRegisterFromPicker = document.getElementById('authGoToRegisterFromPicker');

if(savedAccountCard) {
    savedAccountCard.addEventListener('click', (e) => {
        if(e.target === deleteSavedAccountBtn) return; // Prevent double trigger
        const savedAccStr = localStorage.getItem('saved_tokopedia_account');
        if(savedAccStr) {
            const acc = JSON.parse(savedAccStr);
            if(authInputEmail1) {
                authInputEmail1.value = acc.email;
                if(authDisplayEmail) authDisplayEmail.textContent = acc.email;
            }
            showAuthScreen(authScreen2);
        }
    });
}
if(deleteSavedAccountBtn) {
    deleteSavedAccountBtn.addEventListener('click', () => {
        localStorage.removeItem('saved_tokopedia_account');
        showAuthScreen(authScreen1);
    });
}
if(authGoToLoginFromPicker) {
    authGoToLoginFromPicker.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthScreen(authScreen1);
    });
}
if(authGoToRegisterFromPicker) {
    authGoToRegisterFromPicker.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthScreen(authScreen5);
    });
}

// Logic untuk Layar 7 & 8 (Prompt HP)
const authBtnGoToAddPhone = document.getElementById('authBtnGoToAddPhone');
const authBackTo7 = document.getElementById('authBackTo7');
const authInputPhone = document.getElementById('authInputPhone');
const authBtnSubmitPhone = document.getElementById('authBtnSubmitPhone');

if(authBtnGoToAddPhone) {
    authBtnGoToAddPhone.addEventListener('click', () => showAuthScreen(authScreen8));
}
if(authBackTo7) {
    authBackTo7.addEventListener('click', () => showAuthScreen(authScreen7));
}
if(authInputPhone && authBtnSubmitPhone) {
    authInputPhone.addEventListener('input', () => {
        if(authInputPhone.value.trim().length > 5) {
            authBtnSubmitPhone.style.background = 'var(--primary)';
            authBtnSubmitPhone.style.color = 'white';
            authBtnSubmitPhone.style.cursor = 'pointer';
        } else {
            authBtnSubmitPhone.style.background = '#E5E7E9';
            authBtnSubmitPhone.style.color = '#B3B9C1';
            authBtnSubmitPhone.style.cursor = 'not-allowed';
        }
    });
    authBtnSubmitPhone.addEventListener('click', () => {
        if(authInputPhone.value.trim().length > 5) {
            alert("Nomor HP berhasil ditambahkan ke profil Anda!");
            loginModal.classList.add('hidden');
        }
    });
}

// Intercept Logout Logic (Layar 9)
if(dropdownLogoutBtn) {
    // Timpa event listener sebelumnya dengan cloning node
    const newLogoutBtn = dropdownLogoutBtn.cloneNode(true);
    dropdownLogoutBtn.parentNode.replaceChild(newLogoutBtn, dropdownLogoutBtn);
    
    newLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.classList.remove('hidden');
        showAuthScreen(authScreen9);
    });
}

const authBtnLogoutDontSave = document.getElementById('authBtnLogoutDontSave');
const authBtnLogoutSave = document.getElementById('authBtnLogoutSave');

if(authBtnLogoutDontSave) {
    authBtnLogoutDontSave.addEventListener('click', () => {
        localStorage.removeItem('saved_tokopedia_account');
        sessionStorage.setItem('activePage', 'homePage');
        if(auth) auth.signOut().then(() => location.reload());
    });
}
if(authBtnLogoutSave) {
    authBtnLogoutSave.addEventListener('click', () => {
        if(currentUser) {
            localStorage.setItem('saved_tokopedia_account', JSON.stringify({
                name: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL
            }));
        }
        sessionStorage.setItem('activePage', 'homePage');
        if(auth) auth.signOut().then(() => location.reload());
    });
}

// ======================= CART LOGIC =======================
function saveCart() {
    localStorage.setItem(getUserKey('umkm_cart'), JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    let totalItems = 0;
    Object.values(cart).forEach(storeItems => {
        Object.values(storeItems.items).forEach(item => { totalItems += item.qty; });
    });
    if(cartBadgeCount) {
        cartBadgeCount.textContent = totalItems;
        cartBadgeCount.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
    if(cartIconBtn) {
        if(currentUser) {
            cartIconBtn.classList.remove('hidden');
        } else {
            cartIconBtn.classList.add('hidden');
        }
    }
}

/* ======================= CART LOGIC (PAGE) ======================= */
const cartPageItemsContainer = document.getElementById('cartPageItemsContainer');
const cartSummaryItemCount = document.getElementById('cartSummaryItemCount');
const cartSummaryTotal = document.getElementById('cartSummaryTotal');
const cartSummaryGrandTotal = document.getElementById('cartSummaryGrandTotal');
const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');

// State for checked items
let checkedCartItems = {}; // { storeId: { prodId: boolean } }

// Ensure checked items state is clean
function syncCheckedItems() {
    for (const storeId in cart) {
        if (!checkedCartItems[storeId]) checkedCartItems[storeId] = {};
        for (const prodId in cart[storeId].items) {
            if (checkedCartItems[storeId][prodId] === undefined) {
                checkedCartItems[storeId][prodId] = true; // default checked
            }
        }
    }
}

function updateCartSummary() {
    let totalCheckedItems = 0;
    let grandTotal = 0;
    let activeStores = 0;
    let lastActiveStore = null;

    for (const storeId in cart) {
        let hasCheckedInStore = false;
        for (const prodId in cart[storeId].items) {
            if (checkedCartItems[storeId] && checkedCartItems[storeId][prodId]) {
                const item = cart[storeId].items[prodId];
                totalCheckedItems += item.qty;
                grandTotal += (item.price * item.qty);
                hasCheckedInStore = true;
            }
        }
        if(hasCheckedInStore) {
            activeStores++;
            lastActiveStore = storeId;
        }
    }

    if(cartSummaryItemCount) cartSummaryItemCount.textContent = totalCheckedItems;
    if(cartSummaryTotal) cartSummaryTotal.textContent = 'Rp ' + grandTotal.toLocaleString('id-ID');
    if(cartSummaryGrandTotal) cartSummaryGrandTotal.textContent = 'Rp ' + grandTotal.toLocaleString('id-ID');
    
    if(cartCheckoutBtn) {
        if (totalCheckedItems === 0) {
            cartCheckoutBtn.disabled = true;
            cartCheckoutBtn.style.opacity = '0.5';
            cartCheckoutBtn.onclick = null;
        } else {
            cartCheckoutBtn.disabled = false;
            cartCheckoutBtn.style.opacity = '1';
            cartCheckoutBtn.onclick = () => {
                if (activeStores > 1) {
                    alert("Maaf, checkout via WhatsApp hanya bisa dilakukan untuk 1 UMKM dalam satu waktu. Silakan centang produk dari 1 toko saja.");
                    return;
                }
                checkoutStore(lastActiveStore);
            };
        }
    }
}

function renderCartPage() {
    if(!cartPageItemsContainer) return;
    cartPageItemsContainer.innerHTML = '';
    syncCheckedItems();
    
    if (Object.keys(cart).length === 0) {
        cartPageItemsContainer.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:white; border-radius:8px; border:1px solid #f0f0f0;">
                <i class="fas fa-shopping-cart" style="font-size:4rem; margin-bottom:20px; color:#ddd;"></i>
                <h3 style="color:#666;">Wah, keranjang belanjamu kosong</h3>
                <p style="color:#999; margin-top:10px;">Yuk, isi dengan barang-barang UMKM yang menarik!</p>
                <button class="btn-primary" onclick="switchPage('homePage')" style="margin-top:20px; padding:10px 20px; border-radius:8px;">Belanja Sekarang</button>
            </div>
        `;
        updateCartSummary();
        return;
    }
    
    for (const storeId in cart) {
        const store = cart[storeId];
        const storeGroup = document.createElement('div');
        storeGroup.className = 'cart-page-store';
        
        // Cek apakah semua produk di toko ini dicentang
        let allChecked = true;
        for (const prodId in store.items) {
            if (!checkedCartItems[storeId][prodId]) allChecked = false;
        }

        let itemsHTML = '';
        for (const prodId in store.items) {
            const item = store.items[prodId];
            const isChecked = checkedCartItems[storeId][prodId];
            itemsHTML += `
                <div class="cart-page-item">
                    <input type="checkbox" class="custom-checkbox item-checkbox" data-store="${storeId}" data-prod="${prodId}" ${isChecked ? 'checked' : ''} onchange="toggleCartItem('${storeId}', '${prodId}', this.checked)">
                    <img src="${item.image}" alt="${item.name}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #eee;">
                    <div class="cart-item-details-full">
                        <div style="font-weight:600; font-size:1.1rem; margin-bottom:5px;">${item.name}</div>
                        <div style="font-weight:bold; color:var(--text-color); margin-bottom:15px;">Rp ${item.price.toLocaleString('id-ID')}</div>
                        <div style="display:flex; justify-content:flex-end; align-items:center; gap:15px;">
                            <button onclick="removeCartItem('${storeId}', '${prodId}')" style="background:none; border:none; color:#888; cursor:pointer; font-size:1.1rem;"><i class="fas fa-trash"></i></button>
                            <div class="cart-qty-control">
                                <button class="cart-qty-btn" onclick="updateCartQty('${storeId}', '${prodId}', -1)">-</button>
                                <input type="text" class="cart-qty-input" value="${item.qty}" readonly>
                                <button class="cart-qty-btn" onclick="updateCartQty('${storeId}', '${prodId}', 1)">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        storeGroup.innerHTML = `
            <div class="cart-page-header">
                <input type="checkbox" class="custom-checkbox store-checkbox" data-store="${storeId}" ${allChecked ? 'checked' : ''} onchange="toggleStoreItems('${storeId}', this.checked)">
                <i class="fas fa-store" style="color:#f44336;"></i> ${store.storeName}
            </div>
            ${itemsHTML}
        `;
        cartPageItemsContainer.appendChild(storeGroup);
    }
    updateCartSummary();
}

window.toggleCartItem = function(storeId, prodId, checked) {
    if(!checkedCartItems[storeId]) checkedCartItems[storeId] = {};
    checkedCartItems[storeId][prodId] = checked;
    renderCartPage();
};

window.toggleStoreItems = function(storeId, checked) {
    if(!checkedCartItems[storeId]) checkedCartItems[storeId] = {};
    if(cart[storeId]) {
        for (const prodId in cart[storeId].items) {
            checkedCartItems[storeId][prodId] = checked;
        }
    }
    renderCartPage();
};

window.updateCartQty = function(storeId, prodId, change) {
    if (cart[storeId] && cart[storeId].items[prodId]) {
        cart[storeId].items[prodId].qty += change;
        if (cart[storeId].items[prodId].qty <= 0) { delete cart[storeId].items[prodId]; }
        if (Object.keys(cart[storeId].items).length === 0) { delete cart[storeId]; }
        saveCart();
        renderCartPage();
    }
};

window.removeCartItem = function(storeId, prodId) {
    if (cart[storeId] && cart[storeId].items[prodId]) {
        delete cart[storeId].items[prodId];
        if (Object.keys(cart[storeId].items).length === 0) { delete cart[storeId]; }
        saveCart();
        renderCartPage();
    }
};

window.checkoutStore = function(storeId) {
    const store = cart[storeId];
    if (!store || !currentUser) return;
    
    const userName = currentUser.displayName || 'Pelanggan';
    let text = `Halo *${store.storeName}*,\nSaya ${userName} ingin memesan dari Pasar Desa Karanganyar:\n\n`;
    
    let total = 0; let i = 1;
    for (const prodId in store.items) {
        if(checkedCartItems[storeId] && checkedCartItems[storeId][prodId]) {
            const item = store.items[prodId];
            total += item.price * item.qty;
            text += `${i}. ${item.name} (${item.qty}x) - Rp ${(item.price * item.qty).toLocaleString('id-ID')}\n`;
            i++;
        }
    }
    
    text += `\n*Total Pesanan: Rp ${total.toLocaleString('id-ID')}*\n\nMohon informasikan ketersediaan dan ongkos kirim. Terima kasih!`;
    window.open(`https://wa.me/${store.storeWhatsapp}?text=${encodeURIComponent(text)}`, '_blank');
};

if(cartIconBtn) {
    cartIconBtn.addEventListener('click', () => {
        renderCartPage();
        switchPage('cartPage');
    });
}

window.addToCart = function(umkm, product, qty) {
    if (!cart[umkm.id]) {
        cart[umkm.id] = { storeName: umkm.name, storeWhatsapp: umkm.whatsapp, items: {} };
    }
    const prodId = product.name; // Use name as unique ID for now
    if (cart[umkm.id].items[prodId]) {
        cart[umkm.id].items[prodId].qty += qty;
    } else {
        cart[umkm.id].items[prodId] = {
            name: product.name,
            price: product.price,
            image: product.image.split('|||')[0],
            qty: qty
        };
    }
    // Set baru ke checked
    if(!checkedCartItems[umkm.id]) checkedCartItems[umkm.id] = {};
    checkedCartItems[umkm.id][prodId] = true;
    
    saveCart();
};

/* ======================= PROFILE LOGIC ======================= */
const dropdownProfileMenu = document.getElementById('dropdownProfileMenu');
const profilePageAvatar = document.getElementById('profilePageAvatar');
const profilePageName = document.getElementById('profilePageName');
const profileEditName = document.getElementById('profileEditName');
const profileEditEmail = document.getElementById('profileEditEmail');
const profileSaveBtn = document.getElementById('profileSaveBtn');

if(dropdownProfileMenu) {
    dropdownProfileMenu.addEventListener('click', (e) => {
        e.preventDefault();
        const pd = document.getElementById('profileDropdown');
        if(pd) pd.classList.remove('show');
        
        if (currentUser) {
            const localAvatar = localStorage.getItem('local_avatar_' + currentUser.uid);
            let avatarUrl = localAvatar || currentUser.photoURL || getRandomAvatar(currentUser.email || currentUser.uid);
            
            if(avatarUrl.includes('dicebear.com') && avatarUrl.includes('mouth=smile,laugh&')) {
                avatarUrl = avatarUrl.replace('mouth=smile,laugh&', 'mouth=smile,laughing&');
            }
            
            if(profilePageAvatar) profilePageAvatar.src = avatarUrl;
            
            const profileEditAvatar = document.getElementById('profileEditAvatar');
            if(profileEditAvatar) profileEditAvatar.src = avatarUrl;
            const fallbackName = currentUser.email ? currentUser.email.split('@')[0] : 'Pengguna';
            
            if(profilePageName) profilePageName.textContent = currentUser.displayName || fallbackName;
            
            const displayEditName = document.getElementById('displayEditName');
            if(displayEditName) displayEditName.textContent = currentUser.displayName || fallbackName;
            if(profileEditName) profileEditName.value = currentUser.displayName || fallbackName;
            
            const displayEditEmail = document.getElementById('displayEditEmail');
            if(displayEditEmail) displayEditEmail.textContent = currentUser.email || '';
            if(profileEditEmail) profileEditEmail.value = currentUser.email || '';
            
            if(typeof loadBiodataExtras === 'function') loadBiodataExtras();
        }
        
        switchPage('profilePage');
    });
}

// Tab Switching Logic
const profileTabs = document.querySelectorAll('.profile-tab');
profileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        profileTabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all contents
        document.querySelectorAll('.profile-tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show target content
        const targetId = `tab-${tab.getAttribute('data-tab')}`;
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
    });
});

/* ======================= TOAST NOTIFICATION ======================= */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let iconHTML = '';
    if (type === 'success') iconHTML = '<i class="fas fa-check-circle" style="color: #4CAF50; font-size: 1.2rem;"></i>';
    else if (type === 'error') iconHTML = '<i class="fas fa-exclamation-circle" style="color: #F44336; font-size: 1.2rem;"></i>';
    else iconHTML = '<i class="fas fa-info-circle" style="color: #2196F3; font-size: 1.2rem;"></i>';
    
    toast.innerHTML = `${iconHTML} <span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Animate out after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

const btnBackProfile = document.getElementById('btnBackProfile');
if(btnBackProfile) {
    btnBackProfile.addEventListener('click', () => {
        switchPage(previousPageId);
    });
}

if(profileSaveBtn) {
    profileSaveBtn.addEventListener('click', () => {
        if (!currentUser) return;
        const newName = profileEditName.value;
        const oldName = currentUser.displayName;
        currentUser.updateProfile({ displayName: newName }).then(() => {
            showToast('Biodata berhasil diperbarui!');
            if(profilePageName) profilePageName.textContent = newName;
            
            const userNameDisplay = document.getElementById('userNameDisplay');
            if(userNameDisplay) userNameDisplay.textContent = newName.split(' ')[0];
            
            const dropdownName = document.getElementById('dropdownName');
            if(dropdownName) dropdownName.textContent = newName;
            
        }).catch(err => {
            console.error(err);
            showToast('Gagal memperbarui profil: ' + err.message, 'error');
        });
    });
}

// Fitur Buka Halaman Bantuan
helpCenterLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('helpPage');
    });
});

// Fitur Buka Halaman Tentang Karanganyar
tentangLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('tentangPage');
    });
});

// Fitur Buka Halaman Syarat & Ketentuan
termsLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('termsPage');
    });
});

// Fitur Buka Halaman Kebijakan Privasi
privacyLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('privacyPage');
    });
});

// Interaksi Accordion FAQ
const faqQuestions = document.querySelectorAll('.faq-question');
faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        // Toggle item yang diklik
        parent.classList.toggle('active');
    });
});

// Event Listener Search Bar
if (searchInput) {
    const searchIcon = document.querySelector('.search-icon-left');
    if (searchIcon) {
        searchIcon.addEventListener('click', handleSearch);
        searchIcon.style.cursor = 'pointer'; // Menjadikan ikon kaca pembesar terlihat bisa diklik
    }
    
    // Live Search: Pencarian langsung saat pengguna mengetik (tidak perlu Enter)
    searchInput.addEventListener('input', () => {
        handleSearch();
    });
}

// Event Listener Popular Searches
if (popularSearchLinks) {
    popularSearchLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const keyword = e.target.innerText;
            if (searchInput) {
                searchInput.value = keyword;
                handleSearch();
            }
        });
    });
}

// Global Scroll Observer (bisa diakses oleh fungsi render dinamis)
globalScrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });

function setupScrollReveal() {
    // Semua tipe reveal - pisahkan query agar tidak ada syntax error
    const selectors = [
        '.reveal',
        '.reveal-left',
        '.reveal-right',
        '.reveal-scale',
        '#tentangPage .tkp-map-container',
        '#tentangPage .tkp-collage',
        '#tentangPage .tkp-mission-text',
        '#tentangPage .tkp-stats-box'
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            globalScrollObserver.observe(el);
        });
    });
}
setupScrollReveal();

// Tombol Kembali Mobile dari Store ke Promo Desa
const mobileBackStoreBtn = document.getElementById('mobileBackStoreBtn');
if (mobileBackStoreBtn) {
    mobileBackStoreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Kembali ke Promo Desa (halaman home dengan bagian promo)
        switchPage('homePage');
        if (typeof window.scrollToPromoSection === 'function') {
            setTimeout(() => window.scrollToPromoSection(), 100);
        }
    });
}

// ==========================================
// Fitur Mobile Side Menu (Hamburger)
// ==========================================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileSideMenu = document.getElementById('mobileSideMenu');
const closeSideMenu = document.getElementById('closeSideMenu');
const sideMenuOverlay = document.getElementById('sideMenuOverlay');
const sideMenuLinks = document.querySelectorAll('.mobile-side-menu .side-menu-links a');

function openMobileMenu() {
    if(mobileSideMenu) mobileSideMenu.classList.add('active');
    if(sideMenuOverlay) sideMenuOverlay.classList.add('active');
}

function closeMobileMenu() {
    if(mobileSideMenu) mobileSideMenu.classList.remove('active');
    if(sideMenuOverlay) sideMenuOverlay.classList.remove('active');
}

if (mobileMenuBtn && mobileSideMenu && closeSideMenu && sideMenuOverlay) {
    mobileMenuBtn.addEventListener('click', openMobileMenu);
    closeSideMenu.addEventListener('click', closeMobileMenu);
    sideMenuOverlay.addEventListener('click', closeMobileMenu);
    sideMenuLinks.forEach(link => { link.addEventListener('click', closeMobileMenu); });
}

// ==========================================
// Fitur Dropdown Kategori (Mobile Click Toggle & Dynamic Content)
// ==========================================
const categoryBtn = document.querySelector('.category-btn');
const categoryDropdown = document.querySelector('.category-dropdown');
const categorySidebarItems = document.querySelectorAll('.category-sidebar li');
const categoryContentBox = document.querySelector('.category-content');
const categoryData = {
    "Makanan & Minuman": ["Keripik Pisang", "Telur Asin", "Jamu Tradisional", "Kopi Asli Desa", "Peyek Kacang"],
    "Kerajinan Tangan": ["Anyaman Bambu", "Batik Tulis Tangan", "Kerajinan Tanah Liat", "Pahatan Kayu Jati"],
    "Kebutuhan Harian": ["Beras Organik Mentik Wangi", "Minyak Kelapa", "Sabun Cuci", "Gula Merah Aren"],
    "Pertanian & Peternakan": ["Sayur Segar Musiman", "Bibit Buah", "Pupuk Kompos", "Telur Ayam Kampung"],
    "Jasa Warga": ["Servis Motor Panggilan", "Tukang Kayu Profesional", "Jasa Jahit Pakaian", "Pijat Tradisional"]
};

if (categoryBtn && categoryDropdown) {
    categoryBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Mencegah event click merambat ke window
        categoryDropdown.classList.toggle('active');
    });

    // Menutup menu kategori saat pengguna mengklik di area luar menu
    window.addEventListener('click', (e) => {
        if (!categoryDropdown.contains(e.target)) {
            categoryDropdown.classList.remove('active');
        }
    });
}

// Logika dinamis untuk merender isi menu saat sisi kiri dipilih
if (categorySidebarItems.length > 0 && categoryContentBox) {
    categorySidebarItems.forEach(item => {
        const updateCategory = () => {
            // Hapus kelas active dari semua item
            categorySidebarItems.forEach(i => i.classList.remove('active'));
            // Tambahkan ke item yang dipilih
            item.classList.add('active');
            
            const categoryName = item.textContent.trim();
            const subcats = categoryData[categoryName] || [];
            
            let html = `<h4>${categoryName}</h4><div class="sub-categories">`;
            subcats.forEach(sub => {
                html += `<a href="#" class="cat-link">${sub}</a>`;
            });
            html += `</div>`;
            
            categoryContentBox.innerHTML = html;
            
            // Tambahkan event click pada sub-kategori baru
            const newLinks = categoryContentBox.querySelectorAll('.cat-link');
            newLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Tutup menu
                    categoryDropdown.classList.remove('active');
                    // Isi search box
                    const searchInput = document.getElementById('searchInput');
                    if(searchInput) {
                        searchInput.value = link.textContent;
                        // Gulir (scroll) layar ke bagian grid produk
                        const umkmGrid = document.getElementById('umkmGrid');
                        if (umkmGrid) {
                            umkmGrid.scrollIntoView({behavior: 'smooth', block: 'start'});
                        }
                    }
                });
            });
        };
        
        // Responsif untuk sentuhan di HP maupun sentuhan mouse di PC
        item.addEventListener('mouseenter', updateCategory);
        item.addEventListener('click', updateCategory);
    });
}

// Inisialisasi UMKM Grid di halaman Home (semua kategori)
fetchUMKMData();

// ==========================================
// Halaman Detail Produk (PDP) - Tokopedia Style
// ==========================================
function openProductDetail(umkmId, prodIndex) {
    // Hapus jika sudah ada, lalu masukkan ke depan
    const existingIndex = recentlyViewed.findIndex(item => item.umkmId === umkmId && item.prodIndex === prodIndex);

    if(existingIndex > -1) recentlyViewed.splice(existingIndex, 1);
    recentlyViewed.unshift({umkmId, prodIndex});
    // Batasi 10 terakhir
    if(recentlyViewed.length > 10) recentlyViewed.pop();
    localStorage.setItem(getUserKey("recentlyViewed"), JSON.stringify(recentlyViewed));
    if(typeof renderTerakhirDilihat === "function") renderTerakhirDilihat();
    const umkm = umkmData.find(u => u.id === umkmId);
    if (!umkm || !umkm.products || !umkm.products[prodIndex]) return;

    const product = umkm.products[prodIndex];
    
    // Switch to PDP & Save Session State for Refresh-Proofing
    sessionStorage.setItem('activeStoreId', umkmId);
    sessionStorage.setItem('activeProdIndex', prodIndex);
    switchPage('productPage');
    window.scrollTo(0, 0);

    // Breadcrumbs
    document.getElementById('pdpStoreBreadcrumb').textContent = umkm.name;
    document.getElementById('pdpStoreBreadcrumb').onclick = (e) => {
        e.preventDefault();
        openStore(umkm.id);
    };
    document.getElementById('pdpProductNameBreadcrumb').textContent = product.name;

    // Gallery interactivity
    const mainImg = document.getElementById('pdpMainImage');
    const thumbContainer = document.querySelector('.pdp-thumbnails');
    
    // Split images if multiple images exist
    const images = product.image.split('|||');
    mainImg.src = images[0];
    
    // Clear and rebuild thumbnails dynamically
    thumbContainer.innerHTML = '';
    
    // Only show thumbnails if there are multiple images
    if (images.length > 1) {
        images.forEach((imgSrc, i) => {
            const thumb = document.createElement('img');
            thumb.className = 'pdp-thumb' + (i === 0 ? ' active' : '');
            thumb.src = imgSrc;
            thumb.onclick = () => {
                mainImg.src = imgSrc;
                document.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbContainer.appendChild(thumb);
        });
    }

    // Info Produk
    document.getElementById('pdpProductName').textContent = product.name;
    
    // Randomize stats for demo effect
    const soldCount = Math.floor(Math.random() * 200) + 10;
    const rating = (Math.random() * 1 + 4).toFixed(1);
    
    const pdpSoldCountEl = document.getElementById('pdpSoldCount');
    if (pdpSoldCountEl) pdpSoldCountEl.textContent = soldCount;

    const pdpRatingValueEl = document.getElementById('pdpRatingValue');
    if (pdpRatingValueEl) pdpRatingValueEl.textContent = rating;

    // Price
    document.getElementById('pdpPrice').textContent = 'Rp ' + product.price.toLocaleString('id-ID');

    // Description
    const descText = product.desc ? product.desc : 'Produk unggulan dari ' + umkm.name + '. Kualitas terbaik asli Karanganyar.';
    document.getElementById('pdpDescText').textContent = descText;

    // Store Profile in PDP
    document.getElementById('pdpStoreImage').src = umkm.image;
    document.getElementById('pdpStoreName').innerHTML = `<i class="fas fa-check-circle" style="color: #00AA5B;"></i> ${umkm.name}`;

    // PDP Store Follow Button
    const pdpFollowBtn = document.getElementById('pdpFollowBtn');
    if (pdpFollowBtn) {
        const isFollowed = followedShops.some(s => s.id === umkm.id);
        pdpFollowBtn.textContent = isFollowed ? 'Mengikuti' : 'Follow';
        pdpFollowBtn.style.background = isFollowed ? '#f3f4f5' : '';
        pdpFollowBtn.style.color = isFollowed ? '#6D7588' : '';
        pdpFollowBtn.style.borderColor = isFollowed ? '#E5E7E9' : '';
        pdpFollowBtn.onclick = (e) => {
            toggleFollow(umkm.id, umkm.name, umkm.image, e);
            const nowFollowed = followedShops.some(s => s.id === umkm.id);
            pdpFollowBtn.textContent = nowFollowed ? 'Mengikuti' : 'Follow';
            pdpFollowBtn.style.background = nowFollowed ? '#f3f4f5' : '';
            pdpFollowBtn.style.color = nowFollowed ? '#6D7588' : '';
            pdpFollowBtn.style.borderColor = nowFollowed ? '#E5E7E9' : '';
        };
    }

    // Action Box (Right side)
    document.getElementById('pdpActionThumb').src = images[0];
    
    // Quantity and Subtotal logic
    const qtyInput = document.querySelector('.quantity-control input');
    const minusBtn = document.querySelector('.quantity-control button:first-child');
    const plusBtn = document.querySelector('.quantity-control button:last-child');
    const subtotalEl = document.getElementById('pdpSubtotal');
    
    let currentQty = 1;
    qtyInput.value = currentQty;
    subtotalEl.textContent = 'Rp ' + (product.price * currentQty).toLocaleString('id-ID');
    
    minusBtn.onclick = () => {
        if (currentQty > 1) {
            currentQty--;
            qtyInput.value = currentQty;
            subtotalEl.textContent = 'Rp ' + (product.price * currentQty).toLocaleString('id-ID');
        }
    };
    
    plusBtn.onclick = () => {
        if (currentQty < 99) {
            currentQty++;
            qtyInput.value = currentQty;
            subtotalEl.textContent = 'Rp ' + (product.price * currentQty).toLocaleString('id-ID');
        }
    };

    // Button Tambah ke Keranjang
    const pdpAddToCartBtn = document.getElementById('pdpAddToCartBtn');
    if (pdpAddToCartBtn) {
        pdpAddToCartBtn.onclick = () => {
            if (!currentUser) {
                if (typeof window.openLoginModal === 'function') window.openLoginModal(false);
                if (typeof window.showAuthAlert === 'function') {
                    window.showAuthAlert('Silakan masuk atau daftar untuk menambah ke Keranjang.', 'error');
                }
                return;
            }
            addToCart(umkm, product, currentQty);
            const originalText = pdpAddToCartBtn.innerHTML;
            pdpAddToCartBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
            setTimeout(() => { pdpAddToCartBtn.innerHTML = originalText; }, 1800);
        };
    }

    // Button Beli Langsung -> WhatsApp
    document.getElementById('pdpBuyBtn').onclick = () => {
        if (!currentUser) {
            if (typeof window.openLoginModal === 'function') window.openLoginModal(false);
            if (typeof window.showAuthAlert === 'function') {
                window.showAuthAlert('Silakan masuk atau daftar untuk membeli produk.', 'error');
            }
            return;
        }
        const textMessage = `Halo *${umkm.name}*,\nSaya ${currentUser.displayName || 'Pelanggan'} ingin memesan produk:\n\n- ${product.name} (${currentQty}x) - Rp ${(product.price * currentQty).toLocaleString('id-ID')}\n\n*Total: Rp ${(product.price * currentQty).toLocaleString('id-ID')}*\n\nMohon informasikan ketersediaan dan ongkos kirimnya. Terima kasih!`;
        window.open(`https://wa.me/${umkm.whatsapp}?text=${encodeURIComponent(textMessage)}`, '_blank');
    };

    // Button Chat -> WhatsApp
    document.getElementById('pdpChatBtn').onclick = () => {
        if (!currentUser) {
            if (typeof window.openLoginModal === 'function') window.openLoginModal(false);
            if (typeof window.showAuthAlert === 'function') {
                window.showAuthAlert('Silakan masuk atau daftar untuk menggunakan fitur Chat.', 'error');
            }
            return;
        }
        const textMessage = `Halo ${umkm.owner}, saya ingin bertanya tentang produk ${product.name} yang ada di toko Anda.`;
        window.open(`https://wa.me/${umkm.whatsapp}?text=${encodeURIComponent(textMessage)}`, '_blank');
    };

    // Wishlist Button in PDP
    const pdpWishlistBtn = document.getElementById('pdpWishlistBtn');
    if (pdpWishlistBtn) {
        const isWishlisted = wishlist.some(w => w.umkmId === umkm.id && w.prodIndex === prodIndex);
        if (isWishlisted) {
            pdpWishlistBtn.innerHTML = '<i class="fas fa-heart" style="color:#f44336"></i> Wishlist';
        } else {
            pdpWishlistBtn.innerHTML = '<i class="far fa-heart"></i> Wishlist';
        }
        
        pdpWishlistBtn.onclick = () => {
            if (!currentUser) {
                if (typeof window.openLoginModal === 'function') window.openLoginModal(false);
                if (typeof window.showAuthAlert === 'function') {
                    window.showAuthAlert('Silakan masuk atau daftar untuk menyimpan produk ke Wishlist.', 'error');
                }
                return;
            }
            if (typeof toggleWishlist === 'function') {
                toggleWishlist(umkm.id, prodIndex);
                
                const nowWishlisted = wishlist.some(w => w.umkmId === umkm.id && w.prodIndex === prodIndex);
                if (nowWishlisted) {
                    pdpWishlistBtn.innerHTML = '<i class="fas fa-heart" style="color:#f44336"></i> Wishlist';
                    if (typeof showPdpWishlistPopup === 'function') showPdpWishlistPopup();
                } else {
                    pdpWishlistBtn.innerHTML = '<i class="far fa-heart"></i> Wishlist';
                }
            }
        };
    }

    // Share Button in PDP
    const pdpShareBtn = document.getElementById('pdpShareBtn');
    if (pdpShareBtn) {
        pdpShareBtn.onclick = () => {
            if (typeof window.openPdpShareModal === 'function') {
                window.openPdpShareModal();
            }
        };
    }
}

// ==========================================
// PRODUCT SHARE ENGINE (TOKOPEDIA STYLE)
// ==========================================
window.openPdpShareModal = function() {
    const productName = document.getElementById('pdpProductName')?.innerText || 'Produk UMKM Karanganyar';
    const pageUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: productName,
            text: `Beli ${productName} berkualitas di UMKM Padukuhan Karanganyar!`,
            url: pageUrl
        }).catch(() => {
            showPdpShareModal(pageUrl);
        });
    } else {
        showPdpShareModal(pageUrl);
    }
};

function showPdpShareModal(pageUrl) {
    const modal = document.getElementById('pdpShareModal');
    const input = document.getElementById('shareProductUrlInput');
    if (input) input.value = pageUrl;
    if (modal) {
        modal.style.display = 'flex';
    }
}

window.closePdpShareModal = function() {
    const modal = document.getElementById('pdpShareModal');
    if (modal) modal.style.display = 'none';
};

window.copyProductLink = function() {
    const input = document.getElementById('shareProductUrlInput');
    if (input) {
        navigator.clipboard.writeText(input.value).then(() => {
            if (typeof window.showToast === 'function') {
                window.showToast('🔗 Tautan produk berhasil disalin ke clipboard!');
            } else {
                alert('Tautan produk berhasil disalin!');
            }
            window.closePdpShareModal();
        }).catch(() => {
            input.select();
            document.execCommand('copy');
            if (typeof window.showToast === 'function') {
                window.showToast('🔗 Tautan produk berhasil disalin!');
            }
            window.closePdpShareModal();
        });
    }
};

window.shareProductTo = function(platform) {
    const productName = document.getElementById('pdpProductName')?.innerText || 'Produk UMKM Karanganyar';
    const pageUrl = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Beli ${productName} berkualitas di UMKM Padukuhan Karanganyar!`);

    let targetUrl = '';
    if (platform === 'wa') {
        targetUrl = `https://api.whatsapp.com/send?text=${text}%20${pageUrl}`;
    } else if (platform === 'fb') {
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    } else if (platform === 'twitter') {
        targetUrl = `https://twitter.com/intent/tweet?text=${text}&url=${pageUrl}`;
    }

    if (targetUrl) {
        window.open(targetUrl, '_blank', 'width=600,height=500');
        window.closePdpShareModal();
    }
};

// SPA Router on Load
window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    if(hash === '#terms') {
        switchPage('termsPage');
    } else if (hash === '#privacy') {
        switchPage('privacyPage');
    } else if (hash === '#faq') {
        switchPage('faqPage');
    } else if (hash === '#tentang') {
        switchPage('tentangPage');
    }
});


/* ======================= BIODATA MODALS ======================= */
const dobModal = document.getElementById('dobModal');
const genderModal = document.getElementById('genderModal');
const btnDob = document.getElementById('btnDob');
const btnGender = document.getElementById('btnGender');
const displayDob = document.getElementById('displayDob');
const displayGender = document.getElementById('displayGender');

// Populate DOB Selects
const dobDay = document.getElementById('dobDay');
const dobMonth = document.getElementById('dobMonth');
const dobYear = document.getElementById('dobYear');

if(dobDay) {
    for (let i = 1; i <= 31; i++) {
        let opt = document.createElement('option');
        opt.value = i; opt.textContent = i;
        dobDay.appendChild(opt);
    }
}
if(dobMonth) {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    months.forEach((m, i) => {
        let opt = document.createElement('option');
        opt.value = i + 1; opt.textContent = m;
        dobMonth.appendChild(opt);
    });
}
if(dobYear) {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= 1950; i--) {
        let opt = document.createElement('option');
        opt.value = i; opt.textContent = i;
        dobYear.appendChild(opt);
    }
}

function loadBiodataExtras() {
    if(!currentUser) return;
    const extrasStr = localStorage.getItem('user_profile_' + currentUser.uid);
    if(extrasStr) {
        const extras = JSON.parse(extrasStr);
        if(extras.dob) {
            if(displayDob) {
                displayDob.textContent = extras.dob;
                displayDob.style.display = 'inline';
            }
            if(btnDob) btnDob.textContent = 'Ubah';
        }
        if(extras.gender) {
            if(displayGender) {
                displayGender.textContent = extras.gender;
                displayGender.style.display = 'inline';
            }
            if(btnGender) btnGender.textContent = 'Ubah';
        }
    }
    const phone = localStorage.getItem('phone_' + currentUser.uid);
    const displayEditPhone = document.getElementById('displayEditPhone');
    const btnEditPhone = document.getElementById('btnEditPhone');
    if(phone) {
        if(displayEditPhone) {
            displayEditPhone.textContent = phone;
            displayEditPhone.style.display = 'inline-block';
        }
        if(btnEditPhone) btnEditPhone.textContent = 'Ubah';
    }
}

if(btnDob) {
    btnDob.addEventListener('click', (e) => {
        e.preventDefault();
        if(dobModal) dobModal.classList.add('active');
    });
}
if(btnGender) {
    btnGender.addEventListener('click', (e) => {
        e.preventDefault();
        if(genderModal) genderModal.classList.add('active');
    });
}

const closeDobModal = document.getElementById('closeDobModal');
if(closeDobModal) {
    closeDobModal.addEventListener('click', () => dobModal.classList.remove('active'));
}
const closeGenderModal = document.getElementById('closeGenderModal');
if(closeGenderModal) {
    closeGenderModal.addEventListener('click', () => genderModal.classList.remove('active'));
}

const saveDobBtn = document.getElementById('saveDobBtn');
if(saveDobBtn) {
    saveDobBtn.addEventListener('click', () => {
        if(!currentUser) {
            alert("Harap login terlebih dahulu.");
            return;
        }
        if(!dobDay.value || !dobMonth.value || !dobYear.value) {
            if(typeof showToast === 'function') showToast("Pilih tanggal, bulan, dan tahun terlebih dahulu", "error");
            return;
        }
        const dobStr = `${dobDay.value} ${dobMonth.options[dobMonth.selectedIndex].text} ${dobYear.value}`;
        
        let extras = JSON.parse(localStorage.getItem('user_profile_' + currentUser.uid) || '{}');
        extras.dob = dobStr;
        localStorage.setItem('user_profile_' + currentUser.uid, JSON.stringify(extras));
        
        currentUser.dob = dobStr;
        if (typeof window.saveRegisteredUser === 'function') {
            window.saveRegisteredUser(currentUser);
        }

        dobModal.classList.remove('active');
        loadBiodataExtras();
        if(typeof showToast === 'function') showToast("Tanggal lahir berhasil disimpan", "success");
    });
}

const saveGenderBtn = document.getElementById('saveGenderBtn');
if(saveGenderBtn) {
    saveGenderBtn.addEventListener('click', () => {
        if(!currentUser) {
            alert("Harap login terlebih dahulu.");
            return;
        }
        const selectedGender = document.querySelector('input[name="genderRadio"]:checked');
        if(!selectedGender) {
            if(typeof showToast === 'function') showToast("Pilih jenis kelamin terlebih dahulu", "error");
            return;
        }
        
        let extras = JSON.parse(localStorage.getItem('user_profile_' + currentUser.uid) || '{}');
        extras.gender = selectedGender.value;
        localStorage.setItem('user_profile_' + currentUser.uid, JSON.stringify(extras));
        
        currentUser.gender = selectedGender.value;
        if (typeof window.saveRegisteredUser === 'function') {
            window.saveRegisteredUser(currentUser);
        }

        genderModal.classList.remove('active');
        loadBiodataExtras();
        if(typeof showToast === 'function') showToast("Jenis kelamin berhasil disimpan", "success");
    });
}


/* ======================= PHOTO MODAL ======================= */
const photoModal = document.getElementById('photoModal');
const btnPilihFoto = document.getElementById('btnPilihFoto');
const closePhotoModal = document.getElementById('closePhotoModal');
const defaultAvatarsContainer = document.getElementById('defaultAvatarsContainer');
const uploadPhotoInput = document.getElementById('uploadPhotoInput');

if(btnPilihFoto) {
    btnPilihFoto.addEventListener('click', (e) => {
        e.preventDefault();
        if(!currentUser) return alert("Harap login terlebih dahulu.");
        
        // Populate default avatars if empty
        if(defaultAvatarsContainer && defaultAvatarsContainer.innerHTML.trim() === '') {
            const seeds = ['Milo', 'Bella', 'Charlie', 'Luna', 'Oliver', 'Lucy'];
            seeds.forEach(seed => {
                const url = `https://api.dicebear.com/9.x/micah/svg?seed=${seed}&mouth=smile,laughing&backgroundColor=b6e3f4`;
                const img = document.createElement('img');
                img.src = url;
                img.style.width = '60px';
                img.style.height = '60px';
                img.style.borderRadius = '50%';
                img.style.cursor = 'pointer';
                img.style.border = '2px solid transparent';
                img.style.transition = 'all 0.2s';
                
                img.onmouseover = () => img.style.borderColor = '#03AC0E';
                img.onmouseout = () => img.style.borderColor = 'transparent';
                
                img.onclick = () => updateProfileAvatar(url);
                
                defaultAvatarsContainer.appendChild(img);
            });
        }
        
        if(photoModal) photoModal.classList.add('active');
    });
}

if(closePhotoModal) {
    closePhotoModal.addEventListener('click', () => {
        if(photoModal) photoModal.classList.remove('active');
    });
}

if(uploadPhotoInput) {
    uploadPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        // Check size (10MB)
        if(file.size > 10000000) {
            if(typeof showToast === 'function') showToast("Ukuran file maksimal 10MB", "error");
            else alert("Ukuran file maksimal 10MB");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            updateProfileAvatar(event.target.result);
        };
        reader.readAsDataURL(file);
    });
}

function updateProfileAvatar(url) {
    const activeUid = localStorage.getItem('umkm_active_uid') || (currentUser ? currentUser.uid : null);
    if (!activeUid) return;
    
    const applyAvatar = () => {
        const avatars = [
            document.getElementById('userAvatar'),
            document.getElementById('dropdownAvatar'),
            document.getElementById('profilePageAvatar'),
            document.getElementById('profileEditAvatar')
        ];
        avatars.forEach(av => {
            if(av) av.src = url;
        });
        if(photoModal) photoModal.classList.remove('active');
        if(typeof showToast === 'function') showToast("Foto profil berhasil diubah", "success");
    };

    try {
        localStorage.setItem('local_avatar_' + activeUid, url);
    } catch (e) {
        console.warn("Local avatar set warning:", e);
    }

    if (currentUser) {
        currentUser.photoURL = url;
        if (typeof window.saveRegisteredUser === 'function') {
            window.saveRegisteredUser(currentUser);
        }
        if (currentUser.updateProfile && !url.startsWith('data:')) {
            currentUser.updateProfile({ photoURL: url }).catch(() => {});
        }
    }

    applyAvatar();
}


/* ======================= NAME MODAL ======================= */
const btnEditName = document.getElementById('btnEditName');
const nameModal = document.getElementById('nameModal');
const closeNameModal = document.getElementById('closeNameModal');
const nameInputModal = document.getElementById('nameInputModal');
const saveNameBtn = document.getElementById('saveNameBtn');
let originalName = '';

if(btnEditName) {
    btnEditName.addEventListener('click', (e) => {
        e.preventDefault();
        if(!currentUser) {
            if(typeof showToast === 'function') showToast("Silakan login terlebih dahulu", "error");
            return;
        }
        originalName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Pengguna');
        nameInputModal.value = originalName;
        saveNameBtn.classList.add('tkp-btn-disabled');
        saveNameBtn.classList.remove('tkp-btn-active');
        nameModal.classList.add('active');
    });
}

if(closeNameModal) {
    closeNameModal.addEventListener('click', () => {
        nameModal.classList.remove('active');
    });
}

if(nameInputModal) {
    nameInputModal.addEventListener('input', () => {
        if(nameInputModal.value.trim() !== '' && nameInputModal.value.trim() !== originalName) {
            saveNameBtn.classList.remove('tkp-btn-disabled');
            saveNameBtn.classList.add('tkp-btn-active');
        } else {
            saveNameBtn.classList.add('tkp-btn-disabled');
            saveNameBtn.classList.remove('tkp-btn-active');
        }
    });
}

if(saveNameBtn) {
    saveNameBtn.addEventListener('click', () => {
        if(saveNameBtn.classList.contains('tkp-btn-disabled')) return;
        
        const newName = nameInputModal.value.trim();
        if(newName.length === 0) return;
        
        if(!currentUser) return;
        
        saveNameBtn.textContent = 'Menyimpan...';
        currentUser.displayName = newName;
        if (typeof window.saveRegisteredUser === 'function') {
            window.saveRegisteredUser(currentUser);
        }

        const updateFn = currentUser.updateProfile ? currentUser.updateProfile({ displayName: newName }) : Promise.resolve();
        updateFn
            .then(() => {
                saveNameBtn.textContent = 'Simpan';
                nameModal.classList.remove('active');
                if(typeof showToast === 'function') showToast("Nama berhasil diubah", "success");
                
                // Update UI elements
                const profilePageName = document.getElementById('profilePageName');
                if(profilePageName) profilePageName.textContent = newName;
                
                const displayEditName = document.getElementById('displayEditName');
                if(displayEditName) displayEditName.textContent = newName;
                
                const profileEditName = document.getElementById('profileEditName');
                if(profileEditName) profileEditName.value = newName;
                
                const userNameDisplay = document.getElementById('userNameDisplay');
                if(userNameDisplay) userNameDisplay.textContent = newName.split(' ')[0];
                
                const dropdownName = document.getElementById('dropdownName');
                if(dropdownName) dropdownName.textContent = newName;
                
            })
            .catch((error) => {
                saveNameBtn.textContent = 'Simpan';
                if(typeof showToast === 'function') showToast("Gagal mengubah nama: " + error.message, "error");
            });
    });
}


/* ======================= PHONE MODAL ======================= */
const btnEditPhone = document.getElementById('btnEditPhone');
const phoneModal = document.getElementById('phoneModal');
const closePhoneModal = document.getElementById('closePhoneModal');
const phoneInputModal = document.getElementById('phoneInputModal');
const savePhoneBtn = document.getElementById('savePhoneBtn');
let originalPhone = '';

if(btnEditPhone) {
    btnEditPhone.addEventListener('click', (e) => {
        e.preventDefault();
        if(!currentUser) {
            if(typeof showToast === 'function') showToast("Silakan login terlebih dahulu", "error");
            return;
        }
        // Assuming phone is stored in localStorage temporarily if not in custom claims, or just check displayEditPhone text
        const displayEditPhone = document.getElementById('displayEditPhone');
        originalPhone = (displayEditPhone && displayEditPhone.textContent && displayEditPhone.textContent !== '...' && displayEditPhone.textContent !== '') ? displayEditPhone.textContent : '';
        phoneInputModal.value = originalPhone;
        
        savePhoneBtn.classList.add('tkp-btn-disabled');
        savePhoneBtn.classList.remove('tkp-btn-active');
        phoneModal.classList.add('active');
    });
}

if(closePhoneModal) {
    closePhoneModal.addEventListener('click', () => {
        phoneModal.classList.remove('active');
    });
}

if(phoneInputModal) {
    phoneInputModal.addEventListener('input', () => {
        const currentBtn = document.getElementById('savePhoneBtn');
        if(!currentBtn) return;
        if(phoneInputModal.value.trim() !== '' && phoneInputModal.value.trim() !== originalPhone) {
            currentBtn.classList.remove('tkp-btn-disabled');
            currentBtn.classList.add('tkp-btn-active');
        } else {
            currentBtn.classList.add('tkp-btn-disabled');
            currentBtn.classList.remove('tkp-btn-active');
        }
    });
}

// Simple direct save logic
if(savePhoneBtn) {
    savePhoneBtn.addEventListener('click', () => {
        if(savePhoneBtn.classList.contains('tkp-btn-disabled')) return;
        
        let newPhone = phoneInputModal.value.trim();
        if(newPhone.length === 0) return;
        
        // Save directly to localStorage
        if(currentUser) {
            localStorage.setItem('phone_' + currentUser.uid, newPhone);
        } else {
            localStorage.setItem('phone_guest', newPhone);
        }
        
        // Update UI
        const displayEditPhone = document.getElementById('displayEditPhone');
        const btnPhone = document.getElementById('btnEditPhone');
        if(displayEditPhone) {
            displayEditPhone.textContent = newPhone;
            displayEditPhone.style.display = 'inline-block';
            if(btnPhone) btnPhone.textContent = 'Ubah';
        }
        
        // Close modal
        phoneModal.classList.remove('active');
        
        // Show success toast
        if(typeof showToast === 'function') {
            showToast("Nomor HP berhasil disimpan!", "success");
        }
    });
}

/* ======================= PASSWORD MODAL ======================= */
const btnChangePassword = document.getElementById('btnChangePassword');
const passwordModal = document.getElementById('passwordModal');
const closePasswordModal = document.getElementById('closePasswordModal');
const newPasswordInput = document.getElementById('newPasswordInput');
const btnSaveNewPassword = document.getElementById('btnSaveNewPassword');

if (btnChangePassword) {
    btnChangePassword.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) {
            if (typeof showToast === 'function') showToast("Silakan login terlebih dahulu", "error");
            return;
        }
        if (newPasswordInput) newPasswordInput.value = '';
        if (passwordModal) passwordModal.classList.add('active');
    });
}

if (closePasswordModal) {
    closePasswordModal.addEventListener('click', () => {
        if (passwordModal) passwordModal.classList.remove('active');
    });
}

if (btnSaveNewPassword) {
    btnSaveNewPassword.addEventListener('click', async () => {
        if (!currentUser) return;
        const newPass = newPasswordInput ? newPasswordInput.value.trim() : '';

        if (!newPass) {
            if (typeof showToast === 'function') showToast("Masukkan kata sandi baru", "error");
            return;
        }
        if (newPass.length < 6) {
            if (typeof showToast === 'function') showToast("Kata sandi minimal 6 karakter", "error");
            return;
        }

        btnSaveNewPassword.textContent = "Menyimpan...";

        // 1. Update in Firebase Auth SDK if user is authenticated via Firebase
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
            try {
                await firebase.auth().currentUser.updatePassword(newPass);
            } catch (err) {
                console.warn("Firebase updatePassword error:", err);
                if (err.code === 'auth/requires-recent-login') {
                    if (typeof showToast === 'function') showToast("Sesi login perlu diperbarui. Silakan login ulang.", "error");
                    if (passwordModal) passwordModal.classList.remove('active');
                    if (typeof window.logoutUser === 'function') window.logoutUser();
                    return;
                }
            }
        }

        // 2. Update user object and sync to Firebase Realtime DB & local storage
        currentUser.password = newPass;
        if (typeof window.saveRegisteredUser === 'function') {
            window.saveRegisteredUser(currentUser);
        }

        if (passwordModal) passwordModal.classList.remove('active');
        btnSaveNewPassword.textContent = "Simpan Kata Sandi";

        // 3. AUTOMATIC LOGOUT & SWITCH TO TENTANG KARANGANYAR PAGE
        if (typeof window.logoutUser === 'function') {
            window.logoutUser(false, 'tentangPage');
        } else if (typeof switchPage === 'function') {
            switchPage('tentangPage');
        }

        setTimeout(() => {
            if (typeof window.showAuthAlert === 'function') {
                window.showAuthAlert('Kata sandi telah berhasil diubah! Anda telah keluar secara otomatis. Silakan masuk kembali menggunakan kata sandi baru Anda.', 'success');
            }
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('hidden');
        }, 300);
    });
}

// Tokopedia Transparent Header Logic
function updateHeaderMode() {
    const header = document.querySelector('.header');
    if(document.body.classList.contains('home-mode')) {
        if(window.scrollY < 50) {
            header.classList.add('transparent-mode');
        } else {
            header.classList.remove('transparent-mode');
        }
    } else {
        header.classList.remove('transparent-mode');
    }
}

window.addEventListener('scroll', updateHeaderMode);


// ==================== WISHLIST & FAVORITES STATE ====================



function toggleWishlist(umkmId, prodIndex) {
    if (!currentUser) {
        if (typeof window.openLoginModal === 'function') window.openLoginModal(false);
        if (typeof window.showAuthAlert === 'function') {
            window.showAuthAlert('Silakan masuk atau daftar untuk menyimpan produk ke Wishlist.', 'error');
        }
        return;
    }
    const existingIndex = wishlist.findIndex(item => item.umkmId === umkmId && item.prodIndex === prodIndex);
    if (existingIndex > -1) {
        wishlist.splice(existingIndex, 1);
        if(typeof showToast === 'function') showToast("Dihapus dari Wishlist");
    } else {
        wishlist.push({ umkmId, prodIndex });
        if(typeof showToast === 'function') showToast("Ditambahkan ke Wishlist", "success");
    }
    localStorage.setItem(getUserKey("wishlist"), JSON.stringify(wishlist));
    
    // Jika sedang di halaman wishlist, re-render
    const wishlistPage = document.getElementById('wishlistPage');
    if (wishlistPage && !wishlistPage.classList.contains('hidden')) {
        renderWishlist();
    }
    
    // Jika sedang di halaman toko, re-render tombol love-nya (simple trick: klik ulang tab produk/refresh)
    // atau biarkan re-render manual jika perlu
}

function renderWishlist() {
    const emptyState = document.getElementById('wishlistEmpty');
    const filledState = document.getElementById('wishlistFilled');
    const grid = document.getElementById('wishlistGrid');
    
    if (wishlist.length === 0) {
        if(emptyState) emptyState.style.display = 'flex';
        if(filledState) filledState.classList.add('hidden');
    } else {
        if(emptyState) emptyState.style.display = 'none';
        if(filledState) filledState.classList.remove('hidden');
        
        grid.innerHTML = '';
        wishlist.forEach(item => {
            const umkm = umkmData.find(u => u.id === item.umkmId);
            if(umkm && umkm.products[item.prodIndex]) {
                const product = umkm.products[item.prodIndex];
                const productCard = document.createElement('div');
                productCard.className = 'product-card reveal active';
                
                productCard.innerHTML = `
                    <div style="position:relative;">
                        <img src="${product.image}" alt="${product.name}" class="prod-img">
                        <button onclick="event.stopPropagation(); toggleWishlist('${umkm.id}', ${item.prodIndex})" style="position:absolute; top:8px; right:8px; background:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.1); border:none; cursor:pointer; color:#f44336; z-index: 10;">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="prod-info">
                        <h3 class="prod-name">${product.name}</h3>
                        <p class="prod-price">Rp ${product.price.toLocaleString('id-ID')}</p>
                        <div class="prod-shop"><i class="fas fa-check-circle" style="color:#00AA5B;"></i> ${umkm.name}</div>
                    </div>
                `;
                productCard.onclick = () => openProductDetail(umkm.id, item.prodIndex);
                grid.appendChild(productCard);
            }
        });
    }
}

function switchFavTab(tab) {
    localStorage.setItem('activeFavTab', tab);
    const tabToko = document.getElementById('tabTokoFavorit');
    const tabTerakhir = document.getElementById('tabTerakhirDilihat');
    const contentToko = document.getElementById('contentTokoFavorit');
    const contentTerakhir = document.getElementById('contentTerakhirDilihat');
    
    if (tab === 'toko') {
        tabToko.style.color = 'var(--primary)';
        tabToko.style.borderBottom = '3px solid var(--primary)';
        tabTerakhir.style.color = '#6D7588';
        tabTerakhir.style.borderBottom = 'none';
        
        contentToko.classList.remove('hidden');
        contentTerakhir.classList.add('hidden');
    } else {
        tabTerakhir.style.color = 'var(--primary)';
        tabTerakhir.style.borderBottom = '3px solid var(--primary)';
        tabToko.style.color = '#6D7588';
        tabToko.style.borderBottom = 'none';
        
        contentTerakhir.classList.remove('hidden');
        contentToko.classList.add('hidden');
        
        renderTerakhirDilihat();
    }
}

function renderTerakhirDilihat() {
    const emptyState = document.getElementById('terakhirDilihatEmpty');
    const filledState = document.getElementById('terakhirDilihatFilled');
    const grid = document.getElementById('terakhirGrid');
    
    if (recentlyViewed.length === 0) {
        if(emptyState) emptyState.style.display = 'flex';
        if(filledState) filledState.classList.add('hidden');
    } else {
        if(emptyState) emptyState.style.display = 'none';
        if(filledState) filledState.classList.remove('hidden');
        
        grid.innerHTML = '';
        recentlyViewed.forEach(item => {
            const umkm = umkmData.find(u => u.id === item.umkmId);
            if(umkm && umkm.products[item.prodIndex]) {
                const product = umkm.products[item.prodIndex];
                const isWishlisted = wishlist.some(w => w.umkmId === umkm.id && w.prodIndex === item.prodIndex);
                const productCard = document.createElement('div');
                productCard.className = 'product-card reveal active';
                
                productCard.innerHTML = `
                    <div style="position:relative;">
                        <img src="${product.image}" alt="${product.name}" class="prod-img">
                        <button onclick="event.stopPropagation(); toggleWishlist('${umkm.id}', ${item.prodIndex}); renderTerakhirDilihat();" style="position:absolute; top:8px; right:8px; background:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.1); border:none; cursor:pointer; color:${isWishlisted ? '#f44336' : '#ccc'}; z-index: 10;">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="prod-info">
                        <h3 class="prod-name">${product.name}</h3>
                        <p class="prod-price">Rp ${product.price.toLocaleString('id-ID')}</p>
                        <div class="prod-shop"><i class="fas fa-check-circle" style="color:#00AA5B;"></i> ${umkm.name}</div>
                    </div>
                `;
                productCard.onclick = () => openProductDetail(umkm.id, item.prodIndex);
                grid.appendChild(productCard);
            }
        });
    }
}
// ====================================================================

// ==========================================
// LOGIKA KOLEKSI WISHLIST
// ==========================================

function openModalBuatKoleksi() {
    document.getElementById('modalBuatKoleksi').classList.add('active');
    document.getElementById('inputNamaKoleksi').focus();
}

function closeModalBuatKoleksi() {
    document.getElementById('modalBuatKoleksi').classList.remove('active');
}

function updateKoleksiCharCount(val) {
    document.getElementById('koleksiCharCount').innerText = val.length + '/20';
    const btn = document.getElementById('btnSubmitKoleksi');
    if(val.trim().length > 0) {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
    } else {
        btn.disabled = true;
        btn.classList.add('btn-disabled');
    }
}



function submitKoleksi() {
    const name = document.getElementById('inputNamaKoleksi').value.trim();
    if(!name) return;
    
    userCollections.push(name);
    localStorage.setItem(getUserKey("userCollections"), JSON.stringify(userCollections));
    
    // Hide default empty state
    document.getElementById('wishlistEmpty').classList.add('hidden');
    document.getElementById('wishlistCollectionView').classList.add('hidden');
    
    // Show Collections Grid
    document.getElementById('wishlistFilled').classList.remove('hidden');
    
    // Update the card name
    document.getElementById('cardCollectionName').innerText = name;
    const ucc1 = document.getElementById('userCollectionCard'); if(ucc1) ucc1.style.display = 'block'; // Show the custom card
    
    closeModalBuatKoleksi();
}

function openCollection(name) {
    if (name === 'Custom') name = document.getElementById('cardCollectionName').innerText;
    
    // Hide grid
    document.getElementById('wishlistFilled').classList.add('hidden');
    document.getElementById('wishlistEmpty').classList.add('hidden');
    
    // Show specific collection view
    document.getElementById('wishlistCollectionView').classList.remove('hidden');
    document.getElementById('koleksiTitle').innerText = name;
    document.getElementById('breadcrumbKoleksiName').innerText = name;
}

function showWishlistEmpty() {
    // Go back to Collections Grid (or empty state if no collections)
    document.getElementById('wishlistCollectionView').classList.add('hidden');
    if(userCollections.length > 0) {
        document.getElementById('wishlistFilled').classList.remove('hidden');
    } else {
        document.getElementById('wishlistEmpty').classList.remove('hidden');
    }
}

function openModalUbahKoleksi() {
    // Check if we are opening from the Grid or from inside the Collection View
    const dropdownMenu = document.getElementById('collectionDropdownMenu');
    let currentName = '';
    
    if(!document.getElementById('wishlistFilled').classList.contains('hidden')) {
        // Opened from Grid
        currentName = document.getElementById('cardCollectionName').innerText;
    } else {
        // Opened from Collection View
        currentName = document.getElementById('koleksiTitle').innerText;
    }
    
    const input = document.getElementById('inputUbahKoleksi');
    input.value = currentName;
    
    document.getElementById('modalUbahKoleksi').classList.add('active');
    input.focus();
    updateUbahKoleksiCharCount(currentName, currentName);
}

function closeModalUbahKoleksi() {
    document.getElementById('modalUbahKoleksi').classList.remove('active');
}

function updateUbahKoleksiCharCount(val, originalName) {
    if(!originalName) {
        if(!document.getElementById('wishlistFilled').classList.contains('hidden')) {
            originalName = document.getElementById('cardCollectionName').innerText;
        } else {
            originalName = document.getElementById('koleksiTitle').innerText;
        }
    }
    
    document.getElementById('ubahKoleksiCharCount').innerText = val.length + '/20';
    const btn = document.getElementById('btnSubmitUbahKoleksi');
    
    if(val.trim().length > 0 && val.trim() !== originalName) {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
    } else {
        btn.disabled = true;
        btn.classList.add('btn-disabled');
    }
}

function submitUbahKoleksi() {
    const name = document.getElementById('inputUbahKoleksi').value.trim();
    if(!name) return;
    
    // Update both places
    document.getElementById('cardCollectionName').innerText = name;
    document.getElementById('koleksiTitle').innerText = name;
    document.getElementById('breadcrumbKoleksiName').innerText = name;
    
    closeModalUbahKoleksi();
}

// 3-Dots Menu Logic
function toggleCollectionMenu(e) {
    e.stopPropagation(); // Prevent card click
    const menu = document.getElementById('collectionDropdownMenu');
    menu.classList.toggle('hidden');
}

function closeCollectionMenu() {
    const menu = document.getElementById('collectionDropdownMenu');
    if(menu) menu.classList.add('hidden');
}

function hapusKoleksi() {
    closeCollectionMenu();
    userCollections = [];
    localStorage.setItem(getUserKey("userCollections"), JSON.stringify(userCollections));
    const ucc2 = document.getElementById('userCollectionCard'); if(ucc2) ucc2.style.display = 'none';
    
    // Optional: If you want it to go back to empty state when all custom collections are deleted
    if(userCollections.length === 0) {
        const grid = document.getElementById('wishlistFilled');
        grid.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        grid.style.opacity = '0';
        grid.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            grid.classList.add('hidden');
            grid.style.opacity = '1';
            grid.style.transform = 'translateY(0)';
            
            document.getElementById('wishlistCollectionView').classList.add('hidden');
            
            const emptyState = document.getElementById('wishlistEmpty');
            emptyState.classList.remove('hidden');
            
            // Re-trigger enter animation
            emptyState.classList.remove('page-enter');
            void emptyState.offsetWidth;
            emptyState.classList.add('page-enter');
        }, 400);
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('collectionDropdownMenu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.collection-menu-wrapper')) {
        menu.classList.add('hidden');
    }
});


// ==========================================
// LOGIKA TOKO FAVORIT & IKUTI (FOLLOW)
// ==========================================

// Auth guard helper untuk aksi yang memerlukan login
function requireAuthForAction(actionLabel, callback) {
    if (!currentUser) {
        if (typeof window.openLoginModal === 'function') window.openLoginModal(false);
        if (typeof window.showAuthAlert === 'function') {
            window.showAuthAlert(`Silakan masuk atau daftar untuk ${actionLabel}.`, 'error');
        }
        return false;
    }
    if (typeof callback === 'function') callback();
    return true;
}

// Auth guard untuk tombol Chat di store
window.requireAuthForChat = function(whatsapp, owner) {
    requireAuthForAction('menggunakan fitur Chat', () => {
        const text = `Halo ${owner}, saya tertarik dengan produk Anda di Pasar Karanganyar.`;
        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
    });
};

function toggleFollow(id, name, imgUrl, e) {
    if(e) e.stopPropagation();

    // Auth Guard: Harus login untuk ikuti toko
    if (!currentUser) {
        if (typeof window.openLoginModal === 'function') window.openLoginModal(false);
        if (typeof window.showAuthAlert === 'function') {
            window.showAuthAlert('Silakan masuk atau daftar untuk mengikuti toko ini.', 'error');
        }
        return;
    }

    const btnId = 'btnFollow_' + id;
    const btn = document.getElementById(btnId);
    
    const index = followedShops.findIndex(shop => shop.id === id);
    
    if (index === -1) {
        // Not followed -> Follow
        followedShops.push({ id, name, imgUrl });
        if(btn) {
            btn.innerText = 'Mengikuti';
            btn.style.background = '#f3f4f5';
            btn.style.color = '#6D7588';
            btn.style.borderColor = '#E5E7E9';
        }
    } else {
        // Followed -> Unfollow
        followedShops.splice(index, 1);
        if(btn) {
            btn.innerText = 'Ikuti';
            btn.style.background = 'white';
            btn.style.color = 'var(--primary)';
            btn.style.borderColor = 'var(--primary)';
        }
    }
    
    localStorage.setItem(getUserKey("followedShops"), JSON.stringify(followedShops));
    renderFavoriteShops();
}

// Fungsi kembali dari PDP ke Store
window.goBackToStoreFromPDP = function(e) {
    if(e) e.preventDefault();
    const savedStoreId = sessionStorage.getItem('activeStoreId');
    if (savedStoreId && typeof openStore === 'function') {
        openStore(savedStoreId);
    } else {
        switchPage('homePage');
    }
};

// Render Toko Favorit Grid
function renderFavoriteShops() {
    const emptyState = document.getElementById('tokoFavoritEmpty');
    const filledState = document.getElementById('tokoFavoritFilled');
    const grid = document.getElementById('tokoFavoritGrid');
    
    if(!grid) return;
    
    if(followedShops.length === 0) {
        // Show empty state with animation
        filledState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.classList.remove('page-enter');
        void emptyState.offsetWidth; // trigger reflow
        emptyState.classList.add('page-enter');
    } else {
        emptyState.classList.add('hidden');
        filledState.classList.remove('hidden');
        
        // Render shops (using CSS Grid to make it compact like Tokopedia)
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
        grid.style.gap = '20px';
        grid.style.flexDirection = 'unset';

        grid.innerHTML = followedShops.map(shop => {
            // Find shop in umkmData
            const shopData = typeof umkmData !== 'undefined' ? umkmData.find(s => s.id === shop.id) : null;
            let productThumbnails = '';
            
            if (shopData && shopData.products && shopData.products.length > 0) {
                const limit = Math.min(3, shopData.products.length);
                for(let i=0; i<limit; i++) {
                    productThumbnails += `<img src="${shopData.products[i].image}" style="width: 65px; height: 65px; object-fit: cover; border-radius: 8px; border: 1px solid #E5E7E9;">`;
                }
            }
            
            return `
            <div style="background: white; border: 1px solid #E5E7E9; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 12px; width: 100%;">
                <!-- Header Toko -->
                <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${shop.imgUrl}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid #E5E7E9;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-check-circle" style="color: #9C27B0; font-size: 0.85rem;"></i>
                                <h4 style="margin: 0; font-size: 1rem; color: #31353B; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${shop.name}</h4>
                            </div>
                            <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #6D7588;"><i class="fas fa-map-marker-alt"></i> Kab. Karanganyar</p>
                        </div>
                    </div>
                    <button onclick="toggleFollow('${shop.id}', '${shop.name}', '${shop.imgUrl}', event)" style="padding: 6px 15px; font-weight: 700; font-size: 0.85rem; background: white; border: 1px solid #E5E7E9; color: #6D7588; border-radius: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#f3f4f5'" onmouseout="this.style.background='white'">Following</button>
                </div>
                
                ${productThumbnails ? `
                <!-- Separator -->
                <div style="height: 1px; background: #E5E7E9; width: 100%;"></div>
                
                <!-- Produk Sample -->
                <div style="display: flex; gap: 10px;">
                    ${productThumbnails}
                </div>
                ` : ''}
            </div>
        `}).join('');
    }
}


// ==========================================
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if(typeof renderFavoriteShops === 'function') renderFavoriteShops();
    if(typeof renderTerakhirDilihat === "function") renderTerakhirDilihat();
    const activeFavTab = localStorage.getItem('activeFavTab');
    if (activeFavTab) {
        if(typeof switchFavTab === 'function') switchFavTab(activeFavTab);
    }

    // Attach theme card click handlers per active user UID
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const themeVal = card.getAttribute('data-value');
            if (!themeVal) return;
            const activeUid = localStorage.getItem('umkm_active_uid') || (currentUser ? currentUser.uid : 'guest');
            localStorage.setItem('umkm_theme_' + activeUid, themeVal);
            
            if (typeof window.applyUserTheme === 'function') {
                window.applyUserTheme(themeVal);
            }
            
            const notif = document.getElementById('themeAppliedNotif');
            if (notif) {
                notif.style.display = 'block';
                setTimeout(() => { notif.style.display = 'none'; }, 3000);
            }
        });
    });

    if (typeof window.applyUserTheme === 'function') {
        window.applyUserTheme();
    }

    // Auto-load berita pada inisialisasi
    if (typeof window.loadBerita === 'function') {
        window.loadBerita();
    }
});

// ==========================================
// KELOLA DATA BERITA DESA PENGUNJUNG
// ==========================================
const BERITA_DATABASE_URL = 'https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/beritaData.json';
let beritaItems = [];

function escapeBeritaText(text) {
    return String(text || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

window.loadBerita = async function() {
    const beritaList = document.getElementById('beritaList');
    const beritaEmpty = document.getElementById('beritaEmpty');
    if (!beritaList) return;
    try {
        const response = await fetch(BERITA_DATABASE_URL);
        const data = await response.json();
        beritaItems = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
        beritaItems.sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));

        if (!beritaItems.length) {
            beritaList.innerHTML = '';
            if (beritaEmpty) {
                beritaEmpty.textContent = 'Belum ada berita yang dipublikasikan.';
                beritaEmpty.classList.remove('hidden');
            }
            return;
        }

        if (beritaEmpty) beritaEmpty.classList.add('hidden');
        beritaList.innerHTML = beritaItems.map(item => `
            <article class="berita-article" data-berita-title="${escapeBeritaText(item.judul)}" data-berita-id="${escapeBeritaText(item.id)}" onclick="showBeritaDetail('${item.id}')" tabindex="0" role="button">
                ${item.fotoUtama ? `<img src="${escapeBeritaText(item.fotoUtama)}" alt="${escapeBeritaText(item.judul)}" class="berita-article-image">` : ''}
                <time><i class="far fa-calendar-alt"></i> ${escapeBeritaText(item.tanggal)}</time>
                <h2>${escapeBeritaText(item.judul)}</h2>
                <p class="berita-article-excerpt">${escapeBeritaText(item.deskripsiAwal)}</p>
            </article>
        `).join('');
    } catch (error) {
        console.error('Gagal memuat berita:', error);
        beritaList.innerHTML = '';
        if (beritaEmpty) {
            beritaEmpty.textContent = 'Gagal memuat berita. Silakan coba lagi.';
            beritaEmpty.classList.remove('hidden');
        }
    }
};

window.showBeritaDetail = function(id) {
    const item = beritaItems.find(berita => berita.id === id);
    const detail = document.getElementById('beritaDetail');
    const listSection = document.getElementById('beritaListSection');
    const hero = document.getElementById('beritaHero');
    if (!item || !detail || !listSection || !hero) return;

    detail.innerHTML = `
        <button type="button" class="berita-back" onclick="hideBeritaDetail()">
            <i class="fas fa-arrow-left"></i> Kembali ke Daftar Berita
        </button>
        <article class="berita-detail-article">
            <header class="berita-detail-header">
                <h1>${escapeBeritaText(item.judul)}</h1>
                <time><i class="far fa-calendar-alt"></i> ${escapeBeritaText(item.tanggal)}</time>
            </header>
            ${item.fotoUtama ? `<img src="${escapeBeritaText(item.fotoUtama)}" alt="${escapeBeritaText(item.judul)}" class="berita-detail-image">` : ''}
            <p>${escapeBeritaText(item.deskripsiAwal)}</p>
            ${item.fotoIsi ? `<img src="${escapeBeritaText(item.fotoIsi)}" alt="Foto isi ${escapeBeritaText(item.judul)}" class="berita-detail-image">` : ''}
            <p>${escapeBeritaText(item.deskripsiLanjutan)}</p>
        </article>
    `;
    hero.classList.add('hidden');
    listSection.classList.add('hidden');
    detail.classList.remove('hidden');
    document.body.classList.add('berita-detail-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.hideBeritaDetail = function() {
    const hero = document.getElementById('beritaHero');
    const listSection = document.getElementById('beritaListSection');
    const detail = document.getElementById('beritaDetail');
    if (hero) hero.classList.remove('hidden');
    if (listSection) listSection.classList.remove('hidden');
    if (detail) detail.classList.add('hidden');
    document.body.classList.remove('berita-detail-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.filterBerita = function(query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const articles = document.querySelectorAll('#beritaList .berita-article');
    const emptySearchMsg = document.getElementById('beritaSearchEmpty');
    let matchedCount = 0;

    articles.forEach(article => {
        const title = (article.getAttribute('data-berita-title') || article.querySelector('h2')?.textContent || '').toLowerCase();
        const isMatch = !normalizedQuery || title.includes(normalizedQuery);
        article.classList.toggle('hidden', !isMatch);
        if (isMatch) matchedCount++;
    });

    if (emptySearchMsg) {
        emptySearchMsg.classList.toggle('hidden', !normalizedQuery || matchedCount > 0);
    }
};


// ==========================================
// PDP WISHLIST POPUP
// ==========================================
function showPdpWishlistPopup() {
    const modal = document.getElementById('pdpWishlistModal');
    if (modal) {
        modal.classList.add('active');
    }
}
function closePdpWishlistModal() {
    const modal = document.getElementById('pdpWishlistModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ==========================================
// MAP SLIDER & SWITCHER LOGIC
// ==========================================
window.currentMapSlide = 'imgmap';
window.switchMapSlide = function(target) {
    const gmapsEl = document.getElementById('mapSlideGmaps');
    const imgmapEl = document.getElementById('mapSlideImgmap');
    const btnGmaps = document.getElementById('btnShowGmaps');
    const btnImgmap = document.getElementById('btnShowImgMap');

    if (target === 'gmaps') {
        window.currentMapSlide = 'gmaps';
        if (gmapsEl) gmapsEl.style.display = 'block';
        if (imgmapEl) imgmapEl.style.display = 'none';
        if (btnGmaps) {
            btnGmaps.style.background = '#00AA5B';
            btnGmaps.style.color = 'white';
            btnGmaps.style.borderColor = '#00AA5B';
        }
        if (btnImgmap) {
            btnImgmap.style.background = 'white';
            btnImgmap.style.color = '#6D7588';
            btnImgmap.style.borderColor = '#E5E7E9';
        }
    } else {
        window.currentMapSlide = 'imgmap';
        if (gmapsEl) gmapsEl.style.display = 'none';
        if (imgmapEl) imgmapEl.style.display = 'block';
        if (btnImgmap) {
            btnImgmap.style.background = '#00AA5B';
            btnImgmap.style.color = 'white';
            btnImgmap.style.borderColor = '#00AA5B';
        }
        if (btnGmaps) {
            btnGmaps.style.background = 'white';
            btnGmaps.style.color = '#6D7588';
            btnGmaps.style.borderColor = '#E5E7E9';
        }
    }
};

window.nextMapSlide = function() {
    if (window.currentMapSlide === 'gmaps') window.switchMapSlide('imgmap');
    else window.switchMapSlide('gmaps');
};

window.prevMapSlide = function() {
    if (window.currentMapSlide === 'gmaps') window.switchMapSlide('imgmap');
    else window.switchMapSlide('gmaps');
};

// ==========================================
// IMAGE LIGHTBOX POP-UP PREVIEW
// ==========================================
window.openImageLightbox = function(src, title) {
    const modal = document.getElementById('imageLightboxModal');
    const imgEl = document.getElementById('lightboxImageSrc');
    const titleEl = document.getElementById('lightboxTitleText');
    if (modal && imgEl) {
        imgEl.src = src;
        if (titleEl) titleEl.innerText = title || 'Detail Gambar Peta';
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        document.body.style.overflow = 'hidden';
    }
};

window.closeImageLightbox = function() {
    const modal = document.getElementById('imageLightboxModal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = 'auto';
    }
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        window.closeImageLightbox();
    }
});
