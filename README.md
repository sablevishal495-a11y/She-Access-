# SHE-ACCESS

A responsive app for finding sanitary pad vending machines, checking stock and price, and viewing locations on an interactive map. Built with React, Vite, Tailwind CSS, Leaflet, and optional Capacitor support.

## Run the app

```bash
npm install
npm run dev
```

Without an API URL, the app runs in **preview mode**. Choose **Explore the demo**, or sign in with any valid Indian mobile number and enter `123456` on the code screen. No SMS is sent. Search, city switching, stock filters, machine details, and map pins work in this mode. Sample pins are not real vending machines, so external directions are disabled.

## Optional local API

The included `backend/server.cjs` is a development-only Express API. It generates sample machines around the requested coordinates, validates OTP attempts, expires sessions, and does **not** send SMS.

```bash
node backend/server.cjs
```

In a separate terminal, copy `.env.example` to `.env`, then set:

```dotenv
VITE_API_BASE_URL=http://localhost:4000
VITE_DEMO_MODE=true
VITE_DEMO_OTP=123456
```

Run `npm run dev` again after changing `.env`. The local API accepts the code from `backend/.env.example` (`DEV_OTP`, default `123456`). Keep `VITE_DEMO_OTP` and `DEV_OTP` in sync. You can change `PORT`, `HOST`, and `CORS_ORIGIN` in `backend/.env`; by default the server listens on `127.0.0.1:4000` and allows `http://localhost:5173`.

## Connect a real backend

Set `VITE_API_BASE_URL` to an HTTPS API and leave `VITE_DEMO_MODE=false`. The app expects:

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/auth/otp/send` | `{ "phone": "+919876543210" }` | `{ "requestId": "...", "expiresInSec": 300 }` |
| POST | `/auth/otp/verify` | `{ "phone": "...", "otp": "...", "requestId": "..." }` | `{ "token": "...", "user": { "id": "...", "phone": "..." } }` |
| GET | `/machines/nearby?lat=...&lng=...&radiusKm=...` | Bearer token | `{ "machines": [ ... ] }` |
| POST | `/auth/logout` | Bearer token | `204 No Content` (best effort) |

Each machine needs `id`, `name`, `address`, `location: { lat, lng }`, `pricePerPad`, three-letter `currency`, `stock`, `capacity`, `online`, `openHours`, and ISO `lastRestockedAt`. The optional `sample: true` flag disables directions and shows a preview notice. The optional `VITE_API_KEY` is sent as `x-api-key`; never put a private secret in a Vite variable because client bundles are inspectable.

The included backend is **not** a production SMS or inventory service. Before deployment, provide real SMS delivery, a live machine inventory, secure session handling, rate limits, and HTTPS. Map tiles need internet access and a tile provider appropriate for your traffic; configure `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` if changing providers.

## Checks

```bash
npx tsc --noEmit
npm run build
node --test backend/server.test.cjs
npx playwright test
npx playwright test --config=playwright.api.config.ts
npx playwright test --config=playwright.preview.config.ts
```

For browser checks, install Chromium once with `npx playwright install chromium`. Linux environments may also need `npx playwright install-deps chromium`.

`capacitor.config.ts` and the Capacitor plugins are included. To prepare a native Android project, run `npm run build`, `npx cap add android`, and `npx cap sync android` in an Android SDK environment. Android packaging has not been verified in this workspace.

Do not commit `.env` files. The linked source repository contains tracked environment files; rotate any credentials that may have been exposed there before using a live service.