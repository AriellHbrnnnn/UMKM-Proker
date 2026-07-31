// admin_cms.js - Standalone CMS & Admin Edit Detector (TERINTEGRASI FIREBASE REST DB)
(function() {
    function hasActiveAdminSession() {
        const isSessionOk = sessionStorage.getItem('isAdminLoggedIn') === 'true' && !!sessionStorage.getItem('umkm_admin_session_token');
        if (isSessionOk) return true;

        const isLocalOk = localStorage.getItem('isAdminLoggedIn') === 'true' && !!localStorage.getItem('umkm_admin_session_token');
        if (isLocalOk) return true;

        try {
            if (window.parent && window.parent !== window && window.parent.sessionStorage) {
                const isParentOk = window.parent.sessionStorage.getItem('isAdminLoggedIn') === 'true' && !!window.parent.sessionStorage.getItem('umkm_admin_session_token');
                if (isParentOk) return true;
            }
        } catch (_) {}

        return false;
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

    // INDEXEDDB VAULT HELPER (Mencegah QuotaExceededError untuk Video MP4 Besar)
    const cmsVideoStore = {
        dbName: 'UMKM_CMS_DB',
        storeName: 'cms_assets',
        async open() {
            return new Promise((resolve) => {
                try {
                    const req = indexedDB.open(this.dbName, 1);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName);
                        }
                    };
                    req.onsuccess = (e) => resolve(e.target.result);
                    req.onerror = () => resolve(null);
                } catch (_) { resolve(null); }
            });
        },
        async set(key, val) {
            try {
                const db = await this.open();
                if (!db) return false;
                return new Promise((resolve) => {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    tx.objectStore(this.storeName).put(val, key);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                });
            } catch (_) { return false; }
        },
        async get(key) {
            try {
                const db = await this.open();
                if (!db) return null;
                return new Promise((resolve) => {
                    const tx = db.transaction(this.storeName, 'readonly');
                    const req = tx.objectStore(this.storeName).get(key);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => resolve(null);
                });
            } catch (_) { return null; }
        }
    };

    // Helper: Kirim seluruh data CMS yang terkumpul ke Firebase RTDB (single PUT)
    async function saveAllCMSToFirebase(cmsMapping, savedSnapshot = null) {
        try {
            const payload = {};
            cmsMapping.forEach(item => {
                const val = (savedSnapshot && savedSnapshot[item.key] != null)
                    ? savedSnapshot[item.key]
                    : (localStorage.getItem(item.key) ?? "");

                // Filter untuk cms_hero_bg: hanya blokir video base64 (terlalu besar)
                // Foto base64 yang sudah dikompres (~100-500KB) BOLEH disimpan ke Firebase
                // agar foto background tampil global untuk semua pengunjung
                if (item.key === 'cms_hero_bg' && typeof val === 'string') {
                    if (val.startsWith('blob:')) {
                        // blob: URL tidak portable — jangan simpan
                        payload[item.key] = "";
                        return;
                    }
                    if (val.startsWith('data:video/')) {
                        // Video base64 bisa ratusan MB — jangan simpan ke Firebase
                        payload[item.key] = "";
                        return;
                    }
                    // data:image/ (foto compressed) → boleh, ukurannya kecil setelah compressImageCMS
                }
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

    // Helper function kompresi video otomatis CMS (Untuk Hero Background)
    function compressVideoCMS(file) {
        return new Promise((resolve, reject) => {
            try {
                if (!file || !(file instanceof Blob)) {
                    return reject(new Error("File video tidak valid"));
                }
                // Jika file video sudah sangat kecil (di bawah 3MB), langsung konversi ke Base64 DataURL
                if (file.size <= 3 * 1024 * 1024) {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    return;
                }

                const video = document.createElement('video');
                video.preload = 'metadata';
                video.muted = true;
                video.playsInline = true;
                const videoUrl = URL.createObjectURL(file);
                video.src = videoUrl;

                video.onloadedmetadata = () => {
                    let width = video.videoWidth || 854;
                    let height = video.videoHeight || 480;
                    const maxWidth = 854;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    width = width % 2 === 0 ? width : width - 1;
                    height = height % 2 === 0 ? height : height - 1;

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    let mimeType = 'video/webm;codecs=vp8';
                    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'video/webm';
                    }
                    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'video/mp4';
                    }

                    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
                        URL.revokeObjectURL(videoUrl);
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                        return;
                    }

                    const stream = canvas.captureStream(24);
                    let mediaRecorder;
                    try {
                        mediaRecorder = new MediaRecorder(stream, {
                            mimeType: mimeType,
                            videoBitsPerSecond: 800000
                        });
                    } catch (_) {
                        mediaRecorder = new MediaRecorder(stream);
                    }

                    const chunks = [];
                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) chunks.push(e.data);
                    };

                    mediaRecorder.onstop = () => {
                        URL.revokeObjectURL(videoUrl);
                        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'video/webm' });
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    };

                    mediaRecorder.start(100);
                    video.play().catch(() => {});

                    let animationFrameId;
                    const duration = Math.min(video.duration || 15, 15);
                    const startTime = Date.now();

                    function drawFrame() {
                        if (video.paused || video.ended || (Date.now() - startTime) >= duration * 1000) {
                            video.pause();
                            if (mediaRecorder.state !== 'inactive') {
                                mediaRecorder.stop();
                            }
                            cancelAnimationFrame(animationFrameId);
                            return;
                        }
                        ctx.drawImage(video, 0, 0, width, height);
                        animationFrameId = requestAnimationFrame(drawFrame);
                    }

                    drawFrame();
                };

                video.onerror = () => {
                    URL.revokeObjectURL(videoUrl);
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                };
            } catch (_) {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
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
            { selector: '.tkp-hero', type: 'hero_bg', key: 'cms_hero_bg', label: 'Background Hero (Video / Foto)' },
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
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) h3 > span:nth-child(1) .count-up, .tkp-stat-item:nth-child(3) h3 span:nth-child(1) .count-up', type: 'number', key: 'cms_stat_l', label: 'Penduduk Laki-laki', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) h3 > span:nth-child(2) .count-up, .tkp-stat-item:nth-child(3) h3 span:nth-child(2) .count-up', type: 'number', key: 'cms_stat_p', label: 'Penduduk Perempuan', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) p .count-up, .tkp-stat-item:nth-child(3) p .count-up', type: 'number', key: 'cms_stat_total', label: 'Total Penduduk (Jiwa)', attr: 'data-target' },
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

    // Direct HTML/Image element mutator
    function applyCMSItemToDOM(item, savedVal) {
        if (!savedVal) return;
        const el = document.querySelector(item.selector);
        if (!el) return;

        if (item.type === 'text') {
            el.innerText = savedVal;
        } else if (item.type === 'html') {
            el.innerHTML = sanitizeBasicHtml(savedVal);
        } else if (item.type === 'image' || item.type === 'iframe') {
            if (item.key === 'cms_map_custom_image') {
                const imgCustom = document.getElementById('mapCustomImage');
                const safeMapUrl = sanitizeAssetUrl(savedVal, 'image');
                if (imgCustom) imgCustom.src = safeMapUrl;
                
                const ph = document.getElementById('mapImgPlaceholder');
                if (ph) ph.style.display = 'none';
            } else if (item.key === 'cms_peta_sumber_air') {
                const imgWater = document.getElementById('petaSumberAirImg');
                const safeWaterUrl = sanitizeAssetUrl(savedVal, 'image');
                if (imgWater) imgWater.src = safeWaterUrl;
            } else if (item.type === 'iframe') {
                const iframe = el.tagName.toLowerCase() === 'iframe' ? el : el.querySelector('iframe');
                let safeFrameUrl = sanitizeAssetUrl(savedVal, 'iframe');
                if (iframe && safeFrameUrl) {
                    try {
                        const frameUrlObj = new URL(safeFrameUrl);
                        if (frameUrlObj.hostname.includes('google.com') && frameUrlObj.pathname.includes('/maps/embed')) {
                            const params = new URLSearchParams(frameUrlObj.search);
                            if (params.has('output')) safeFrameUrl = safeFrameUrl.replace('output=embed', 'output=embed&z=17');
                            else safeFrameUrl += (safeFrameUrl.includes('?') ? '&' : '?') + 'z=17';
                        }
                    } catch(e) {}
                    iframe.src = safeFrameUrl;
                }
            } else {
                el.src = sanitizeAssetUrl(savedVal, 'image');
            }
        } else if (item.type === 'hero_bg') {
            applyHeroBgToDOM(el, savedVal);
        } else if (item.type === 'number') {
            if (item.attr) el.setAttribute(item.attr, savedVal);
            el.innerText = savedVal;
        }
    }

    async function applyHeroBgToDOM(heroEl, savedVal) {
        if (!heroEl) return;
        let bgWrapper = heroEl.querySelector('.tkp-hero-bg');
        if (!bgWrapper) {
            bgWrapper = document.createElement('div');
            bgWrapper.className = 'tkp-hero-bg';
            bgWrapper.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; z-index:0; pointer-events:none;';
            heroEl.insertBefore(bgWrapper, heroEl.firstChild);
        }

        let mediaType = 'image';
        let url = '';

        try {
            const storedFile = await cmsVideoStore.get('cms_hero_bg_file');
            if (storedFile && (storedFile instanceof Blob || storedFile instanceof File)) {
                mediaType = storedFile.type.startsWith('image/') ? 'image' : 'video';
                url = URL.createObjectURL(storedFile);
            }
        } catch (_) {}

        if (!url && savedVal) {
            try {
                if (typeof savedVal === 'string' && savedVal.trim().startsWith('{')) {
                    const parsed = JSON.parse(savedVal);
                    mediaType = parsed.mediaType || 'image';
                    url = parsed.url || '';
                } else {
                    url = String(savedVal).trim();
                    if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        mediaType = 'youtube';
                    } else if (url.startsWith('data:video/') || /\.(mp4|webm|ogv)($|\?)/i.test(url)) {
                        mediaType = 'video';
                    } else {
                        mediaType = 'image';
                    }
                }
            } catch (_) {
                url = String(savedVal);
            }
        }

        if (!url) {
            bgWrapper.innerHTML = '';
            heroEl.style.background = '#0f172a';
            return;
        }

        heroEl.style.background = 'none';

        if (mediaType === 'youtube') {
            let videoId = '';
            if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0].split('#')[0];
            } else if (url.includes('v=')) {
                videoId = new URLSearchParams(url.split('?')[1]).get('v');
            } else if (url.includes('youtube.com/embed/')) {
                videoId = url.split('youtube.com/embed/')[1].split('?')[0].split('#')[0];
            }
            if (videoId) {
                bgWrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&autohide=1&modestbranding=1&playsinline=1&enablejsapi=1" style="position:absolute; top:50%; left:50%; width:100vw; height:100vh; min-width:177.77vh; min-height:56.25vw; transform:translate(-50%, -50%); object-fit:cover; border:none; pointer-events:none;"></iframe>`;
            } else {
                bgWrapper.innerHTML = '';
                heroEl.style.background = '#0f172a';
            }
        } else if (mediaType === 'video') {
            bgWrapper.innerHTML = `<video autoplay loop muted playsinline webkit-playsinline style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0;"><source src="${url}"></video>`;
        } else {
            bgWrapper.innerHTML = `<img src="${url}" alt="Hero Background" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0;">`;
        }
    }

    // 1. Apply saved CMS data: PRIORITAS FIREBASE DB > INDEXEDDB > localStorage
    async function applySavedCMSData() {
        const cmsMapping = getCMSMapping();

        // --- STEP 1: Tarik data dari Firebase DB (sumber kebenaran utama untuk deploy) ---
        const fbSnapshot = await fetchCMSFromFirebase();
        let fbHeroBgValue = null; // Nilai hero_bg dari Firebase (URL/JSON string)

        if (fbSnapshot) {
            for (const item of cmsMapping) {
                if (fbSnapshot[item.key] != null && fbSnapshot[item.key] !== "") {
                    const val = fbSnapshot[item.key];
                    if (item.key === 'cms_hero_bg') {
                        fbHeroBgValue = val;
                        // Jika nilai dari Firebase adalah URL atau JSON (bukan blob: URL),
                        // simpan ke IndexedDB DAN localStorage agar offline fallback bekerja
                        const isExternalUrl = (typeof val === 'string') &&
                            (val.startsWith('http') || val.startsWith('{') || val.startsWith('data:'));
                        if (isExternalUrl) {
                            try { await cmsVideoStore.set('cms_hero_bg', val); } catch(_) {}
                        }
                    }
                    try { localStorage.setItem(item.key, val); } catch (e) {}
                }
            }
        }

        // --- STEP 2: Apply nilai ke DOM ---
        for (const item of cmsMapping) {
            let savedVal = null;

            if (item.type === 'hero_bg') {
                // Prioritas: (1) Firebase value URL, (2) IndexedDB blob/file, (3) localStorage
                if (fbHeroBgValue) {
                    savedVal = fbHeroBgValue;
                } else {
                    // Coba IndexedDB (upload lokal — hanya ada di browser yang sama)
                    try {
                        const idbHero = await cmsVideoStore.get('cms_hero_bg');
                        if (idbHero) savedVal = idbHero;
                    } catch(_) {}
                    // Fallback ke localStorage
                    if (!savedVal) savedVal = localStorage.getItem(item.key);
                }
            } else {
                savedVal = localStorage.getItem(item.key);
            }

            if (savedVal) applyCMSItemToDOM(item, savedVal);
        }

        // --- STEP 3: Binding Lightbox untuk gambar peta & galeri (bukan di mode admin) ---
        setTimeout(() => bindLightboxHandlers(cmsMapping), 200);

        return cmsMapping;
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
                    } else if (item.type === 'hero_bg') {
                        el.style.position = 'relative';
                        let btn = el.querySelector('.cms-real-btn-' + item.key);
                        if (!btn) {
                            btn = document.createElement('button');
                            btn.className = 'cms-real-btn cms-real-btn-' + item.key;
                            btn.innerHTML = `✏️ Edit Background Hero (Video / Foto)`;
                            btn.style.cssText = 'position: absolute !important; top: 90px !important; right: 20px !important; z-index: 99999 !important; background: #00AA5B !important; color: #ffffff !important; border: 2px solid #ffffff !important; padding: 10px 18px !important; border-radius: 24px !important; font-weight: 700 !important; font-size: 13px !important; font-family: "Poppins", sans-serif !important; cursor: pointer !important; box-shadow: 0 4px 15px rgba(0,0,0,0.4) !important; display: flex !important; align-items: center !important; gap: 8px !important; pointer-events: auto !important;';
                            el.appendChild(btn);
                        }
                        btn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditor(el, item, cmsMapping);
                        };
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
        
        let currentMediaType = 'video';
        let currentUrl = '';
        if (item.type === 'hero_bg') {
            const rawVal = localStorage.getItem(item.key) || '';
            if (rawVal) {
                try {
                    if (rawVal.trim().startsWith('{')) {
                        const parsed = JSON.parse(rawVal);
                        currentMediaType = (parsed.mediaType === 'image') ? 'image' : 'video';
                        currentUrl = parsed.url || '';
                    } else {
                        currentUrl = rawVal.trim();
                        if (currentUrl.startsWith('data:video/') || /\.(mp4|webm|ogv)($|\?)/i.test(currentUrl)) currentMediaType = 'video';
                        else currentMediaType = 'image';
                    }
                } catch (_) { currentUrl = rawVal; }
            }
        }

        let inputHtml = '';
        if (item.type === 'text' || item.type === 'html') {
            inputHtml = `<textarea rows="5" class="cms-input-field" style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; font-family: inherit; box-sizing: border-box;">${escapedCurrentValue}</textarea>`;
        } else if (item.type === 'hero_bg') {
            // Tentukan nilai URL awal yang tampil di input (bersih dari blob/data)
            const _initUrlVal = (currentUrl && !currentUrl.startsWith('blob:') && !currentUrl.startsWith('data:')) ? currentUrl : '';
            inputHtml = `
                <!-- TAB PILIH JENIS -->
                <div style="display: flex; gap: 8px; margin-bottom: 16px; background: #f1f5f9; border-radius: 10px; padding: 4px;">
                    <button type="button" class="cms-hero-type-btn" data-type="image" style="flex: 1; padding: 9px 8px; border-radius: 8px; border: none; background: ${currentMediaType === 'image' ? '#ffffff' : 'transparent'}; color: ${currentMediaType === 'image' ? '#00AA5B' : '#64748b'}; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: ${currentMediaType === 'image' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none'}; transition: all 0.2s; font-family: inherit;">
                        <i class="fas fa-image"></i> Foto / Gambar
                    </button>
                    <button type="button" class="cms-hero-type-btn" data-type="video" style="flex: 1; padding: 9px 8px; border-radius: 8px; border: none; background: ${currentMediaType === 'video' ? '#ffffff' : 'transparent'}; color: ${currentMediaType === 'video' ? '#00AA5B' : '#64748b'}; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: ${currentMediaType === 'video' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none'}; transition: all 0.2s; font-family: inherit;">
                        <i class="fab fa-youtube"></i> Video YouTube
                    </button>
                </div>

                <!-- SECTION FOTO (tampil jika type = image) -->
                <div class="cms-hero-image-section" style="display: ${currentMediaType === 'image' ? 'block' : 'none'};">
                    <div style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; background: #f8fafc; margin-bottom: 14px; cursor: pointer; transition: border-color 0.2s;" id="cmsHeroDragDrop">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #00AA5B; margin-bottom: 8px; display: block;"></i>
                        <div style="font-weight: 700; color: #1e293b; font-size: 0.9rem; margin-bottom: 4px;">Upload Foto Latar Belakang</div>
                        <div style="color: #64748b; font-size: 0.78rem; margin-bottom: 12px;">JPG, PNG, atau WebP — Otomatis dikompres & tersimpan global</div>
                        <input type="file" class="cms-hero-file-input" accept="image/*" style="display: none;">
                        <button type="button" class="cms-hero-pick-btn" style="padding: 8px 20px; border-radius: 8px; border: 1.5px solid #00AA5B; background: white; color: #00AA5B; font-weight: 700; font-size: 0.85rem; cursor: pointer; font-family: inherit;">
                            <i class="fas fa-folder-open"></i> Pilih Foto
                        </button>
                    </div>
                    <div style="text-align: center; color: #94a3b8; font-size: 0.78rem; margin-bottom: 10px;">— atau tempel URL foto —</div>
                    <input type="text" class="cms-hero-url-input" placeholder="https://contoh.com/foto.jpg" value="${_initUrlVal && !_initUrlVal.includes('youtube') ? _initUrlVal : ''}" style="width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem; box-sizing: border-box; font-family: inherit; margin-bottom: 14px;">
                </div>

                <!-- SECTION VIDEO (tampil jika type = video) -->
                <div class="cms-hero-video-section" style="display: ${currentMediaType === 'video' ? 'block' : 'none'};">
                    <div style="background: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                            <i class="fab fa-youtube" style="color: #ff0000; font-size: 1.3rem;"></i>
                            <span style="font-weight: 700; color: #1e293b; font-size: 0.9rem;">Tempel Link YouTube</span>
                        </div>
                        <input type="text" class="cms-hero-url-input" placeholder="Contoh: https://youtu.be/XXXXX atau https://www.youtube.com/watch?v=XXXXX" value="${_initUrlVal && _initUrlVal.includes('youtube') ? _initUrlVal : (_initUrlVal && !_initUrlVal.includes('.') ? '' : _initUrlVal)}" style="width: 100%; padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; box-sizing: border-box; font-family: inherit;">
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">Link YouTube → otomatis dikonversi dan tersimpan untuk semua pengunjung web</div>
                    </div>
                </div>

                <!-- PREVIEW -->
                <div style="background: #0f172a; border-radius: 12px; border: 1px solid #334155; overflow: hidden;">
                    <div style="padding: 8px 12px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-eye" style="color: #94a3b8; font-size: 0.75rem;"></i>
                        <span style="font-size: 0.72rem; font-weight: 700; color: #94a3b8;">PRATINJAU (Preview)</span>
                    </div>
                    <div class="cms-hero-preview-stage" style="position: relative; width: 100%; height: 160px; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center;">
                        <span style="color: #475569; font-size: 0.8rem;">Pilih foto atau masukkan URL untuk melihat preview</span>
                    </div>
                </div>
            `;
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

        // Modal dengan layout flexbox column: header sticky + body scrollable + footer sticky
        modalBackdrop.innerHTML = `
            <div style="background: #ffffff; width: 100%; max-width: 540px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); border: 1px solid #e2e8f0; font-family: 'Poppins', sans-serif; display: flex; flex-direction: column; max-height: 92vh; overflow: hidden;">
                <!-- HEADER STICKY -->
                <div style="padding: 18px 20px 14px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: #fff; border-radius: 16px 16px 0 0;">
                    <span style="font-size: 1rem; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-edit" style="color: #00AA5B;"></i> Edit ${item.label || 'Elemen'}
                    </span>
                    <button class="cms-btn-close" style="background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; line-height: 1;">&times;</button>
                </div>
                <!-- BODY SCROLLABLE -->
                <div style="padding: 18px 20px; overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch;">
                    ${inputHtml}
                </div>
                <!-- FOOTER STICKY (tombol selalu terlihat) -->
                <div style="padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; justify-content: flex-end; flex-shrink: 0; background: #f8fafc; border-radius: 0 0 16px 16px;">
                    <button class="cms-btn-cancel" style="padding: 10px 20px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #64748b; font-weight: 700; cursor: pointer; font-family: inherit;">Batal</button>
                    <button class="cms-btn-save" style="padding: 10px 24px; border-radius: 8px; border: none; background: #00AA5B; color: white; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,170,91,0.3); display: flex; align-items: center; gap: 6px; font-family: inherit;">
                        <i class="fas fa-check"></i> Simpan Perubahan
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalBackdrop);
        activeEditor = modalBackdrop;
        // Kunci scroll body agar halaman di belakang tidak ikut scroll saat user scroll di modal
        // Simpan posisi scroll dulu agar tidak jump saat modal ditutup
        try {
            const _scrollY = window.scrollY || 0;
            document.body._cmsScrollLockY = _scrollY;
            document.body.style.setProperty('overflow', 'hidden', 'important');
            document.body.style.setProperty('position', 'fixed', 'important');
            document.body.style.setProperty('top', '-' + _scrollY + 'px', 'important');
            document.body.style.setProperty('width', '100%', 'important');
        } catch(_) {}

        let activeHeroUrl = currentUrl;
        let pendingHeroFile = null;
        if (item.type === 'hero_bg') {
            let selectedMediaType = currentMediaType;
            const typeBtns = modalBackdrop.querySelectorAll('.cms-hero-type-btn');
            const imgSection = modalBackdrop.querySelector('.cms-hero-image-section');
            const vidSection = modalBackdrop.querySelector('.cms-hero-video-section');
            const fileInput = modalBackdrop.querySelector('.cms-hero-file-input');
            const pickBtn = modalBackdrop.querySelector('.cms-hero-pick-btn');
            const urlInput = modalBackdrop.querySelector('.cms-hero-url-input');
            const previewStage = modalBackdrop.querySelector('.cms-hero-preview-stage');

            // Helper: update preview
            const updatePreview = () => {
                if (!previewStage) return;
                if (!activeHeroUrl) {
                    previewStage.innerHTML = `<span style="color:#475569;font-size:0.8rem;">Pilih foto atau masukkan URL untuk melihat preview</span>`;
                    return;
                }
                applyHeroBgToDOM(previewStage, JSON.stringify({ mediaType: selectedMediaType, url: activeHeroUrl }));
            };

            // Helper: switch tab visual
            const switchTab = (type) => {
                selectedMediaType = type;
                typeBtns.forEach(b => {
                    const active = b.dataset.type === type;
                    b.style.background = active ? '#ffffff' : 'transparent';
                    b.style.color = active ? '#00AA5B' : '#64748b';
                    b.style.boxShadow = active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none';
                });
                if (imgSection) imgSection.style.display = type === 'image' ? 'block' : 'none';
                if (vidSection) vidSection.style.display = type === 'video' ? 'block' : 'none';
                // Reset activeHeroUrl saat ganti tab
                activeHeroUrl = '';
                pendingHeroFile = null;
                updatePreview();
            };

            // Tab switch
            typeBtns.forEach(btn => { btn.onclick = () => switchTab(btn.dataset.type); });

            // Tombol pilih foto → trigger file input
            if (pickBtn && fileInput) {
                pickBtn.onclick = () => fileInput.click();
                // Drag area juga bisa diklik
                const dragArea = modalBackdrop.querySelector('#cmsHeroDragDrop');
                if (dragArea) {
                    dragArea.addEventListener('click', (e) => {
                        if (e.target !== pickBtn) fileInput.click();
                    });
                    dragArea.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        dragArea.style.borderColor = '#00AA5B';
                        dragArea.style.background = '#f0fdf4';
                    });
                    dragArea.addEventListener('dragleave', () => {
                        dragArea.style.borderColor = '#cbd5e1';
                        dragArea.style.background = '#f8fafc';
                    });
                    dragArea.addEventListener('drop', (e) => {
                        e.preventDefault();
                        dragArea.style.borderColor = '#cbd5e1';
                        dragArea.style.background = '#f8fafc';
                        const files = e.dataTransfer.files;
                        if (files && files[0]) processImageFile(files[0]);
                    });
                }
            }

            // Helper: proses file gambar → compress → base64 → preview
            const processImageFile = async (file) => {
                if (!file.type.startsWith('image/')) {
                    alert('Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan untuk foto background.');
                    return;
                }
                pendingHeroFile = file;
                // Tampilkan loading di preview
                if (previewStage) {
                    previewStage.innerHTML = `<div style="color:white;text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem;color:#00AA5B;display:block;margin:0 auto 10px;"></i><span style="font-size:0.82rem;">Mengompres foto...</span></div>`;
                }
                try {
                    activeHeroUrl = await compressImageCMS(file);
                } catch (err) {
                    // Fallback: baca sebagai base64 langsung
                    activeHeroUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result || '');
                        reader.readAsDataURL(file);
                    });
                }
                selectedMediaType = 'image';
                // Update drag area: tampilkan nama file
                const dragArea = modalBackdrop.querySelector('#cmsHeroDragDrop');
                if (dragArea) {
                    dragArea.querySelector('div[style*="font-weight: 700"]').textContent = '✅ ' + file.name;
                }
                if (urlInput) urlInput.value = '';
                updatePreview();
            };

            // File input change
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) processImageFile(file);
                });
            }

            // URL input change → update preview langsung
            if (urlInput) {
                urlInput.addEventListener('input', (e) => {
                    const val = e.target.value.trim();
                    pendingHeroFile = null;
                    activeHeroUrl = val;
                    if (val.includes('youtube.com') || val.includes('youtu.be')) {
                        selectedMediaType = 'youtube';
                    }
                    // Debounce preview update
                    clearTimeout(urlInput._previewTimer);
                    urlInput._previewTimer = setTimeout(() => updatePreview(), 600);
                });
            }

            // Init preview dengan nilai awal
            updatePreview();
        } else if (item.type === 'image') {
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
            // Buka kembali scroll body dan kembalikan ke posisi scroll sebelumnya
            try {
                const savedY = document.body._cmsScrollLockY || 0;
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('position');
                document.body.style.removeProperty('top');
                document.body.style.removeProperty('width');
                window.scrollTo(0, savedY);
                delete document.body._cmsScrollLockY;
            } catch(_) {}
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
            if (item.type === 'hero_bg') {
                const saveBtn = modalBackdrop.querySelector('.cms-btn-save');
                if (saveBtn) {
                    saveBtn.disabled = true;
                    saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Menyimpan...`;
                }

                // --- Tentukan mediaType final ---
                let mediaType = selectedMediaType || 'image';
                if (activeHeroUrl && (activeHeroUrl.includes('youtube.com') || activeHeroUrl.includes('youtu.be'))) {
                    mediaType = 'youtube';
                }

                // --- Jika masih ada pendingHeroFile (foto belum diproses) ---
                if (pendingHeroFile && activeHeroUrl.startsWith('blob:')) {
                    try {
                        activeHeroUrl = await compressImageCMS(pendingHeroFile);
                        mediaType = 'image';
                    } catch (_) {
                        activeHeroUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result || '');
                            reader.readAsDataURL(pendingHeroFile);
                        });
                        mediaType = 'image';
                    }
                }

                // --- Jika URL YouTube, ubah ke format embed ---
                if (mediaType === 'youtube' || activeHeroUrl.includes('youtu')) {
                    let ytId = '';
                    if (activeHeroUrl.includes('youtu.be/')) {
                        ytId = activeHeroUrl.split('youtu.be/')[1].split('?')[0];
                    } else if (activeHeroUrl.includes('v=')) {
                        try { ytId = new URLSearchParams(activeHeroUrl.split('?')[1]).get('v'); } catch(_) {}
                    } else if (activeHeroUrl.includes('youtube.com/embed/')) {
                        ytId = activeHeroUrl.split('youtube.com/embed/')[1].split('?')[0];
                    }
                    if (ytId) {
                        activeHeroUrl = 'https://www.youtube.com/embed/' + ytId + '?autoplay=1&mute=1&loop=1&playlist=' + ytId + '&playsinline=1&controls=0&rel=0';
                        mediaType = 'youtube';
                    }
                }

                // --- Jangan simpan blob: URL ke Firebase ---
                const safeUrl = (activeHeroUrl && activeHeroUrl.startsWith('blob:')) ? '' : (activeHeroUrl || '');

                if (!safeUrl) {
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = `<i class="fas fa-check"></i> Simpan Perubahan`;
                    }
                    alert('Harap pilih foto atau masukkan URL terlebih dahulu.');
                    return;
                }

                newValue = JSON.stringify({ mediaType: mediaType, url: safeUrl });
                try { localStorage.setItem('cms_hero_bg', newValue); } catch(e) {}
                try { await cmsVideoStore.set('cms_hero_bg', newValue); } catch(e) {}

                // Kirim ke Firebase DB agar tampil global untuk semua pengunjung
                const cmsMapping = getCMSMapping();
                const snapshot = {};
                cmsMapping.forEach(m => {
                    if (m.key === 'cms_hero_bg') snapshot[m.key] = newValue;
                    else snapshot[m.key] = localStorage.getItem(m.key) ?? "";
                });
                await saveAllCMSToFirebase(cmsMapping, snapshot);
            } else if (item.type === 'text' || item.type === 'html') {
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

            if (item.key === 'cms_stat_l' || item.key === 'cms_stat_p') {
                const elL = document.querySelector('.tkp-stats-right .tkp-stat-card:nth-child(3) h3 > span:nth-child(1) .count-up');
                const elP = document.querySelector('.tkp-stats-right .tkp-stat-card:nth-child(3) h3 > span:nth-child(2) .count-up');
                const valL = parseInt(item.key === 'cms_stat_l' ? newValue : (localStorage.getItem('cms_stat_l') || (elL ? elL.getAttribute('data-target') || elL.innerText : '331')), 10);
                const valP = parseInt(item.key === 'cms_stat_p' ? newValue : (localStorage.getItem('cms_stat_p') || (elP ? elP.getAttribute('data-target') || elP.innerText : '347')), 10);
                if (!isNaN(valL) && !isNaN(valP)) {
                    const tot = String(valL + valP);
                    try { localStorage.setItem('cms_stat_total', tot); } catch(e) {}
                    const totalItem = cmsMapping.find(m => m.key === 'cms_stat_total');
                    if (totalItem) applyCMSItemToDOM(totalItem, tot);
                }
            }

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
