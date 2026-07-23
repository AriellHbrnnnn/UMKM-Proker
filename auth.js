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
        if (user) {
            currentUser = user;
            if (authButtonsContainer) {
                authButtonsContainer.classList.add('hidden');
                authButtonsContainer.style.display = 'none';
            }
            if (userProfileContainer) userProfileContainer.classList.remove('hidden');
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
            }
            if (userProfileContainer) userProfileContainer.classList.add('hidden');
            if (cartIconBtn) cartIconBtn.classList.add('hidden');
            if (profileDropdown) profileDropdown.classList.add('hidden');
        }
    });
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
    if (typeof clearInputErrors === 'function') clearInputErrors();
    [authScreen1, authScreen2, authScreen3, authScreen4, authScreen5, authScreen6, authScreen7, authScreen8, authScreen9, authScreen10].forEach(s => {
        if (s) s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
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

    authBtnNext.addEventListener('click', () => {
        if (typeof clearInputErrors === 'function') clearInputErrors();
        const email = authInputEmail1.value.trim();
        if (email.length > 0) {
            if (!auth) {
                if (typeof showInputError === 'function') showInputError('authInputEmail1', "Firebase Auth SDK tidak ditemukan.");
                return;
            }
            if (!email.includes('@') || !email.includes('.')) {
                if (typeof showInputError === 'function') showInputError('authInputEmail1', "Harap masukkan format email yang valid (contoh: user@gmail.com).");
                return;
            }
            if (authDisplayEmail) authDisplayEmail.textContent = email;
            showAuthScreen(authScreen2);
        }
    });
}
if (authBtnOtherMethods) authBtnOtherMethods.addEventListener('click', () => {
    showAuthScreen(authScreen3);
});

// Firebase Auth Actions
if (authBtnLogin) {
    authBtnLogin.addEventListener('click', () => {
        if (typeof clearInputErrors === 'function') clearInputErrors();
        if (!auth) {
            if (typeof showInputError === 'function') showInputError('authInputPassword', "Sistem auth tidak siap.");
            return;
        }
        const email = authDisplayEmail.textContent;
        const password = authInputPassword.value;
        if (!password) {
            if (typeof showInputError === 'function') showInputError('authInputPassword', "Kata sandi tidak boleh kosong.");
            return;
        }
        authBtnLogin.textContent = "Loading...";
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                authBtnLogin.textContent = "Masuk";
                authInputPassword.value = '';

                loginModal.classList.add('hidden');
            })
            .catch((error) => {
                authBtnLogin.textContent = "Masuk";
                if (typeof showInputError === 'function') {
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email' || error.code === 'auth/invalid-credential') {
                        showInputError('authInputPassword', "Akun tidak ditemukan atau kata sandi salah.");
                    } else if (error.code === 'auth/wrong-password') {
                        showInputError('authInputPassword', "Kata sandi salah. Silakan coba lagi.");
                    } else {
                        showInputError('authInputPassword', "Terjadi kesalahan: " + error.message);
                    }
                }
            });
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
            auth.fetchSignInMethodsForEmail(email).then((methods) => {
                if (methods.length > 0) {
                    authBtnRegister.textContent = "Daftar";
                    if (typeof showInputError === 'function') showInputError('authRegEmail', "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
                } else {
                    authRegNameGroup.classList.remove('hidden');
                    authRegPasswordGroup.classList.remove('hidden');
                    authBtnRegister.textContent = "Selesaikan Pendaftaran";
                }
            }).catch(e => {
                authBtnRegister.textContent = "Daftar";
                if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/unauthorized-domain') {
                    authRegNameGroup.classList.remove('hidden');
                    authRegPasswordGroup.classList.remove('hidden');
                    authBtnRegister.textContent = "Selesaikan Pendaftaran";
                } else {
                    if (typeof showInputError === 'function') showInputError('authRegEmail', "Kesalahan: " + e.message);
                }
            });
            return;
        }

        // Step 2: Register User
        if (!auth) return;
        const password = authRegPassword.value;
        const name = authRegName.value;
        let hasError = false;

        if (!name) { if (typeof showInputError === 'function') showInputError('authRegName', "Nama tidak boleh kosong."); hasError = true; }
        if (!password) { if (typeof showInputError === 'function') showInputError('authRegPassword', "Kata sandi tidak boleh kosong."); hasError = true; }
        else if (password.length < 6) { if (typeof showInputError === 'function') showInputError('authRegPassword', "Kata sandi minimal 6 karakter."); hasError = true; }

        if (hasError) return;

        authBtnRegister.textContent = "Loading...";
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const avatarUrl = getRandomAvatar(email);
                return userCredential.user.updateProfile({ displayName: name, photoURL: avatarUrl });
            })
            .then(() => {
                authBtnRegister.textContent = "Selesaikan Pendaftaran";
                if (userNameDisplay) userNameDisplay.textContent = name.split(' ')[0];
                loginModal.classList.add('hidden');
            })
            .catch((error) => {
                authBtnRegister.textContent = "Selesaikan Pendaftaran";
                if (typeof showInputError === 'function') {
                    if (error.code === 'auth/email-already-in-use') {
                        showInputError('authRegEmail', "Email ini sudah terdaftar.");
                    } else if (error.code === 'auth/weak-password') {
                        showInputError('authRegPassword', "Kata sandi terlalu lemah (minimal 6 karakter).");
                    } else {
                        showInputError('authRegPassword', "Kesalahan: " + error.message);
                    }
                }
            });
    });
}

