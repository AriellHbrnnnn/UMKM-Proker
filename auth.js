// Logic Sistem Login (Prototype)
/* =========================================
   AUTH, CART, AND USER PROFILE SYSTEM
========================================= */
// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCB2O20Z9NzTLfXUkqZnPUATe1KJwLU6r8",
    authDomain: "umkm-karanganyar.firebaseapp.com",
    databaseURL: "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "umkm-karanganyar",
    storageBucket: "umkm-karanganyar.firebasestorage.app",
    messagingSenderId: "433865445262",
    appId: "1:433865445262:web:0af1da5d3f24df48405edf"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Gunakan var agar tidak konflik dengan re-declaration dari file lain
var auth = typeof firebase !== 'undefined' ? firebase.auth() : null;

// Global user state - gunakan var agar bisa di-share antar script
var currentUser = null;

/* =============================================
   DEKLARASI ELEMEN UI AUTH (GUARD ANTI REDECLARE)
   Sebelumnya di globals.js → sekarang inline agar tidak SyntaxError
   duplicate const dengan script.js
   ============================================= */
(function _initAuthGlobals() {
    function _g(id) { return document.getElementById(id); }
    function _qs(sel) { return document.querySelector(sel); }
    function _qsa(sel) { return document.querySelectorAll(sel); }
    function _v(name) { return (typeof window[name] !== 'undefined') ? window[name] : undefined; }
    function _def(name, val) {
        if (typeof _v(name) === 'undefined') {
            window[name] = val;
            try { window.eval('var ' + name + ' = window["' + name + '"];'); } catch(e){}
        }
    }

    // === USER PROFILE HEADER ===
    _def('authButtonsContainer', _g('authButtonsContainer'));
    _def('userProfileContainer', _g('userProfileContainer'));
    _def('cartIconBtn', _g('cartIconBtn'));
    _def('cartBadgeCount', _g('cartBadgeCount'));
    _def('userAvatar', _g('userAvatar'));
    _def('userNameDisplay', _g('userNameDisplay'));
    _def('userProfileBtnHeader', _g('userProfileBtnHeader'));
    _def('profileDropdown', _g('profileDropdown'));
    _def('dropdownLogoutBtn', _g('dropdownLogoutBtn'));

    // === LOGIN MODAL & SCREENS ===
    _def('loginModal', _g('loginModal'));
    _def('authScreen1', _g('authScreen1'));
    _def('authScreen2', _g('authScreen2'));
    _def('authScreen3', _g('authScreen3'));
    _def('authScreen4', _g('authScreen4'));
    _def('authScreen5', _g('authScreen5'));
    _def('authScreen6', _g('authScreen6'));
    _def('authScreen7', _g('authScreen7'));
    _def('authScreen8', _g('authScreen8'));
    _def('authScreen9', _g('authScreen9'));
    _def('authScreen10', _g('authScreen10'));
    _def('authBtnSaveAvatar', _g('authBtnSaveAvatar'));
    _def('avatarOptions', _qsa('.avatar-option'));
    _def('selectedAvatarUrl', _g('selectedAvatarUrl'));

    // === INPUTS ===
    _def('authInputEmail1', _g('authInputEmail1'));
    _def('authInputPassword', _g('authInputPassword'));
    _def('authDisplayEmail', _g('authDisplayEmail'));
    _def('authForgotEmail', _g('authForgotEmail'));
    _def('authRegName', _g('authRegName'));
    _def('authRegEmail', _g('authRegEmail'));
    _def('authRegPassword', _g('authRegPassword'));

    // === BUTTONS & LINKS ===
    _def('authBtnNext', _g('authBtnNext'));
    _def('authBtnOtherMethods', _g('authBtnOtherMethods'));
    _def('authGoToForgot', _g('authGoToForgot'));
    _def('authGoToRegister', _g('authGoToRegister'));
    _def('authBtnLogin', _g('authBtnLogin'));
    _def('authBtnRegister', _g('authBtnRegister'));
    _def('authBtnReset', _g('authBtnReset'));
    _def('googleLoginBtn', _g('googleLoginBtn'));
    _def('googleRegisterBtn', _g('googleRegisterBtn'));
    _def('headerBtnMasuk', _qs('.btn-masuk'));
    _def('headerBtnDaftar', _qs('.btn-daftar'));
    _def('authGoToLogin', _g('authGoToLogin'));
    _def('authRegNameGroup', _g('authRegNameGroup'));
    _def('authRegPasswordGroup', _g('authRegPasswordGroup'));

    // === ACCOUNT PICKER (Screen 6) ===
    _def('savedAccountCard', _g('savedAccountCard'));
    _def('deleteSavedAccountBtn', _g('deleteSavedAccountBtn'));
    _def('authGoToLoginFromPicker', _g('authGoToLoginFromPicker'));
    _def('authGoToRegisterFromPicker', _g('authGoToRegisterFromPicker'));

    // === PHONE PROMPT SCREEN (7 & 8) ===
    _def('authBtnGoToAddPhone', _g('authBtnGoToAddPhone'));
    _def('authBackTo7', _g('authBackTo7'));
    _def('authInputPhone', _g('authInputPhone'));
    _def('authBtnSubmitPhone', _g('authBtnSubmitPhone'));

    // === LOGOUT SAVE / DONT SAVE ===
    _def('authBtnLogoutDontSave', _g('authBtnLogoutDontSave'));
    _def('authBtnLogoutSave', _g('authBtnLogoutSave'));
})();


// Ensure persistence is set to LOCAL so users stay logged in indefinitely
if (auth) {
    try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {}); } catch (_) {}
}

/* ===============================================================
   SINGLE SOURCE OF TRUTH: FIREBASE AUTH STATE OBSERVER
   - Semua login (email/password, Google popup, Google redirect)
     diproses DISINI SAJA (auth_engine.js TIDAK usah memproses
     user yang sudah diobservasi oleh kode ini).
   - Gunakan window.__googleAuthProcessed sebagai LOCK.
   - PERINGATAN: SELALU periksa typeof FUNGSI === 'function' SEBELUM
     memanggil fungsi dari auth_engine.js (karena load order: auth.js
     DULUAN, observer async bisa jalan SEBELUM auth_engine.js di-load!)
   =============================================================== */
