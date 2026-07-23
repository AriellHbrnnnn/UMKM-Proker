const umkmData = [
    { id: "umkm_1", name: "Winarsih", category: "pertanian", owner: "Winarsih", rating: 4.8, sold: "500+", location: "KARANGANYAR, RT.01/05", desc: "Menjual berbagai macam sayuran segar dan bumbu dapur harian.", image: "https://images.unsplash.com/photo-1596328825838-89c065f49e48?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000001", products: [{ name: "Sayur Campur Segar", price: 5000, sold: 120, rating: 4.8, image: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_2", name: "Sunarmi", category: "makanan", owner: "Sunarmi", rating: 4.9, sold: "800+", location: "KARANGANYAR, RT.01/05", desc: "Produksi peyek koin renyah, gurih, dan halal.", image: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000002", products: [{ name: "Peyek Koin Kacang", price: 15000, sold: 300, rating: 4.9, image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_3", name: "Margiyem", category: "kebutuhan", owner: "Margiyem", rating: 4.7, sold: "1rb+", location: "KARANGANYAR, RT.01/05", desc: "Toko kelontong menyediakan kebutuhan pokok sehari-hari.", image: "https://images.unsplash.com/photo-1601599561213-832382fd07ea?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000003", products: [{ name: "Gula Pasir 1 Kg", price: 16000, sold: 450, rating: 4.8, image: "https://images.unsplash.com/photo-1622484211148-7140cb7ee284?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_4", name: "Saniati", category: "makanan", owner: "Saniati", rating: 4.8, sold: "1.2rb+", location: "KARANGANYAR, RT.01/05", desc: "Menyediakan makanan matang rumahan, siap saji dan lezat.", image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000004", products: [{ name: "Nasi Sayur Lodeh", price: 10000, sold: 200, rating: 4.8, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_5", name: "Wasijo", category: "kerajinan", owner: "Wasijo", rating: 4.9, sold: "200+", location: "KARANGANYAR, RT.01/05", desc: "Menerima pesanan meubel kayu jati dan mahoni custom.", image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000005", products: [{ name: "Kursi Sudut Kayu", price: 1500000, sold: 15, rating: 5.0, image: "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_6", name: "Ayu Arisma", category: "kerajinan", owner: "Ayu Arisma", rating: 4.9, sold: "600+", location: "KARANGANYAR, RT.01/05", desc: "Menjual aneka kerajinan tangan (craft) unik dan estetik.", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000006", products: [{ name: "Hiasan Dinding Makrame", price: 45000, sold: 120, rating: 4.9, image: "https://images.unsplash.com/photo-1520699049698-acd2fceb8938?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_7", name: "Edi Santoso", category: "jasa", owner: "Edi Santoso", rating: 4.8, sold: "1.5rb+", location: "KARANGANYAR, RT.01/05", desc: "Bengkel motor terpercaya, servis rutin dan ganti oli.", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000007", products: [{ name: "Servis Ringan Motor", price: 45000, sold: 400, rating: 4.8, image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_8", name: "Komunitas Ibu Kreatif", category: "kerajinan", owner: "Ibu Kreatif", rating: 5.0, sold: "450+", location: "KARANGANYAR, RT.01/05", desc: "Produksi Batik Ecoprint ramah lingkungan asli karya warga.", image: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000008", products: [{ name: "Kain Batik Ecoprint", price: 150000, sold: 80, rating: 5.0, image: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=300" }] },
    { id: "umkm_9", name: "Marsinah", category: "makanan", owner: "Marsinah", rating: 4.8, sold: "2rb+", location: "KARANGANYAR, RT.02/05", desc: "Sedia Cireng & Pempek ikan tenggiri yang lezat dan gurih.", image: "https://images.unsplash.com/photo-1626804475297-41609ea0d4eb?auto=format&fit=crop&q=80&w=400", whatsapp: "6280000000009", products: [{ name: "Pempek Kapal Selam", price: 15000, sold: 500, rating: 4.8, image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&q=80&w=300" }] }
];

const databaseUrl = "https://umkm-karanganyar-default-rtdb.asia-southeast1.firebasedatabase.app/umkmData.json";

// Convert array to object keyed by ID
const dbObject = {};
umkmData.forEach(item => {
    dbObject[item.id] = item;
});

fetch(databaseUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dbObject)
})
.then(res => res.json())
.then(data => console.log("Database seeded successfully!"))
.catch(err => console.error(err));
