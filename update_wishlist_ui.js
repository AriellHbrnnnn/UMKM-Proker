const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

const oldEmptyState = `<div id="wishlistEmpty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500px; background: url('https://images.tokopedia.net/img/wishlist/empty-state.png') center/cover no-repeat; border-radius: 8px;">
                <div style="background: rgba(255,255,255,0.9); padding: 30px; border-radius: 12px; text-align: left; max-width: 500px; margin-right: auto; margin-left: 50px;">
                    <h1 style="font-size: 2.2rem; margin-bottom: 15px; color: #31353B;">Wishlist</h1>
                    <p style="font-size: 1.1rem; color: #31353B; margin-bottom: 30px; line-height: 1.5;">Simpan barang-barang yang kamu suka buat dibeli nanti. Yuk, mulai isi Wishlist kamu!</p>
                    <button class="btn-primary" onclick="switchPage('homePage')" style="padding: 12px 40px; font-weight: 700; width: 100%; max-width: 250px; font-size: 1rem; margin-bottom: 15px;">Cari Barang</button>
                    <button style="padding: 12px 40px; font-weight: 700; width: 100%; max-width: 250px; font-size: 1rem; background: white; border: 1px solid var(--primary); color: var(--primary); border-radius: 8px; cursor: pointer; transition: background 0.3s;" onmouseover="this.style.background='#f3fff4'" onmouseout="this.style.background='white'">Buat Koleksi</button>
                </div>
            </div>`;

const newEmptyState = `<div id="wishlistEmpty">
                <div id="wishlistEmptyBanner" style="display: flex; align-items: center; justify-content: space-between; height: 350px; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 12px 12px 0 0; padding: 40px; position: relative; overflow: hidden;">
                    <div style="background: rgba(255,255,255,0.95); padding: 30px; border-radius: 12px; text-align: left; max-width: 450px; z-index: 2; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-left: 20px;">
                        <h1 style="font-size: 2.2rem; margin-bottom: 15px; color: #31353B; font-weight: 800;">Wishlist</h1>
                        <p style="font-size: 1.05rem; color: #6D7588; margin-bottom: 25px; line-height: 1.5;">Simpan barang-barang yang kamu suka buat dibeli nanti. Yuk, mulai isi Wishlist kamu!</p>
                        <div style="display: flex; gap: 15px;">
                            <button class="btn-primary" onclick="switchPage('homePage')" style="padding: 12px 30px; font-weight: 700; width: 100%; font-size: 0.95rem;">Cari Barang</button>
                            <button style="padding: 12px 30px; font-weight: 700; width: 100%; font-size: 0.95rem; background: white; border: 1px solid var(--primary); color: var(--primary); border-radius: 8px; cursor: pointer; transition: background 0.3s;" onmouseover="this.style.background='#f3fff4'" onmouseout="this.style.background='white'">Buat Koleksi</button>
                        </div>
                    </div>

                    <!-- Decorative Illustration on the right -->
                    <div style="position: absolute; right: 50px; bottom: -20px; z-index: 1; display: flex; align-items: flex-end;">
                        <i class="fas fa-shopping-bag" style="font-size: 18rem; color: rgba(0,170,91,0.15); transform: rotate(-15deg);"></i>
                        <i class="fas fa-heart" style="font-size: 8rem; color: rgba(244,67,54,0.3); position: absolute; top: 40px; right: -20px; transform: rotate(15deg);"></i>
                        <i class="fas fa-gift" style="font-size: 10rem; color: rgba(255,193,7,0.3); position: absolute; bottom: 20px; left: -60px; transform: rotate(-5deg);"></i>
                    </div>
                </div>

                <div style="text-align: center; padding: 60px 20px 80px;">
                    <h2 style="font-size: 1.6rem; color: #31353B; margin-bottom: 50px; font-weight: 800;">Cara pakai Wishlist</h2>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; max-width: 900px; margin: 0 auto;">
                        
                        <div style="text-align: center;">
                            <div style="background: #eafaf1; border-radius: 50%; width: 130px; height: 130px; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 4px 10px rgba(0,170,91,0.15);">
                                <i class="fas fa-search" style="font-size: 3.5rem; color: #00AA5B;"></i>
                                <i class="fas fa-box" style="font-size: 2rem; color: #ffb74d; position: absolute; bottom: 20px; right: 20px; text-shadow: 2px 2px 5px rgba(0,0,0,0.1);"></i>
                            </div>
                            <h3 style="font-size: 1.15rem; color: #31353B; margin-bottom: 12px; font-weight: 700;">Simpan barang impian</h3>
                            <p style="font-size: 0.95rem; color: #6D7588; line-height: 1.6;">Mau simpan barang untuk beli nanti? Bandingkan harga dan spesifikasinya? Di sini tempatnya!</p>
                        </div>

                        <div style="text-align: center;">
                            <div style="background: #fff3e0; border-radius: 50%; width: 130px; height: 130px; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 4px 10px rgba(255,152,0,0.15);">
                                <i class="fas fa-heart" style="font-size: 3.5rem; color: #f44336;"></i>
                                <i class="fas fa-mouse-pointer" style="font-size: 1.8rem; color: #31353B; position: absolute; bottom: 25px; right: 25px; text-shadow: 2px 2px 5px rgba(0,0,0,0.1);"></i>
                            </div>
                            <h3 style="font-size: 1.15rem; color: #31353B; margin-bottom: 12px; font-weight: 700;">Klik ikon hati buat simpan</h3>
                            <p style="font-size: 0.95rem; color: #6D7588; line-height: 1.6;">Lagi lihat-lihat, ada barang yang kamu suka? Klik ikon hati buat simpan di Wishlist.</p>
                        </div>

                        <div style="text-align: center;">
                            <div style="background: #e3f2fd; border-radius: 50%; width: 130px; height: 130px; margin: 0 auto 25px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 4px 10px rgba(33,150,243,0.15);">
                                <i class="fas fa-folder-open" style="font-size: 3.5rem; color: #2196f3;"></i>
                                <i class="fas fa-star" style="font-size: 1.8rem; color: #ffeb3b; position: absolute; top: 25px; right: 25px; text-shadow: 2px 2px 5px rgba(0,0,0,0.1);"></i>
                            </div>
                            <h3 style="font-size: 1.15rem; color: #31353B; margin-bottom: 12px; font-weight: 700;">Atur Wishlist dengan Koleksi</h3>
                            <p style="font-size: 0.95rem; color: #6D7588; line-height: 1.6;">Pakai fitur Koleksi buat mengelompokkan barang-barang di Wishlist sesukamu.</p>
                        </div>

                    </div>
                </div>
            </div>`;

html = html.replace(oldEmptyState, newEmptyState);
fs.writeFileSync(indexFile, html);
console.log('Successfully updated wishlist UI');
