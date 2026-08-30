# API — Zambra

Base `/api`. Puerto 3079.

| Método | Ruta | Auth |
|--------|------|------|
| POST | /auth/register | no |
| POST | /auth/login `{ identifier, password }` | no |
| GET | /auth/me | JWT |
| GET | /shows | no |
| GET | /shows/:id | no |
| GET | /zones | no |
| GET | /addons | no |
| POST | /orders/checkout `{ showId, seatIds, addonIds }` | JWT |
| GET | /orders | JWT |
| GET | /orders/public/:code | no |
| GET | /orders/:code | JWT |
| POST | /orders/:id/cancel | JWT |
| POST | /staff/scan `{ codeOrUrl }` | staff |
| GET | /stats/occupancy | staff |
| GET | /stats/me | JWT |
| POST | /reviews | JWT |
| GET | /reviews/show/:showId | no |
| GET | /users/me | JWT |
| PATCH | /users/me | JWT |
| GET | /health | no |

409 con `{ code, message }`: `SEAT_TAKEN`, `ALREADY_BOOKED`, `SHOW_STARTED`, `TOO_LATE`, `ALREADY_USED`, `ALREADY_REVIEWED`.