if (auth) {
    auth.onAuthStateChanged((user) => {
        try {
            // Mark body as auth-resolved to prevent FOUC
            if (document.body) document.body.classList.add('auth-resolved');

            if (user) {
                // ====== USER MASUK (Google / Email/Pwd / Refresh) ======
                const savedGoogleMode = sessionStorage.getItem('google_auth_mode');
                const isGoogleUser = !!(user.providerData &&
                    user.providerData.some(function(p) { return p && p.providerId === 'google.com'; }));

                // ----- Kasus Khusus: Google OAuth BARU SELESAI -----
                // Cek dulu apakah fungsi dari auth_engine.js SUDAH TERSEDIA.
                // Jika BELUM tersedia → JANGAN ambil path ini. Fallback ke update UI biasa.
                var googleProcessedExternally = false;
                    if (isGoogleUser && savedGoogleMode && !window.__googleAuthProcessed) {
                    var hasLoginUserObject = typeof window.loginUserObject === 'function';
                    var hasSaveRegistered = typeof window.saveRegisteredUser === 'function';
                    var hasSyncFirebase = typeof window.syncUserToFirebaseDatabase === 'function';

                    if (hasLoginUserObject && hasSaveRegistered && hasSyncFirebase) {
                        window.__googleAuthProcessed = true;

                        var email = user.email || '';
                        var displayName = user.displayName || (email ? email.split('@')[0] : 'Pengguna');
                        var googlePhotoURL = user.photoURL || '';

                        var finalPhotoUrl = '';
                        try { finalPhotoUrl = localStorage.getItem('local_avatar_' + user.uid) || ''; } catch (_) {}
                        if (!finalPhotoUrl) {
                            try {
                                var selField = document.getElementById('selectedAvatarUrl');
                                if (selField && selField.value && /^https?:\/\//.test(selField.value)) {
                                    finalPhotoUrl = selField.value;
                                }
                            } catch (_) {}
                        }
                        if (!finalPhotoUrl && googlePhotoURL) finalPhotoUrl = googlePhotoURL;
                        if (!finalPhotoUrl && typeof window.buildDicebearAvatarUrl === 'function') {
                            finalPhotoUrl = window.buildDicebearAvatarUrl(email || user.uid, 'b6e3f4');
                        }
                        if (!finalPhotoUrl) {
                            finalPhotoUrl = 'https://api.dicebear.com/9.x/micah/svg?seed=' + encodeURIComponent(email || user.uid) + '&mouth=smile,laughing&backgroundColor=b6e3f4';
                        }

                        var mergedUser = {
                            uid: user.uid,
                            email: email,
                            username: String(displayName).toLowerCase().replace(/\s+/g, '_'),
                            displayName: displayName,
                            password: 'google_firebase_auth',
                            photoURL: finalPhotoUrl,
                            isGoogle: true,
                            providerId: 'google.com'
                        };

                        window.saveRegisteredUser(mergedUser);
                        window.syncUserToFirebaseDatabase(mergedUser, true);

                        if (finalPhotoUrl && googlePhotoURL !== finalPhotoUrl && finalPhotoUrl.indexOf('data:') !== 0) {
                            try { user.updateProfile({ photoURL: finalPhotoUrl }).catch(function() {}); } catch (_) {}
                        }

                        window.loginUserObject(mergedUser, true);

                        var toastMode = savedGoogleMode === 'register' ? 'mendaftar' : 'masuk';
                        if (typeof window.showAuthAlert === 'function') {
                            window.showAuthAlert('Berhasil ' + toastMode + ' dengan Google: ' + email, 'success');
                        }
                        sessionStorage.removeItem('google_auth_mode');
                        sessionStorage.removeItem('google_auth_flow');
                        sessionStorage.removeItem('google_auth_prompt_shown');

                        if (window.__googleAuthWatchdogTimer) {
                            clearTimeout(window.__googleAuthWatchdogTimer);
                            window.__googleAuthWatchdogTimer = null;
                        }

                        googleProcessedExternally = true;
                    } // end: hasLoginUserObject && hasSaveRegistered && hasSyncFirebase
                }

                // ----- UI UPDATE LANGSUNG (bypass loginUserObject jika belum dipanggil) -----
                if (!googleProcessedExternally) {
                    currentUser = user;
                    try {
                        localStorage.setItem('umkm_active_uid', user.uid);
                        localStorage.setItem('umkm_active_user', JSON.stringify({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL
                        }));
                    } catch (_) {}

                    if (typeof loadUserState === 'function') loadUserState();
                    if (authButtonsContainer) {
                        authButtonsContainer.classList.add('hidden');
                        authButtonsContainer.style.display = 'none';
                        authButtonsContainer.style.visibility = 'hidden';
                    }
                    if (userProfileContainer) {
                        userProfileContainer.classList.remove('hidden');
                        userProfileContainer.style.visibility = 'visible';
                    }
                    if (cartIconBtn) cartIconBtn.classList.remove('hidden');

                    var fallbackName = user.email ? user.email.split('@')[0] : 'Pengguna';
                    var firstName = user.displayName ? user.displayName.split(' ')[0] : fallbackName;
                    if (userNameDisplay) userNameDisplay.textContent = firstName;

                    var dropdownName = document.getElementById('dropdownName');
                    if (dropdownName) dropdownName.textContent = user.displayName || fallbackName;

                    var avatarUrl = '';
                    try { avatarUrl = localStorage.getItem('local_avatar_' + user.uid) || ''; } catch (_) {}
                    if (!avatarUrl) avatarUrl = user.photoURL || '';
                    if (!avatarUrl && typeof window.buildDicebearAvatarUrl === 'function') {
                        avatarUrl = window.buildDicebearAvatarUrl(user.email || user.uid, 'b6e3f4');
                    }
                    if (!avatarUrl && typeof getRandomAvatar === 'function') {
                        avatarUrl = getRandomAvatar(user.email || user.uid);
                    }
                    if (!avatarUrl) {
                        avatarUrl = 'https://api.dicebear.com/9.x/micah/svg?seed=' + encodeURIComponent(user.email || user.uid) + '&mouth=smile,laughing&backgroundColor=b6e3f4';
                    }

                    if (avatarUrl.indexOf('dicebear.com') !== -1 && avatarUrl.indexOf('mouth=smile,laugh&') !== -1) {
                        avatarUrl = avatarUrl.replace('mouth=smile,laugh&', 'mouth=smile,laughing&');
                        try { user.updateProfile({ photoURL: avatarUrl }).catch(function() {}); } catch (_) {}
                    }

                    if (userAvatar) userAvatar.src = avatarUrl;
                    var dropdownAvatar = document.getElementById('dropdownAvatar');
                    if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
                    var profilePageAvatar = document.getElementById('profilePageAvatar');
                    if (profilePageAvatar) profilePageAvatar.src = avatarUrl;
                    var profileEditAvatar = document.getElementById('profileEditAvatar');
                    if (profileEditAvatar) profileEditAvatar.src = avatarUrl;

                    var profilePageName = document.getElementById('profilePageName');
                    if (profilePageName) profilePageName.textContent = user.displayName || fallbackName;
                    var displayEditName = document.getElementById('displayEditName');
                    if (displayEditName) displayEditName.textContent = user.displayName || fallbackName;
                    var profileEditName = document.getElementById('profileEditName');
                    if (profileEditName) profileEditName.value = user.displayName || fallbackName;
                    var displayEditEmail = document.getElementById('displayEditEmail');
                    if (displayEditEmail) displayEditEmail.textContent = user.email || '';
                    var profileEditEmail = document.getElementById('profileEditEmail');
                    if (profileEditEmail) profileEditEmail.value = user.email || '';

                    if (typeof loadBiodataExtras === 'function') loadBiodataExtras();
                    if (loginModal) loginModal.classList.add('hidden');
                    if (typeof updateCartBadge === 'function') updateCartBadge();

                    if (typeof window.syncUserToFirebaseDatabase === 'function') {
                        try { window.syncUserToFirebaseDatabase(user, isGoogleUser || !!user.isGoogle); } catch (_) {}
                    }
                }
            } else {
                // ====== USER KELUAR / BELUM MASUK (GUEST) ======
                currentUser = null;
                if (typeof loadUserState === 'function') loadUserState();
                if (authButtonsContainer) {
                    authButtonsContainer.classList.remove('hidden');
                    authButtonsContainer.style.display = 'flex';
                    authButtonsContainer.style.visibility = 'visible';
                }
                if (userProfileContainer) {
                    userProfileContainer.classList.add('hidden');
                    userProfileContainer.style.visibility = '';
                }
                if (cartIconBtn) cartIconBtn.classList.add('hidden');
                if (profileDropdown) profileDropdown.classList.add('hidden');
            }

            if (typeof setupMobileProfileDropdown === 'function') setupMobileProfileDropdown();
        } catch (observerErr) {
            // Observer ERROR: JANGAN biarkan break observer berikutnya
            console.error('[Auth Observer] ERROR internal observer (tidak fatal, UI fallback):', observerErr);
        }
    });
}

