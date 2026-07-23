// admin_cms.js - Standalone CMS & Admin Edit Detector
(function() {
    // 1. Apply saved CMS data from localStorage on all page loads
    function applySavedCMSData() {
        const cmsMapping = [
            { selector: '.tkp-hero h1', type: 'html', key: 'cms_hero_title', label: 'Judul Hero' },
            { selector: '.tkp-hero p', type: 'text', key: 'cms_hero_desc', label: 'Deskripsi Hero' },
            { selector: '.tkp-challenge .tkp-section-title', type: 'text', key: 'cms_tantangan_title', label: 'Judul Tantangan' },
            { selector: '.tkp-challenge .tkp-section-desc', type: 'html', key: 'cms_tantangan_desc', label: 'Deskripsi Tantangan' },
            { selector: 'iframe[src*="google.com/maps"], .tkp-map-container iframe', type: 'iframe', key: 'cms_map_url', label: 'URL Titik Google Maps' },
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
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) .count-up:nth-of-type(1), .tkp-stat-item:nth-child(3) h3 span:nth-of-type(1)', type: 'number', key: 'cms_stat_l', label: 'Penduduk Laki-laki', attr: 'data-target' },
            { selector: '.tkp-stats-right .tkp-stat-card:nth-child(3) .count-up:nth-of-type(2), .tkp-stat-item:nth-child(3) h3 span:nth-of-type(2)', type: 'number', key: 'cms_stat_p', label: 'Penduduk Perempuan', attr: 'data-target' },
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
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) h2', type: 'text', key: 'cms_kehidupan_title', label: 'Judul Kehidupan' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) li:nth-child(1) div', type: 'html', key: 'cms_kehidupan_1', label: 'Poin Kehidupan 1' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) li:nth-child(2) div', type: 'html', key: 'cms_kehidupan_2', label: 'Poin Kehidupan 2' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(1) li:nth-child(3) div', type: 'html', key: 'cms_kehidupan_3', label: 'Poin Kehidupan 3' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) h2', type: 'text', key: 'cms_budaya_title', label: 'Judul Budaya' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) li:nth-child(1) div', type: 'html', key: 'cms_budaya_1', label: 'Poin Budaya 1' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) li:nth-child(2) div', type: 'html', key: 'cms_budaya_2', label: 'Poin Budaya 2' },
            { selector: '#tentangPage > section:nth-of-type(5) > div > div > div:nth-child(2) li:nth-child(3) div', type: 'html', key: 'cms_budaya_3', label: 'Poin Budaya 3' },
            { selector: 'iframe[src*="youtube.com"], iframe[src*="youtu.be"]', type: 'iframe', key: 'cms_video_url', label: 'URL Link Video YouTube' },
            { selector: '#tentangPage > section:nth-of-type(7) h2', type: 'text', key: 'cms_galeri_title', label: 'Judul Galeri' },
            { selector: '.tkp-gal-1', type: 'image', key: 'cms_galeri_img_1', label: 'Foto Galeri 1' },
            { selector: '.tkp-gal-2', type: 'image', key: 'cms_galeri_img_2', label: 'Foto Galeri 2' },
            { selector: '.tkp-gal-3', type: 'image', key: 'cms_galeri_img_3', label: 'Foto Galeri 3' },
            { selector: '.tkp-gal-4', type: 'image', key: 'cms_galeri_img_4', label: 'Foto Galeri 4' },
            { selector: '.tkp-gal-5', type: 'image', key: 'cms_galeri_img_5', label: 'Foto Galeri 5' }
        ];

        cmsMapping.forEach(item => {
            const savedVal = localStorage.getItem(item.key);
            if (savedVal) {
                const el = document.querySelector(item.selector);
                if (el) {
                    if (item.type === 'text') el.innerText = savedVal;
                    else if (item.type === 'html') el.innerHTML = savedVal;
                    else if (item.type === 'image' || item.type === 'iframe') el.src = savedVal;
                    else if (item.type === 'number') {
                        if (item.attr) el.setAttribute(item.attr, savedVal);
                        el.innerText = savedVal;
                    }
                }
            }
        });

        return cmsMapping;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySavedCMSData);
    } else {
        applySavedCMSData();
    }

    // 2. DETEKSI MODE ADMIN (Halaman di dalam iframe ATAU URL memuat mode=admin)
    const isInsideIframe = window.self !== window.top;
    const isUrlAdmin = window.location.search.includes('mode=admin');
    const isAdmin = isInsideIframe || isUrlAdmin;

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
            const cmsMapping = applySavedCMSData();

            cmsMapping.forEach(item => {
                const el = document.querySelector(item.selector);
                if (el) {
                    if (el.tagName.toLowerCase() === 'iframe') {
                        // Math pointer-events: none agar iframe tidak menyerap klik (peta tidak zoom, video tidak play)
                        el.style.pointerEvents = 'none';

                        const parent = el.parentElement;
                        if (parent) {
                            if (getComputedStyle(parent).position === 'static') {
                                parent.style.position = 'relative';
                            }
                            
                            let wrapper = parent.querySelector('.cms-iframe-overlay');
                            if (!wrapper) {
                                wrapper = document.createElement('div');
                                wrapper.className = 'cms-iframe-overlay cms-editable';
                                wrapper.style.position = 'absolute';
                                wrapper.style.top = '0';
                                wrapper.style.left = '0';
                                wrapper.style.width = '100%';
                                wrapper.style.height = '100%';
                                wrapper.style.zIndex = '999999';
                                wrapper.style.cursor = 'pointer';
                                wrapper.style.display = 'flex';
                                wrapper.style.alignItems = 'center';
                                wrapper.style.justifyContent = 'center';
                                wrapper.style.background = 'rgba(46, 125, 50, 0.1)';
                                wrapper.style.border = '2px dashed #2e7d32';
                                wrapper.style.borderRadius = '12px';
                                wrapper.title = `Klik untuk mengedit ${item.label}`;

                                wrapper.innerHTML = `
                                    <div style="background: #2e7d32; color: #ffffff; padding: 12px 24px; border-radius: 30px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 8px; font-family: 'Poppins', sans-serif;">
                                        ✏️ Edit ${item.label}
                                    </div>
                                `;

                                parent.appendChild(wrapper);
                            }
                            
                            wrapper.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openEditor(el, item);
                            };
                        }
                    } else {
                        el.classList.add('cms-editable');
                        el.title = `Klik untuk mengedit ${item.label}`;
                        
                        el.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEditor(el, item);
                        };
                    }
                }
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', enableEditing);
        } else {
            setTimeout(enableEditing, 300);
        }
    }

    let activeEditor = null;

    function openEditor(el, item) {
        if (activeEditor) {
            activeEditor.remove();
            activeEditor = null;
        }

        let currentValue = '';
        if (item.type === 'text') currentValue = el.innerText;
        else if (item.type === 'html') currentValue = el.innerHTML;
        else if (item.type === 'image' || item.type === 'iframe') currentValue = el.src || '';
        else if (item.type === 'number') currentValue = el.getAttribute(item.attr) || el.innerText;

        const editor = document.createElement('div');
        editor.className = 'cms-editor-container';
        
        let inputHtml = '';
        if (item.type === 'text' || item.type === 'html') {
            inputHtml = `<textarea rows="4">${currentValue}</textarea>`;
        } else if (item.type === 'image') {
            inputHtml = `
                <input type="text" placeholder="URL Gambar (atau pilih file)" value="${currentValue}">
                <input type="file" accept="image/*" style="font-size: 12px; margin-top: 5px;">
            `;
        } else {
            inputHtml = `<input type="${item.type === 'number' ? 'number' : 'text'}" value="${currentValue}">`;
        }

        editor.innerHTML = `
            <div style="font-size: 13px; font-weight: bold; color: #2e7d32;">Edit ${item.label || 'Elemen'}</div>
            ${inputHtml}
            <div class="cms-editor-actions">
                <button class="cms-btn cms-btn-cancel">Batal</button>
                <button class="cms-btn cms-btn-save">Simpan</button>
            </div>
        `;

        el.parentNode.insertBefore(editor, el.nextSibling);
        el.style.display = 'none';
        activeEditor = editor;

        if (item.type === 'image') {
            const fileInput = editor.querySelector('input[type="file"]');
            const textInput = editor.querySelector('input[type="text"]');
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        textInput.value = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        editor.querySelector('.cms-btn-cancel').addEventListener('click', () => {
            el.style.display = '';
            editor.remove();
            activeEditor = null;
        });

        editor.querySelector('.cms-btn-save').addEventListener('click', () => {
            let newValue = '';
            if (item.type === 'text' || item.type === 'html') {
                newValue = editor.querySelector('textarea').value;
            } else if (item.type === 'image') {
                newValue = editor.querySelector('input[type="text"]').value;
            } else {
                newValue = editor.querySelector('input').value.trim();
                
                if (item.type === 'iframe') {
                    const srcMatch = newValue.match(/srcs*=s*["']([^"']+)["']/i);
                    if (srcMatch && srcMatch[1]) {
                        newValue = srcMatch[1];
                    }
                    if (newValue.includes('youtube.com/embed/')) {
                        newValue = newValue.split('?')[0];
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
                }
            }

            try {
                localStorage.setItem(item.key, newValue);
            } catch(e) {}

            if (item.type === 'text') {
                el.innerText = newValue;
            } else if (item.type === 'html') {
                el.innerHTML = newValue;
            } else if (item.type === 'image') {
                el.src = newValue;
            } else if (item.type === 'iframe') {
                const newIframe = document.createElement('iframe');
                newIframe.width = el.width || '100%';
                newIframe.height = el.height || '550';
                newIframe.src = newValue;
                newIframe.title = el.title || 'Video';
                newIframe.frameBorder = '0';
                newIframe.allow = el.allow || 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                newIframe.allowFullscreen = true;
                newIframe.className = el.className;
                newIframe.style.cssText = el.style.cssText;
                el.parentNode.replaceChild(newIframe, el);
                el = newIframe;
            } else if (item.type === 'number') {
                if (item.attr) el.setAttribute(item.attr, newValue);
                el.innerText = newValue;

                // Auto calculate Total Penduduk if Laki-laki or Perempuan edited
                if (item.key === 'cms_stat_l' || item.key === 'cms_stat_p') {
                    const valL = parseInt(localStorage.getItem('cms_stat_l') || '331', 10);
                    const valP = parseInt(localStorage.getItem('cms_stat_p') || '347', 10);
                    const totalJiwa = valL + valP;
                    localStorage.setItem('cms_stat_total', totalJiwa);
                    
                    const totalEl = document.querySelector('.tkp-stats-right .tkp-stat-card:nth-child(3) .count-up:nth-of-type(3)');
                    if (totalEl) {
                        totalEl.setAttribute('data-target', totalJiwa);
                        totalEl.innerText = totalJiwa;
                    }
                }
            }

            if (typeof window.triggerCountUpAnimation === 'function') {
                window.triggerCountUpAnimation();
            }

            el.style.display = '';
            editor.remove();
            activeEditor = null;
            
            const toast = document.createElement('div');
            toast.innerText = 'Perubahan disimpan!';
            toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#2e7d32; color:white; padding:10px 20px; border-radius:4px; z-index:9999; box-shadow:0 4px 6px rgba(0,0,0,0.1);';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        });
    }
})();
