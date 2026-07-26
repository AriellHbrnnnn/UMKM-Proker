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


// Ensure persistence is set to LOCAL so users stay logged in indefinitely
if (auth) {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);
}

/* ======================= AUTH LOGIC (FIREBASE OBSERVER) ======================= */
if (auth) {
    auth.onAuthStateChanged((user) => {
        // Mark body as auth-resolved to prevent FOUC
        document.body.classList.add('auth-resolved');

        if (user) {
            currentUser = user;
            localStorage.setItem('umkm_active_uid', user.uid);
            localStorage.setItem('umkm_active_user', JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
            }));

            if (typeof loadUserState === 'function') {
                loadUserState();
            }
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

            const fallbackName = user.email ? user.email.split('@')[0] : 'Pengguna';
            const firstName = user.displayName ? user.displayName.split(' ')[0] : fallbackName;
            if (userNameDisplay) userNameDisplay.textContent = firstName;

            const dropdownName = document.getElementById('dropdownName');
            if (dropdownName) dropdownName.textContent = user.displayName || fallbackName;

            const localAvatar = localStorage.getItem('local_avatar_' + user.uid);
            let avatarUrl = localAvatar || user.photoURL || getRandomAvatar(user.email || user.uid);

            // Fix previously saved broken Dicebear URLs in Firebase Auth
            if (avatarUrl.includes('dicebear.com') && avatarUrl.includes('mouth=smile,laugh&')) {
                avatarUrl = avatarUrl.replace('mouth=smile,laugh&', 'mouth=smile,laughing&');
                user.updateProfile({ photoURL: avatarUrl }).catch(() => console.log('silent fail'));
            }

            if (userAvatar) userAvatar.src = avatarUrl;

            const dropdownAvatar = document.getElementById('dropdownAvatar');
            if (dropdownAvatar) dropdownAvatar.src = avatarUrl;

            const profilePageAvatar = document.getElementById('profilePageAvatar');
            if (profilePageAvatar) profilePageAvatar.src = avatarUrl;

            const profileEditAvatar = document.getElementById('profileEditAvatar');
            if (profileEditAvatar) profileEditAvatar.src = avatarUrl;

            const profilePageName = document.getElementById('profilePageName');
            if (profilePageName) profilePageName.textContent = user.displayName || fallbackName;

            const displayEditName = document.getElementById('displayEditName');
            if (displayEditName) displayEditName.textContent = user.displayName || fallbackName;

            const profileEditName = document.getElementById('profileEditName');
            if (profileEditName) profileEditName.value = user.displayName || fallbackName;

            const displayEditEmail = document.getElementById('displayEditEmail');
            if (displayEditEmail) displayEditEmail.textContent = user.email || '';

            const profileEditEmail = document.getElementById('profileEditEmail');
            if (profileEditEmail) profileEditEmail.value = user.email || '';

            if (typeof loadBiodataExtras === 'function') loadBiodataExtras();

            if (loginModal) loginModal.classList.add('hidden');
            if (typeof updateCartBadge === 'function') updateCartBadge();
        } else {
            currentUser = null;
            loadUserState(); // INIT USER DATA
            if (authButtonsContainer) {
                authButtonsContainer.classList.remove('hidden');
                authButtonsContainer.style.display = 'flex';
                authButtonsContainer.style.visibility = 'visible'; // Restore from initial hidden
            }
            if (userProfileContainer) {
                userProfileContainer.classList.add('hidden');
                userProfileContainer.style.visibility = '';
            }
            if (cartIconBtn) cartIconBtn.classList.add('hidden');
            if (profileDropdown) profileDropdown.classList.add('hidden');
        }

        // Setup mobile profile dropdown toggle (touch-friendly)
        setupMobileProfileDropdown();
    });
}

// Mobile-friendly profile dropdown toggle
function setupMobileProfileDropdown() {
    const profileBtn = document.getElementById('userProfileBtnHeader');
    const pDropdown = document.getElementById('profileDropdown');
    const pOverlay = document.getElementById('profileDropdownOverlay') || document.querySelector('.profile-dropdown-overlay');

    if (!pDropdown) return;

    function closeDropdown() {
        pDropdown.classList.remove('show');
        if (pOverlay) {
            pOverlay.classList.remove('show');
            pOverlay.style.opacity = '';
            pOverlay.style.visibility = '';
            pOverlay.style.pointerEvents = '';
        }
    }

    function openDropdown() {
        pDropdown.classList.add('show');
        if (pOverlay) {
            pOverlay.classList.add('show');
            pOverlay.style.opacity = '0.3';
            pOverlay.style.visibility = 'visible';
            pOverlay.style.pointerEvents = 'all';
        }
    }

    function toggleDropdown(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (pDropdown.classList.contains('show')) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    // Attach toggle event ONLY to the profile header button/avatar
    if (profileBtn) {
        profileBtn.onclick = toggleDropdown;
    }

    // Close when clicking any link inside the dropdown, without overriding existing link handlers
    pDropdown.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeDropdown();
        });
    });

    // Close when clicking overlay / backdrop
    if (pOverlay) {
        pOverlay.onclick = function (e) {
            e.stopPropagation();
            closeDropdown();
        };
    }

    // Close when clicking anywhere outside on the document ("klik sembarangan")
    if (!document._profileOutsideClickListener) {
        document._profileOutsideClickListener = function (e) {
            const container = document.getElementById('userProfileContainer');
            if (container && !container.contains(e.target)) {
                closeDropdown();
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

if (authBtnLogoutDontSave) {
    authBtnLogoutDontSave.addEventListener('click', () => {
        localStorage.removeItem('saved_tokopedia_account');
        sessionStorage.removeItem('activePage');
        if (auth) auth.signOut().then(() => location.reload());
    });
}
if (authBtnLogoutSave) {
    authBtnLogoutSave.addEventListener('click', () => {
        if (currentUser) {
            localStorage.setItem('saved_tokopedia_account', JSON.stringify({
                name: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL
            }));
        }
        sessionStorage.removeItem('activePage');
        if (auth) auth.signOut().then(() => location.reload());
    });
}

if (avatarOptions && avatarOptions.length > 0 && selectedAvatarUrl) {
    avatarOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            avatarOptions.forEach(o => {
                o.classList.remove('selected');
                o.style.borderColor = 'transparent';
            });
            opt.classList.add('selected');
            opt.style.borderColor = '#00AA5B';
            selectedAvatarUrl.value = opt.getAttribute('data-url');
        });
    });
}

if (authBtnSaveAvatar) {
    authBtnSaveAvatar.addEventListener('click', () => {
        if (!auth || !auth.currentUser) return;

        authBtnSaveAvatar.textContent = "Menyimpan...";
        authBtnSaveAvatar.style.pointerEvents = 'none';

        const avatarUrl = selectedAvatarUrl ? selectedAvatarUrl.value : "https://api.dicebear.com/7.x/avataaars/svg?seed=Default&backgroundColor=b6e3f4";

        auth.currentUser.updateProfile({
            photoURL: avatarUrl
        }).then(() => {
            authBtnSaveAvatar.textContent = "Simpan Profile";
            authBtnSaveAvatar.style.pointerEvents = 'auto';
            alert("Avatar berhasil disimpan!");
            window.location.reload();
        }).catch((error) => {
            console.error("Error updating avatar:", error);
            authBtnSaveAvatar.textContent = "Simpan Profile";
            authBtnSaveAvatar.style.pointerEvents = 'auto';
            alert("Gagal menyimpan avatar.");
        });
    });
}