/* ===============================================================
   POST-DOMCONTLOADED SETUP (SEMUA script auth.js + auth_engine.js
   SUDAH DI-LOAD saat ini dijalankan!)
   ---------------------------------------------------------------
   JANGAN jalankan kode ini di IIFE top-level (saat parse auth.js)!
   Script auth.js di-load SEBELUM auth_engine.js, jadi fungsi seperti
   promptGoogleAccountInput, loginUserObject, showAuthAlert BELUM ADA
   saat top-level IIFE dieksekusi → UNDEFINED → script CRASH!
   =============================================================== */
document.addEventListener('DOMContentLoaded', function() {
    // ----- Google Redirect Watchdog (HANYA LOG + TOAST. JANGAN PERNAH AUTO-OPEN MODAL!) -----
    (function safeInstallGoogleRedirectWatchdog() {
        try {
            function needsWatchdog() {
                try {
                    if (sessionStorage.getItem('google_auth_flow') === 'redirect') return true;
                    var qs = (window.location.search || '') + (window.location.hash || '');
                    return /[?&](code|state|authuser|scope|prompt|client_id|redirect_uri|response_type)=/.test(qs);
                } catch (_) { return false; }
            }
            if (!needsWatchdog()) return;

            var WAIT_MS = 25000;
            console.log('[Google Auth] Watchdog dipasang (setelah DOMContentLoaded). Tunggu ' + (WAIT_MS / 1000) + 's untuk Firebase Auth menukar token OAuth...');

            window.__googleAuthWatchdogTimer = setTimeout(function() {
                try {
                    var currentAuth = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth() : null;
                    var stillNoUser = !currentAuth || !currentAuth.currentUser;
                    if (stillNoUser && !window.__googleAuthProcessed) {
                        console.warn('[Google Auth] WATCHDOG TIMEOUT: Firebase Auth token exchange melebihi batas waktu.');
                        sessionStorage.removeItem('google_auth_mode');
                        sessionStorage.removeItem('google_auth_flow');

                        // HANYA TOAST (non-blocking). JANGAN PERNAH auto-open modal!
                        if (typeof window.showAuthAlert === 'function') {
                            window.showAuthAlert(
                                'Proses Google OAuth terlalu lama (timeout). Kemungkinan: (1) koneksi lambat, (2) domain deploy BELUM ditambahkan ke Authorized Domains di Firebase Console → Authentication → Settings. Silakan coba klik tombol Daftar/Masuk Google lagi atau gunakan form email manual.',
                                'error'
                            );
                        }

                        // Bersihkan query parameter agar watchdog tidak berjalan lagi
                        try {
                            var cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + (window.location.hash || '').replace(/[?&](code|state|session_state|scope|prompt|client_id|redirect_uri|response_type|authuser)=[^&]*/g, '');
                            window.history.replaceState({}, document.title, cleanUrl);
                        } catch (_) {}
                    }
                } catch (watchdogInnerErr) {
                    console.error('[Google Auth] Watchdog inner error (diabaikan):', watchdogInnerErr);
                }
            }, WAIT_MS);
        } catch (watchdogErr) {
            console.info('[Google Auth] Watchdog tidak terpasang (diabaikan):', watchdogErr && watchdogErr.message);
        }
    })();

    // ----- Netlify Deploy DIAGNOSTIC (HANYA console + toast. JANGAN alert().) -----
    (function safeRunNetlifyDeployDiagnostic() {
        try {
            var hostname = window.location.hostname || '';
            var isNetlifyDeploy = /netlify\.app$/i.test(hostname) || /netlify\.com$/i.test(hostname);
            if (!isNetlifyDeploy) return;
            if (sessionStorage.getItem('netlify_diagnostic_done')) return;
            sessionStorage.setItem('netlify_diagnostic_done', '1');

            setTimeout(function() {
                try {
                    var apiKey = (typeof firebaseConfig !== 'undefined') ? firebaseConfig.apiKey : null;
                    if (!apiKey) return;

                    fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + apiKey, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: 'DUMMY_TOKEN_DIAGNOSTIC_IGNORE' })
                    }).then(function(r) {
                        // 400 = normal (token dummy). 401/403 = DOMAIN BELUM DIWHITELIST!
                        if (r.status === 401 || r.status === 403) {
                            var msg = '⚠️ Domain Netlify "' + hostname + '" BELUM TERDAFTAR di Firebase Console! Ini penyebab Google Sign-In GAGAL. Cara perbaiki: (1) Buka console.firebase.google.com → Authentication → Settings → Authorized domains. (2) Klik ADD DOMAIN → masukkan: ' + hostname + ' → ADD. (3) Tunggu 1-2 menit → REFRESH website lalu coba Google Sign-In lagi.';
                            console.warn('[Netlify Deploy Diagnostic] ' + msg);

                            // HANYA toast NON-BLOCKING (jangan pakai alert()! alert() blocks UI di mobile bikin kesan rusak)
                            if (typeof window.showAuthAlert === 'function') {
                                window.showAuthAlert(msg, 'error');
                            }
                        }
                    }).catch(function() {
                        /* Offline / network error → silent. Tidak usah ganggu user */
                    });
                } catch (diagnosticInnerErr) {
                    console.info('[Netlify Deploy Diagnostic] Silent inner error (diabaikan):', diagnosticInnerErr && diagnosticInnerErr.message);
                }
            }, 5000); // Delay 5 detik agar UI selesai render dulu, baru jalankan check
        } catch (diagnosticErr) {
            console.info('[Netlify Deploy Diagnostic] Tidak berjalan (diabaikan):', diagnosticErr && diagnosticErr.message);
        }
    })();
});

