
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
        const users = window.getRegisteredUsers();
        users.push(userObj);
        localStorage.setItem('umkm_users', JSON.stringify(users));
    };


    // Helper to clear all local users database
    window.clearLocalUsersDatabase = function () {
        localStorage.removeItem('umkm_users');
        localStorage.removeItem('umkm_active_user');
        localStorage.removeItem('umkm_active_uid');
        localStorage.removeItem('saved_tokopedia_account');
        console.log("Cleared local users database!");
    };

    window.findUserByIdentifierAsync = async function (identifier) {
        if (!identifier) return null;
        const cleanId = identifier.trim().toLowerCase();

        // 1. Check local localStorage first
        const localMatch = window.findUserByIdentifier(cleanId);
        if (localMatch) return localMatch;

        // 2. Check Firebase Cloud if identifier is an email
        if (typeof firebase !== 'undefined' && firebase.auth && cleanId.includes('@')) {
            try {
                const methods = await firebase.auth().fetchSignInMethodsForEmail(cleanId);
                if (methods && methods.length > 0) {
                    const cloudUser = {
                        uid: 'firebase_' + Date.now(),
                        email: cleanId,
                        username: cleanId.split('@')[0],
                        displayName: cleanId.split('@')[0],
                        methods: methods
                    };
                    window.saveRegisteredUser(cloudUser);
                    return cloudUser;
                } else if (methods && methods.length === 0) {
                    return null;
                }
            } catch (e) {
                // Fallback: Test via sendPasswordResetEmail to probe Firebase Auth
                try {
                    await firebase.auth().sendPasswordResetEmail(cleanId);
                    const cloudUser = {
                        uid: 'firebase_' + Date.now(),
                        email: cleanId,
                        username: cleanId.split('@')[0],
                        displayName: cleanId.split('@')[0]
                    };
                    window.saveRegisteredUser(cloudUser);
                    return cloudUser;
                } catch (errReset) {
                    if (errReset.code === 'auth/user-not-found') {
                        return null; // Definitely not registered
                    }
                }
            }
        }

        return window.findUserByIdentifier(cleanId);
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
            const firstName = name.split(' ')[0];

            if (userNameDisplay) userNameDisplay.textContent = firstName;

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
                if (authButtonsContainer.style) authButtonsContainer.style.setProperty('display', 'flex', 'important');
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
    window.logoutUser = function () {
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

        window.showAuthAlert('Berhasil keluar dari akun.', 'success');
    };

    // 6. REAL FIREBASE GOOGLE OAUTH WITH LOCAL FALLBACK
    window.handleRealFirebaseGoogleAuth = function (mode = 'login') {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const authInst = firebase.auth();
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            authInst.signInWithPopup(provider).then((result) => {
                const gUser = result.user;
                const email = gUser.email;
                const displayName = gUser.displayName || email.split('@')[0];
                const photoURL = gUser.photoURL;

                const newUser = {
                    uid: gUser.uid,
                    email: email,
                    username: displayName.toLowerCase().replace(/\s+/g, '_'),
                    displayName: displayName,
                    password: 'google_firebase_auth',
                    photoURL: photoURL
                };

                const existingUser = window.findUserByIdentifier(email);
                if (mode === 'login') {
                    if (!existingUser) {
                        window.showAuthAlert(`Akun Google (${email}) belum terdaftar. Silakan klik "Daftar" terlebih dahulu!`);
                        return;
                    }
                    window.loginUserObject(existingUser, true);
                } else {
                    // Register Mode
                    if (existingUser) {
                        window.showAuthAlert(`Akun Google (${email}) sudah terdaftar! Otomatis masuk.`, 'success');
                        window.loginUserObject(existingUser, true);
                    } else {
                        window.saveRegisteredUser(newUser);
                        window.loginUserObject(newUser, true);
                        window.showAuthAlert(`Berhasil mendaftar dengan Google: ${email}`, 'success');
                    }
                }
            }).catch((error) => {
                console.error("Firebase Google Auth Error:", error);
                if (error.code === 'auth/popup-blocked') {
                    window.showAuthAlert('Pop-up Google diblokir browser Anda. Silakan izinkan pop-up di bilah alamat browser!');
                } else if (error.code === 'auth/unauthorized-domain') {
                    window.showAuthAlert('Domain 127.0.0.1 belum diizinkan di Firebase Console -> Authentication -> Settings -> Authorized Domains. Membuka opsi pendaftaran...', 'error');
                    setTimeout(() => {
                        promptGoogleAccountInput(mode);
                    }, 1200);
                } else {
                    if (error && error.code === 'auth/popup-closed-by-user') {
                        window.showAuthAlert('Proses masuk Google dibatalkan.', 'info');
                    } else if (error && error.message && !error.message.includes('style') && !error.message.includes('null')) {
                        window.showAuthAlert('Gagal masuk Google: ' + error.message);
                    }
                }
            });
        } else {
            promptGoogleAccountInput(mode);
        }
    };

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
                    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" style="width: 42px; height: 42px; margin-bottom: 10px;">
                    <h3 style="margin: 0 0 5px 0; color: #31353B; font-size: 1.2rem; font-weight: 700;">${mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}</h3>
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
                        photoURL: `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(email)}&mouth=smile,laughing&backgroundColor=b6e3f4`
                    };
                    window.saveRegisteredUser(newUser);
                    window.loginUserObject(newUser, true);
                    window.showAuthAlert(`Berhasil mendaftar dengan Google: ${email}`, 'success');
                }
            }
        };
    }

    // 7. INITIALIZE DOM & FORM LISTENERS
    document.addEventListener('DOMContentLoaded', () => {
        // NOTE: Session restore is handled by Firebase onAuthStateChanged in auth.js
        // Do NOT restore from localStorage here to avoid conflicts with Firebase auth state
        // The Firebase onAuthStateChanged observer will call updateHeaderAuthUI automatically




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

        async function handleScreen1Submit(e) {
            if (e) e.preventDefault();
            const identifier = authInputEmail ? authInputEmail.value.trim() : '';

            if (!identifier) {
                window.showAuthAlert('Silakan masukkan Email atau Username.');
                return;
            }

            const userObj = await window.findUserByIdentifierAsync(identifier);
            if (!userObj) {
                window.showAuthAlert(`Akun (${identifier}) tidak terdaftar. Silakan daftar terlebih dahulu!`);
                return;
            }

            // User found! Save reference
            window.targetLoginUser = userObj;

            // If account is registered via Google OAuth in Firebase Cloud
            if (userObj.methods && userObj.methods.includes('google.com') && !userObj.password) {
                window.showAuthAlert(`Akun (${identifier}) terdaftar menggunakan Google Sign-In. Membuka Autentikasi Google...`, 'success');
                setTimeout(() => {
                    window.handleRealFirebaseGoogleAuth('login');
                }, 1000);
                return;
            }

            const authDisplayEmail = document.getElementById('authDisplayEmail');
            if (authDisplayEmail) authDisplayEmail.textContent = userObj.email || userObj.username;

            const authScreen1 = document.getElementById('authScreen1');
            const authScreen2 = document.getElementById('authScreen2');
            if (authScreen1) authScreen1.classList.add('hidden');
            if (authScreen2) authScreen2.classList.remove('hidden');
        }

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

            // If account is registered via Google Sign-In, transition smoothly to Google Login
            if (targetUser.methods && targetUser.methods.includes('google.com') && targetUser.password === 'google_firebase_auth') {
                window.showAuthAlert(`Akun (${targetUser.email}) terdaftar menggunakan Google Sign-In. Membuka login dengan Google...`, 'success');
                setTimeout(() => {
                    window.handleRealFirebaseGoogleAuth('login');
                }, 1000);
                return;
            }

            let firebaseAuthSuccess = false;

            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    const cred = await firebase.auth().signInWithEmailAndPassword(targetUser.email || targetUser.username, password);
                    if (cred && cred.user) {
                        firebaseAuthSuccess = true;
                        targetUser.uid = cred.user.uid;
                        if (cred.user.displayName) targetUser.displayName = cred.user.displayName;
                        if (cred.user.photoURL) targetUser.photoURL = cred.user.photoURL;
                    }
                } catch (errFb) {
                    if (errFb.code === 'auth/wrong-password' || errFb.code === 'auth/invalid-credential' || errFb.code === 'auth/invalid-login-credentials') {
                        window.showAuthAlert('Kata sandi salah! Silakan periksa kembali.');
                        return;
                    }
                }
            }

            if (!firebaseAuthSuccess && targetUser.password && targetUser.password !== password) {
                window.showAuthAlert('Kata sandi salah! Silakan periksa kembali.');
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

            let isUserRegistered = false;
            let firebaseResetError = null;

            // 1. Check local registered database
            const localUser = window.findUserByIdentifier(email);
            if (localUser) {
                isUserRegistered = true;
            }

            // 2. Query Firebase Auth directly via sendPasswordResetEmail & fetchSignInMethods
            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
                    if (methods && methods.length > 0) {
                        isUserRegistered = true;
                    }
                } catch (err) {
                    console.log("fetchSignInMethods err:", err);
                }

                try {
                    await firebase.auth().sendPasswordResetEmail(email);
                    isUserRegistered = true; // Accepted by Firebase Cloud!
                } catch (err) {
                    firebaseResetError = err;
                    if (err.code === 'auth/user-not-found') {
                        isUserRegistered = false;
                    }
                }
            }

            // If account is definitely not registered anywhere
            if (!isUserRegistered) {
                window.showAuthAlert(`Akun dengan email (${email}) belum terdaftar. Silakan periksa kembali email Anda!`);
                return;
            }

            // Account IS registered -> Show success notification & 60s cooldown timer
            window.showAuthAlert(`Tautan verifikasi atur ulang kata sandi telah dikirim ke ${email}. Silakan periksa kotak masuk (Inbox), folder Junk, atau Spam Anda!`, 'success');

            if (authBtnReset) {
                authBtnReset.disabled = true;
                authBtnReset.style.pointerEvents = 'none';
                authBtnReset.style.background = '#B3B9C1';
                authBtnReset.style.cursor = 'not-allowed';

                let secondsLeft = 60;
                authBtnReset.textContent = `Kirim Ulang (${secondsLeft}s)`;

                if (resetTimerInterval) clearInterval(resetTimerInterval);

                resetTimerInterval = setInterval(() => {
                    secondsLeft--;
                    if (secondsLeft > 0) {
                        authBtnReset.textContent = `Kirim Ulang (${secondsLeft}s)`;
                    } else {
                        clearInterval(resetTimerInterval);
                        authBtnReset.disabled = false;
                        authBtnReset.style.pointerEvents = 'auto';
                        authBtnReset.style.background = 'var(--primary)';
                        authBtnReset.style.cursor = 'pointer';
                        authBtnReset.textContent = 'Kirim Ulang Tautan';
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

            const existingEmail = await window.findUserByIdentifierAsync(email);
            if (existingEmail) {
                window.showAuthAlert('Email ini sudah terdaftar! Silakan gunakan email lain atau masuk.');
                return;
            }

            const existingUser = window.findUserByIdentifier(username);
            if (existingUser) {
                window.showAuthAlert('Username ini sudah digunakan! Silakan pilih username lain.');
                return;
            }

            let firebaseUser = null;

            // REALTIME FIREBASE AUTHENTICATION CLOUD CREATION
            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
                    firebaseUser = cred.user;
                    if (firebaseUser) {
                        await firebaseUser.updateProfile({ displayName: username });
                    }
                } catch (fbErr) {
                    console.error("Firebase registration error:", fbErr);
                    if (fbErr.code === 'auth/email-already-in-use') {
                        window.showAuthAlert('Email ini sudah terdaftar di Firebase! Silakan gunakan email lain atau masuk.');
                        return;
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
                createdAt: new Date().toISOString()
            };

            // Realtime Sync to Firestore / Realtime DB
            if (typeof firebase !== 'undefined') {
                if (firebase.firestore) {
                    try {
                        await firebase.firestore().collection('users').doc(uid).set({
                            uid: uid,
                            email: email,
                            username: username,
                            displayName: username,
                            dob: dob || '',
                            gender: gender || 'Laki-laki',
                            photoURL: newUser.photoURL,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (errFs) { }
                }
                if (firebase.database) {
                    try {
                        await firebase.database().ref('users/' + uid).set({
                            uid: uid,
                            email: email,
                            username: username,
                            displayName: username,
                            dob: dob || '',
                            gender: gender || 'Laki-laki',
                            photoURL: newUser.photoURL,
                            createdAt: new Date().toISOString()
                        });
                    } catch (errDb) { }
                }
            }

            window.saveRegisteredUser(newUser);
            window.loginUserObject(newUser, true);
            window.showAuthAlert(`Pendaftaran berhasil! Akun ${username} telah terdaftar secara Realtime di Firebase Cloud.`, 'success');
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
