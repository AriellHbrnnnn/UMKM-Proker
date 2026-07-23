const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

const oldWishlistFilled = `            <!-- Jika Wishlist Ada Isinya -->
            <div id="wishlistFilled" class="hidden" style="padding: 30px;">
                <h2 style="font-size: 1.5rem; margin-bottom: 20px; color: #31353B; font-weight: 800;">Wishlist Saya</h2>
                <div class="umkm-grid" id="wishlistGrid">
                    <!-- Diisi via JS -->
                </div>
            </div>`;

const newWishlistFilled = `            <!-- Jika Wishlist Ada Isinya (Grid Koleksi) -->
            <div id="wishlistFilled" class="hidden" style="padding: 40px;">
                <h2 style="font-size: 1.6rem; margin-bottom: 30px; color: #31353B; font-weight: 800;">Wishlist</h2>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;" id="wishlistCollectionsContainer">
                    
                    <!-- Card: Semua Wishlist -->
                    <div class="collection-card" onclick="openCollection('Semua Wishlist')" style="cursor:pointer; width: 280px;">
                        <div style="background: #f0f3f7; border-radius: 8px; height: 180px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                            <img src="https://images.tokopedia.net/img/wishlist/empty-state.png" onerror="this.src='https://assets.tokopedia.net/assets-tokopedia-lite/v2/zeus/kratos/6029515f.jpg'; this.onerror=null; this.style.display='none'" alt="Folder" style="width: 80px; opacity: 0.5;">
                            <!-- Fallback if img breaks -->
                            <div style="position:absolute; width:80px; height:80px; display:flex; align-items:center; justify-content:center; color:#ccc;">
                                <i class="fas fa-folder-open" style="font-size:4rem;"></i>
                            </div>
                        </div>
                        <h3 style="font-size: 1.1rem; color: #31353B; margin: 0 0 5px 0; font-weight: 700;">Semua Wishlist</h3>
                        <p style="font-size: 0.85rem; color: #31353B; margin: 0;">0 Barang</p>
                    </div>

                    <!-- Card: Custom Collection (Dinamo/JS akan inject ke sini, ini dummy) -->
                    <div class="collection-card" id="userCollectionCard" style="cursor:pointer; width: 280px;">
                        <div onclick="openCollection('Custom')" style="background: #f0f3f7; border-radius: 8px; height: 180px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                            <div style="width:80px; height:80px; display:flex; align-items:center; justify-content:center; color:#ccc;">
                                <i class="fas fa-folder" style="font-size:4rem;"></i>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative;">
                            <div>
                                <h3 id="cardCollectionName" style="font-size: 1.1rem; color: #31353B; margin: 0 0 5px 0; font-weight: 700;">barang</h3>
                                <p style="font-size: 0.85rem; color: #31353B; margin: 0;">0 Barang</p>
                            </div>
                            <!-- 3 dots menu -->
                            <div class="collection-menu-wrapper">
                                <button onclick="toggleCollectionMenu(event)" style="background:none; border:none; padding: 5px; cursor:pointer; color: #6D7588;">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <!-- Dropdown -->
                                <div id="collectionDropdownMenu" class="hidden" style="position: absolute; top: 30px; right: 0; background: white; border: 1px solid #E5E7E9; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-radius: 8px; width: 160px; z-index: 10;">
                                    <a href="#" onclick="openModalUbahKoleksi(); closeCollectionMenu(); return false;" style="display: block; padding: 12px 15px; color: #31353B; text-decoration: none; font-size: 0.95rem; border-bottom: 1px solid #f3f4f5;">Ubah Nama Koleksi</a>
                                    <a href="#" onclick="hapusKoleksi(); return false;" style="display: block; padding: 12px 15px; color: #31353B; text-decoration: none; font-size: 0.95rem;">Hapus Koleksi</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Card: Koleksi Baru -->
                    <div class="collection-card" onclick="openModalBuatKoleksi()" style="cursor:pointer; width: 120px;">
                        <div style="border: 2px dashed #babbbd; border-radius: 8px; height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='#f3f4f5'" onmouseout="this.style.background='transparent'">
                            <i class="fas fa-plus" style="color: #00AA5B; font-size: 1.5rem; margin-bottom: 10px;"></i>
                            <span style="color: #31353B; font-size: 0.9rem; font-weight: 600;">Koleksi Baru</span>
                        </div>
                    </div>

                </div>
            </div>`;

html = html.replace(oldWishlistFilled, newWishlistFilled);
fs.writeFileSync(indexFile, html);
console.log('Successfully updated wishlistFilled HTML for Collections Grid');
