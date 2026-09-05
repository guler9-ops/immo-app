# 🚀 ImmoApp auf Vercel deployen (mit Turso-Datenbank)

Diese App läuft jetzt sowohl auf **Railway** (wie bisher, mit lokaler SQLite-Datei)
als auch auf **Vercel** (serverless, mit **Turso** als Datenbank).

Der Unterschied: Vercel hat **kein dauerhaftes Dateisystem**. Deshalb wird dort
statt der SQLite-Datei eine **Turso-Datenbank** (SQLite in der Cloud) verwendet.
Hochgeladene Dokumente werden als BLOB direkt in der Datenbank gespeichert und
bleiben dadurch ebenfalls erhalten.

---

## 1. Turso-Datenbank anlegen (einmalig, kostenlos)

1. Konto erstellen: <https://turso.tech>
2. Turso-CLI installieren und einloggen:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```
3. Datenbank + Zugangsdaten erzeugen:
   ```bash
   turso db create immo-app
   turso db show immo-app --url          # -> TURSO_DATABASE_URL (libsql://...)
   turso db tokens create immo-app       # -> TURSO_AUTH_TOKEN
   ```

> Alternativ geht alles auch über die Weboberfläche von Turso (Create Database →
> „Connect" → URL und Token kopieren).

Das Schema (Tabellen, Admin-User) wird beim ersten Start **automatisch** angelegt –
du musst nichts manuell in der DB erstellen.

---

## 2. Projekt auf Vercel importieren

1. Auf <https://vercel.com> → **Add New… → Project** → dieses GitHub-Repo auswählen.
2. Framework Preset: **Other** (die `vercel.json` im Repo regelt Build & Routing).
3. Vor dem Deploy die **Environment Variables** setzen (siehe unten).
4. **Deploy** klicken.

`vercel.json` ist bereits konfiguriert:
- baut das Frontend (`client/dist`)
- leitet alle `/api/*`-Aufrufe an die Serverless-Function `api/index.js`
- SPA-Fallback für das React-Routing

---

## 3. Environment Variables in Vercel

Unter **Project → Settings → Environment Variables** eintragen:

| Variable                | Pflicht | Beschreibung |
|-------------------------|:------:|--------------|
| `TURSO_DATABASE_URL`    | ✅ | Turso-URL aus Schritt 1 (`libsql://…`) |
| `TURSO_AUTH_TOKEN`      | ✅ | Turso-Token aus Schritt 1 |
| `IMMO_ADMIN_PASSWORD`   | ✅ | Passwort für den Admin-Login (User `admin`). Wird bei jedem Start durchgesetzt. |
| `JWT_SECRET`            | ✅ | Langer Zufallsstring zum Signieren der Login-Tokens |
| `APP_URL`               | ⬜ | Öffentliche URL der App (für Stripe success/cancel), z. B. `https://immo-app.vercel.app` |
| `STRIPE_SECRET_KEY`     | ⬜ | Nur falls der Lizenz-Kauf per Stripe genutzt wird |
| `STRIPE_WEBHOOK_SECRET` | ⬜ | Signing-Secret des Stripe-Webhooks |
| `IMMO_PRICE_CENTS`      | ⬜ | Preis pro Lizenz in Cent, z. B. `29900` |
| `IMMO_PERIOD_MONTHS`    | ⬜ | Laufzeit je Kauf in Monaten (Default 12) |

> **Ohne** `TURSO_DATABASE_URL` fällt die App automatisch auf eine lokale
> SQLite-Datei zurück – praktisch für lokale Entwicklung, aber auf Vercel nutzlos
> (Daten wären weg). Auf Vercel also unbedingt Turso-Variablen setzen.

### Stripe-Webhook (optional)
Falls du Stripe nutzt: im Stripe-Dashboard einen Webhook auf
`https://DEINE-APP.vercel.app/api/billing/webhook` anlegen (Event
`checkout.session.completed`) und das Signing-Secret als `STRIPE_WEBHOOK_SECRET`
hinterlegen.

---

## 4. Erster Login

Nach dem Deploy:
- URL öffnen → Login mit Benutzer **`admin`** und dem in `IMMO_ADMIN_PASSWORD`
  gesetzten Passwort.

---

## Lokale Entwicklung (unverändert)

Ohne Turso-Variablen wird eine lokale Datei `server/immo.db` benutzt:

```bash
cd server && npm install && npm start      # Backend :3001
cd client && npm install && npm run dev     # Frontend :5173
```

Optional lokal gegen Turso testen: `TURSO_DATABASE_URL` und `TURSO_AUTH_TOKEN`
als Umgebungsvariablen setzen, bevor `npm start` im `server`-Ordner läuft.

---

## Was wurde technisch geändert?

- **Datenbank:** `better-sqlite3` (synchron, lokale Datei) → **`@libsql/client`**
  (Turso/libSQL, async). Ein dünner Wrapper in `server/database.js` bildet die
  bisherige `prepare().get()/.all()/.run()`-API nach; alle Routen nutzen jetzt
  `await`.
- **App-Struktur:** `server/app.js` baut die Express-App (ohne `listen`).
  `server/index.js` startet sie lokal/für Railway, `api/index.js` ist der
  Serverless-Einstieg für Vercel.
- **Dokumente:** werden als BLOB in der Datenbank gespeichert statt auf der
  Festplatte (damit sie auf Vercel nicht verloren gehen).
- **`vercel.json`:** Build, API-Routing und SPA-Fallback.
