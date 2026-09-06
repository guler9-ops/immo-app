# 📌 Projekt-Status – ImmoApp

Stand: 2026-09-06

## Überblick
Immobilienverwaltungs-Web-App (Express-Backend + React/Vite-Frontend), läuft
**live auf Vercel** mit **Turso** (SQLite in der Cloud) als Datenbank. Lokal und
auf Railway läuft die App weiterhin unverändert mit einer lokalen SQLite-Datei.

## Architektur
- **Frontend:** React + Vite (`client/`) → statischer Build (`client/dist`), von
  Vercel ausgeliefert.
- **Backend:** Express (`server/`) → auf Vercel als Serverless-Function
  (`api/index.js` lädt `server/app.js`); lokal/Railway via `server/index.js`.
- **Datenbank:** `@libsql/client` (Turso). Lokal Fallback auf `file:immo.db`.
  Dünner Wrapper in `server/database.js` bildet die alte
  `prepare().get()/.all()/.run()`-API asynchron nach.
- **Dokumente:** werden als BLOB in der DB gespeichert (persistent auf Vercel).
- **Routing/Build:** `vercel.json` (API-Rewrite + SPA-Fallback).

## Nötige Environment-Variablen (Vercel)
| Variable | Pflicht | Zweck |
|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | Turso-URL (`libsql://…`) |
| `TURSO_AUTH_TOKEN` | ✅ | Turso-Token |
| `IMMO_ADMIN_PASSWORD` | ✅ | Admin-Login-Passwort (Benutzer `admin`) |
| `JWT_SECRET` | ✅ | Signierung der Login-Tokens |
| `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `IMMO_PRICE_CENTS`, `IMMO_PERIOD_MONTHS` | ⬜ | nur für Stripe-Lizenzkauf |
| `CORS_ORIGIN` | ⬜ | nur falls Frontend/API auf getrennten Domains |

Details siehe `VERCEL.md`.

## Umgesetzte Änderungen (gemergt in `main`)
- **PR #1** – Vercel-Deployment + Migration von `better-sqlite3` auf Turso/libSQL,
  Serverless-Struktur, Dokumente als BLOB.
- **PR #2** – Open-Redirect-Schutz beim Stripe-Checkout.
- **PR #3** – Token-Validierung vor dem Schreiben in `localStorage` +
  `client/package-lock.json` ergänzt.
- **PR #4** – ungenutzte Demo-Dateien (`DEMO.html`, `DEMO_v2.html`) entfernt.
- **PR #5** – kryptografisch sicherer Zufall (`node:crypto`) statt `Math.random()`
  (Lizenzcodes, Demo-Passwort, Dateinamen).
- **PR #6** – letzten Redirect-Blocker inline abgesichert + Cognitive Complexity
  des Stripe-Webhook-Handlers reduziert.
- **PR #7** – dieses Projekt-Status-Dokument ergänzt.
- **PR #8** – `node:`-Präfix für alle Node-Built-in-Imports konsistent gemacht
  (`app.js`, `database.js`, `documents.js`).

## SonarCloud-Status
- **Security: 0 offene Findungen** (alle Blocker/High behoben).
- Verbleibend: einzelne, unkritische **Reliability/Maintainability**-Hinweise
  (Stil/Robustheit) – blockieren weder Funktion noch Deployment.
- Der Open-Redirect-Hinweis am Stripe-Checkout ist eine bewusste, per Allowlist
  geprüfte Weiterleitung; falls SonarCloud ihn noch führt, im Dashboard als
  **„Accepted/Safe"** markieren.

## Offene, optionale To-dos
- Restliche Reliability-/Maintainability-Hinweise nach Bedarf abarbeiten
  (benötigt die konkreten Findungen aus dem SonarCloud-Dashboard).

## Lokale Entwicklung
```bash
cd server && npm install && npm start      # Backend :3001 (nutzt file:immo.db)
cd client && npm install && npm run dev     # Frontend :5173
```
