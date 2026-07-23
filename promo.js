// Menyimpan state kategori aktif
function renderUMKM(category = currentCategory, searchQuery = '') {
    currentCategory = category;
    umkmGrid.innerHTML = '';
    
    const lowerQuery = searchQuery.toLowerCase().trim();

    const filteredData = umkmData.filter(item => {
        const matchCategory = category === 'all' || item.category === category;
        const matchSearch = item.name.toLowerCase().includes(lowerQuery) || 
                            item.desc.toLowerCase().includes(lowerQuery) ||
                            item.products.some(p => p.name.toLowerCase().includes(lowerQuery));
        return matchCategory && matchSearch;
    });

    if (filteredData.length === 0) {
        umkmGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: white; border-radius: 12px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                <h3 style="color: #334155; font-size: 1.3rem; margin-bottom: 8px;">Pencarian tidak ditemukan</h3>
                <p style="color: #64748b;">Kami tidak dapat menemukan UMKM atau produk "${searchQuery}". Coba kata kunci lain.</p>
            </div>
        `;
        return;
    }

    filteredData.forEach((umkm, index) => {
        const card = document.createElement('div');
        card.className = 'umkm-card reveal'; // Gunakan reveal untuk animasi scroll
        card.style.transitionDelay = `${(index % 4) * 0.1}s`; // Efek stagger 
        card.onclick = () => openStore(umkm.id);
        
        card.innerHTML = `
            <div class="umkm-img-wrap">
                <img src="${umkm.image}" alt="${umkm.name}">
                <div class="badge-official"><i class="fas fa-check-circle"></i> Desa Official</div>
            </div>
            <div class="umkm-info">
                <h3 class="umkm-name">${umkm.name}</h3>
                <p class="umkm-desc">${umkm.desc}</p>
                <div class="umkm-stats" style="margin-top:8px;">
                    <span><i class="fas fa-map-marker-alt text-danger"></i> ${umkm.location}</span>
                </div>
            </div>
        `;
        umkmGrid.appendChild(card);
        
        // Daftarkan ke observer agar muncul saat di-scroll
        if (typeof globalScrollObserver !== 'undefined') {
            globalScrollObserver.observe(card);
        }
    });
}

// Open Store Details
function openStore(id) {
    const umkm = umkmData.find(item => item.id === id);
    if (!umkm) return;

    // Simpan ke session storage agar toko tidak hilang saat direfresh
    sessionStorage.setItem('activeStoreId', id);

    // Toggle Pages
    switchPage('storePage');

    // Update Breadcrumb
    bcStoreName.textContent = umkm.name;

    // Reset store search input
    const storeSearchInput = document.getElementById('storeSearchInput');
    if (storeSearchInput) {
        storeSearchInput.value = '';
    }

    // Tentukan badge Official (misalnya warna hijau atau ungu khas e-commerce)
    const officialBadge = `<i class="fas fa-check-circle" style="color: #6a1b9a; font-size: 1rem;"></i>`;

    // Render Store Info Sidebar (Tokopedia Style)
    storeInfoCard.innerHTML = `
        <img src="${umkm.image}" alt="${umkm.name}" class="store-avatar">
        <h2>${officialBadge} ${umkm.name}</h2>
        <p class="online-status">Online 5 Menit Lalu</p>
        <p class="store-location"><i class="fas fa-map-marker-alt"></i> ${umkm.location}</p>
        
        <div class="store-action-buttons">
            <button class="btn-follow" id="btnFollow_${umkm.id}" onclick="toggleFollow('${umkm.id}', '${umkm.name}', '${umkm.image}', event)" ${followedShops.some(s => s.id === umkm.id) ? 'style="background: #f3f4f5; color: #6D7588; border-color: #E5E7E9;"' : ''}>${followedShops.some(s => s.id === umkm.id) ? 'Mengikuti' : 'Ikuti'}</button>
            <button class="btn-chat-outline" onclick="requireAuthForChat && requireAuthForChat('${umkm.whatsapp}', '${umkm.owner}')">Chat</button>
        </div>

        <p style="font-size:0.8rem; text-align:left; margin-top:15px; color:var(--text-muted); line-height: 1.4;">
            ${umkm.desc}
        </p>
    `;
    storeInfoCard.classList.add('reveal');
    if (typeof globalScrollObserver !== 'undefined') {
        globalScrollObserver.observe(storeInfoCard);
    }
    
    // Fungsi render produk terfilter
    const renderProducts = (filteredProducts) => {
        productGrid.innerHTML = '';
        if (filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: white; border-radius: 12px; border: 1px solid var(--border);">
                    <i class="fas fa-search" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 10px;"></i>
                    <h4 style="color: #334155; margin-bottom: 5px;">Produk tidak ditemukan</h4>
                    <p style="color: #64748b; font-size: 0.85rem;">Tidak ada produk di toko ini yang cocok dengan pencarian Anda.</p>
                </div>
            `;
            return;
        }
        filteredProducts.forEach((product, index) => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card reveal';
            productCard.style.transitionDelay = `${(index % 4) * 0.1}s`;
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="prod-img">
                <div class="prod-info">
                    <h3 class="prod-name">${product.name}</h3>
                    <p class="prod-price">Rp ${product.price.toLocaleString('id-ID')}</p>
                    <div class="prod-shop">
                        <i class="fas fa-check-circle" style="color:#00AA5B;"></i> ${umkm.location}
                    </div>
                </div>
            `;
            productCard.onclick = () => {
                openProductDetail(umkm.id, index);
            };
            productGrid.appendChild(productCard);
            if (typeof globalScrollObserver !== 'undefined') {
                globalScrollObserver.observe(productCard);
            }
        });
    };

    // Render Awal produk
    renderProducts(umkm.products);

    // Setup input handler
    if (storeSearchInput) {
        storeSearchInput.oninput = (e) => {
            const keyword = e.target.value.toLowerCase().trim();
            const filtered = umkm.products.filter(product =>
                product.name.toLowerCase().includes(keyword) ||
                (product.desc && product.desc.toLowerCase().includes(keyword))
            );
            renderProducts(filtered);
        };
    }

    // Render Ulasan (Dummy) - dengan null check
    if (ulasanContainer) { ulasanContainer.innerHTML = `
        <div style="border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:15px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <img src="https://ui-avatars.com/api/?name=Budi&background=random" style="width:30px; border-radius:50%;">
                <strong style="font-size:0.9rem;">Budi Warga RT 02</strong>
                <span class="rating" style="font-size:0.8rem;"><i class="fas fa-star"></i> 5.0</span>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted);">Sangat memuaskan! Kualitas pelayanan dari ${umkm.name} selalu juara. Pengirimannya juga cepat.</p>
        </div>
        <div style="border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:15px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                <img src="https://ui-avatars.com/api/?name=Ani&background=random" style="width:30px; border-radius:50%;">
                <strong style="font-size:0.9rem;">Ani (Pembeli Luar Desa)</strong>
                <span class="rating" style="font-size:0.8rem;"><i class="fas fa-star"></i> ${umkm.rating}</span>
            </div>
            <p style="font-size:0.85rem; color:var(--text-muted);">Barang sesuai dengan deskripsi. Sangat merekomendasikan untuk belanja di toko UMKM ini.</p>
        </div>
    `; } // end if(ulasanContainer)


    // Render Galeri (Dummy)
    if (galeriContainer) {
        galeriContainer.innerHTML = `
            <div class="product-card" style="border:none; box-shadow:none;">
                <img src="${umkm.image}" class="prod-img" style="border-radius:var(--radius-sm); cursor:pointer;">
            </div>
            <div class="product-card" style="border:none; box-shadow:none;">
                <img src="https://picsum.photos/id/20/300/300" class="prod-img" style="border-radius:var(--radius-sm); cursor:pointer;">
            </div>
            <div class="product-card" style="border:none; box-shadow:none;">
                <img src="https://picsum.photos/id/40/300/300" class="prod-img" style="border-radius:var(--radius-sm); cursor:pointer;">
            </div>
        `;
    }

    // Reset tab active ke Produk
    storeTabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.add('hidden'));
    storeTabBtns[0].classList.add('active'); // Tombol Produk
    document.getElementById('tabProduk').classList.remove('hidden');
}

// ======================= CART LOGIC =======================
function saveCart() {
    localStorage.setItem('umkm_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    let totalItems = 0;
    Object.values(cart).forEach(storeItems => {
        Object.values(storeItems.items).forEach(item => { totalItems += item.qty; });
    });
    if(cartBadgeCount) {
        cartBadgeCount.textContent = totalItems;
        cartBadgeCount.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
    if(cartIconBtn) {
        if(currentUser) {
            cartIconBtn.classList.remove('hidden');
        } else {
            cartIconBtn.classList.add('hidden');
        }
    }
} // { storeId: { prodId: boolean } }

// Ensure checked items state is clean
function syncCheckedItems() {
    for (const storeId in cart) {
        if (!checkedCartItems[storeId]) checkedCartItems[storeId] = {};
        for (const prodId in cart[storeId].items) {
            if (checkedCartItems[storeId][prodId] === undefined) {
                checkedCartItems[storeId][prodId] = true; // default checked
            }
        }
    }
}

function updateCartSummary() {
    let totalCheckedItems = 0;
    let grandTotal = 0;
    let activeStores = 0;
    let lastActiveStore = null;

    for (const storeId in cart) {
        let hasCheckedInStore = false;
        for (const prodId in cart[storeId].items) {
            if (checkedCartItems[storeId] && checkedCartItems[storeId][prodId]) {
                const item = cart[storeId].items[prodId];
                totalCheckedItems += item.qty;
                grandTotal += (item.price * item.qty);
                hasCheckedInStore = true;
            }
        }
        if(hasCheckedInStore) {
            activeStores++;
            lastActiveStore = storeId;
        }
    }

    if(cartSummaryItemCount) cartSummaryItemCount.textContent = totalCheckedItems;
    if(cartSummaryTotal) cartSummaryTotal.textContent = 'Rp ' + grandTotal.toLocaleString('id-ID');
    if(cartSummaryGrandTotal) cartSummaryGrandTotal.textContent = 'Rp ' + grandTotal.toLocaleString('id-ID');
    
    if(cartCheckoutBtn) {
        if (totalCheckedItems === 0) {
            cartCheckoutBtn.disabled = true;
            cartCheckoutBtn.style.opacity = '0.5';
            cartCheckoutBtn.onclick = null;
        } else {
            cartCheckoutBtn.disabled = false;
            cartCheckoutBtn.style.opacity = '1';
            cartCheckoutBtn.onclick = () => {
                if (activeStores > 1) {
                    alert("Maaf, checkout via WhatsApp hanya bisa dilakukan untuk 1 UMKM dalam satu waktu. Silakan centang produk dari 1 toko saja.");
                    return;
                }
                checkoutStore(lastActiveStore);
            };
        }
    }
}

function renderCartPage() {
    if(!cartPageItemsContainer) return;
    cartPageItemsContainer.innerHTML = '';
    syncCheckedItems();
    
    if (Object.keys(cart).length === 0) {
        cartPageItemsContainer.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:white; border-radius:8px; border:1px solid #f0f0f0;">
                <i class="fas fa-shopping-cart" style="font-size:4rem; margin-bottom:20px; color:#ddd;"></i>
                <h3 style="color:#666;">Wah, keranjang belanjamu kosong</h3>
                <p style="color:#999; margin-top:10px;">Yuk, isi dengan barang-barang UMKM yang menarik!</p>
                <button class="btn-primary" onclick="switchPage('homePage')" style="margin-top:20px; padding:10px 20px; border-radius:8px;">Belanja Sekarang</button>
            </div>
        `;
        updateCartSummary();
        return;
    }
    
    for (const storeId in cart) {
        const store = cart[storeId];
        const storeGroup = document.createElement('div');
        storeGroup.className = 'cart-page-store';
        
        // Cek apakah semua produk di toko ini dicentang
        let allChecked = true;
        for (const prodId in store.items) {
            if (!checkedCartItems[storeId][prodId]) allChecked = false;
        }

        let itemsHTML = '';
        for (const prodId in store.items) {
            const item = store.items[prodId];
            const isChecked = checkedCartItems[storeId][prodId];
            itemsHTML += `
                <div class="cart-page-item">
                    <input type="checkbox" class="custom-checkbox item-checkbox" data-store="${storeId}" data-prod="${prodId}" ${isChecked ? 'checked' : ''} onchange="toggleCartItem('${storeId}', '${prodId}', this.checked)">
                    <img src="${item.image}" alt="${item.name}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid #eee;">
                    <div class="cart-item-details-full">
                        <div style="font-weight:600; font-size:1.1rem; margin-bottom:5px;">${item.name}</div>
                        <div style="font-weight:bold; color:var(--text-color); margin-bottom:15px;">Rp ${item.price.toLocaleString('id-ID')}</div>
                        <div style="display:flex; justify-content:flex-end; align-items:center; gap:15px;">
                            <button onclick="removeCartItem('${storeId}', '${prodId}')" style="background:none; border:none; color:#888; cursor:pointer; font-size:1.1rem;"><i class="fas fa-trash"></i></button>
                            <div class="cart-qty-control">
                                <button class="cart-qty-btn" onclick="updateCartQty('${storeId}', '${prodId}', -1)">-</button>
                                <input type="text" class="cart-qty-input" value="${item.qty}" readonly>
                                <button class="cart-qty-btn" onclick="updateCartQty('${storeId}', '${prodId}', 1)">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        storeGroup.innerHTML = `
            <div class="cart-page-header">
                <input type="checkbox" class="custom-checkbox store-checkbox" data-store="${storeId}" ${allChecked ? 'checked' : ''} onchange="toggleStoreItems('${storeId}', this.checked)">
                <i class="fas fa-store" style="color:#f44336;"></i> ${store.storeName}
            </div>
            ${itemsHTML}
        `;
        cartPageItemsContainer.appendChild(storeGroup);
    }
    updateCartSummary();
}

window.toggleStoreItems = function(storeId, checked) {
    if(!checkedCartItems[storeId]) checkedCartItems[storeId] = {};
    if(cart[storeId]) {
        for (const prodId in cart[storeId].items) {
            checkedCartItems[storeId][prodId] = checked;
        }
    }
    renderCartPage();
};

window.updateCartQty = function(storeId, prodId, change) {
    if (cart[storeId] && cart[storeId].items[prodId]) {
        cart[storeId].items[prodId].qty += change;
        if (cart[storeId].items[prodId].qty <= 0) { delete cart[storeId].items[prodId]; }
        if (Object.keys(cart[storeId].items).length === 0) { delete cart[storeId]; }
        saveCart();
        renderCartPage();
    }
};

window.removeCartItem = function(storeId, prodId) {
    if (cart[storeId] && cart[storeId].items[prodId]) {
        delete cart[storeId].items[prodId];
        if (Object.keys(cart[storeId].items).length === 0) { delete cart[storeId]; }
        saveCart();
        renderCartPage();
    }
};

window.checkoutStore = function(storeId) {
    const store = cart[storeId];
    if (!store || !currentUser) return;
    
    const userName = currentUser.displayName || 'Pelanggan';
    let text = `Halo *${store.storeName}*,\nSaya ${userName} ingin memesan dari Pasar Desa Karanganyar:\n\n`;
    
    let total = 0; let i = 1;
    for (const prodId in store.items) {
        if(checkedCartItems[storeId] && checkedCartItems[storeId][prodId]) {
            const item = store.items[prodId];
            total += item.price * item.qty;
            text += `${i}. ${item.name} (${item.qty}x) - Rp ${(item.price * item.qty).toLocaleString('id-ID')}\n`;
            i++;
        }
    }
    
    text += `\n*Total Pesanan: Rp ${total.toLocaleString('id-ID')}*\n\nMohon informasikan ketersediaan dan ongkos kirim. Terima kasih!`;
    window.open(`https://wa.me/${store.storeWhatsapp}?text=${encodeURIComponent(text)}`, '_blank');
};

if(cartIconBtn) {
    cartIconBtn.addEventListener('click', () => {
        renderCartPage();
        switchPage('cartPage');
    });
}

// Using global addToCart from script.js
// (PDP functions ada di script.js)
