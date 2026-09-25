# AGENTS.md

## Layout

- Two **independent** npm packages, no root manifest / workspace tooling: `backend/` (Express 5 + Mongoose, CommonJS) and `frontend/` (Angular 17, standalone components). Install and run each separately.
- API surface source of truth is `backend/index.js` (route mounts), not the README table — the README is stale (`/api/suscripcion` is never mounted; `/api/users` and `/api/dataset` exist but are unlisted).
- Frontend routes: `frontend/src/app/app.routes.ts`. The 3D planetario is `/app` → `src/app/pages/facade-engine/`; the custom Three.js engine lives in `src/engine/`.
- Backend layers follow `routes/ -> controllers/ -> models/`, plus `middleware/` and `helpers/`.

## Commands

```sh
# Backend (needs MongoDB; reads backend/.env; nodemon)
cd backend && npm i && npm start            # PORT from .env (dev expects 8080)
npm run seed:eventos                        # loads backend/data/eventos2026_v2.json

# Frontend
cd frontend && npm i && npm start           # ng serve, port 4200 (development config)
npm run build                               # ng build, production config (default)
npm test                                    # ng test, Karma + Chrome
```

- There is **no lint, formatter, or CI config** anywhere — don't look for `npm run lint`.
- Backend `npm test` is a placeholder that always exits 1.
- `ng test` needs a locally installed Chrome (no headless/karma config), and specs must compile cleanly first.

## Setup gotchas (verified)

- `frontend/src/environments/*` and **both `package-lock.json`s are gitignored**. On a fresh clone `ng serve`/`ng build` fail until you create `src/environments/environment.ts` and `environment.development.ts`, both shaped `{ production, apiUrl, imageUrl, loginUrl }`; dev points at `http://localhost:8080/api`, prod at `https://example.com/api`.
- No lockfile means `npm i` resolves fresh versions; breakage from dependency drift is expected (see below).
- Backend setup: `cp backend/.env.example backend/.env`. Server needs `PORT`, `MONGODB_URI`, `JWT_SECRET`; photos need `UPLOAD_DIR`, `MAX_FILE_SIZE`, `ALLOWED_MIME_TYPES`, `THUMBNAIL_*`.
- Backend listens on `127.0.0.1` only — unreachable from other hosts/containers as-is.

## Build quirks (do not regress)

- `@gltf-transform/core` (used by `graphics-engine/GLBLoader.ts`) dynamically imports `node:fs`/`node:path`, which esbuild refuses to bundle for the browser. `angular.json` works around it with `"externalDependencies": ["node:fs", "node:path"]` — the app only uses `WebIO`, never `NodeIO`, so those imports never execute. Remove that entry and `ng build` fails again.
- Never deep-import `@maptiler/sdk` internals (`@maptiler/sdk/dist/src/...` does not exist in 3.11.x; types live under `dist/utils/`). A prior unused import of this path broke both build and test.
- `ng test` compiles but still needs a locally installed Chrome (none in this environment); there is no headless config, so set `CHROME_BIN` or install Chromium to run specs. Host Chrome installs fail (missing `libglib`); to verify UI/runtime behaviour headlessly, use the Docker image instead: `docker run --rm --network host -v <dir>:/work ghcr.io/puppeteer/puppeteer:latest bash -c "cp /work/x.js /home/pptruser/ && cd /home/pptruser && node x.js"` (ships puppeteer + Chrome; reaches `localhost:4200` via host networking).

## Conventions & quirks

- **Auth is cookie-based**: JWT lives in the `token` cookie; `frontend/src/app/interceptors/auth.interceptor.ts` adds `withCredentials` to _every_ HttpClient request; backend reads `req.cookies.token` (`middleware/validar-jwt.js`). Login/register are rate-limited to 5 attempts / 15 min (`middleware/limit-auth.js`, skips successful requests) — expect 429s when testing auth flows.
- **CORS allowlist is hardcoded** in `backend/index.js` (`localhost:4200`, `127.0.0.1:4200`, `https://example.com`); new origins require a backend edit + restart. `credentials: true` is set.
- **TypeScript config is deceptive**: `tsconfig.json` has `strict: true` but `noImplicitAny: false` and `strictNullChecks: false`; Angular `strictTemplates: true`. Code compiles with `any` and without null checks — don't assume `strict` implies otherwise.
- Express is **v5** (`^5.1.0`): wildcard/catch-all route syntax differs from v4.
- Every request is logged to Mongo via `middleware/api-logger.js` (async, failure-safe).
- Photo uploads go through `middleware/upload-photos.js` (multer) into `UPLOAD_DIR`, served statically at `/uploads`.
