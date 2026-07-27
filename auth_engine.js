
// --- REALTIME USER SYNC TO FIREBASE CLOUD DATABASE ---
window.syncUserToFirebaseDatabase = function (user, isGoogle = false) {
    if (!user) return;
    const uid = user.uid || ('user_' + Date.now());
    const userData = {
        uid: uid,
        email: user.email || '',
        displayName: user.displayName || user.username || (user.email ? user.email.split('@')[0] : 'Pengguna'),
        isGoogle: isGoogle || user.providerId === 'google.com' || (user.providerData && user.providerData.some(p => p.providerId === 'google.com')),
        providerId: (isGoogle || user.providerId === 'google.com') ? 'google.com' : 'password',
        photoURL: user.photoURL || '',
        createdAt: user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : Date.now()
    };

    // Realtime PUT to Firebase Cloud DB
    fetch(`https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users/${uid}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    }).catch(e => console.warn("Firebase user sync error:", e));

    // Also update LocalStorage
    let users = [];
    try { users = JSON.parse(localStorage.getItem('umkm_users') || '[]'); } catch (e) { }
    const idx = users.findIndex(u => u.uid === uid || u.email === user.email);
    if (idx > -1) {
        users[idx] = { ...users[idx], ...userData };
    } else {
        users.push(userData);
    }
    localStorage.setItem('umkm_users', JSON.stringify(users));
};

// auth_engine.js - Perfect Unified Auth Engine (Login, Registration, Google OAuth, Scoped Storage)
(function () {
    // 1. Toast Notification Helper
    window.showAuthAlert = function (message, type = 'error') {
        const existing = document.querySelectorAll('.auth-alert-toast');
        existing.forEach(el => el.remove());

        const toast = document.createElement('div');
        toast.className = 'auth-alert-toast';
        toast.style.cssText = `
            position: fixed;
            top: 25px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#D32F2F' : '#2E7D32'};
            color: #ffffff;
            padding: 14px 28px;
            border-radius: 30px;
            font-weight: 700;
            font-size: 0.95rem;
            z-index: 9999999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Poppins', 'Nunito', sans-serif;
            transition: all 0.3s ease;
        `;
        toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i> ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    };


    // --- ACCOUNT SCOPING & DATA ISOLATION HELPERS (CART, WISHLIST, BIODATA, THEME, ORDERS PER UID) ---
    window.getScopedStorageKey = function (keyName) {
        const activeUid = localStorage.getItem('umkm_active_uid') || 'guest';
        return `umkm_${keyName}_${activeUid}`;
    };

    window.getScopedItem = function (keyName, defaultValue = null) {
        const scopedKey = window.getScopedStorageKey(keyName);
        const val = localStorage.getItem(scopedKey);
        if (val !== null) {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return defaultValue;
    };

    window.setScopedItem = function (keyName, value) {
        const scopedKey = window.getScopedStorageKey(keyName);
        const valToStore = typeof value === 'object' ? JSON.stringify(value) : value;
        localStorage.setItem(scopedKey, valToStore);

        // Sync with Firebase Cloud if available
        const activeUid = localStorage.getItem('umkm_active_uid');
        if (activeUid && activeUid !== 'guest' && typeof firebase !== 'undefined') {
            if (firebase.database) {
                try { firebase.database().ref(`users/${activeUid}/${keyName}`).set(value); } catch (e) { }
            }
        }
    };


    // --- ACCOUNT-SCOPED MODE TAMPILAN (THEME ENGINE PER UID) ---
    window.applyUserTheme = function (themeValue = null) {
        const activeUid = localStorage.getItem('umkm_active_uid') || 'guest';
        const currentTheme = themeValue || (activeUid !== 'guest' ? localStorage.getItem('umkm_theme_' + activeUid) : 'light') || 'light';

        let actualTheme = currentTheme;
        if (currentTheme === 'device') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            actualTheme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', actualTheme);
        document.body.setAttribute('data-theme', actualTheme);
        document.documentElement.setAttribute('data-theme-mode', currentTheme);
        document.body.setAttribute('data-theme-mode', currentTheme);

        // Update Theme Cards UI on Mode Tampilan Tab
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(card => {
            const val = card.getAttribute('data-value');
            const radio = card.querySelector('input[type="radio"]');
            if (val === currentTheme) {
                card.classList.add('active');
                card.style.borderColor = '#03ac0e';
                card.style.background = '#f6fbf7';
                if (radio) radio.checked = true;
            } else {
                card.classList.remove('active');
                card.style.borderColor = '#e5e7e9';
                card.style.background = '#ffffff';
                if (radio) radio.checked = false;
            }
        });

        if (themeValue) {
            localStorage.setItem('umkm_theme_' + activeUid, themeValue);

            // Sync to Firebase Cloud if available
            if (activeUid !== 'guest' && typeof firebase !== 'undefined' && firebase.database) {
                try { firebase.database().ref(`users/${activeUid}/theme`).set(themeValue); } catch (e) { }
            }

            // Show Theme Applied Toast Notification
            const notif = document.getElementById('themeAppliedNotif');
            const notifText = document.getElementById('themeAppliedText');
            const themeNames = {
                'device': 'Ikuti Pengaturan Device',
                'light': 'Standar Light',
                'protanopia': 'Filter Hijau/Merah',
                'tritanopia': 'Filter Biru/Kuning',
                'dark': 'Tampilan Gelap'
            };
            if (notif && notifText) {
                notifText.textContent = `Mode tampilan "${themeNames[themeValue] || themeValue}" berhasil diterapkan!`;
                notif.style.display = 'flex';
                setTimeout(() => {
                    notif.style.display = 'none';
                }, 3500);
            }
        }
    };

    // 2. Registered Users Database (localStorage: umkm_users)
    window.getRegisteredUsers = function () {
        return JSON.parse(localStorage.getItem('umkm_users') || '[]');
    };

    window.saveRegisteredUser = function (userObj) {
        if (!userObj || !userObj.uid) return;
        const users = window.getRegisteredUsers();
        const idx = users.findIndex(u => u.uid === userObj.uid || (u.email && userObj.email && u.email.toLowerCase() === userObj.email.toLowerCase()));

        // === PRIORITAS PILIHAN FOTO PROFIL ===
        // 1. Field yang di-passing via userObj.photoURL (misal dari Google OAuth, updateProfile, dll)
        // 2. Hidden field selectedAvatarUrl (jika user baru saja pilih di avatar picker dalam sesi ini)
        // 3. localStorage 'local_avatar_' + uid (sudah disimpan dari updateProfileAvatar sebelumnya)
        // 4. Fallback Dicebear random by email / uid (pakai URL standar terpadu)
        let finalPhotoUrl = userObj.photoURL || '';
        if (!finalPhotoUrl) {
            try {
                const selField = document.getElementById('selectedAvatarUrl');
                if (selField && selField.value && /https?:\/\//.test(selField.value)) {
                    finalPhotoUrl = selField.value;
                }
            } catch(_) {}
        }
        if (!finalPhotoUrl) {
            try { finalPhotoUrl = localStorage.getItem('local_avatar_' + userObj.uid) || ''; } catch(_) {}
        }
        if (!finalPhotoUrl) {
            const fallbackSeed = (userObj.email || userObj.uid || 'user');
            if (typeof window.buildDicebearAvatarUrl === 'function') {
                finalPhotoUrl = window.buildDicebearAvatarUrl(fallbackSeed, 'b6e3f4');
            } else {
                finalPhotoUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(fallbackSeed)}&mouth=smile,laughing&backgroundColor=b6e3f4`;
            }
        }

        const payload = {
            uid: userObj.uid,
            email: userObj.email || '',
            username: userObj.username || userObj.displayName || '',
            displayName: userObj.displayName || userObj.username || '',
            password: userObj.password || 'password_protected',
            dob: userObj.dob || '',
            gender: userObj.gender || 'Laki-laki',
            photoURL: finalPhotoUrl,
            isGoogle: !!userObj.isGoogle,
            providerId: userObj.providerId || (userObj.isGoogle ? 'google.com' : 'password'),
            createdAt: userObj.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (idx >= 0) {
            users[idx] = { ...users[idx], ...payload };
        } else {
            users.push(payload);
        }
        localStorage.setItem('umkm_users', JSON.stringify(users));

        // Realtime REST Sync to Firebase DB for Admin Panel
        try {
            fetch(`https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users/${payload.uid}.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.warn("Firebase REST Sync error:", e));
        } catch (e) { }

        if (typeof firebase !== 'undefined' && firebase.database) {
            try { firebase.database().ref('users/' + payload.uid).set(payload); } catch (e) { }
        }
    };


    // Helper to clear all local users database
    window.clearLocalUsersDatabase = function () {
        localStorage.removeItem('umkm_users');
        localStorage.removeItem('umkm_active_user');
        localStorage.removeItem('umkm_active_uid');
        localStorage.removeItem('saved_tokopedia_account');
        console.log("Cleared local users database!");
    };

    window.getFirebaseApiKey = function () {
        if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'GANTI_DENGAN_API_KEY_ANDA') {
            return firebaseConfig.apiKey;
        }
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            return firebase.apps[0].options && firebase.apps[0].options.apiKey;
        }
        return null;
    };

    window.buildAuthUserFromEmailCheck = function (email, signinMethods = []) {
        const cleanEmail = email.trim().toLowerCase();
        const methods = Array.isArray(signinMethods) ? signinMethods : [];
        const isGoogle = methods.includes('google.com');
        const hasPassword = methods.includes('password') || methods.includes('emailLink');

        return {
            uid: 'fb_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
            email: cleanEmail,
            username: cleanEmail.split('@')[0],
            displayName: cleanEmail.split('@')[0],
            isGoogle: isGoogle,
            methods: methods,
            providerId: isGoogle ? 'google.com' : (hasPassword ? 'password' : 'unknown'),
            password: isGoogle ? 'google_firebase_auth' : ''
        };
    };

    // Cek keberadaan email di Firebase Authentication (manual + Google provider)
    window.checkEmailInFirebaseAuth = async function (email) {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.includes('@')) return null;

        let signinMethods = [];

        // Metode 1: SDK (bisa kosong jika Email Enumeration Protection aktif)
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                const methods = await firebase.auth().fetchSignInMethodsForEmail(cleanEmail);
                if (methods && methods.length > 0) {
                    signinMethods = methods;
                    return {
                        registered: true,
                        signinMethods: methods,
                        user: window.buildAuthUserFromEmailCheck(cleanEmail, methods)
                    };
                }
            } catch (errAuth) {
                console.warn("fetchSignInMethodsForEmail note:", errAuth);
            }
        }

        // Metode 2: REST createAuthUri (lebih andal untuk akun Google saat enumeration protection aktif)
        const apiKey = window.getFirebaseApiKey();
        if (apiKey) {
            try {
                const continueUri = window.location.origin + (window.location.pathname || '/');
                const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identifier: cleanEmail,
                        continueUri: continueUri
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.registered === true) {
                        signinMethods = data.signinMethods || data.allProviders || signinMethods;
                        return {
                            registered: true,
                            signinMethods: signinMethods,
                            user: window.buildAuthUserFromEmailCheck(cleanEmail, signinMethods)
                        };
                    }
                }
            } catch (errRest) {
                console.warn("createAuthUri check note:", errRest);
            }
        }

        return null;
    };

    window.findUserByIdentifierAsync = async function (identifier) {
        if (!identifier) return null;
        const cleanId = identifier.trim().toLowerCase();

        // 1. Fetch live users directly from Firebase Realtime DB
        try {
            const res = await fetch('https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/users.json');
            if (res.ok) {
                const firebaseUsers = await res.json();
                if (firebaseUsers) {
                    const foundUid = Object.keys(firebaseUsers).find(uid => {
                        const u = firebaseUsers[uid];
                        return (u.email && u.email.toLowerCase() === cleanId) ||
                               (u.username && u.username.toLowerCase() === cleanId);
                    });
                    if (foundUid) {
                        return { uid: foundUid, ...firebaseUsers[foundUid] };
                    }
                }
            }
        } catch (e) {
            console.warn("Live DB check fallback:", e);
        }

        // 2. Cek Firebase Authentication (email/password + Google provider)
        if (cleanId.includes('@')) {
            const authCheck = await window.checkEmailInFirebaseAuth(cleanId);
            if (authCheck && authCheck.registered && authCheck.user) {
                return authCheck.user;
            }
        }

        // 3. Fallback ke local storage
        const localUser = window.findUserByIdentifier(cleanId);
        if (localUser) return localUser;

        return null;
    };

    window.findUserByIdentifier = function (identifier) {
        if (!identifier) return null;
        const users = window.getRegisteredUsers();
        const cleanId = identifier.trim().toLowerCase();
        return users.find(u =>
            (u.email && u.email.toLowerCase() === cleanId) ||
            (u.username && u.username.toLowerCase() === cleanId)
        );
    };

    // 3. Single Source of Truth Header UI Updater
    window.updateHeaderAuthUI = function (user) {
        const authButtonsContainer = document.getElementById('authButtonsContainer');
        const userProfileContainer = document.getElementById('userProfileContainer');
        const cartIconBtn = document.getElementById('cartIconBtn');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');

        if (user) {
            // LOGGED IN
            if (authButtonsContainer) {
                authButtonsContainer.classList.add('hidden');
                if (authButtonsContainer.style) authButtonsContainer.style.setProperty('display', 'none', 'important');
            }
            if (userProfileContainer) {
                userProfileContainer.classList.remove('hidden');
                if (userProfileContainer.style) userProfileContainer.style.setProperty('display', 'flex', 'important');
            }
            if (cartIconBtn) cartIconBtn.classList.remove('hidden');

            const name = user.displayName || user.username || (user.email ? user.email.split('@')[0] : 'Pengguna');
            let firstName = name.split(' ')[0];
            if (firstName.length > 12) {
                firstName = firstName.substring(0, 10) + '...';
            }

            if (userNameDisplay) {
                userNameDisplay.textContent = firstName;
                userNameDisplay.title = name; // Tooltip showing full name on hover
            }

            const dropdownName = document.getElementById('dropdownName');
            if (dropdownName) dropdownName.textContent = name;

            const avatarUrl = user.photoURL || `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(user.email || user.uid)}&mouth=smile,laughing&backgroundColor=b6e3f4`;
            if (userAvatar) userAvatar.src = avatarUrl;

            const dropdownAvatar = document.getElementById('dropdownAvatar');
            if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
        } else {
            // GUEST MODE (LOGGED OUT)
            if (authButtonsContainer) {
                authButtonsContainer.classList.remove('hidden');
                if (authButtonsContainer.style) {
                    authButtonsContainer.style.setProperty('display', 'flex', 'important');
                    authButtonsContainer.style.setProperty('visibility', 'visible', 'important');
                }
            }
            if (userProfileContainer) {
                userProfileContainer.classList.add('hidden');
                if (userProfileContainer.style) userProfileContainer.style.setProperty('display', 'none', 'important');
            }
            if (cartIconBtn) cartIconBtn.classList.add('hidden');
        }
    };

    // 4. Perform Login Function
    window.loginUserObject = function (userObj, showToast = false) {
        localStorage.setItem('umkm_active_uid', userObj.uid);
        localStorage.setItem('umkm_active_user', JSON.stringify(userObj));
        window.syncUserToFirebaseDatabase(userObj, userObj.isGoogle);

        if (typeof currentUser !== 'undefined') {
            currentUser = userObj;
        }

        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.classList.add('hidden');

        window.updateHeaderAuthUI(userObj);
        window.applyUserTheme();

        if (typeof loadUserState === 'function') {
            loadUserState();
        }

        if (showToast) {
            const displayName = userObj.displayName || userObj.username || 'Pengguna';
            window.showAuthAlert(`Berhasil masuk! Selamat datang kembali, ${displayName}`, 'success');
        }
    };

    // 5. Perform Logout Function
    window.logoutUser = function (showMsg = true, redirectPage = 'tentangPage') {
        localStorage.removeItem('umkm_active_uid');
        localStorage.removeItem('umkm_active_user');
        localStorage.removeItem('saved_tokopedia_account');

        if (typeof firebase !== 'undefined' && firebase.auth) {
            try { firebase.auth().signOut(); } catch (e) { }
        }

        if (typeof currentUser !== 'undefined') {
            currentUser = null;
        }

        window.updateHeaderAuthUI(null);
        window.applyUserTheme();

        if (typeof loadUserState === 'function') {
            loadUserState();
        }

        // Automatically switch away from profile/private pages to Tentang Karanganyar page
        if (typeof window.switchPage === 'function') {
            window.switchPage(redirectPage || 'tentangPage');
        }

        if (showMsg) {
            window.showAuthAlert('Berhasil keluar dari akun.', 'success');
        }
    };

    // Helper: Cek apakah user sedang di perangkat mobile
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth < 768;
    }

    // Helper: Proses hasil autentikasi Google (dipakai oleh popup DAN redirect flow)
    function processGoogleAuthResult(gUser, modeFromStorage) {
        const email = gUser.email;
        const displayName = gUser.displayName || email.split('@')[0];
        const photoURL = gUser.photoURL;

        const newUser = {
            uid: gUser.uid,
            email: email,
            username: displayName.toLowerCase().replace(/\s+/g, '_'),
            displayName: displayName,
            password: 'google_firebase_auth',
            photoURL: photoURL,
            isGoogle: true,
            providerId: 'google.com'
        };

        const mode = modeFromStorage || 'login';
        const existingUser = window.findUserByIdentifier(email);
        if (mode === 'login') {
            const userToLogin = existingUser
                ? { ...existingUser, ...newUser, uid: gUser.uid }
                : newUser;
            window.saveRegisteredUser(userToLogin);
            window.loginUserObject(userToLogin, true);
            window.showAuthAlert(`Berhasil masuk dengan Google: ${email}`, 'success');
        } else {
            window.saveRegisteredUser(newUser);
            window.loginUserObject(newUser, true);
            window.showAuthAlert(`Berhasil mendaftar dengan Google: ${email}`, 'success');
        }
        sessionStorage.removeItem('google_auth_mode');
        sessionStorage.removeItem('google_auth_flow');
        sessionStorage.removeItem('google_auth_prompt_shown');
    }

    // 6. REAL FIREBASE GOOGLE OAUTH WITH LOCAL FALLBACK
    window.handleRealFirebaseGoogleAuth = function (mode = 'login') {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const authInst = firebase.auth();
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            provider.setCustomParameters({ prompt: 'select_account' });

            // Simpan mode ke sessionStorage untuk dipakai setelah auth selesai
            sessionStorage.setItem('google_auth_mode', mode);
            sessionStorage.removeItem('google_auth_flow');

            // Untuk website biasa, popup adalah flow paling stabil.
            // Redirect hanya dipakai sebagai fallback jika popup diblokir browser.
            const useRedirect = false;
            const authMethodLabel = useRedirect ? 'Redirect' : 'Popup';
            console.log(`[Google Auth] Using ${authMethodLabel} flow for ${mode} mode`, {
                origin: window.location.origin,
                hostname: window.location.hostname,
                authDomain: (firebase.apps && firebase.apps[0] && firebase.apps[0].options && firebase.apps[0].options.authDomain) || null,
                projectId: (firebase.apps && firebase.apps[0] && firebase.apps[0].options && firebase.apps[0].options.projectId) || null
            });

            if (useRedirect) {
                // === REDIRECT FLOW (lebih stabil untuk mobile & deploy) ===
                sessionStorage.setItem('google_auth_flow', 'redirect');
                window.showAuthAlert('Mengalihkan ke halaman Google...', 'info');
                authInst.signInWithRedirect(provider).catch((error) => {
                    console.error('[Google Auth] Redirect Error object:', error);
                    console.error('[Google Auth] Redirect Error code:', error && error.code);
                    console.error('[Google Auth] Redirect Error message:', error && error.message);
                    console.error('[Google Auth] Redirect Error customData:', error && error.customData);
                    console.error('[Google Auth] Redirect Error stack:', error && error.stack);
                    handleGoogleAuthError(error, mode);
                });
            } else {
                // === POPUP FLOW (untuk desktop) ===
                authInst.signInWithPopup(provider).then((result) => {
                    processGoogleAuthResult(result.user, mode);
                }).catch((error) => {
                    console.error('[Google Auth] Popup Error object:', error);
                    console.error('[Google Auth] Popup Error code:', error && error.code);
                    console.error('[Google Auth] Popup Error message:', error && error.message);
                    console.error('[Google Auth] Popup Error customData:', error && error.customData);
                    console.error('[Google Auth] Popup Error stack:', error && error.stack);
                    // Jika popup diblokir/gagal, fallback ke redirect
                    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
                        console.warn("[Google Auth] Popup failed, falling back to redirect...");
                        sessionStorage.setItem('google_auth_flow', 'redirect');
                        window.showAuthAlert('Pop-up diblokir, mengalihkan ke halaman Google...', 'info');
                        authInst.signInWithRedirect(provider).catch((e) => {
                            console.error('[Google Auth] Fallback Redirect Error object:', e);
                            console.error('[Google Auth] Fallback Redirect Error code:', e && e.code);
                            console.error('[Google Auth] Fallback Redirect Error message:', e && e.message);
                            console.error('[Google Auth] Fallback Redirect Error customData:', e && e.customData);
                            console.error('[Google Auth] Fallback Redirect Error stack:', e && e.stack);
                            handleGoogleAuthError(e, mode);
                        });
                    } else {
                        handleGoogleAuthError(error, mode);
                    }
                });
            }
        } else {
            promptGoogleAccountInput(mode);
        }
    };

    // Handler error Google Auth yang terpusat
    function handleGoogleAuthError(error, mode) {
        sessionStorage.removeItem('google_auth_mode');
        sessionStorage.removeItem('google_auth_flow');
        console.error('[Google Auth] Central handler error object:', error);
        console.error('[Google Auth] Central handler error code:', error && error.code);
        console.error('[Google Auth] Central handler error message:', error && error.message);
        console.error('[Google Auth] Central handler error customData:', error && error.customData);
        console.error('[Google Auth] Central handler current origin:', window.location.origin);
        console.error('[Google Auth] Central handler mode:', mode);

        const rawMessage = (error && (error.message || error.code)) || 'Terjadi kesalahan yang tidak diketahui saat autentikasi Google.';
        if (error.code === 'auth/popup-blocked') {
            window.showAuthAlert('Pop-up Google diblokir. Silakan izinkan pop-up (klik ikon pop-up di address bar) atau coba lagi. Detail: ' + rawMessage, 'error');
        } else if (error.code === 'auth/unauthorized-domain') {
            const currentDomain = window.location.hostname;
            window.showAuthAlert(
                `Domain "${currentDomain}" belum terdaftar di Firebase Console! Detail: ${rawMessage}`,
                'error'
            );
        } else if (error.code === 'auth/popup-closed-by-user') {
            window.showAuthAlert('Proses masuk Google dibatalkan.', 'info');
        } else if (error.code === 'auth/network-request-failed') {
            var currentDomain = window.location.hostname || '';
            var isLocal = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/i.test(currentDomain);
            if (isLocal) {
                window.showAuthAlert('Koneksi ke Google OAuth gagal (localhost). Detail Firebase: ' + rawMessage, 'error');
            } else {
                window.showAuthAlert(
                    'Koneksi ke Google OAuth gagal di domain "' + currentDomain + '". Detail Firebase: ' + rawMessage,
                    'error'
                );
            }
            sessionStorage.removeItem('google_auth_mode');
        } else if (error.code === 'auth/operation-not-allowed') {
            window.showAuthAlert(
                'Login Google belum diaktifkan di Firebase! Detail: ' + rawMessage,
                'error'
            );
        } else if (error.code === 'auth/invalid-api-key') {
            window.showAuthAlert('Firebase API Key tidak valid. Detail: ' + rawMessage, 'error');
        } else if (error.code === 'auth/app-not-authorized') {
            window.showAuthAlert(
                'Aplikasi tidak diotorisasi untuk Google Sign-In! Detail: ' + rawMessage,
                'error'
            );
        } else {
            window.showAuthAlert('Gagal masuk Google: ' + rawMessage, 'error');
        }
    }

    // === REDIRECT RESULT HANDLER ===
    // PERINGATAN: SEKARANG observer onAuthStateChanged di auth.js = SINGLE SOURCE OF TRUTH.
    // Fungsi ini HANYA sebagai FAILSAFE FALLBACK, TIDAK PERNAH memodifikasi UI langsung.
    // SEMUA call dibungkus try/catch + typeof safety check agar TIDAK BISA merusak layout.
    function setupGoogleRedirectResultHandler() {
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        if (sessionStorage.getItem('google_auth_flow') !== 'redirect') return;
        var authInst = firebase.auth();
        var savedMode = sessionStorage.getItem('google_auth_mode') || 'login';

        // === TIMEOUT WRAPPER: 15 detik maksimal tunggu getRedirectResult ===
        var REDIRECT_TIMEOUT_MS = 15000;
        var redirectPromise = authInst.getRedirectResult();
        var timeoutPromise = new Promise(function(_, reject) {
            setTimeout(function() {
                var err = new Error('Redirect result timeout setelah ' + (REDIRECT_TIMEOUT_MS / 1000) + 's');
                err.code = 'custom/redirect-timeout';
                reject(err);
            }, REDIRECT_TIMEOUT_MS);
        });

        Promise.race([redirectPromise, timeoutPromise])
            .then(function(result) {
                try {
                    if (!(result && result.user)) return;

                    console.log('[Google Auth] Redirect result (failsafe fallback):', result.user.email);

                    // CEK LOCK: jika observer auth.js SUDAH MEMPROSES → LEWATKAN SAJA!
                    if (window.__googleAuthProcessed) {
                        sessionStorage.removeItem('google_auth_mode');
                        sessionStorage.removeItem('google_auth_flow');
                        return;
                    }

                    // TUNGGU 2 DETIK untuk observer (onAuthStateChanged) prioritas utama memproses duluan
                    setTimeout(function() {
                        try {
                            if (!window.__googleAuthProcessed) {
                                console.warn('[Google Auth] Observer auth.js belum memproses → fallback processGoogleAuthResult');
                                if (typeof processGoogleAuthResult === 'function') {
                                    processGoogleAuthResult(result.user, savedMode);
                                }
                            } else {
                                sessionStorage.removeItem('google_auth_mode');
                                sessionStorage.removeItem('google_auth_flow');
                            }
                        } catch (innerErr) {
                            console.error('[Google Auth] Redirect fallback setTimeout error (diabaikan):', innerErr);
                        }
                    }, 2000);
                } catch (thenErr) {
                    console.error('[Google Auth] Redirect .then() error (diabaikan):', thenErr);
                }
            })
            .catch(function(error) {
                try {
                    console.error('[Google Auth] Redirect result error (failsafe):', error && error.code, error && error.message);

                    // Jika observer auth.js SUDAH berhasil memproses → abaikan error ini
                    try {
                        var alreadyUser = authInst.currentUser;
                        if (alreadyUser && window.__googleAuthProcessed) {
                            sessionStorage.removeItem('google_auth_mode');
                            sessionStorage.removeItem('google_auth_flow');
                            return;
                        }
                    } catch (_) {}

                    if (error.code === 'auth/no-auth-event' || error.code === 'auth/user-cancelled') {
                        sessionStorage.removeItem('google_auth_mode');
                        sessionStorage.removeItem('google_auth_flow');
                        return;
                    }

                    if (error.code === 'custom/redirect-timeout') {
                        // HANYA TOAST, JANGAN PERNAH auto-open promptGoogleAccountInput!
                        // Auto-open modal di mobile membuat kesan UI rusak dan menghalangi konten.
                        var isNetlify = /netlify\.(app|com)$/i.test(window.location.hostname || '');
                        if (typeof window.showAuthAlert === 'function') {
                            if (isNetlify) {
                                window.showAuthAlert(
                                    '⚠️ Google Sign-In TIMEOUT! Hampir pasti karena domain "' + window.location.hostname + '" BELUM ditambahkan ke Authorized Domains di Firebase Console. Buka Console → Authentication → Settings → Authorized domains → Add "' + window.location.hostname + '". Tunggu 1-2 menit lalu coba lagi.',
                                    'error'
                                );
                            } else {
                                window.showAuthAlert(
                                    'Waktu tunggu Google Sign-In habis. Coba lagi klik tombol Daftar/Masuk Google, atau gunakan form daftar email manual.',
                                    'error'
                                );
                            }
                        }
                        sessionStorage.removeItem('google_auth_mode');
                        sessionStorage.removeItem('google_auth_flow');
                        return;
                    }

                    if (typeof handleGoogleAuthError === 'function') {
                        handleGoogleAuthError(error, savedMode);
                    }
                } catch (catchErr) {
                    console.error('[Google Auth] Redirect .catch() outer error (diabaikan):', catchErr);
                }
            });
    }

    function promptGoogleAccountInput(mode) {
        const existingModal = document.getElementById('googleAccountPromptModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'googleAccountPromptModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.6); z-index: 9999999; display: flex;
            align-items: center; justify-content: center; font-family: 'Poppins', sans-serif;
        `;
        modal.innerHTML = `
            <div style="background: white; width: 420px; max-width: 90%; padding: 28px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative;">
                <button id="closeGooglePromptBtn" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #888;">&times;</button>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" style="width: 42px; height: 42px; margin-bottom: 10px;" alt="Logo Google">
                    <h3 style="margin: 0 0 5px 0; color: #31353B; font-size: 1.2rem; font-weight: 700;">Lanjutkan dengan Google</h3>
                    <p style="margin: 0; color: #6D7588; font-size: 0.85rem;">Masukkan alamat e-mail akun Google yang Anda miliki</p>
                </div>

                <form id="googlePromptForm">
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 0.85rem; color: #6D7588; font-weight: 600; display: block; margin-bottom: 5px;">Email Google Anda</label>
                        <input type="email" id="googlePromptEmail" placeholder="Contoh: akun.anda@gmail.com" required style="width: 100%; padding: 12px; border: 1px solid #E5E7E9; border-radius: 8px; font-size: 0.95rem; outline: none; box-sizing: border-box;">
                    </div>
                    ${mode === 'register' ? `
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 0.85rem; color: #6D7588; font-weight: 600; display: block; margin-bottom: 5px;">Nama Lengkap Akun Google</label>
                        <input type="text" id="googlePromptName" placeholder="Contoh: Budi Santoso" required style="width: 100%; padding: 12px; border: 1px solid #E5E7E9; border-radius: 8px; font-size: 0.95rem; outline: none; box-sizing: border-box;">
                    </div>
                    ` : ''}
                    <button type="submit" style="width: 100%; padding: 12px; background: #4285F4; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 0.95rem; cursor: pointer; margin-top: 10px;">Lanjutkan dengan Google</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('closeGooglePromptBtn').onclick = () => modal.remove();

        document.getElementById('googlePromptForm').onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('googlePromptEmail').value.trim();
            const name = mode === 'register' ? (document.getElementById('googlePromptName')?.value.trim() || email.split('@')[0]) : email.split('@')[0];

            modal.remove();

            // Gunakan FOTO PROFIL SISTEM TERPADU (SAMA DENGAN observer auth.js)
            let finalPhotoUrl = '';
            try {
                const selField = document.getElementById('selectedAvatarUrl');
                if (selField && selField.value && /https?:\/\//.test(selField.value)) {
                    finalPhotoUrl = selField.value;
                }
            } catch(_) {}
            if (!finalPhotoUrl && typeof window.buildDicebearAvatarUrl === 'function') {
                finalPhotoUrl = window.buildDicebearAvatarUrl(email, 'b6e3f4');
            }
            if (!finalPhotoUrl) {
                finalPhotoUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(email)}&mouth=smile,laughing&backgroundColor=b6e3f4`;
            }

            const existingUser = window.findUserByIdentifier(email);
            if (mode === 'login') {
                if (!existingUser) {
                    window.showAuthAlert(`Akun Google (${email}) belum terdaftar. Silakan klik "Daftar" terlebih dahulu!`);
                    return;
                }
                window.loginUserObject(existingUser, true);
            } else {
                if (existingUser) {
                    window.showAuthAlert(`Akun Google (${email}) sudah terdaftar! Otomatis masuk.`, 'success');
                    window.loginUserObject(existingUser, true);
                } else {
                    const newUser = {
                        uid: 'goog_' + Date.now(),
                        email: email,
                        username: name.toLowerCase().replace(/\s+/g, '_'),
                        displayName: name,
                        password: 'google_oauth_pass',
                        dob: '2000-01-01',
                        gender: 'Laki-laki',
                        photoURL: finalPhotoUrl
                    };
                    window.saveRegisteredUser(newUser);
                    window.loginUserObject(newUser, true);
                    window.showAuthAlert(`Berhasil mendaftar dengan Google: ${email}`, 'success');
                }
            }
        };
    }

    // Ekspose prompt manual agar watchdog di auth.js bisa memanggilnya
    window.promptGoogleAccountInput = promptGoogleAccountInput;

    // 7. INITIALIZE DOM & FORM LISTENERS
    document.addEventListener('DOMContentLoaded', () => {
        // NOTE: Session restore is handled by Firebase onAuthStateChanged in auth.js
        // Do NOT restore from localStorage here to avoid conflicts with Firebase auth state
        // The Firebase onAuthStateChanged observer will call updateHeaderAuthUI automatically

        // === KRITIS: Setup handler untuk menangkap hasil Google OAuth redirect ===
        // Ini harus dijalankan SECEPATNYA saat DOM siap, agar tidak melewatkan callback redirect
        setupGoogleRedirectResultHandler();

        // --- MODE TAMPILAN (THEME SELECTION CLICK LISTENERS) ---
        document.addEventListener('click', (e) => {
            const themeCard = e.target.closest('.theme-card');
            if (themeCard) {
                const themeVal = themeCard.getAttribute('data-value');
                if (themeVal) {
                    window.applyUserTheme(themeVal);
                }
            }
        });
        window.applyUserTheme();

        // --- MODAL SCREEN SWITCHING & NAVIGATION LISTENERS ---
        function showAuthScreen(screenToShow) {
            const screens = ['authScreen1', 'authScreen2', 'authScreen3', 'authScreen4', 'authScreen5', 'authScreen6', 'authScreen7', 'authScreen8'];
            screens.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            if (screenToShow) {
                const target = typeof screenToShow === 'string' ? document.getElementById(screenToShow) : screenToShow;
                if (target) target.classList.remove('hidden');
            }
        }
        window.showAuthScreen = showAuthScreen;
        window.openLoginModal = function(toRegister = false) {
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.classList.remove('hidden');
                loginModal.style.display = 'flex';
            }
            showAuthScreen(toRegister ? 'authScreen5' : 'authScreen1');
        };

        // Open Modal Buttons from Header
        const headerBtnMasuk = document.querySelector('.btn-masuk');
        const headerBtnDaftar = document.querySelector('.btn-daftar');
        const loginModal = document.getElementById('loginModal');

        if (headerBtnMasuk) {
            headerBtnMasuk.onclick = (e) => {
                e.preventDefault();
                if (loginModal) loginModal.classList.remove('hidden');
                showAuthScreen('authScreen1');
            };
        }

        if (headerBtnDaftar) {
            headerBtnDaftar.onclick = (e) => {
                e.preventDefault();
                if (loginModal) loginModal.classList.remove('hidden');
                showAuthScreen('authScreen5');
            };
        }

        // Close Modal ("x") Buttons
        const closeBtns = document.querySelectorAll('.close-modal');
        closeBtns.forEach(btn => {
            btn.onclick = () => {
                if (loginModal) loginModal.classList.add('hidden');
            };
        });

        // "Metode Lain" Button (Screen 1 -> Screen 3)
        const authBtnOtherMethods = document.getElementById('authBtnOtherMethods');
        if (authBtnOtherMethods) {
            authBtnOtherMethods.onclick = (e) => {
                e.preventDefault();
                showAuthScreen('authScreen3');
            };
        }

        // "Daftar" Link on Screen 1 -> Screen 5
        const authGoToRegister = document.getElementById('authGoToRegister');
        if (authGoToRegister) {
            authGoToRegister.onclick = (e) => {
                e.preventDefault();
                showAuthScreen('authScreen5');
            };
        }

        // "Masuk" Link on Screen 5 -> Screen 1
        const authGoToLogin = document.getElementById('authGoToLogin');
        if (authGoToLogin) {
            authGoToLogin.onclick = (e) => {
                e.preventDefault();
                showAuthScreen('authScreen1');
            };
        }

        // "Lupa Kata Sandi?" Link on Screen 1 -> Screen 4
        const authGoToForgot = document.getElementById('authGoToForgot');
        if (authGoToForgot) {
            authGoToForgot.onclick = (e) => {
                e.preventDefault();
                showAuthScreen('authScreen4');
            };
        }

        // Back Arrow ("<") Buttons
        const authBackTo1 = document.getElementById('authBackTo1');
        if (authBackTo1) {
            authBackTo1.onclick = () => showAuthScreen('authScreen1');
        }

        const authBackTo1FromMethods = document.getElementById('authBackTo1FromMethods');
        if (authBackTo1FromMethods) {
            authBackTo1FromMethods.onclick = () => showAuthScreen('authScreen1');
        }

        const authBackTo1FromForgot = document.getElementById('authBackTo1FromForgot');
        if (authBackTo1FromForgot) {
            authBackTo1FromForgot.onclick = () => showAuthScreen('authScreen1');
        }

        // --- MANUAL LOGIN SCREEN 1 (EMAIL / USERNAME INPUT) ---
        const formAuthScreen1 = document.getElementById('formAuthScreen1');
        const authInputEmail = document.getElementById('authInputEmail') || document.getElementById('authInputEmail1');
        const authBtnNext = document.getElementById('authBtnNext') || document.getElementById('authBtnNextEmail');

        window.closeAccountNotFoundModal = function() {
            const modal = document.getElementById('accountNotFoundModal');
            if (modal) modal.style.display = 'none';
        };

        window.showAccountNotFoundModal = function(identifier) {
            const modal = document.getElementById('accountNotFoundModal');
            const emailText = document.getElementById('unregisteredEmailText');
            const btnGoReg = document.getElementById('btnGoToRegisterFromNotFound');

            if (emailText) emailText.textContent = identifier;
            if (modal) modal.style.display = 'flex';

            if (btnGoReg) {
                btnGoReg.onclick = () => {
                    window.closeAccountNotFoundModal();
                    if (typeof showAuthScreen === 'function') {
                        showAuthScreen('authScreen5');
                    }
                    const regEmailInput = document.getElementById('authRegisterEmail') || document.getElementById('authInputEmailRegister');
                    if (regEmailInput) {
                        regEmailInput.value = identifier;
                    }
                };
            }
        };

        async function handleScreen1Submit(e) {
            if (e) e.preventDefault();
            const inputField = document.getElementById('authInputEmail1') || document.getElementById('authInputEmail');
            const btn = document.getElementById('authBtnNext') || document.getElementById('authBtnNextEmail');
            const identifier = inputField ? inputField.value.trim() : '';

            if (!identifier) {
                window.showAuthAlert('Silakan masukkan Email Anda terlebih dahulu.', 'error');
                if (inputField) inputField.focus();
                return;
            }

            // ====================================================================
            // ALUR 1: CEK PENULISAN FORMAT EMAIL (SEKETIKA TANPA ANIMASI LOADING)
            // ====================================================================
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            const lowerId = identifier.toLowerCase();
            const hasTypoDomain = lowerId.endsWith('@gmai.com') || lowerId.endsWith('@gmaill.com') || lowerId.endsWith('@gmil.com') || lowerId.endsWith('@gmal.com') || lowerId.endsWith('@yaho.com') || lowerId.endsWith('@hotmai.com');

            // Cek apakah format penulisan email sudah valid dan benar
            const isValidEmailFormat = emailRegex.test(identifier) && !hasTypoDomain;

            if (!isValidEmailFormat) {
                // JIKA PENULISAN EMAIL SALAH -> SEKETIKA MUNCULKAN NOTIFIKASI SALAH PENULISAN EMAIL!
                window.showAuthAlert('Penulisan email tidak benar! Harap masukkan format email yang sesuai (contoh: nama@gmail.com).', 'error');
                if (inputField) inputField.focus();
                return; // LANGSUNG KELUAR & STAY DI KOLOM EMAIL, TANPA MASUK KE ANIMASI LOADING!
            }

            // ====================================================================
            // ALUR 2: PENULISAN EMAIL SUDAH BENAR -> MASUK KE ANIMASI LOADING (1.5s)
            // ====================================================================
            if (btn) {
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="margin-right: 8px; font-size: 1.1rem;"></i> Memeriksa Email...';
                btn.disabled = true;
                btn.style.opacity = '0.85';
                btn.style.cursor = 'wait';
                btn.style.background = '#00AA5B';
            }
            if (inputField) {
                inputField.readOnly = true;
            }

            try {
                // Loading 1.5 detik untuk verifikasi keberadaan email di database
                await new Promise(r => setTimeout(r, 1500));

                // Restorasi status tombol dan input
                if (btn) {
                    btn.innerHTML = 'Selanjutnya';
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.style.background = 'var(--primary)';
                }
                if (inputField) {
                    inputField.readOnly = false;
                }

                // ====================================================================
                // ALUR 3: VERIFIKASI KEBERADAAN EMAIL DI DATABASE
                // ====================================================================
                const userObj = await window.findUserByIdentifierAsync(identifier);

                // --- KASUS A: EMAIL BELUM TERDAFTAR ---
                if (!userObj) {
                    window.showAuthAlert(`Email (${identifier}) belum terdaftar! Silakan daftar akun terlebih dahulu.`, 'error');
                    window.showAccountNotFoundModal(identifier);
                    return;
                }

                // --- KASUS B: EMAIL SUDAH TERDAFTAR (manual maupun Google) ---
                // Alur sama: langsung beralih ke form kata sandi
                window.targetLoginUser = userObj;

                const authDisplayEmail = document.getElementById('authDisplayEmail');
                if (authDisplayEmail) authDisplayEmail.textContent = userObj.email || userObj.username;

                if (authInputPassword) authInputPassword.value = '';
                showAuthScreen('authScreen2');

            } catch (err) {
                console.error("Screen 1 submit check error:", err);
                window.showAuthAlert('Terjadi kesalahan saat mengecek email. Silakan coba lagi.');
            } finally {
                if (inputField) {
                    inputField.readOnly = false;
                }
                if (btn) {
                    btn.innerHTML = 'Selanjutnya';
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.style.background = 'var(--primary)';
                }
            }
        }

        window.handleScreen1Submit = handleScreen1Submit;

        if (formAuthScreen1) {
            formAuthScreen1.onsubmit = handleScreen1Submit;
        }
        if (authBtnNext) {
            authBtnNext.onclick = handleScreen1Submit;
        }

        // --- MANUAL LOGIN SCREEN 2 (PASSWORD INPUT) ---
        const formAuthScreen2 = document.getElementById('formAuthScreen2');
        const authInputPassword = document.getElementById('authInputPassword');
        const authBtnLogin = document.getElementById('authBtnLogin');

        async function handleScreen2Submit(e) {
            if (e) e.preventDefault();
            const password = authInputPassword ? authInputPassword.value : '';
            const targetUser = window.targetLoginUser;

            if (!targetUser) {
                window.showAuthAlert('Sesi login kedaluwarsa. Silakan ketik ulang email/username Anda.');
                const authScreen1 = document.getElementById('authScreen1');
                const authScreen2 = document.getElementById('authScreen2');
                if (authScreen2) authScreen2.classList.add('hidden');
                if (authScreen1) authScreen1.classList.remove('hidden');
                return;
            }

            if (!password) {
                window.showAuthAlert('Silakan masukkan Kata Sandi Anda.');
                return;
            }

            // REALTIME FIREBASE CLOUD AUTHENTICATION CHECK (STRICT SINGLE SOURCE OF TRUTH)
            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    const cred = await firebase.auth().signInWithEmailAndPassword(targetUser.email || targetUser.username, password);
                    if (cred && cred.user) {
                        targetUser.uid = cred.user.uid;
                        targetUser.password = password; // Update local user password to new reset password
                        if (cred.user.displayName) targetUser.displayName = cred.user.displayName;
                        if (cred.user.photoURL) targetUser.photoURL = cred.user.photoURL;

                        // Sync updated password to local storage & Realtime DB
                        window.saveRegisteredUser(targetUser);
                        window.loginUserObject(targetUser, true);
                        return;
                    }
                } catch (errFb) {
                    console.warn("Firebase Auth Login Error:", errFb);
                    const cleanMsg = (function(err) {
                        if (!err) return 'Kata sandi salah! Silakan periksa kembali kata sandi Anda.';
                        const code = (err.code || '').toLowerCase();
                        const msg = (err.message || '').toString();

                        if (code.includes('user-not-found') || msg.includes('USER_NOT_FOUND')) {
                            window.findUserByIdentifierAsync(targetUser.email || targetUser.username);
                            return 'Akun ini telah dihapus atau tidak terdaftar di Firebase! Silakan daftar akun baru.';
                        }
                        if (code.includes('too-many-requests') || msg.includes('TOO_MANY_ATTEMPTS')) {
                            return 'Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi nanti.';
                        }
                        return 'Kata sandi salah! Silakan periksa kembali kata sandi Anda.';
                    })(errFb);

                    window.showAuthAlert(cleanMsg);
                    return;
                }
            }

            // Fallback for offline mode ONLY if Firebase Auth SDK is unavailable
            if (targetUser.password && targetUser.password !== password) {
                window.showAuthAlert('Kata sandi salah! Silakan periksa kembali kata sandi Anda.');
                return;
            }

            // Password Correct -> Login with Scoped Account Storage!
            window.loginUserObject(targetUser, true);
        }

        if (formAuthScreen2) {
            formAuthScreen2.onsubmit = handleScreen2Submit;
        }
        if (authBtnLogin) {
            authBtnLogin.onclick = handleScreen2Submit;
        }


        // --- FORGOT PASSWORD (Screen 4: Atur Ulang Kata Sandi) ---
        const formAuthScreen4 = document.getElementById('formAuthScreen4');
        const authForgotEmail = document.getElementById('authForgotEmail');
        const authBtnReset = document.getElementById('authBtnReset');
        let resetTimerInterval = null;

        async function handleForgotSubmit(e) {
            if (e) e.preventDefault();
            const email = authForgotEmail ? authForgotEmail.value.trim() : '';

            if (!email) {
                window.showAuthAlert('Silakan masukkan alamat Email Anda.');
                return;
            }

            if (!email.includes('@') || !email.includes('.')) {
                window.showAuthAlert('Format email tidak valid (contoh: nama@gmail.com).');
                return;
            }

            if (authBtnReset && authBtnReset.disabled) {
                window.showAuthAlert('Silakan tunggu hingga hitung mundur selesai sebelum mengirim ulang.');
                return;
            }

            // Cek email di Realtime DB, Firebase Auth (manual/Google), atau local storage
            const userInDb = await window.findUserByIdentifierAsync(email);
            const authCheck = await window.checkEmailInFirebaseAuth(email);
            const hasAuthAccount = !!(authCheck && authCheck.registered);

            if (!userInDb && !hasAuthAccount) {
                window.showAuthAlert(`Akun dengan email (${email}) belum terdaftar di database! Silakan periksa kembali email Anda.`);
                return;
            }

            // Email IS registered -> Send reset email via Firebase Auth
            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    await firebase.auth().sendPasswordResetEmail(email);
                } catch (err) {
                    console.warn("sendPasswordResetEmail note:", err);
                    if (err.code === 'auth/user-not-found') {
                        window.showAuthAlert(`Akun dengan email (${email}) belum terdaftar di Firebase! Silakan periksa kembali email Anda.`);
                        return;
                    }
                }
            }

            // If user is currently logged in, perform automatic logout as requested by user
            if (typeof currentUser !== 'undefined' && currentUser && currentUser.email && currentUser.email.toLowerCase() === email.toLowerCase()) {
                if (typeof window.logoutUser === 'function') {
                    window.logoutUser();
                }
            }

            // Show success alert & start 60s cooldown timer
            window.showAuthAlert(`Tautan atur ulang kata sandi telah dikirim ke ${email}. Demi keamanan akun Anda, Anda telah keluar secara otomatis. Silakan periksa email dan masuk kembali menggunakan kata sandi baru Anda!`, 'success');

            if (authBtnReset) {
                authBtnReset.disabled = true;
                authBtnReset.style.pointerEvents = 'none';
                authBtnReset.style.background = '#B3B9C1';
                authBtnReset.style.cursor = 'not-allowed';

                let count = 60;
                authBtnReset.textContent = `Kirim Ulang (${count}s)`;

                if (resetTimerInterval) clearInterval(resetTimerInterval);
                resetTimerInterval = setInterval(() => {
                    count--;
                    if (count > 0) {
                        authBtnReset.textContent = `Kirim Ulang (${count}s)`;
                    } else {
                        clearInterval(resetTimerInterval);
                        authBtnReset.disabled = false;
                        authBtnReset.style.pointerEvents = 'auto';
                        authBtnReset.style.background = 'var(--primary)';
                        authBtnReset.style.cursor = 'pointer';
                        authBtnReset.textContent = 'Kirim Ulang';
                    }
                }, 1000);
            }
        }

        if (formAuthScreen4) {
            formAuthScreen4.onsubmit = handleForgotSubmit;
        }
        if (authBtnReset) {
            authBtnReset.onclick = handleForgotSubmit;
        }

        // --- MANUAL REGISTRATION (Screen 5) REALTIME FIREBASE CLOUD ---
        const formAuthScreen5 = document.getElementById('formAuthScreen5');
        const authBtnRegister = document.getElementById('authBtnRegister');

        async function handleScreen5Submit(e) {
            if (e) e.preventDefault();

            const email = document.getElementById('authRegEmail')?.value.trim();
            const username = document.getElementById('authRegName')?.value.trim();
            const dob = document.getElementById('authRegDOB')?.value;
            const genderRadio = document.querySelector('input[name="authRegGenderRadio"]:checked');
            const gender = genderRadio ? genderRadio.value : '';
            const password = document.getElementById('authRegPassword')?.value;

            if (!email || !username || !password) {
                window.showAuthAlert('Silakan lengkapi Email, Username, dan Kata Sandi.');
                return;
            }

            if (username.length < 3) {
                window.showAuthAlert('Username minimal 3 karakter.');
                return;
            }

            if (password.length < 6) {
                window.showAuthAlert('Kata sandi minimal 6 karakter.');
                return;
            }

            let firebaseUser = null;
            let isExistingAuthUser = false;

            // REALTIME FIREBASE AUTHENTICATION CLOUD CREATION
            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
                    firebaseUser = cred.user;
                    if (firebaseUser) {
                        await firebaseUser.updateProfile({ displayName: username });
                    }
                } catch (fbErr) {
                    console.warn("Firebase registration note:", fbErr);
                    if (fbErr.code === 'auth/email-already-in-use') {
                        try {
                            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
                            firebaseUser = cred.user;
                            isExistingAuthUser = true;
                        } catch (signInErr) {
                            window.showAuthAlert('Email ini sudah terdaftar! Silakan masuk atau gunakan email baru.');
                            return;
                        }
                    } else if (fbErr.code === 'auth/invalid-email') {
                        window.showAuthAlert('Format email tidak valid.');
                        return;
                    } else if (fbErr.code === 'auth/weak-password') {
                        window.showAuthAlert('Kata sandi terlalu lemah (minimal 6 karakter).');
                        return;
                    }
                }
            }

            const uid = firebaseUser ? firebaseUser.uid : ('usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));

            const newUser = {
                uid: uid,
                email: email,
                username: username,
                displayName: username,
                password: password,
                dob: dob || '',
                gender: gender || 'Laki-laki',
                photoURL: `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(email)}&mouth=smile,laughing&backgroundColor=b6e3f4`,
                isGoogle: false,
                providerId: 'password',
                createdAt: new Date().toISOString()
            };

            // Save & Sync user to Firebase Realtime Database for Admin Panel
            window.saveRegisteredUser(newUser);

            window.loginUserObject(newUser, true);
            
            if (isExistingAuthUser) {
                window.showAuthAlert(`Email sudah terdaftar. Berhasil masuk ke akun ${username}!`, 'success');
            } else {
                window.showAuthAlert(`Pendaftaran berhasil! Selamat datang, ${username}.`, 'success');
            }
        }

        if (formAuthScreen5) {
            formAuthScreen5.onsubmit = handleScreen5Submit;
        }
        if (authBtnRegister) {
            authBtnRegister.onclick = handleScreen5Submit;
        }

        // --- GOOGLE BUTTONS ---
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.onclick = (e) => {
                e.preventDefault();
                window.handleRealFirebaseGoogleAuth('login');
            };
        }

        const googleRegisterBtn = document.getElementById('googleRegisterBtn');
        if (googleRegisterBtn) {
            googleRegisterBtn.onclick = (e) => {
                e.preventDefault();
                window.handleRealFirebaseGoogleAuth('register');
            };
        }

        // --- LOGOUT DROPDOWN BUTTON ---
        const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
        if (dropdownLogoutBtn) {
            dropdownLogoutBtn.onclick = (e) => {
                e.preventDefault();
                window.logoutUser();
            };
        }
    });
})();
