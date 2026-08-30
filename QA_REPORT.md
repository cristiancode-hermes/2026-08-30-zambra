# QA Report — 2026-08-30 Zambra

**Project:** Tablao en cueva — mapa de sillas por pase, cobro atómico y QR de umbral
**Stack:** Angular 22 (zoneless/signals) + NestJS 11 + TypeORM / SQLite
**Author:** Hermes Daily Builder
**Port:** 3079
**Slug:** zambra

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc` | ✅ | `npx tsc -p tsconfig.json --incremental false` |
| Web `ng build` | ✅ | `apps/web/dist/web/browser/index.html` |
| `provideZonelessChangeDetection` | ✅ | `app.config.ts` |
| `baseHref` `/` | ✅ | angular.json + index.html |
| Auth routes before `**` | ✅ | `/login` `/entrar` `/registro` |

## ✅ 2. Test Results

Jest: **19/19** passing (mutex SEAT_TAKEN, ALREADY_BOOKED, QR URL in SVG, puntos, cancel 24 h).

Endpoint smoke (script file, no curl\|python pipes): **24 PASS**, 1 script miss (cancel on a show <24 h → 409 TOO_LATE by design; covered in Jest).

Browser Puppeteer: **25/25 PASS**.

## ✅ 3. Binary / Runtime Verification

| Mode | Output | Status |
|------|--------|--------|
| `GET /api/health` | `{ok:true}` | ✅ |
| Demo login `demo@zambra.dev` | 201 + token | ✅ |
| Staff login `staff@zambra.dev` | 201 + token | ✅ |
| Register unique | 201 | ✅ |
| Lista ↔ detalle `freeCount` | 38=38 | ✅ |
| Checkout + QR real | URL `/entrada/:code` inside SVG | ✅ |
| 409 ALREADY_BOOKED / SEAT_TAKEN | humano `code` | ✅ |
| Public ticket | 200 | ✅ |
| Totals list=detail=lines | 4500 | ✅ |
| Staff scan + ALREADY_USED | 201 then 409 | ✅ |
| Occupancy chart | 200 + SVG ejes/fechas/tooltips | ✅ |

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Capa de valor | PASS | butacas-sesion, cobro atómico, no hold 15 min |
| QR real | PASS | `qrcode` SVG + `WEB_ORIGIN/entrada/:code` |
| Contraste-hover | PASS | light 11.5→15.1; dark 6.84 (regla 2026-08-19) |
| Login split + demo debajo | PASS | inputs vacíos |
| `/entrar` alias | PASS | |
| Dynamic routes | PASS | `/pases/:id`, `/confirmacion/:code`, `/entrada/:code`, `/mis-entradas/:code` |
| Mobile 390 | PASS | scrollWidth=390, no overflow |
| Console | PASS | clean |
| Fotos vertical | PASS | SVG cueva/palo, no gym/hielo |
| isFinalDesign | N/A | DESIGN_FREE (proyecto nuevo) |

### Fixes applied during QA

1. Seed `orders.code` UNIQUE — Rafa reused `ZAMBPAGO` → crash `SQLITE_CONSTRAINT_UNIQUE`. Codes `ZAMBDEMO` / `ZAMBPAGO` / `ZAMBRAFA`.
2. `WEB_ORIGIN` → `https://zambra.proyectos.cristiancode.dev` (QR scaneable).
3. Staff/auth guards `await readyWait` (reload no echa al staff a `/`).
4. Admin chart: etiquetas de fecha en eje X cada 3 barras.
5. Nav móvil: wrap 2 filas (antes `display:none`).

### Minor Issues

| Issue | Severity | Suggestion |
|-------|----------|------------|
| Cancel <24 h | info | 409 TOO_LATE correcto; no es bug |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| Auth interceptor | `'Bearer ' + token` (no `***`) |
| TOKEN_KEY | `zambra.token` (añadido a prod-capture ×2) |
| JWT no global APP_GUARD | PASS |
| `/api` relative frontend | PASS |
| no-token `/api/orders` | 401 |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | ✅ | `zambra.proyectos.cristiancode.dev` HTTP 200 |
| API | ✅ | localhost:3079 + reverse_proxy |
| manage-apis.sh | ✅ | 3079 / zambra / 2026-08-30-zambra ALIGNED 64 |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-08-30-zambra |
| README | ✅ | blob 200 |
| Excel | ✅ | row 96 |
| Landing | ✅ | `name:'zambra'` |
| Portfolio locales | ✅ | es/en/pt slug `zambra` id 243 |
| Capture config | ✅ | config.mjs + prod-capture.mjs |
| Assets | ✅ | zambra.png / zambra-m.png reales |

## Summary

**OVERALL: PASS ✅**

QR real: sí | url: `/entrada/:code`
contraste-hover: PASS (regla 2026-08-19)
Núcleo B2C: butacas-sesion (no hueco+hold 15)
