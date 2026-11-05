# wabot-osu

Bot WhatsApp moderasi untuk komunitas osu! Indonesia.

## Fitur

- **Verifikasi member baru** via osu! account — member yang masuk grup wajib kirim username osu! dalam 5 menit atau di-kick otomatis
- **Filter link** — domain blacklisted → warn (3x → kick)
- **Admin commands** — kelola blacklist domain dari dalam grup

## Setup

### 1. Dapatkan osu! API credentials

1. Login ke [osu.ppy.sh](https://osu.ppy.sh)
2. Buka **Account Settings** → **OAuth**
3. Klik **New OAuth Application**
4. Isi nama aplikasi, biarkan Callback URL kosong
5. Simpan `Client ID` dan `Client Secret`

### 2. Konfigurasi

```bash
cp .env.example .env
```

Edit `.env`:

```
OSU_CLIENT_ID=12345
OSU_CLIENT_SECRET=your_secret_here
BOT_ADMIN_NUMBER=628123456789   # nomor WA admin tanpa + dan spasi
VERIFY_TIMEOUT_MS=300000        # 5 menit (ms)
MAX_WARNS=3
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Scan QR code yang muncul di terminal dengan WhatsApp.

## Admin Commands

Kirim dari nomor yang terdaftar di `BOT_ADMIN_NUMBER` di dalam grup:

| Command | Fungsi |
|---------|--------|
| `!addomain evil.com` | Tambah domain ke blacklist |
| `!rmdomain evil.com` | Hapus domain dari blacklist |
| `!resetwarn 628xxx` | Reset warn member (nomor tanpa @s.whatsapp.net) |

## Default Blacklist

Domain yang otomatis diblokir saat bot pertama kali jalan:
- `bit.ly`, `tinyurl.com`, `grabify.link`, `t.co`

## Flow Verifikasi

1. Member baru masuk grup → bot kirim notifikasi di grup
2. Member kirim username osu! sebagai pesan biasa di grup
3. Bot cek via osu! API
4. ✅ Valid → tersimpan di database, selamat datang
5. ❌ Tidak valid → bot reply error, timer tetap jalan
6. ⏰ Timeout 5 menit → auto-kick
