# Architecture — Zambra

Monorepo `apps/api` (NestJS) + `apps/web` (Angular 22). SQLite en dev (`data/zambra.db`), Neon-ready vía `DATABASE_TYPE=postgres`.

## Módulos API

- `auth` — JWT async (`ConfigService`), login `identifier` username|email
- `shows` — cartelera 14 días Europe/Madrid + mapa `ShowSeat`
- `orders` — cobro atómico (mutex SQLite + `FOR UPDATE` en Postgres), QR `qrcode`, cancel 24 h, scan, stats, reviews
- `seed` — demo + staff + sillas de cueva

No hay `expiresAt` de hold ni sweeper.

## Frontend

Standalone, `provideZonelessChangeDetection`, interceptor lee `zambra.token` de localStorage. Auth routes (`/login`, `/entrar`, `/registro`) **antes** del shell `**`.