// Mobile-friendly profile dropdown toggle
function setupMobileProfileDropdown() {
    const profileBtn = document.getElementById('userProfileBtnHeader');
    const pDropdown = document.getElementById('profileDropdown');
    const pOverlay = document.getElementById('profileDropdownOverlay') || document.querySelector('.profile-dropdown-overlay');

    if (!pDropdown) return;

    const reportProfileDropdownDebug = function (hypothesisId, msg, data) {
        fetch("http://127.0.0.1:7777/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId: "profile-dropdown-responsive",
                runId: "pre-fix",
                hypothesisId: hypothesisId,
                location: "auth.js:setupMobileProfileDropdown",
                msg: "[DEBUG] " + msg,
                data: data || {},
                ts: Date.now()
            })
        }).catch(() => { });
    };

    // #region debug-point A:init
    reportProfileDropdownDebug("A", "setup dropdown init", {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hasProfileBtn: !!profileBtn,
        hasDropdown: !!pDropdown,
        hasOverlay: !!pOverlay,
        initialShow: pDropdown.classList.contains('show'),
        breakpointMobile: window.matchMedia('(max-width: 768px)').matches,
        breakpointTablet: window.matchMedia('(min-width: 769px) and (max-width: 1100px)').matches
    });
    // #endregion

    function closeDropdown(reason) {
        pDropdown.classList.remove('show');
        // #region debug-point D:close
        reportProfileDropdownDebug("D", "close dropdown", {
            reason: reason || 'unknown',
            showAfterClose: pDropdown.classList.contains('show'),
            visibility: window.getComputedStyle(pDropdown).visibility,
            opacity: window.getComputedStyle(pDropdown).opacity,
            pointerEvents: window.getComputedStyle(pDropdown).pointerEvents
        });
        // #endregion
    }

    function openDropdown(reason) {
        pDropdown.classList.add('show');
        // #region debug-point C:open
        reportProfileDropdownDebug("C", "open dropdown requested", {
            reason: reason || 'unknown',
            showAfterOpen: pDropdown.classList.contains('show')
        });
        requestAnimationFrame(function () {
            const styles = window.getComputedStyle(pDropdown);
            const rect = pDropdown.getBoundingClientRect();
            reportProfileDropdownDebug("C", "open dropdown rendered", {
                reason: reason || 'unknown',
                className: pDropdown.className,
                display: styles.display,
                visibility: styles.visibility,
                opacity: styles.opacity,
                pointerEvents: styles.pointerEvents,
                top: rect.top,
                left: rect.left,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            });
        });
        // #endregion
    }

    function toggleDropdown(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // #region debug-point B:toggle
        reportProfileDropdownDebug("B", "toggle dropdown click", {
            targetId: e && e.target && e.target.id ? e.target.id : '',
            targetTag: e && e.target && e.target.tagName ? e.target.tagName : '',
            showBeforeToggle: pDropdown.classList.contains('show')
        });
        // #endregion
        if (pDropdown.classList.contains('show')) {
            closeDropdown('toggle-click');
        } else {
            openDropdown('toggle-click');
        }
    }

    // Attach toggle event ONLY to the profile header button/avatar
    if (profileBtn) {
        profileBtn.onclick = toggleDropdown;
    }

    // Close when clicking any link inside the dropdown, without overriding existing link handlers
    pDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeDropdown('menu-link');
        });
    });

    // Close when clicking overlay / backdrop
    if (pOverlay) {
        pOverlay.onclick = function (e) {
            e.stopPropagation();
            closeDropdown('overlay');
        };
    }

    // Close when clicking anywhere outside on the document ("klik sembarangan")
    if (!document._profileOutsideClickListener) {
        document._profileOutsideClickListener = function (e) {
            const container = document.getElementById('userProfileContainer');
            if (container && !container.contains(e.target)) {
                // #region debug-point E:outside-click
                reportProfileDropdownDebug("E", "outside click detected", {
                    targetId: e && e.target && e.target.id ? e.target.id : '',
                    targetTag: e && e.target && e.target.tagName ? e.target.tagName : '',
                    showBeforeClose: pDropdown.classList.contains('show')
                });
                // #endregion
                closeDropdown('outside-click');
            }
        };
        document.addEventListener('click', document._profileOutsideClickListener);
    }

    // Close when page is scrolled
    if (!window._profileScrollListener) {
        window._profileScrollListener = function () {
            if (pDropdown.classList.contains('show')) {
                closeDropdown();
            }
        };
        window.addEventListener('scroll', window._profileScrollListener, { passive: true });
    }
}


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

// Navigation Helpers
function showAuthScreen(screen) {
    if (typeof window.showAuthScreen === 'function') {
        window.showAuthScreen(screen);
    } else {
        if (typeof clearInputErrors === 'function') clearInputErrors();
        const allScreens = document.querySelectorAll('#loginModal [id^="authScreen"]');
        allScreens.forEach(s => s.classList.add('hidden'));
        if (screen) screen.classList.remove('hidden');
    }
}

