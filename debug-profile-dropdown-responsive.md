# Debug Session: profile-dropdown-responsive
- **Status**: [OPEN]
- **Issue**: Dropdown profile aman di iPhone SE sampai Samsung Galaxy S20 Ultra, tetapi pada iPad Mini hingga Nest Hub Max tombol profile terlihat ada namun dropdown tidak muncul pada posisi yang diharapkan atau tampak tidak bisa ditekan. User juga meminta auto responsive seluruh tampilan web dan admin tetap normal.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-profile-dropdown-responsive.ndjson

## Reproduction Steps
1. Buka halaman utama dalam mode login.
2. Ubah device emulation ke iPad Mini / iPad Air / iPad Pro / Nest Hub Max.
3. Tekan tombol profile di header kanan atas.
4. Amati apakah dropdown muncul, posisinya benar, dan bisa ditutup/dibuka ulang.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Handler klik profile aktif, tetapi kelas `.show` tertimpa aturan CSS responsive tertentu sehingga dropdown tetap tersembunyi | High | Low | Pending |
| B | Breakpoint tablet memakai geometri dropdown yang salah sehingga elemen tampil di luar area yang terlihat atau tertutup parent stacking context | High | Medium | Pending |
| C | Ada konflik state antara handler di header, mode hover desktop, dan close-on-outside-click pada ukuran tablet/hub | High | Low | Pending |
| D | Header / container global pada breakpoint tertentu membatasi area klik atau overflow sehingga event terlihat gagal | Medium | Medium | Pending |
| E | Admin / halaman lain mewarisi override global yang sama sehingga perbaikan harus dipusatkan di layout responsive umum, bukan per halaman | Medium | Medium | Pending |

## Log Evidence
Instrumentation active in [auth.js](file:///C:/Users/ncnrc/Downloads/UMKM%20Proker/auth.js#L413-L558):
- A: init breakpoint detection and available DOM refs
- B: toggle click entry
- C: post-open rendered geometry and computed style
- D: close path and computed visibility state
- E: outside click detection

## Verification Conclusion
Pending runtime evidence.