if (authBtnReset) {
    authBtnReset.addEventListener('click', () => {
        if (typeof clearInputErrors === 'function') clearInputErrors();
        if (!auth) return;
        const email = authForgotEmail.value;
        if (!email) {
            if (typeof showInputError === 'function') showInputError('authForgotEmail', "Masukkan email.");
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            if (typeof showInputError === 'function') showInputError('authForgotEmail', "Format email tidak valid.");
            return;
        }
        authBtnReset.textContent = "Loading...";
        auth.sendPasswordResetEmail(email)
            .then(() => {
                authBtnReset.textContent = "Lanjut";
                if (typeof showInputError === 'function') {
                    showInputError('authForgotEmail', "Tautan reset telah dikirim ke email Anda!");
                    document.getElementById('authForgotEmail').style.borderColor = 'var(--primary)';
                    document.getElementById('authForgotEmail').parentElement.querySelector('.input-error-msg').style.color = 'var(--primary)';
                }
            })
            .catch((error) => {
                authBtnReset.textContent = "Lanjut";
                if (typeof showInputError === 'function') {
                    if (error.code === 'auth/user-not-found') {
                        showInputError('authForgotEmail', "Email ini tidak terdaftar.");
                    } else {
                        showInputError('authForgotEmail', "Gagal: " + error.message);
                    }
                }
            });
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

        if (!auth) return;

        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<div class="loading-spinner"></div>';
        btn.style.pointerEvents = 'none';

        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then((result) => {
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.style.pointerEvents = 'auto';
                if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
                    if (typeof showAuthScreen !== 'undefined' && typeof authScreen10 !== 'undefined') {
                        showAuthScreen(authScreen10);
                    }
                } else {
                    window.location.reload();
                }
            }, 3000);
        }).catch((error) => {
            console.error(error);
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = 'auto';
        });
    });
}

handleGoogleAuth(googleLoginBtn);
handleGoogleAuth(googleRegisterBtn);

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
        // Hapus session agar refresh kembali ke halaman default (tentangPage)
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
        // Hapus session agar refresh kembali ke halaman default (tentangPage)
        sessionStorage.removeItem('activePage');
        if (auth) auth.signOut().then(() => location.reload());
    });
}


// ==========================================
// AVATAR SELECTION LOGIC (Layar 10)
// ==========================================
const avatarOptions = document.querySelectorAll('.avatar-option');
const selectedAvatarUrl = document.getElementById('selectedAvatarUrl');
if (avatarOptions && avatarOptions.length > 0 && selectedAvatarUrl) {
    avatarOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            // Remove 'selected' class and reset border for all
            avatarOptions.forEach(o => {
                o.classList.remove('selected');
                o.style.borderColor = 'transparent';
            });
            // Add 'selected' class and green border to clicked option
            opt.classList.add('selected');
            opt.style.borderColor = '#00AA5B';
            // Update hidden input value
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
