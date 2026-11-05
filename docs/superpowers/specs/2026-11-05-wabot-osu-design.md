# wabot-osu Design Doc

**Date:** 2026-11-05

## Intent & Why

Bot WhatsApp untuk komunitas osu! Indonesia. Otomasi moderasi grup: verifikasi member baru via osu! account, auto-kick jika gagal verif, warn+kick untuk link terlarang.

## Goals

- Member baru wajib verif osu! username dalam 5 menit atau di-kick
- Member terverif tersimpan di database
- Link blacklisted → warn (3x → kick otomatis)
- Admin bisa kelola blacklist domain

## Non-Goals

- Dashboard web
- Multi-platform (hanya WA)
- Integrasi osu! score/ranking

## Anti-Goals

- Jangan ban permanen (hanya kick)
- Jangan simpan pesan user

## Constraints

- Runtime: Node.js 20+, TypeScript
- Library WA: baileys ^7.0.0-rc14
- DB: better-sqlite3 (SQLite, file-based)
- HTTP: axios (osu! API v2)
- osu! API: https://osu.ppy.sh/api/v2 — perlu client_id + client_secret (OAuth client credentials)

## Approaches

**A) Verif via osu! API (dipilih):** User kirim username → bot cek endpoint `/users/{username}` → valid = tersimpan di DB. Paling relevan, buktikan user punya akun osu!.

**B) Kode unik:** Bot kirim kode, user balas. Tidak membuktikan akun osu!.

**C) Manual admin:** Tidak skalabel.

## Architecture

- `src/index.ts` — boot: koneksi Baileys, load handler
- `src/config.ts` — env vars, konstanta
- `src/services/db.ts` — SQLite init + query helpers
- `src/services/osu.ts` — osu! API client (OAuth + user lookup)
- `src/services/verify.ts` — pending map, timer, kick logic
- `src/handlers/group.ts` — event `group-participants.update` (join/leave/remove)
- `src/handlers/message.ts` — event `messages.upsert` (verif reply, link filter, admin cmd)

## Data Model

```sql
CREATE TABLE verified_members (
  jid TEXT PRIMARY KEY,
  osu_username TEXT NOT NULL,
  osu_user_id INTEGER NOT NULL,
  verified_at INTEGER NOT NULL
);

CREATE TABLE warn_records (
  jid TEXT NOT NULL,
  group_jid TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (jid, group_jid)
);

CREATE TABLE blacklisted_domains (
  domain TEXT PRIMARY KEY
);
```

## Config (.env)

```
OSU_CLIENT_ID=
OSU_CLIENT_SECRET=
BOT_ADMIN_NUMBER=  # format: 628xxx@s.whatsapp.net
VERIFY_TIMEOUT_MS=300000  # 5 menit
MAX_WARNS=3
```
