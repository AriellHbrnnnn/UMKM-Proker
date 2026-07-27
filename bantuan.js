/* =========================================================
   PUSAT BANTUAN - Form Hubungi Admin via Email
   ========================================================= */

// === KONFIGURASI EMAIL ADMIN DESA ===
// Ganti dengan email admin desa yang sesungguhnya!
const ADMIN_EMAIL = "padukuhankaranganyar@outlook.com";
const ADMIN_EMAIL_CC = "simanjuntakariel138@gmail.com"; // Opsional: email untuk di-cc (pisahkan koma jika banyak)

// === Handler Form Email Hubungi Admin ===
// Menggunakan mailto: agar kompatibel dengan semua perangkat (mobile & desktop)
window.handleAdminEmailSubmit = function (e) {
    if (e) e.preventDefault();

    const userName = document.getElementById('contactUserName')?.value.trim() || '';
    const userEmail = document.getElementById('contactUserEmail')?.value.trim() || '';
    const subject = document.getElementById('contactSubject')?.value || '';
    const message = document.getElementById('contactMessage')?.value.trim() || '';

    // Basic validation
    if (!userName || !userEmail || !subject || !message) {
        if (typeof window.showAuthAlert === 'function') {
            window.showAuthAlert('Mohon lengkapi semua kolom formulir sebelum mengirim.', 'error');
        } else {
            alert('Mohon lengkapi semua kolom formulir.');
        }
        return false;
    }

    // Ambil informasi user yang sedang login (jika ada)
    let userInfo = "";
    try {
        const activeUser = localStorage.getItem('umkm_active_user');
        if (activeUser) {
            const u = JSON.parse(activeUser);
            if (u && u.uid) {
                userInfo = `\n\n---- Informasi Akun Website ----\nUID Akun: ${u.uid}\nEmail Terdaftar: ${u.email || '-'}\nNama Akun: ${u.displayName || '-'}`;
            }
        }
    } catch (_) { }

    // Tambahkan info browser & timestamp untuk debugging
    const timestamp = new Date().toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'long'
    });
    const browserInfo = navigator.userAgent?.split(') ')[0]?.split('(')[1] || 'Unknown Device';

    // Susun body email yang rapi & informatif
    const fullBody =
`Yth. Tim Admin Padukuhan Karanganyar,

Saya, ${userName} (${userEmail}), ingin menyampaikan kebutuhan berikut:

===================================================================
JENIS KEBUTUHAN: ${subject}
===================================================================

${message}${userInfo}

---- Info Pengiriman ----
Waktu Kirim: ${timestamp}
Peramban / Device: ${browserInfo}
Halaman Aktif: ${window.location.href}

===================================================================
Mohon bantuan dan balasannya secepatnya. Terima kasih.
Hormat saya,
${userName}
${userEmail}`;

    // Susun subjek email dengan format standar
    const fullSubject = `[PasarDesa Karanganyar] ${subject} - dari ${userName}`;

    // Encode manual agar Outlook/Gmail tidak menampilkan tanda "+" sebagai pengganti spasi
    const encodeMailtoValue = (value) => encodeURIComponent(
        String(value || '').replace(/\r?\n/g, '\r\n')
    );

    const queryParts = [
        `subject=${encodeMailtoValue(fullSubject)}`,
        `body=${encodeMailtoValue(fullBody)}`
    ];

    if (ADMIN_EMAIL_CC && ADMIN_EMAIL_CC.trim()) {
        queryParts.push(`cc=${encodeMailtoValue(ADMIN_EMAIL_CC.trim())}`);
    }

    // Buka aplikasi email user via mailto:
    const mailtoUrl = `mailto:${ADMIN_EMAIL.trim()}?${queryParts.join('&')}`;
    console.log("[Email Contact] Opening email app with:", mailtoUrl.substring(0, 120) + "...");
    window.location.href = mailtoUrl;

    // Berikan feedback sukses ke user
    setTimeout(() => {
        const notifBox = document.createElement('div');
        notifBox.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #2E7D32; color: white; padding: 14px 24px; border-radius: 12px;
            font-weight: 700; font-size: 0.95rem; z-index: 9999999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.25); font-family: 'Poppins', sans-serif;
            display: flex; align-items: center; gap: 10px;
        `;
        notifBox.innerHTML = '<i class="fas fa-check-circle"></i> Aplikasi email terbuka! Silakan tekan Kirim di jendela email Anda.';
        document.body.appendChild(notifBox);
        setTimeout(() => {
            notifBox.style.transition = 'opacity 0.4s';
            notifBox.style.opacity = '0';
            setTimeout(() => notifBox.remove(), 400);
        }, 5000);

        // Reset form
        const form = document.getElementById('emailContactForm');
        if (form) form.reset();
    }, 300);

    return false;
};
