# 🏠 ImmoApp – Startanleitung

Eine vollständige Immobilienverwaltungs-Web-App inspiriert von immocloud (Starter + Manager Paket).

---

## Voraussetzungen

- **Node.js** (Version 18 oder höher): https://nodejs.org/de/download

---

## Installation & Start (2 Schritte)

### Schritt 1 – Abhängigkeiten installieren

Terminal (CMD/PowerShell) öffnen und in den `immo-app` Ordner wechseln:

```bash
# In den App-Ordner wechseln
cd immo-app

# Backend-Pakete installieren
cd server && npm install

# Frontend-Pakete installieren
cd ../client && npm install
```

### Schritt 2 – App starten

**Zwei Terminals öffnen:**

**Terminal 1 (Backend):**
```bash
cd immo-app/server
npm start
```
→ Backend läuft auf http://localhost:3001

**Terminal 2 (Frontend):**
```bash
cd immo-app/client
npm run dev
```
→ App öffnet sich auf http://localhost:5173

---

## Funktionen

### Starter-Paket (bis 5 Einheiten)
- ✅ **Dashboard** – Übersicht mit KPIs, ausstehende Mieten
- ✅ **Objekte** – Mehrfamilienhäuser, Einfamilienhäuser etc. verwalten
- ✅ **Einheiten** – Wohnungen, Gewerbe, Stellplätze anlegen
- ✅ **Mieter** – Mieterstammdaten inkl. IBAN
- ✅ **Mietverträge** – Befristet / unbefristet, Kaution, Status
- ✅ **Finanzen** – Zahlungen erfassen, Diagramm Einnahmen
- ✅ **Zählerstände** – Strom, Gas, Wasser, Heizung erfassen
- ✅ **Nebenkosten** – Betriebskostenabrechnung mit automatischer Verteilung
- ✅ **Dokumente** – Upload & Download (PDF, Word, Excel, Bilder)

### Manager-Paket (bis 15 Einheiten) – zusätzlich
- ✅ **Kommunikation** – E-Mails, Briefe, SMS an Mieter mit Vorlagen

---

## Daten

Die Daten werden lokal in einer SQLite-Datenbank gespeichert:
`immo-app/server/immo.db`

Die Datei bleibt erhalten – auch nach einem Neustart.

---

## Fehlerbehebung

**"npm nicht gefunden"** → Node.js installieren (s. oben)

**Port bereits belegt** → Anderen Port in `server/index.js` (PORT=3001) setzen

**Frontend lädt nicht** → Sicherstellen, dass Backend in Terminal 1 läuft
