// ==========================================
// USER STATE MANAGEMENT
// ==========================================

let wishlist = [];
let recentlyViewed = [];
let followedShops = [];
let userCollections = [];

let umkmData = [];
const DATABASE_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/umkmData.json";

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

// Objek untuk menyimpan posisi scroll tiap halaman
const scrollPositions = {};
let previousPageId = 'homePage';

// Render UMKM Grid di Home
let currentCategory = 'all';

// Fungsi kembali ke Home atau Tentang
const goHome = (e) => {
    if (e) e.preventDefault();

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

// Logic Slider Hero Banner
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.querySelector('.prev-slide');
const nextBtn = document.querySelector('.next-slide');
let currentSlide = 0;
let slideInterval;


// State
let currentUser = null;
let cart = {};
try {
    cart = JSON.parse(localStorage.getItem('umkm_cart')) || {};
} catch (e) {
    console.warn('Iframe localStorage blocked');
}

// UI Elements
const authButtonsContainer = document.getElementById('authButtonsContainer');
const userProfileContainer = document.getElementById('userProfileContainer');
const cartIconBtn = document.getElementById('cartIconBtn');
const cartBadgeCount = document.getElementById('cartBadgeCount');
const userAvatar = document.getElementById('userAvatar');
const userNameDisplay = document.getElementById('userNameDisplay');
const userProfileBtnHeader = document.getElementById('userProfileBtnHeader');
const profileDropdown = document.getElementById('profileDropdown');
const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');

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
const authScreen10 = document.getElementById('authScreen10');
const authBtnSaveAvatar = document.getElementById('authBtnSaveAvatar');
const avatarOptions = document.querySelectorAll('.avatar-option');
const selectedAvatarUrl = document.getElementById('selectedAvatarUrl');

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

const headerBtnMasuk = document.querySelector('.btn-masuk');
const headerBtnDaftar = document.querySelector('.btn-daftar');

// Screen 5 links
const authGoToLogin = document.getElementById('authGoToLogin');

const googleRegisterBtn = document.getElementById('googleRegisterBtn');

// Register Flow Logic
const authRegNameGroup = document.getElementById('authRegNameGroup');
const authRegPasswordGroup = document.getElementById('authRegPasswordGroup');

// Logic untuk Layar 6 (Account Picker)
const savedAccountCard = document.getElementById('savedAccountCard');
const deleteSavedAccountBtn = document.getElementById('deleteSavedAccountBtn');
const authGoToLoginFromPicker = document.getElementById('authGoToLoginFromPicker');
const authGoToRegisterFromPicker = document.getElementById('authGoToRegisterFromPicker');

// Logic untuk Layar 7 & 8 (Prompt HP)
const authBtnGoToAddPhone = document.getElementById('authBtnGoToAddPhone');
const authBackTo7 = document.getElementById('authBackTo7');
const authInputPhone = document.getElementById('authInputPhone');
const authBtnSubmitPhone = document.getElementById('authBtnSubmitPhone');

const authBtnLogoutDontSave = document.getElementById('authBtnLogoutDontSave');
const authBtnLogoutSave = document.getElementById('authBtnLogoutSave');

/* ======================= CART LOGIC (PAGE) ======================= */
const cartPageItemsContainer = document.getElementById('cartPageItemsContainer');
const cartSummaryItemCount = document.getElementById('cartSummaryItemCount');
const cartSummaryTotal = document.getElementById('cartSummaryTotal');
const cartSummaryGrandTotal = document.getElementById('cartSummaryGrandTotal');
const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');

// State for checked items
let checkedCartItems = {};

/* ======================= PROFILE LOGIC ======================= */
const dropdownProfileMenu = document.getElementById('dropdownProfileMenu');
const profilePageAvatar = document.getElementById('profilePageAvatar');
const profilePageName = document.getElementById('profilePageName');
const profileEditName = document.getElementById('profileEditName');
const profileEditEmail = document.getElementById('profileEditEmail');
const profileSaveBtn = document.getElementById('profileSaveBtn');

// Tab Switching Logic
const profileTabs = document.querySelectorAll('.profile-tab');

const btnBackProfile = document.getElementById('btnBackProfile');

// Interaksi Accordion FAQ
const faqQuestions = document.querySelectorAll('.faq-question');

// Global Scroll Observer (bisa diakses oleh fungsi render dinamis)
const globalScrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

// Tombol Kembali Khusus Mobile di Halaman Detail Toko
const mobileBackStoreBtn = document.getElementById('mobileBackStoreBtn');

// Init Status Halaman setelah Refresh
const lastActivePage = sessionStorage.getItem('activePage') || 'tentangPage';
const activeStoreId = sessionStorage.getItem('activeStoreId');

// ==========================================
// Fitur Mobile Side Menu (Hamburger)
// ==========================================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileSideMenu = document.getElementById('mobileSideMenu');
const closeSideMenu = document.getElementById('closeSideMenu');
const sideMenuOverlay = document.getElementById('sideMenuOverlay');
const sideMenuLinks = document.querySelectorAll('.mobile-side-menu .side-menu-links a');



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

const closeDobModal = document.getElementById('closeDobModal');
const closeGenderModal = document.getElementById('closeGenderModal');

const saveDobBtn = document.getElementById('saveDobBtn');

const saveGenderBtn = document.getElementById('saveGenderBtn');


/* ======================= PHOTO MODAL ======================= */
const photoModal = document.getElementById('photoModal');
const btnPilihFoto = document.getElementById('btnPilihFoto');
const closePhotoModal = document.getElementById('closePhotoModal');
const defaultAvatarsContainer = document.getElementById('defaultAvatarsContainer');
const uploadPhotoInput = document.getElementById('uploadPhotoInput');


/* ======================= NAME MODAL ======================= */
const btnEditName = document.getElementById('btnEditName');
const nameModal = document.getElementById('nameModal');
const closeNameModal = document.getElementById('closeNameModal');
const nameInputModal = document.getElementById('nameInputModal');
const saveNameBtn = document.getElementById('saveNameBtn');
let originalName = '';


/* ======================= PHONE MODAL ======================= */
const btnEditPhone = document.getElementById('btnEditPhone');
const phoneModal = document.getElementById('phoneModal');
const closePhoneModal = document.getElementById('closePhoneModal');
const phoneInputModal = document.getElementById('phoneInputModal');
const savePhoneBtn = document.getElementById('savePhoneBtn');
let originalPhone = '';

function getUserKey(baseKey) {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
        return baseKey + '_' + currentUser.uid;
    }
    return baseKey + '_guest';
}

function loadUserState() {
    try {
        wishlist = JSON.parse(localStorage.getItem(getUserKey('wishlist')) || '[]');
        recentlyViewed = JSON.parse(localStorage.getItem(getUserKey('recentlyViewed')) || '[]');
        userCollections = JSON.parse(localStorage.getItem(getUserKey('userCollections')) || '[]');
        followedShops = JSON.parse(localStorage.getItem(getUserKey('followedShops')) || '[]');
    } catch (e) {
        wishlist = []; recentlyViewed = []; userCollections = []; followedShops = [];
        console.warn('Iframe localStorage blocked in loadUserState');
    }

    // Re-render UI depending on state
    if (typeof renderWishlist === 'function') renderWishlist();
    if (typeof renderTerakhirDilihat === 'function') renderTerakhirDilihat();
    if (typeof renderFavoriteShops === 'function') renderFavoriteShops();
    if (typeof renderUMKM === 'function') renderUMKM();

    if (userCollections.length > 0) {
        document.getElementById('cardCollectionName').innerText = userCollections[0];
        document.getElementById('userCollectionCard').style.display = 'block';
    } else {
        document.getElementById('userCollectionCard').style.display = 'none';
    }

}