// Screen 1: Next Logic
if (authInputEmail1 && authBtnNext) {
    authInputEmail1.addEventListener('input', () => {
        if (authInputEmail1.value.trim().length > 0) {
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
if (authBtnOtherMethods) authBtnOtherMethods.addEventListener('click', () => {
    showAuthScreen(authScreen3);
});

// Firebase Auth Actions
if (authBtnLogin) {
    authBtnLogin.addEventListener('click', () => {
        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating login submit to auth_engine.js...");
        return;
    });
}
if (authRegEmail && authBtnRegister) {
    authRegEmail.addEventListener('input', () => {
        if (authRegEmail.value.trim().length > 0) {
            authBtnRegister.style.background = 'var(--primary)';
            authBtnRegister.style.color = 'white';
            authBtnRegister.style.cursor = 'pointer';
        } else {
            authBtnRegister.style.background = '#E5E7E9';
            authBtnRegister.style.color = '#B3B9C1';
            authBtnRegister.style.cursor = 'not-allowed';
            if (authRegNameGroup) authRegNameGroup.classList.add('hidden');
            if (authRegPasswordGroup) authRegPasswordGroup.classList.add('hidden');
            authBtnRegister.textContent = "Daftar";
        }
    });

    authBtnRegister.addEventListener('click', () => {
        if (typeof clearInputErrors === 'function') clearInputErrors();
        const email = authRegEmail.value.trim();
        if (email.length === 0) {
            if (typeof showInputError === 'function') showInputError('authRegEmail', 'Email tidak boleh kosong.');
            return;
        }

        // Step 1: Validate Email and show Name/Password
        if (authRegNameGroup && authRegNameGroup.classList.contains('hidden')) {
            if (!email.includes('@') || !email.includes('.')) {
                if (typeof showInputError === 'function') showInputError('authRegEmail', "Format email tidak valid.");
                return;
            }
            authBtnRegister.textContent = "Memeriksa...";

            const finishEmailCheck = (alreadyRegistered) => {
                authBtnRegister.textContent = "Daftar";
                if (alreadyRegistered) {
                    if (typeof showInputError === 'function') showInputError('authRegEmail', "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
                    return;
                }
                authRegNameGroup.classList.remove('hidden');
                authRegPasswordGroup.classList.remove('hidden');
                authBtnRegister.textContent = "Selesaikan Pendaftaran";
            };

            if (typeof window.checkEmailInFirebaseAuth === 'function') {
                window.checkEmailInFirebaseAuth(email).then((authCheck) => {
                    finishEmailCheck(!!(authCheck && authCheck.registered));
                }).catch(() => {
                    authRegNameGroup.classList.remove('hidden');
                    authRegPasswordGroup.classList.remove('hidden');
                    authBtnRegister.textContent = "Selesaikan Pendaftaran";
                });
            } else if (auth) {
                auth.fetchSignInMethodsForEmail(email).then((methods) => {
                    finishEmailCheck(methods.length > 0);
                }).catch(e => {
                    authBtnRegister.textContent = "Daftar";
                    if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/unauthorized-domain') {
                        authRegNameGroup.classList.remove('hidden');
                        authRegPasswordGroup.classList.remove('hidden');
                        authBtnRegister.textContent = "Selesaikan Pendaftaran";
                    } else if (typeof showInputError === 'function') {
                        showInputError('authRegEmail', "Kesalahan: " + e.message);
                    }
                });
            }
            return;
        }

        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating registration submit to auth_engine.js...");
        return;
    });
}

if (authBtnReset) {
    authBtnReset.addEventListener('click', () => {
        // Handled exclusively by auth_engine.js single source of truth
        console.log("Delegating forgot password submit to auth_engine.js...");
        return;
    });
}

function handleGoogleAuth(btn) {
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey === "GANTI_DENGAN_API_KEY_ANDA") {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<div class="loading-spinner"></div>';
            btn.style.pointerEvents = 'none';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.style.pointerEvents = 'auto';
                if (!sessionStorage.getItem('phonePromptShown')) {
                    sessionStorage.setItem('phonePromptShown', 'true');
                    if (typeof showAuthScreen !== 'undefined' && typeof authScreen7 !== 'undefined') {
                        showAuthScreen(authScreen7);
                    }
                } else {
                    const loginModal = document.getElementById('loginModal');
                    if (loginModal) loginModal.classList.add('hidden');
                    window.location.reload();
                }
            }, 1500);
            return;
        }

        if (typeof window.handleRealFirebaseGoogleAuth === 'function') {
            window.handleRealFirebaseGoogleAuth('login');
        }
    });
}

