
## Tujuan
Halaman `/login` hanya untuk login. Tidak ada form pendaftaran publik. User baru dibuat oleh admin dari menu Master → Users.

## Perubahan

### 1. Nonaktifkan signup di Supabase Auth
- Panggil `configure_auth` dengan `disable_signup: true`.
- Ini memblokir semua percobaan `signUp()` dari client (publik).

### 2. Update halaman `/login` (`src/routes/login.tsx`)
- Hapus tab/toggle "Sign Up" dan semua field terkait (full name, dll).
- Sisakan hanya form Email + Password + tombol "Masuk".
- Hapus pemanggilan `supabase.auth.signUp`.
- Tampilkan pesan kecil: "Hubungi admin untuk membuat akun."

### 3. Bootstrap admin pertama (penting karena signup dimatikan)
Karena `disable_signup: true` memblokir pendaftaran publik, kita butuh jalan untuk membuat admin pertama:
- **Opsi A (direkomendasikan):** Sebelum mengaktifkan `disable_signup`, user mendaftar dulu satu kali untuk jadi admin (trigger `handle_new_user` sudah otomatis kasih role admin ke user pertama). Setelah itu baru aktifkan `disable_signup`.
- Plan ini akan: (1) deteksi apakah sudah ada admin di DB, (2) jika belum ada admin, tunda pemanggilan `disable_signup` dan beri instruksi ke user untuk daftar dulu via halaman login lama; (3) jika sudah ada admin, langsung aktifkan `disable_signup` dan rapikan UI login.

### 4. Buat user dari halaman Master → Users (admin only)
- Tambah form "Create User" di `src/routes/_authenticated/master.tsx` (section Users) dengan field: email, password sementara, full name, role.
- Buat server function `createUser` di `src/lib/users.functions.ts`:
  - Pakai `requireSupabaseAuth` + cek role admin.
  - Gunakan `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`.
  - Insert role ke `user_roles` sesuai pilihan admin.
- Tambah aksi "Reset Password" dan "Delete User" opsional (skip dulu kalau tidak diminta).

### 5. Rapikan route guard
- `/login` tetap publik. Tidak ada route `/signup`.

## File yang berubah
- `src/routes/login.tsx` — hapus signup UI/logic
- `src/routes/_authenticated/master.tsx` — tambah form create user
- `src/lib/users.functions.ts` — server fn `createUser` (baru)
- Supabase auth config — `disable_signup: true` (setelah admin pertama ada)

## Konfirmasi yang dibutuhkan
Apakah admin pertama sudah pernah didaftarkan? Jika belum, daftar dulu via halaman login saat ini, baru saya kunci signup-nya.
