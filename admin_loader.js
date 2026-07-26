// admin_loader.js - Isolated Admin CMS Loader
(function() {
    // 1. Aplikasikan data CMS yang tersimpan di localStorage ke elemen DOM
    function applySavedCMSData() {
        const cmsMapping = [
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
            { selector: '.tkp-stat-item:nth-child(3) h3 span:nth-of-type(1)', type: 'number', key: 'cms_stat_l', attr: 'data-target' },
            { selector: '.tkp-stat-item:nth-child(3) h3 span:nth-of-type(2)', type: 'number', key: 'cms_stat_p', attr: 'data-target' },
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

        cmsMapping.forEach(item => {
            const savedVal = localStorage.getItem(item.key);
            if (savedVal) {
                const el = document.querySelector(item.selector);
                if (el) {
                    if (item.type === 'text') el.innerText = savedVal;
                    else if (item.type === 'html') el.innerHTML = savedVal;
                    else if (item.type === 'image' || item.type === 'iframe') {
                        if (item.key === 'cms_map_custom_image') {
                            const imgCustom = document.getElementById('mapCustomImage');
                            if (imgCustom) imgCustom.src = savedVal;
                            
                            const ph = document.getElementById('mapImgPlaceholder');
                            if (ph) ph.style.display = 'none';
                        } else if (item.key === 'cms_peta_sumber_air') {
                            const imgWater = document.getElementById('petaSumberAirImg');
                            if (imgWater) imgWater.src = savedVal;
                        } else if (item.type === 'iframe') {
                            const iframe = el.tagName.toLowerCase() === 'iframe' ? el : el.querySelector('iframe');
                            if (iframe) iframe.src = savedVal;
                        } else {
                            const targetImg = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
                            if (targetImg) targetImg.src = savedVal;
                            else el.src = savedVal;
                        }
                    }
                    else if (item.type === 'number') {
                        if (item.attr) el.setAttribute(item.attr, savedVal);
                        el.innerText = savedVal;
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySavedCMSData);
    } else {
        applySavedCMSData();
    }

    // 2. Deteksi parameter mode=admin di URL
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminMode = urlParams.get('mode') === 'admin';

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
