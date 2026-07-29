// admin_loader.js - Isolated Admin CMS Loader
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

    const CMS_FIREBASE_DB_URL = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/cms_profile.json";

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

    async function fetchCMSFromFirebase() {
        try {
            const res = await fetch(CMS_FIREBASE_DB_URL);
            if (!res.ok) return null;
            const data = await res.json();
            return (data && typeof data === 'object') ? data : null;
        } catch (_) {
            return null;
        }
    }

    // 1. Aplikasikan data CMS yang tersimpan di Firebase DB / IndexedDB / localStorage ke elemen DOM
    async function applySavedCMSData() {
        const cmsMapping = [
            { selector: '.tkp-hero', type: 'hero_bg', key: 'cms_hero_bg' },
            { selector: '.tkp-hero h1', type: 'html', key: 'cms_hero_title' },
            { selector: '.tkp-hero p', type: 'text', key: 'cms_hero_desc' },
            { selector: '.tkp-challenge .tkp-section-title', type: 'text', key: 'cms_tantangan_title' },
            { selector: '.tkp-challenge .tkp-section-desc', type: 'html', key: 'cms_tantangan_desc' },
            { selector: '.tkp-map-container iframe', type: 'iframe', key: 'cms_map_url' },
            { selector: '.tkp-map-img-container', type: 'image', key: 'cms_map_custom_image' },
            { selector: '.water-map-img-wrapper', type: 'image', key: 'cms_peta_sumber_air' },
            { selector: '.tkp-mission-text h2', type: 'text', key: 'cms_sejarah_title' },
            { selector: '.tkp-collage-img1', type: 'image', key: 'cms_img_sejarah_1' },
            { selector: '.tkp-collage-img2', type: 'image', key: 'cms_img_sejarah_2' },
            { selector: '.tkp-collage-img3', type: 'image', key: 'cms_img_sejarah_3' },
            { selector: '.tkp-mission-text p:nth-of-type(1)', type: 'html', key: 'cms_sejarah_1' },
            { selector: '.tkp-mission-text p:nth-of-type(2)', type: 'html', key: 'cms_sejarah_2' },
            { selector: '.tkp-mission-text p:nth-of-type(3)', type: 'html', key: 'cms_sejarah_3' },
            { selector: '.tkp-stats-left h2', type: 'text', key: 'cms_data_title' },
            { selector: '.tkp-stat-item:nth-child(1) h3 span:nth-child(1)', type: 'number', key: 'cms_stat_rt', attr: 'data-target' },
            { selector: '.tkp-stat-item:nth-child(1) h3 span:nth-child(2)', type: 'number', key: 'cms_stat_rw', attr: 'data-target' },
            { selector: '.tkp-stat-item:nth-child(2) h3 span', type: 'number', key: 'cms_stat_kk', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) h3 > span:nth-child(1) .count-up, .tkp-stat-item:nth-child(3) h3 span:nth-child(1) .count-up', type: 'number', key: 'cms_stat_l', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) h3 > span:nth-child(2) .count-up, .tkp-stat-item:nth-child(3) h3 span:nth-child(2) .count-up', type: 'number', key: 'cms_stat_p', attr: 'data-target' },
            { selector: '.tkp-stat-item:nth-child(4) > div > div:nth-child(1) > div:nth-child(2)', type: 'text', key: 'cms_batas_u' },
            { selector: '.tkp-stat-item:nth-child(4) > div > div:nth-child(2) > div:nth-child(2)', type: 'text', key: 'cms_batas_s' },
            { selector: '.tkp-stat-item:nth-child(4) > div > div:nth-child(3) > div:nth-child(2)', type: 'text', key: 'cms_batas_t' },
            { selector: '.tkp-stat-item:nth-child(4) > div > div:nth-child(4) > div:nth-child(2)', type: 'text', key: 'cms_batas_b' },
            { selector: '.tkp-features .tkp-section-title', type: 'text', key: 'cms_potensi_title' },
            { selector: '.tkp-feature-card:nth-child(1) h3', type: 'text', key: 'cms_potensi_1_t' },
            { selector: '.tkp-feature-card:nth-child(1) p', type: 'html', key: 'cms_potensi_1_d' },
            { selector: '.tkp-feature-card:nth-child(2) h3', type: 'text', key: 'cms_potensi_2_t' },
            { selector: '.tkp-feature-card:nth-child(2) p', type: 'html', key: 'cms_potensi_2_d' },
            { selector: '.tkp-feature-card:nth-child(3) h3', type: 'text', key: 'cms_potensi_3_t' },
            { selector: '.tkp-feature-card:nth-child(3) p', type: 'html', key: 'cms_potensi_3_d' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) h2', type: 'text', key: 'cms_kehidupan_title' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) li:nth-child(1) div', type: 'html', key: 'cms_kehidupan_1' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) li:nth-child(2) div', type: 'html', key: 'cms_kehidupan_2' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) li:nth-child(3) div', type: 'html', key: 'cms_kehidupan_3' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) h2', type: 'text', key: 'cms_budaya_title' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) li:nth-child(1) div', type: 'html', key: 'cms_budaya_1' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) li:nth-child(2) div', type: 'html', key: 'cms_budaya_2' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) li:nth-child(3) div', type: 'html', key: 'cms_budaya_3' },
            { selector: '#tentangPage > section:nth-of-type(6) h2', type: 'text', key: 'cms_video_title' },
            { selector: '#tentangPage > section:nth-of-type(6) iframe', type: 'iframe', key: 'cms_video_url' },
            { selector: '#tentangPage > section:nth-of-type(7) h2', type: 'text', key: 'cms_galeri_title' },
            { selector: '.tkp-gal-1', type: 'image', key: 'cms_galeri_img_1' },
            { selector: '.tkp-gal-2', type: 'image', key: 'cms_galeri_img_2' },
            { selector: '.tkp-gal-3', type: 'image', key: 'cms_galeri_img_3' },
            { selector: '.tkp-gal-4', type: 'image', key: 'cms_galeri_img_4' },
            { selector: '.tkp-gal-5', type: 'image', key: 'cms_galeri_img_5' },
            { selector: '.tkp-gal-6', type: 'image', key: 'cms_galeri_img_6' }
        ];

        // Tarik data terbaru dari Firebase Realtime DB
        const fbSnapshot = await fetchCMSFromFirebase();
        if (fbSnapshot) {
            for (const item of cmsMapping) {
                if (fbSnapshot[item.key] != null && fbSnapshot[item.key] !== "") {
                    if (item.key === 'cms_hero_bg') {
                        await cmsVideoStore.set('cms_hero_bg', fbSnapshot[item.key]);
                    }
                    try { localStorage.setItem(item.key, fbSnapshot[item.key]); } catch (e) {}
                }
            }
        }

        for (const item of cmsMapping) {
            let savedVal = localStorage.getItem(item.key);
            if (item.type === 'hero_bg') {
                const idbHero = await cmsVideoStore.get('cms_hero_bg');
                if (idbHero) savedVal = idbHero;
            }
            if (savedVal) {
                const el = document.querySelector(item.selector);
                if (el) {
                    if (item.type === 'text') el.innerText = savedVal;
                    else if (item.type === 'html') el.innerHTML = sanitizeBasicHtml(savedVal);
                    else if (item.type === 'image' || item.type === 'iframe') {
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
                            const safeFrameUrl = sanitizeAssetUrl(savedVal, 'iframe');
                            if (iframe && safeFrameUrl) iframe.src = safeFrameUrl;
                        } else {
                            const targetImg = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
                            const safeImageUrl = sanitizeAssetUrl(savedVal, 'image');
                            if (targetImg) targetImg.src = safeImageUrl;
                            else el.src = safeImageUrl;
                        }
                    }
                    else if (item.type === 'hero_bg') {
                        await applyHeroBgToDOM(el, savedVal);
                    }
                    else if (item.type === 'number') {
                        if (item.attr) el.setAttribute(item.attr, savedVal);
                        el.innerText = savedVal;
                    }
                }
            }
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySavedCMSData);
    } else {
        applySavedCMSData();
    }

    // 2. Deteksi parameter mode=admin di URL atau iframe child di admin tab
    const urlParams = new URLSearchParams(window.location.search);
    const isIframeChild = (window.parent && window.parent !== window);
    const isAdminMode = (urlParams.get('mode') === 'admin' || isIframeChild) && hasActiveAdminSession();

    if (isAdminMode) {
        console.log('Admin CMS Mode Activated');

        // Suntikkan CSS agresif untuk menyembunyikan header/footer utama dan menampilkan khusus tentangPage
        const style = document.createElement('style');
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
        `;
        document.head.appendChild(style);

        const initAdminPage = () => {
            if (typeof switchPage === 'function') {
                switchPage('tentangPage');
            } else {
                const tentang = document.getElementById('tentangPage');
                if (tentang) tentang.classList.remove('hidden');
            }
            if (!document.getElementById('adminCmsScript')) {
                const script = document.createElement('script');
                script.id = 'adminCmsScript';
                script.src = 'admin_cms.js?v=' + Date.now();
                document.body.appendChild(script);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAdminPage);
        } else {
            initAdminPage();
        }
    }
})();