if (authBtnGoToAddPhone) {
    authBtnGoToAddPhone.addEventListener('click', () => showAuthScreen(authScreen8));
}
if (authInputPhone && authBtnSubmitPhone) {
    authInputPhone.addEventListener('input', () => {
        if (authInputPhone.value.trim().length > 5) {
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
        if (authInputPhone.value.trim().length > 5) {
            alert("Nomor HP berhasil ditambahkan ke profil Anda!");
            loginModal.classList.add('hidden');
        }
    });
}

/* =====================================================================
   FITUR REMEMBER LOGIN MULTI-ACCOUNT (PER DEVICE / PER BROWSER PROFILE)
   - Penyimpanan di localStorage (OTOMATIS per-origin, tidak global)
   - Key: karanganyar_saved_accounts, value: Array of { uid, email, displayName, photoURL, savedAt }
   - Tidak menyimpan password sama sekali (KEAMANAN UTAMA)
   - User cuma perlu input password, email sudah auto-isi + focus password field
   ===================================================================== */
const REMEMBER_LOGIN_KEY = 'karanganyar_saved_accounts';
const REMEMBER_LOGIN_MIGRATED_KEY = 'karanganyar_remember_migrated_v1';

/* ---------- 1. Helper Functions ---------- */
function _defaultAvatarFor(seed, backgroundColor) {
    const bg = backgroundColor || 'b6e3f4';
    const s = seed ? encodeURIComponent(String(seed).substring(0, 30)) : 'Anonymous';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&backgroundColor=${bg}`;
}
function _maskEmail(emailStr) {
    if (!emailStr || emailStr.indexOf('@') === -1) return emailStr || '';
    const parts = emailStr.split('@');
    const name = parts[0];
    if (name.length <= 2) return name[0] + '***@' + parts[1];
    return name[0] + '***' + name[name.length - 1] + '@' + parts[1];
}
function getSavedAccounts() {
    try {
        let arr = JSON.parse(localStorage.getItem(REMEMBER_LOGIN_KEY) || '[]');
        if (!Array.isArray(arr)) arr = [];
        // Migrasi account single saved_tokopedia_account (jika ada)
        if (!localStorage.getItem(REMEMBER_LOGIN_MIGRATED_KEY)) {
            try {
                const oldSingle = JSON.parse(localStorage.getItem('saved_tokopedia_account') || 'null');
                if (oldSingle && oldSingle.email) {
                    const uidMigrate = 'migration_' + btoa(oldSingle.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
                    const idx = arr.findIndex(a => a.email === oldSingle.email);
                    if (idx === -1) {
                        arr.push({
                            uid: uidMigrate,
                            email: oldSingle.email,
                            displayName: oldSingle.name || oldSingle.email.split('@')[0],
                            photoURL: oldSingle.photoURL || _defaultAvatarFor(oldSingle.email),
                            savedAt: Date.now()
                        });
                    }
                }
            } catch (err) { /* ignore migration errors */ }
            localStorage.setItem(REMEMBER_LOGIN_MIGRATED_KEY, '1');
            localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(arr));
            // Hapus key lama agar tidak ke-overwrite ke new
            try { localStorage.removeItem('saved_tokopedia_account'); } catch (_) { }
        }
        return arr;
    } catch (err) {
        console.warn('[RememberLogin] getSavedAccounts failed:', err);
        return [];
    }
}
function saveAccountToSaved(user) {
    if (!user || !user.uid) return;
    const arr = getSavedAccounts();
    const idx = arr.findIndex(a => a.uid === user.uid);
    const record = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna'),
        photoURL: user.photoURL || _defaultAvatarFor(user.email || user.uid),
        savedAt: Date.now()
    };
    if (idx >= 0) {
        // Update existing (refresh displayName/photo bila berubah)
        arr[idx] = { ...arr[idx], ...record };
    } else {
        // Tambahkan baru di URUTAN PALING DEPAN (recently saved first)
        arr.unshift(record);
    }
    try { localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(arr)); }
    catch (err) { console.warn('[RememberLogin] save failed (quota/private mode):', err); }
}
function removeAccountFromSaved(uid) {
    if (!uid) return;
    const arr = getSavedAccounts().filter(a => a.uid !== uid);
    try { localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(arr)); }
    catch (err) { console.warn('[RememberLogin] remove failed:', err); }
}
function isAccountAlreadySaved(uid) {
    return !!uid && getSavedAccounts().some(a => a.uid === uid);
}

/* ---------- 2. Render Account Picker (Screen 6) ---------- */
function renderSavedAccountsPicker() {
    const container = document.getElementById('savedAccountsListContainer');
    if (!container) return;
    const list = getSavedAccounts();

    if (!list || list.length === 0) {
        // Tidak ada akun tersimpan → sembunyikan picker, pindah ke login biasa
        container.innerHTML = '';
        return false;
    }

    let html = '';
    list.forEach(acc => {
        if (!acc) return;
        const photo = acc.photoURL || _defaultAvatarFor(acc.email || acc.uid);
        const displayName = acc.displayName || (acc.email ? acc.email.split('@')[0] : 'Pengguna');
        const emailMasked = _maskEmail(acc.email || '');
        html += `
            <div class="saved-account-item" data-uid="${encodeURIComponent(acc.uid || '')}"
                 style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; padding:12px 0; border-bottom:1px solid #E5E7E9;">
                <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                    <img src="${photo}"
                         onerror="this.onerror=null;this.src='${_defaultAvatarFor(acc.email || 'x')}';"
                         style="width:40px; height:40px; border-radius:50%; object-fit:cover; background:#f1f5f9; border:1px solid #e2e8f0; flex-shrink:0;" alt="${displayName}">
                    <div style="min-width:0; flex:1;">
                        <div style="font-weight:700; color:#31353B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${displayName}</div>
                        <div style="color:#6D7588; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${emailMasked}</div>
                    </div>
                </div>
                <i class="fas fa-trash-alt saved-account-delete-btn" data-uid="${encodeURIComponent(acc.uid || '')}"
                   style="color:#B3B9C1; font-size:1.15rem; padding:10px 12px; cursor:pointer; flex-shrink:0;" title="Hapus info login akun ini dari device"></i>
            </div>
        `;
    });
    container.innerHTML = html;
    return true;
}

/* ---------- 3. Event Delegation untuk Account Picker ---------- */
document.addEventListener('click', function __rememberLoginDelegation(e) {
    const target = e.target || e.srcElement;
    if (!target) return;
    // 3a. Klik tombol HAPUS (trash icon) di dalam list account picker
    if (target.classList && target.classList.contains('saved-account-delete-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const uidRaw = target.getAttribute('data-uid') || '';
        const uid = uidRaw ? decodeURIComponent(uidRaw) : '';
        if (uid) {
            const acc = getSavedAccounts().find(a => a.uid === uid);
            const nama = acc ? (acc.displayName || acc.email) : 'akun ini';
            if (confirm(`Hapus info login ${nama} dari device ini?\nAkun Anda tidak akan terhapus, hanya tidak muncul di daftar "Pilih Akun Untuk Masuk" saja.`)) {
                removeAccountFromSaved(uid);
                renderSavedAccountsPicker();
                // Bila setelah dihapus list kosong, pindah ke screen login manual
                if (getSavedAccounts().length === 0 && typeof showAuthScreen === 'function') {
                    if (typeof authScreen1 !== 'undefined' && authScreen1) showAuthScreen(authScreen1);
                }
            }
        }
        return;
    }
    // 3b. Klik CARD / AREA akun (bukan tombol trash) → pilih akun tersebut = auto-fill email & lanjut ke password screen
    let item = target;
    while (item && !(item.classList && item.classList.contains('saved-account-item')) && item !== document.body) {
        item = item.parentElement;
    }
    if (item && item.classList && item.classList.contains('saved-account-item') && !target.classList.contains('saved-account-delete-btn')) {
        const uidRaw = item.getAttribute('data-uid') || '';
        const uid = uidRaw ? decodeURIComponent(uidRaw) : '';
        if (!uid) return;
        const acc = getSavedAccounts().find(a => a.uid === uid);
        if (!acc || !acc.email) return;

        // Isi email ke form login (screen 1)
        if (authInputEmail1) authInputEmail1.value = acc.email;
        // Tampilkan email di screen 2 juga
        if (authDisplayEmail) authDisplayEmail.textContent = acc.email;
        // Bersihkan error lama
        if (typeof clearInputErrors === 'function') clearInputErrors();
        // Bersihkan password field
        if (authInputPassword) authInputPassword.value = '';
        // Pindah ke SCREEN 2 (input password) — persis seperti user tekan Next
        if (typeof showAuthScreen === 'function' && typeof authScreen2 !== 'undefined' && authScreen2) {
            showAuthScreen(authScreen2);
        }
        // FOKUS otomatis ke input password, agar user tinggal ketik password SAJA (seperti request user!)
        setTimeout(() => {
            if (authInputPassword) {
                try { authInputPassword.focus(); } catch (_) { }
            }
        }, 180);
        return;
    }
});

/* ---------- 4. Event Dropdown Logout → cek apakah akun sudah tersimpan ---------- */
document.addEventListener('DOMContentLoaded', function __rememberLoginInitAfterDOM() {
    // 4a. Jika user TIDAK PERNAH simpan akun ini → saat logout tampilkan modal "Simpan info login?" (screen 9)
    //     Jika SUDAH PERNAH klik "Ya, Simpan" sebelumnya → LANGSUNG logout (tidak tanya lagi, sesuai request user)
    const logoutBtn = document.getElementById('dropdownLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function __onLogoutClick(e) {
            if (typeof auth === 'undefined' || !auth || !currentUser) {
                return; // biarkan flow default lanjut
            }
            try {
                // Kita preventDefault untuk ambil alih flow logout ke custom kita
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            } catch (_) { }

            const uidNow = currentUser.uid;
            const alreadySaved = isAccountAlreadySaved(uidNow);

            if (alreadySaved) {
                // ✅ Akun ini SUDAH pernah "Ya, Simpan" → TIDAK muncul popup lagi (sesuai request user)
                sessionStorage.removeItem('activePage');
                try {
                    auth.signOut().then(() => {
                        try { localStorage.removeItem('umkm_active_uid'); localStorage.removeItem('umkm_active_user'); } catch (_) { }
                        location.reload();
                    }).catch(() => location.reload());
                } catch (_) { location.reload(); }
            } else {
                // ❌ Belum pernah simpan → TAMPILKAN modal "Simpan info login?" (authScreen9)
                if (typeof loginModal !== 'undefined' && loginModal) {
                    // Buka modal login + pindahkan ke screen 9 (prompt simpan info login)
                    loginModal.classList.remove('hidden');
                    loginModal.style.display = 'flex';
                    if (typeof showAuthScreen === 'function' && typeof authScreen9 !== 'undefined' && authScreen9) {
                        showAuthScreen(authScreen9);
                    }
                    // Tutup dropdown profile (jika masih terbuka)
                    try { profileDropdown && profileDropdown.classList.remove('show'); } catch (_) { }
                } else {
                    // Fallback (tidak ada modal login) → langsung logout
                    auth.signOut().then(() => location.reload());
                }
            }
        }, true); // useCapture agar dijalankan SEBELUM listener logout lain
    }

    // 4b. Tombol "Nanti Saja" di prompt Simpan Info Login → JANGAN simpan, langsung logout (JANGAN hapus akun LAIN yang sudah tersimpan!)
    const dontSaveBtn = document.getElementById('authBtnLogoutDontSave');
    if (dontSaveBtn) {
        // Hapus listener LAMA agar tidak double-trigger
        dontSaveBtn.replaceWith(dontSaveBtn.cloneNode(true));
        const newBtn = document.getElementById('authBtnLogoutDontSave');
        newBtn.addEventListener('click', function __dontSaveHandler() {
            sessionStorage.removeItem('activePage');
            try {
                auth.signOut().then(() => {
                    try { localStorage.removeItem('umkm_active_uid'); localStorage.removeItem('umkm_active_user'); } catch (_) { }
                    location.reload();
                }).catch(() => location.reload());
            } catch (_) { location.reload(); }
        });
    }

    // 4c. Tombol "Ya, Simpan" → SIMPAN ke array savedAccounts, lalu logout
    const saveBtn = document.getElementById('authBtnLogoutSave');
    if (saveBtn) {
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        const newBtn = document.getElementById('authBtnLogoutSave');
        newBtn.addEventListener('click', function __saveHandler() {
            if (currentUser) saveAccountToSaved(currentUser);
            sessionStorage.removeItem('activePage');
            try {
                auth.signOut().then(() => {
                    try { localStorage.removeItem('umkm_active_uid'); localStorage.removeItem('umkm_active_user'); } catch (_) { }
                    location.reload();
                }).catch(() => location.reload());
            } catch (_) { location.reload(); }
        });
    }

    // 4d. Account Picker Links
    const goLoginFromPicker = document.getElementById('authGoToLoginFromPicker');
    if (goLoginFromPicker) {
        goLoginFromPicker.addEventListener('click', function (e) {
            e.preventDefault();
            if (typeof clearInputErrors === 'function') clearInputErrors();
            if (authInputEmail1) authInputEmail1.value = '';
            if (typeof showAuthScreen === 'function' && typeof authScreen1 !== 'undefined' && authScreen1) {
                showAuthScreen(authScreen1);
            }
            setTimeout(() => { try { authInputEmail1 && authInputEmail1.focus(); } catch (_) { } }, 150);
        });
    }
    const goRegisterFromPicker = document.getElementById('authGoToRegisterFromPicker');
    if (goRegisterFromPicker) {
        goRegisterFromPicker.addEventListener('click', function (e) {
            e.preventDefault();
            if (typeof clearInputErrors === 'function') clearInputErrors();
            if (typeof showAuthScreen === 'function' && typeof authScreen5 !== 'undefined' && authScreen5) {
                showAuthScreen(authScreen5);
            }
        });
    }
});

/* ---------- 5. Override openLoginModal → auto show account picker bila ada saved accounts ---------- */
(function _overrideOpenLoginModal() {
    const existingFn = typeof window.openLoginModal === 'function' ? window.openLoginModal : null;
    window.openLoginModal = function (toRegister) {
        toRegister = !!toRegister;
        // Jika user MENGEKLIK "Daftar" (toRegister=true) ATAU tidak ada akun tersimpan → flow NORMAL
        const list = getSavedAccounts();
        const hasSaved = list && list.length > 0;

        // Paksa selalu render picker dulu (bila dibutuhkan)
        try { renderSavedAccountsPicker(); } catch (_) { }

        if (toRegister || !hasSaved) {
            if (existingFn) return existingFn(toRegister);
            // Fallback: buka modal login manual
            const lm = document.getElementById('loginModal');
            if (lm) { lm.classList.remove('hidden'); lm.style.display = 'flex'; }
            if (typeof showAuthScreen === 'function') {
                const screen = toRegister ? authScreen5 : authScreen1;
                if (screen) showAuthScreen(screen);
            }
            return;
        }

        // ✅ Ada savedAccounts → BUKA MODAL, PINDahkan ke SCREEN 6 (Pilih Akun Untuk Masuk)
        const lm = document.getElementById('loginModal');
        if (lm) {
            lm.classList.remove('hidden');
            lm.style.display = 'flex';
        }
        if (typeof showAuthScreen === 'function' && typeof authScreen6 !== 'undefined' && authScreen6) {
            renderSavedAccountsPicker();
            showAuthScreen(authScreen6);
        }
    };
    // Ekspos juga fungsi render agar bisa di-reload oleh script lain
    window.renderRememberLoginPicker = renderSavedAccountsPicker;
    window.getSavedAccounts = getSavedAccounts;
    window.saveAccountToSaved = saveAccountToSaved;
    window.removeAccountFromSaved = removeAccountFromSaved;
})();

/* ===============================
   AVATAR PICKER - RENDER & SAVE
   =============================== */
(function _setupUnifiedAvatarSystem() {
    // 1. Hook ke showAuthScreen → render grid avatar saat masuk ke authScreen10
    const originalShowAuthScreen = typeof window.showAuthScreen === 'function'
        ? window.showAuthScreen
        : (function _fallbackShow(id) {
            if (typeof id !== 'string') return;
            const el = typeof id === 'string' ? document.getElementById(id) : id;
            if (!el) return;
            document.querySelectorAll('#loginModal [id^="authScreen"]').forEach(s => s.classList.add('hidden'));
            el.classList.remove('hidden');
        });

    window.showAuthScreen = function (screenToShow) {
        originalShowAuthScreen(screenToShow);
        const targetId = typeof screenToShow === 'string' ? screenToShow : (screenToShow && screenToShow.id);

        // Screen 10 = Avatar Picker → render grid
        if (targetId === 'authScreen10') {
            const container = document.getElementById('avatarSelectionGrid');
            if (container) {
                let currentAvatarUrl = '';
                const activeUid = localStorage.getItem('umkm_active_uid');
                if (activeUid) {
                    currentAvatarUrl = localStorage.getItem('local_avatar_' + activeUid) || '';
                }
                if (!currentAvatarUrl && auth && auth.currentUser) {
                    currentAvatarUrl = auth.currentUser.photoURL || '';
                }
                if (!currentAvatarUrl) {
                    currentAvatarUrl = window.KARANGANYAR_AVATAR_LIST
                        ? window.buildDicebearAvatarUrl(window.KARANGANYAR_AVATAR_LIST[0].seed, window.KARANGANYAR_AVATAR_LIST[0].bg)
                        : '';
                }
                window.setSelectedAvatarUrl(currentAvatarUrl);
                window.renderAvatarPicker(container, currentAvatarUrl);
            }
        }
    };

    // 2. Tombol "Simpan Profile" di authScreen10 (screen dalam login modal)
    const saveBtn = document.getElementById('authBtnSaveAvatar');
    if (saveBtn) {
        saveBtn.addEventListener('click', function _onSaveAuthAvatar() {
            const avatarUrl = window.getSelectedAvatarUrl() || (
                window.KARANGANYAR_AVATAR_LIST
                    ? window.buildDicebearAvatarUrl(window.KARANGANYAR_AVATAR_LIST[0].seed, window.KARANGANYAR_AVATAR_LIST[0].bg)
                    : ''
            );
            if (!avatarUrl) return;

            // Gunakan updateProfileAvatar GLOBAL (dari script.js) bila tersedia
            if (typeof window.updateProfileAvatar === 'function') {
                saveBtn.textContent = 'Menyimpan...';
                saveBtn.style.pointerEvents = 'none';
                window.updateProfileAvatar(avatarUrl);
                setTimeout(() => {
                    saveBtn.textContent = 'Simpan Profile';
                    saveBtn.style.pointerEvents = 'auto';
                }, 800);
                return;
            }

            // Fallback: manual save (3 lapis)
            saveBtn.textContent = 'Menyimpan...';
            saveBtn.style.pointerEvents = 'none';
            const activeUid = localStorage.getItem('umkm_active_uid');
            if (activeUid) localStorage.setItem('local_avatar_' + activeUid, avatarUrl);

            if (auth && auth.currentUser) {
                auth.currentUser.updateProfile({ photoURL: avatarUrl }).catch(() => {});
                const userObj = auth.currentUser;
                userObj.photoURL = avatarUrl;
                if (typeof window.saveRegisteredUser === 'function') {
                    window.saveRegisteredUser({
                        uid: userObj.uid,
                        email: userObj.email,
                        displayName: userObj.displayName,
                        photoURL: avatarUrl
                    });
                }
            }

            setTimeout(() => {
                saveBtn.textContent = 'Simpan Profile';
                saveBtn.style.pointerEvents = 'auto';
                if (typeof window.showAuthAlert === 'function') {
                    window.showAuthAlert('Foto profil berhasil disimpan!', 'success');
                } else {
                    alert('Foto profil berhasil disimpan!');
                }
                window.location.reload();
            }, 600);
        });
    }

    // 3. Render SEKALI JUGA saat DOMContentLoaded (untuk berjaga-jaga screen10 terbuka langsung)
    document.addEventListener('DOMContentLoaded', function _initAvatarAfterDOM() {
        setTimeout(() => {
            const container = document.getElementById('avatarSelectionGrid');
            if (container && container.innerHTML.trim() === '') {
                const defaultUrl = window.KARANGANYAR_AVATAR_LIST
                    ? window.buildDicebearAvatarUrl(window.KARANGANYAR_AVATAR_LIST[0].seed, window.KARANGANYAR_AVATAR_LIST[0].bg)
                    : '';
                if (defaultUrl) {
                    window.setSelectedAvatarUrl(defaultUrl);
                    window.renderAvatarPicker(container, defaultUrl);
                }
            }
        }, 300);
    });
})();
