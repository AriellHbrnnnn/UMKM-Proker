// admin_cms.js - Standalone CMS & Admin Edit Detector (TERINTEGRASI FIREBASE REST DB)
(function() {
    function hasActiveAdminSession() {
        return sessionStorage.getItem('isAdminLoggedIn') === 'true' && !!sessionStorage.getItem('umkm_admin_session_token');
    }

    function sanitizeBasicHtml(rawHtml) {
        const template = document.createElement('template');
        template.innerHTML = String(rawHtml || '');
        const allowedTags = new Set(['BR', 'B', 'STRONG', 'I', 'EM', 'U', 'SPAN']);
        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT, null, false);
        const toReplace = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!allowedTags.has(node.tagName)) {
                toReplace.push(node);
                continue;
            }
            Array.from(node.attributes).forEach(attr => node.removeAttribute(attr.name));
        }
        toReplace.forEach(node => {
            const text = document.createTextNode(node.textContent || '');
            node.parentNode && node.parentNode.replaceChild(text, node);
        });
        return template.innerHTML;
    }

    function sanitizeAssetUrl(rawUrl, type) {
        try {
            const value = String(rawUrl || '').trim();
            if (!value) return '';
            if (type === 'image' && value.startsWith('data:image/')) return value;
            const parsed = new URL(value, window.location.origin);
            if (type === 'iframe') {
                const host = parsed.hostname.toLowerCase();
                const isYoutube = host.includes('youtube.com') || host.includes('youtu.be') || host.includes('youtube-nocookie.com');
                const isMaps = host.includes('google.com') || host.includes('googleusercontent.com') || host.includes('googleapis.com');
                return (parsed.protocol === 'https:' && (isYoutube || isMaps)) ? parsed.href : '';
            }
            return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed.href : '';
        } catch (_) {
            return '';
        }
    }

    function escapeForHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[char]));
    }

    // ==========================================================
    // FIREBASE REST DB CONFIG untuk CMS Profile Desa (Sinkronisasi Lintas Peramban)
    // ==========================================================
    const FIREBASE_RTDB_BASE = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app";
    const CMS_DB_URL = FIREBASE_RTDB_BASE + "/cms_profile.json";

    // Helper: Kirim seluruh data CMS yang terkumpul ke Firebase RTDB (single PUT)
    async function saveAllCMSToFirebase(cmsMapping, savedSnapshot = null) {
        try {
            const payload = {};
            cmsMapping.forEach(item => {
                const val = (savedSnapshot && savedSnapshot[item.key] != null)
                    ? savedSnapshot[item.key]
                    : (localStorage.getItem(item.key) ?? "");
                payload[item.key] = val;
            });
            const response = await fetch(CMS_DB_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Firebase PUT status: " + response.status);
            return true;
        } catch (e) {
            console.warn("[admin_cms] Gagal simpan CMS ke Firebase DB:", e);
            return false;
        }
    }

    // Helper: Ambil CMS snapshot dari Firebase RTDB
    async function fetchCMSFromFirebase() {
        try {
            const res = await fetch(CMS_DB_URL + "?t=" + Date.now(), { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            return (data && typeof data === 'object') ? data : null;
        } catch (e) {
            console.warn("[admin_cms] Gagal fetch CMS dari Firebase DB:", e);
            return null;
        }
    }

    // Helper function kompresi gambar CMS
    function compressImageCMS(file, maxWidth = 1600, quality = 0.82) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = err => reject(err);
            };
            reader.onerror = err => reject(err);
        });
    }

    // ⭐⭐⭐ HELPER PALING PENTING: Build URL YouTube embed DENGAN PARAMETER MOBILE-FRIENDLY SELALU
    // Jangan biarkan /embed/{id} tanpa parameter — ini penyebab mobile tidak bisa tap play!
    function buildYoutubeEmbedUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
        let base = rawUrl.trim();
        // Hapus semua parameter existing (karena kita akan tambah parameter standar)
        if (base.includes('youtube.com/embed/')) {
            base = base.split('?')[0].split('#')[0];
        }
        // Tambahkan ALL parameter mobile-friendly & play-friendly
        const params = [
            'rel=0',
            'modestbranding=1',
            'playsinline=1',
            'webkit-playsinline=1',
            'controls=1',
            'fs=1',
            'hl=id',
            'cc_load_policy=0'
        ];
        try {
            const origin = encodeURIComponent(window.location.origin || 'https://umkm-karanganyar.web.id');
            params.push('origin=' + origin);
        } catch(e) {}
        return base + '?' + params.join('&');
    }

    function applyMapAsset(targetImg, assetSrc, options = {}) {
        if (!targetImg) return;
        const wrapper = options.wrapperSelector ? document.querySelector(options.wrapperSelector) : targetImg.parentElement;
        if (wrapper) {
            const pdfFrame = wrapper.querySelector('.tkp-map-pdf-viewer');
            if (pdfFrame) {
                pdfFrame.remove();
            }
            delete wrapper.dataset.tkpAssetType;
            delete wrapper.dataset.tkpAssetSrc;
            wrapper.classList.remove('tkp-pdf-asset');
        }

        delete targetImg.dataset.tkpAssetType;
        targetImg.dataset.tkpAssetSrc = assetSrc || '';
        targetImg.src = assetSrc || '';
        targetImg.style.display = 'block';
        targetImg.style.objectFit = 'cover';
        targetImg.style.background = '';
        targetImg.style.padding = '';
    }

    // Mendapatkan mapping CMS
    function getCMSMapping() {
        return [
            { selector: '.tkp-hero h1', type: 'html', key: 'cms_hero_title', label: 'Judul Hero' },
            { selector: '.tkp-hero p', type: 'text', key: 'cms_hero_desc', label: 'Deskripsi Hero' },
            { selector: '.tkp-challenge .tkp-section-title', type: 'text', key: 'cms_tantangan_title', label: 'Judul Tantangan' },
            { selector: '.tkp-challenge .tkp-section-desc', type: 'html', key: 'cms_tantangan_desc', label: 'Deskripsi Tantangan' },
            { selector: '#mapSlideGmaps, .tkp-map-container', type: 'iframe', key: 'cms_map_url', label: 'URL Titik Google Maps' },
            { selector: '#mapSlideImgmap, .tkp-map-img-container', type: 'image', key: 'cms_map_custom_image', label: 'Peta Wilayah (JPG/PNG)', lightbox: true, caption: 'Peta Wilayah Padukuhan Karanganyar' },
            { selector: '#petaSumberAirImg, .water-map-img-wrapper', type: 'image', key: 'cms_peta_sumber_air', label: 'Peta Sebaran & Sumber Air (JPG/PNG)', lightbox: true, caption: 'Peta Sebaran & Sumber Daya Air Karanganyar' },
            { selector: '.tkp-mission-text h2', type: 'text', key: 'cms_sejarah_title', label: 'Judul Sejarah' },
            { selector: '.tkp-collage-img1', type: 'image', key: 'cms_img_sejarah_1', label: 'Gambar Sejarah 1' },
            { selector: '.tkp-collage-img2', type: 'image', key: 'cms_img_sejarah_2', label: 'Gambar Sejarah 2' },
            { selector: '.tkp-collage-img3', type: 'image', key: 'cms_img_sejarah_3', label: 'Gambar Sejarah 3' },
            { selector: '.tkp-mission-text p:nth-of-type(1)', type: 'html', key: 'cms_sejarah_1', label: 'Paragraf Sejarah 1' },
            { selector: '.tkp-mission-text p:nth-of-type(2)', type: 'html', key: 'cms_sejarah_2', label: 'Paragraf Sejarah 2' },
            { selector: '.tkp-mission-text p:nth-of-type(3)', type: 'html', key: 'cms_sejarah_3', label: 'Paragraf Sejarah 3' },
            { selector: '.tkp-stats-left h2', type: 'text', key: 'cms_data_title', label: 'Judul Data Wilayah' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(1) .count-up:nth-of-type(1), .tkp-stat-item:nth-child(1) h3 span:nth-child(1)', type: 'number', key: 'cms_stat_rt', label: 'Jumlah RT', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(1) .count-up:nth-of-type(2), .tkp-stat-item:nth-child(1) h3 span:nth-child(2)', type: 'number', key: 'cms_stat_rw', label: 'Jumlah RW', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(2) .count-up, .tkp-stat-item:nth-child(2) h3 span', type: 'number', key: 'cms_stat_kk', label: 'Kepala Keluarga (KK)', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) .count-up:nth-of-type(1), .tkp-stat-item:nth-child(3) h3 span:nth-child(1)', type: 'number', key: 'cms_stat_l', label: 'Penduduk Laki-laki', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) .count-up:nth-of-type(2), .tkp-stat-item:nth-child(3) h3 span:nth-child(2)', type: 'number', key: 'cms_stat_p', label: 'Penduduk Perempuan', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) .count-up:nth-of-type(3)', type: 'number', key: 'cms_stat_total', label: 'Total Penduduk (Jiwa)', attr: 'data-target' },
            { selector: '.batas-card:nth-child(1) div:nth-child(2), .tkp-stat-item:nth-child(4) > div > div:nth-child(1) > div:nth-child(2)', type: 'text', key: 'cms_batas_u', label: 'Batas Utara' },
            { selector: '.batas-card:nth-child(2) div:nth-child(2), .tkp-stat-item:nth-child(4) > div > div:nth-child(2) > div:nth-child(2)', type: 'text', key: 'cms_batas_s', label: 'Batas Selatan' },
            { selector: '.batas-card:nth-child(3) div:nth-child(2), .tkp-stat-item:nth-child(4) > div > div:nth-child(3) > div:nth-child(2)', type: 'text', key: 'cms_batas_t', label: 'Batas Timur' },
            { selector: '.batas-card:nth-child(4) div:nth-child(2), .tkp-stat-item:nth-child(4) > div > div:nth-child(4) > div:nth-child(2)', type: 'text', key: 'cms_batas_b', label: 'Batas Barat' },
            { selector: '.tkp-features .tkp-section-title', type: 'text', key: 'cms_potensi_title', label: 'Judul Potensi' },
            { selector: '.tkp-feature-card:nth-child(1) h3', type: 'text', key: 'cms_potensi_1_t', label: 'Judul Potensi 1' },
            { selector: '.tkp-feature-card:nth-child(1) p', type: 'html', key: 'cms_potensi_1_d', label: 'Deskripsi Potensi 1' },
            { selector: '.tkp-feature-card:nth-child(2) h3', type: 'text', key: 'cms_potensi_2_t', label: 'Judul Potensi 2' },
            { selector: '.tkp-feature-card:nth-child(2) p', type: 'html', key: 'cms_potensi_2_d', label: 'Deskripsi Potensi 2' },
            { selector: '.tkp-feature-card:nth-child(3) h3', type: 'text', key: 'cms_potensi_3_t', label: 'Judul Potensi 3' },
            { selector: '.tkp-feature-card:nth-child(3) p', type: 'html', key: 'cms_potensi_3_d', label: 'Deskripsi Potensi 3' },
            { selector: '#cmsKehidupanTitle', type: 'text', key: 'cms_kehidupan_title', label: 'Judul Kehidupan' },
            { selector: '#cmsKehidupan1', type: 'html', key: 'cms_kehidupan_1', label: 'Poin Kehidupan 1' },
            { selector: '#cmsKehidupan2', type: 'html', key: 'cms_kehidupan_2', label: 'Poin Kehidupan 2' },
            { selector: '#cmsKehidupan3', type: 'html', key: 'cms_kehidupan_3', label: 'Poin Kehidupan 3' },
            { selector: '#cmsBudayaTitle', type: 'text', key: 'cms_budaya_title', label: 'Judul Budaya' },
            { selector: '#cmsBudaya1', type: 'html', key: 'cms_budaya_1', label: 'Poin Budaya 1' },
            { selector: '#cmsBudaya2', type: 'html', key: 'cms_budaya_2', label: 'Poin Budaya 2' },
            { selector: '#cmsBudaya3', type: 'html', key: 'cms_budaya_3', label: 'Poin Budaya 3' },
            { selector: '#cmsVideoWrapper, .tkp-video-wrapper', type: 'iframe', key: 'cms_video_url', label: 'URL Link Video YouTube' },
            { selector: '#tentangPage > section:nth-of-type(7) h2', type: 'text', key: 'cms_galeri_title', label: 'Judul Galeri' },
            { selector: '.tkp-gal-1', type: 'image', key: 'cms_galeri_img_1', label: 'Foto Galeri 1', lightbox: true, caption: 'Galeri Ruang Kerja & Kegiatan 1' },
            { selector: '.tkp-gal-2', type: 'image', key: 'cms_galeri_img_2', label: 'Foto Galeri 2', lightbox: true, caption: 'Galeri Ruang Kerja & Kegiatan 2' },
            { selector: '.tkp-gal-3', type: 'image', key: 'cms_galeri_img_3', label: 'Foto Galeri 3', lightbox: true, caption: 'Galeri Ruang Kerja & Kegiatan 3' },
            { selector: '.tkp-gal-4', type: 'image', key: 'cms_galeri_img_4', label: 'Foto Galeri 4', lightbox: true, caption: 'Galeri Ruang Kerja & Kegiatan 4' },
            { selector: '.tkp-gal-5', type: 'image', key: 'cms_galeri_img_5', label: 'Foto Galeri 5', lightbox: true, caption: 'Galeri Ruang Kerja & Kegiatan 5' },
            { selector: '.tkp-gal-6', type: 'image', key: 'cms_galeri_img_6', label: 'Foto Galeri 6', lightbox: true, caption: 'Galeri Ruang Kerja & Kegiatan 6' }
        ];
    }

    // Apply satu item CMS value ke DOM
    function applyCMSItemToDOM(item, savedVal) {
        const el = document.querySelector(item.selector);
        if (!el) return;
        if (item.type === 'text') el.innerText = savedVal;
        else if (item.type === 'html') el.innerHTML = sanitizeBasicHtml(savedVal);
        else if (item.type === 'image' || item.type === 'iframe') {
            if (item.key === 'cms_map_custom_image') {
                const imgCustom = document.getElementById('mapCustomImage');
                if (imgCustom) {
                    applyMapAsset(imgCustom, sanitizeAssetUrl(savedVal, 'image'), {
                        wrapperSelector: '#mapSlideImgmap',
                        label: 'Peta Wilayah Padukuhan Karanganyar',
                        accentColor: '#0f172a'
                    });
                }
            } else if (item.key === 'cms_peta_sumber_air') {
                const imgWater = document.getElementById('petaSumberAirImg');
                if (imgWater) {
                    applyMapAsset(imgWater, sanitizeAssetUrl(savedVal, 'image'), {
                        wrapperSelector: '.water-map-img-wrapper',
                        label: 'Peta Sebaran & Sumber Daya Air Karanganyar',
                        accentColor: '#0f766e'
                    });
                }
            } else if (item.type === 'iframe') {
                const iframe = el.tagName.toLowerCase() === 'iframe' ? el : el.querySelector('iframe');
                if (iframe) {
                    // ⭐⭐⭐ SELALU gunakan helper buildYoutubeEmbedUrl untuk YouTube
                    // agar parameter playsinline/controls/fs SELALU ada (mobile bisa tap play!)
                    let finalSrc = sanitizeAssetUrl(savedVal, 'iframe') || '';
                    try {
                        if (item.key === 'cms_video_url' && finalSrc && finalSrc.includes('youtube.com/embed/')) {
                            finalSrc = buildYoutubeEmbedUrl(finalSrc);
                        } else if (item.key === 'cms_map_url') {
                            // Google Maps embed URL parameter standar
                            if (finalSrc && !finalSrc.includes('?')) {
                                // Do nothing, biarkan sesuai input
                            }
                        }
                    } catch(e) {}
                    iframe.src = finalSrc;
                }
            } else {
                el.src = sanitizeAssetUrl(savedVal, 'image');
            }
        } else if (item.type === 'number') {
            if (item.attr) el.setAttribute(item.attr, savedVal);
            el.innerText = savedVal;
        }
    }

    // 1. Apply saved CMS data: PRIORITAS FIREBASE DB > localStorage
    async function applySavedCMSData() {
        const cmsMapping = getCMSMapping();

        // --- STEP 1: Coba tarik data dari Firebase DB terlebih dahulu ---
        const fbSnapshot = await fetchCMSFromFirebase();
        if (fbSnapshot) {
            // Priority: Firebase value > localStorage value. Sync ke localStorage juga.
            cmsMapping.forEach(item => {
                if (fbSnapshot[item.key] != null && fbSnapshot[item.key] !== "") {
                    try { localStorage.setItem(item.key, fbSnapshot[item.key]); } catch (e) {}
                }
            });
            // Jika Firebase sudah punya beberapa key tapi localStorage tidak lengkap,
            // push snapshot gabungan kembali ke Firebase agar DB selalu lengkap
            if (Object.keys(fbSnapshot).length < cmsMapping.length) {
                saveAllCMSToFirebase(cmsMapping, fbSnapshot).catch(() => {});
            }
        } else {
            // Tidak ada data di Firebase: coba push data localStorage jika ada
            const anyLocal = cmsMapping.some(item => {
                const v = localStorage.getItem(item.key);
                return v != null && v !== "";
            });
            if (anyLocal) saveAllCMSToFirebase(cmsMapping).catch(() => {});
        }

        // --- STEP 2: Apply nilai yang sudah disinkron ke DOM ---
        cmsMapping.forEach(item => {
            const savedVal = localStorage.getItem(item.key);
            if (savedVal) applyCMSItemToDOM(item, savedVal);
        });

        // --- STEP 3: Binding Lightbox untuk gambar peta & galeri (bukan di mode admin) ---
        setTimeout(() => bindLightboxHandlers(cmsMapping), 200);

        return cmsMapping;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { applySavedCMSData(); });
    } else {
        applySavedCMSData();
    }

    // ==========================================================
    // GLOBAL IMAGE LIGHTBOX ENGINE (Klik gambar -> Popup responsive)
    // Diakses melalui window.openCMSImageLightbox(src, caption)
    // ==========================================================
    function ensureLightboxDOM() {
        if (document.getElementById('cmsImageLightbox')) return;
        const overlay = document.createElement('div');
        overlay.id = 'cmsImageLightbox';
        overlay.className = 'cms-lightbox-overlay hidden';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <button type="button" class="cms-lightbox-close" aria-label="Tutup gambar">&times;</button>
            <div class="cms-lightbox-stage">
                <img class="cms-lightbox-img" alt="Preview Gambar" src="">
                <div class="cms-lightbox-caption"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Event close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('cms-lightbox-close')) {
                closeCMSLightbox();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
                closeCMSLightbox();
            }
        });
    }

    function openCMSImageLightbox(src, caption) {
        if (typeof window.openImageLightbox === 'function') {
            window.openImageLightbox(src, caption);
            return;
        }
        ensureLightboxDOM();
        const overlay = document.getElementById('cmsImageLightbox');
        const img = overlay.querySelector('.cms-lightbox-img');
        const cap = overlay.querySelector('.cms-lightbox-caption');
        if (img) { img.src = src || ''; }
        if (cap) { cap.textContent = caption || ''; cap.style.display = caption ? 'block' : 'none'; }
        overlay.classList.remove('hidden');
        document.body.classList.add('cms-lightbox-open');
    }
    window.openCMSImageLightbox = openCMSImageLightbox;

    function closeCMSLightbox() {
        const overlay = document.getElementById('cmsImageLightbox');
        if (overlay) {
            overlay.classList.add('hidden');
            const img = overlay.querySelector('.cms-lightbox-img');
            if (img) img.src = '';
        }
        document.body.classList.remove('cms-lightbox-open');
    }
    window.closeCMSLightbox = closeCMSLightbox;

    // Binding click handler ke gambar-gambar yang punya lightbox:true (peta & galeri)
    function bindLightboxHandlers(cmsMapping) {
        cmsMapping.forEach(item => {
            if (!item.lightbox || item.type !== 'image') return;
            const els = document.querySelectorAll(item.selector);
            els.forEach(el => {
                const img = (el.tagName && el.tagName.toLowerCase() === 'img') ? el : (el.querySelector ? el.querySelector('img') : null);
                const refImg = (item.key === 'cms_map_custom_image')
                    ? document.getElementById('mapCustomImage')
                    : (item.key === 'cms_peta_sumber_air' ? document.getElementById('petaSumberAirImg') : img);

                const target = refImg || img || el;
                if (!target) return;
                if (target.getAttribute('data-lightbox-bound')) return;
                target.setAttribute('data-lightbox-bound', '1');

                target.style.cursor = 'zoom-in';
                target.addEventListener('click', (e) => {
                    // Jika sedang di mode admin edit, biarkan edit buttonnya yang kerja
                    const isAdmin = hasActiveAdminSession() && ((window.self !== window.top) || window.location.search.includes('mode=admin'));
                    if (isAdmin) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const src = target.dataset.tkpAssetSrc
                        || (target.parentElement && target.parentElement.dataset ? target.parentElement.dataset.tkpAssetSrc : '')
                        || target.src
                        || target.getAttribute('src')
                        || '';
                    openCMSImageLightbox(src, item.caption || item.label || '');
                });
            });
        });
    }

    // 2. DETEKSI MODE ADMIN (Halaman di dalam iframe ATAU URL memuat mode=admin)
    const isInsideIframe = window.self !== window.top;
    const isUrlAdmin = window.location.search.includes('mode=admin');
    const isAdmin = hasActiveAdminSession() && (isInsideIframe || isUrlAdmin);

    if (isAdmin) {
        console.log('CMS Edit Mode Active (Detected Iframe / mode=admin)');

        const style = document.createElement('style');
        style.id = 'cmsAdminStyles';
        style.innerHTML = `
            header, .header, .topbar, .main-header, .header-actions, .category-nav, .mobile-nav, footer, .footer { 
                display: none !important; 
            }
            body { 
                background: #f8fafc !important; 
                margin: 0 !important; 
                padding: 0 !important; 
            }
            #tentangPage { 
                display: block !important; 
                opacity: 1 !important; 
                visibility: visible !important; 
                position: relative !important; 
                z-index: 1000 !important;
                padding-top: 0 !important;
                margin-top: 0 !important;
            }
            main:not(#tentangPage) {
                display: none !important;
            }
            .cms-editable {
                position: relative !important;
                cursor: pointer !important;
                outline: 2px dashed #2e7d32 !important;
                outline-offset: 3px !important;
                transition: all 0.2s ease !important;
                border-radius: 6px !important;
            }
            .cms-editable:hover {
                outline: 2px solid #1b5e20 !important;
                background-color: rgba(46, 125, 50, 0.12) !important;
            }
            .cms-editable::after {
                content: '✏️ Edit' !important;
                font-family: 'Poppins', sans-serif !important;
                font-weight: 700 !important;
                position: absolute !important;
                top: 4px !important;
                right: 4px !important;
                background: #2e7d32 !important;
                color: white !important;
                padding: 3px 10px !important;
                border-radius: 12px !important;
                font-size: 11px !important;
                opacity: 0.95 !important;
                z-index: 9999 !important;
                pointer-events: none !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important;
            }
            .cms-editor-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 8px;
                background: #ffffff;
                padding: 12px;
                border-radius: 8px;
                box-shadow: 0 6px 16px rgba(0,0,0,0.15);
                z-index: 10000;
                position: relative;
                border: 1px solid #2e7d32;
            }
            .cms-editor-container input, .cms-editor-container textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ccc;
                border-radius: 6px;
                font-family: inherit;
                font-size: 14px;
                box-sizing: border-box;
            }
            .cms-editor-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .cms-btn {
                padding: 6px 14px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
            }
            .cms-btn-save { background: #2e7d32; color: white; }
            .cms-btn-cancel { background: #e0e0e0; color: #333; }
        `;
        document.head.appendChild(style);

        const enableEditing = () => {
            // applySavedCMSData sudah dipanggil, tapi kita panggil ulang (Promise aman) untuk ambil mapping
            const cmsMapping = getCMSMapping();
            applySavedCMSData().then(() => {
                // Setelah data sinkron, attach tombol edit
                cmsMapping.forEach(item => {
                    const el = document.querySelector(item.selector);
                    if (!el) return;

                    if (item.type === 'image') {
                        const img = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
                        const parent = img ? img.parentElement : el;
                        if (parent) {
                            parent.style.position = 'relative';
                            parent.style.outline = '2px dashed #00AA5B';
                            parent.style.outlineOffset = '-3px';
                            parent.style.cursor = 'zoom-in';
                            
                            let btn = parent.querySelector('.cms-real-btn-' + item.key);
                            if (!btn) {
                                btn = document.createElement('button');
                                btn.className = 'cms-real-btn cms-real-btn-' + item.key;
                                btn.innerHTML = `✏️ Edit ${item.label}`;
                                btn.style.cssText = 'position: absolute !important; top: 10px !important; right: 10px !important; z-index: 99999 !important; background: #00AA5B !important; color: #ffffff !important; border: 2px solid #ffffff !important; padding: 6px 14px !important; border-radius: 20px !important; font-weight: 700 !important; font-size: 12px !important; font-family: "Poppins", sans-serif !important; cursor: pointer !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; display: flex !important; align-items: center !important; gap: 6px !important; pointer-events: auto !important;';
                                parent.appendChild(btn);
                            }

                            btn.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openEditor(el, item, cmsMapping);
                            };

                            if (img) {
                                img.style.cursor = 'pointer';
                                img.onclick = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEditor(el, item, cmsMapping);
                                };
                            }
                        }
                    } else if (item.type === 'iframe') {
                        const iframe = el.tagName.toLowerCase() === 'iframe' ? el : el.querySelector('iframe');
                        const parent = iframe ? iframe.parentElement : el;
                        if (iframe) iframe.style.pointerEvents = 'none';

                        if (parent) {
                            parent.style.position = 'relative';
                            parent.style.outline = '2px dashed #00AA5B';
                            parent.style.outlineOffset = '-3px';

                            let btn = parent.querySelector('.cms-real-btn-' + item.key);
                            if (!btn) {
                                btn = document.createElement('button');
                                btn.className = 'cms-real-btn cms-real-btn-' + item.key;
                                btn.innerHTML = `✏️ Edit ${item.label}`;
                                btn.style.cssText = 'position: absolute !important; top: 10px !important; right: 10px !important; z-index: 99999 !important; background: #00AA5B !important; color: #ffffff !important; border: 2px solid #ffffff !important; padding: 6px 14px !important; border-radius: 20px !important; font-weight: 700 !important; font-size: 12px !important; font-family: "Poppins", sans-serif !important; cursor: pointer !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; display: flex !important; align-items: center !important; gap: 6px !important; pointer-events: auto !important;';
                                parent.appendChild(btn);
                            }

                            btn.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openEditor(el, item, cmsMapping);
                            };
                        }
                    } else {
                        el.classList.add('cms-editable');
                        el.title = `Klik untuk mengedit ${item.label}`;
                        
                        el.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditor(el, item, cmsMapping);
                        };
                    }
                });
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enableEditing);
        } else {
            setTimeout(enableEditing, 400);
        }
    }

    let activeEditor = null;

    function openEditor(el, item, cmsMapping) {
        if (activeEditor) {
            activeEditor.remove();
            activeEditor = null;
        }

        let currentValue = '';
        if (item.type === 'text') currentValue = el.innerText;
        else if (item.type === 'html') currentValue = el.innerHTML;
        else if (item.type === 'image' || item.type === 'iframe') {
            if (item.key === 'cms_map_custom_image') {
                const targetImg = document.getElementById('mapCustomImage');
                currentValue = targetImg ? (targetImg.dataset.tkpAssetSrc || targetImg.src || '') : '';
            } else if (item.key === 'cms_peta_sumber_air') {
                const targetImg = document.getElementById('petaSumberAirImg');
                currentValue = targetImg ? (targetImg.dataset.tkpAssetSrc || targetImg.src || '') : '';
            } else {
                const targetImg = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
                const targetIframe = el.tagName.toLowerCase() === 'iframe' ? el : el.querySelector('iframe');
                currentValue = targetImg ? targetImg.src : (targetIframe ? targetIframe.src : (el.src || ''));
            }
        }
        else if (item.type === 'number') currentValue = el.getAttribute(item.attr) || el.innerText;
        const escapedCurrentValue = escapeForHtml(currentValue);

        const modalBackdrop = document.createElement('div');
        modalBackdrop.className = 'cms-floating-editor-backdrop';
        modalBackdrop.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.75); z-index: 9999999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 15px; box-sizing: border-box;';
        
        let inputHtml = '';
        if (item.type === 'text' || item.type === 'html') {
            inputHtml = `<textarea rows="5" class="cms-input-field" style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; font-family: inherit; box-sizing: border-box;">${escapedCurrentValue}</textarea>`;
        } else if (item.type === 'image') {
            inputHtml = `
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; font-weight: 700; color: #475569; display: block; margin-bottom: 6px;">1. Upload Foto Baru (JPG/PNG dari Perangkat):</label>
                    <input type="file" accept="image/*" class="cms-input-file" style="width: 100%; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 0.85rem; background: #f8fafc; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="font-size: 0.85rem; font-weight: 700; color: #475569; display: block; margin-bottom: 6px;">2. Atau URL Tautan Foto:</label>
                    <input type="text" class="cms-input-field" placeholder="https://..." value="${escapedCurrentValue}" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;">
                </div>
                <div style="text-align: center; background: #f1f5f9; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; display: block; margin-bottom: 6px;">Preview Gambar:</span>
                    <img class="cms-preview-img" src="${sanitizeAssetUrl(currentValue, 'image')}" style="max-height: 180px; max-width: 100%; border-radius: 6px; object-fit: contain;">
                </div>
            `;
        } else {
            inputHtml = `<input type="${item.type === 'number' ? 'number' : 'text'}" class="cms-input-field" value="${escapedCurrentValue}" placeholder="Masukkan URL Embed..." style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box;">`;
        }

        modalBackdrop.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 520px; border-radius: 16px; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #e2e8f0; font-family: 'Poppins', sans-serif; position: relative;">
                <div style="font-size: 1.1rem; font-weight: 800; color: #1e293b; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-edit" style="color: #00AA5B;"></i> Edit ${item.label || 'Elemen'}</span>
                    <button class="cms-btn-close" style="background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer;">&times;</button>
                </div>
                ${inputHtml}
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button class="cms-btn-cancel" style="padding: 10px 20px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #64748b; font-weight: 700; cursor: pointer;">Batal</button>
                    <button class="cms-btn-save" style="padding: 10px 24px; border-radius: 8px; border: none; background: #00AA5B; color: white; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,170,91,0.3); display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-check"></i> Simpan Perubahan
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalBackdrop);
        activeEditor = modalBackdrop;

        if (item.type === 'image') {
            const fileInput = modalBackdrop.querySelector('.cms-input-file');
            const textInput = modalBackdrop.querySelector('.cms-input-field');
            const previewImg = modalBackdrop.querySelector('.cms-preview-img');

            textInput.addEventListener('input', (e) => {
                if (previewImg) previewImg.src = e.target.value;
            });

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const base64 = await compressImageCMS(file);
                        textInput.value = base64;
                        if (previewImg) previewImg.src = base64;
                    } catch(err) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            textInput.value = ev.target.result;
                            if (previewImg) previewImg.src = ev.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                }
            });
        }

        const closeModal = () => {
            modalBackdrop.remove();
            activeEditor = null;
        };

        modalBackdrop.querySelector('.cms-btn-cancel').addEventListener('click', closeModal);
        modalBackdrop.querySelector('.cms-btn-close').addEventListener('click', closeModal);
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeModal();
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape' && activeEditor === modalBackdrop) {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });

        modalBackdrop.querySelector('.cms-btn-save').addEventListener('click', async () => {
            let newValue = '';
            if (item.type === 'text' || item.type === 'html') {
                newValue = modalBackdrop.querySelector('.cms-input-field').value;
            } else if (item.type === 'image') {
                newValue = modalBackdrop.querySelector('.cms-input-field').value;
            } else {
                newValue = modalBackdrop.querySelector('.cms-input-field').value.trim();
                
                if (item.type === 'iframe') {
                    const srcMatch = newValue.match(/src\s*=\s*["']([^"']+)["']/i);
                    if (srcMatch && srcMatch[1]) {
                        newValue = srcMatch[1];
                    }
                    if (newValue.includes('youtube.com/embed/')) {
                        newValue = newValue.split('?')[0].split('#')[0];
                    }
                    if (newValue.includes('youtube.com/watch') || newValue.includes('youtu.be/')) {
                        let videoId = '';
                        if (newValue.includes('youtu.be/')) {
                            videoId = newValue.split('youtu.be/')[1].split('?')[0];
                        } else if (newValue.includes('v=')) {
                            try {
                                videoId = new URLSearchParams(newValue.split('?')[1]).get('v');
                            } catch(e) {}
                        }
                        if (videoId) {
                            newValue = 'https://www.youtube.com/embed/' + videoId;
                        }
                    }
                    // ⭐⭐⭐ SELALU TAMBAHKAN PARAMETER MOBILE-FRIENDLY DI AKHIR
                    // (supaya playsinline=1 controls=1 fs=1 SELALU ADA, baik disimpan ke DB maupun ke DOM)
                    if (item.key === 'cms_video_url' && newValue && newValue.includes('youtube.com/embed/')) {
                        newValue = buildYoutubeEmbedUrl(newValue);
                    }
                }
            }

            if (item.type === 'html') {
                newValue = sanitizeBasicHtml(newValue);
            } else if (item.type === 'image') {
                newValue = sanitizeAssetUrl(newValue, 'image');
            } else if (item.type === 'iframe') {
                newValue = sanitizeAssetUrl(newValue, 'iframe');
            }

            try {
                localStorage.setItem(item.key, newValue);
            } catch(e) {}

            applyCMSItemToDOM(item, newValue);

            // ✅ PENTING: Simpan SEMUA data CMS ke Firebase DB (bukan cuma localStorage)
            const saveBtn = modalBackdrop.querySelector('.cms-btn-save');
            const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
            }
            await saveAllCMSToFirebase(cmsMapping);

            closeModal();
            
            const toast = document.createElement('div');
            toast.innerText = `Perubahan ${item.label || 'elemen'} berhasil disimpan ke Database Firebase!`;
            toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#00AA5B; color:white; padding:12px 24px; border-radius:10px; z-index:9999999; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-family:"Poppins",sans-serif; font-weight:700; font-size:0.9rem;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        });
    }
})();
