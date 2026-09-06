// Datenbank-Layer auf Basis von libSQL / Turso.
//
// Lokal & auf Railway:   file:immo.db  (Standard, keine Env nötig)
// Auf Vercel/Turso:      TURSO_DATABASE_URL + TURSO_AUTH_TOKEN setzen
//
// Der frühere Code nutzte better-sqlite3 SYNCHRON (db.prepare(sql).get()/.all()/.run()).
// libSQL ist ASYNCHRON. Damit die Routen mit minimalem Umbau weiterlaufen, bildet dieser
// Wrapper dieselbe API nach – nur geben get()/all()/run() jetzt Promises zurück.
// In den Routen wird daher überall `await` verwendet.

const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const url = process.env.TURSO_DATABASE_URL || ('file:' + path.join(__dirname, 'immo.db'));
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

// --- Hilfsfunktionen -------------------------------------------------------

// better-sqlite3 akzeptiert Parameter als Einzelargumente ODER als Array.
// undefined ist als Bind-Wert nicht erlaubt -> null; Booleans -> 1/0.
function normArgs(args) {
  const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return list.map((v) => {
    if (v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v;
  });
}

// libSQL-Row -> einfaches Objekt (nur benannte Spalten, bigint -> Number),
// damit die JSON-Ausgabe exakt wie bei better-sqlite3 aussieht.
function toPlain(row, columns) {
  if (!row) return undefined;
  const o = {};
  for (const c of columns) {
    let v = row[c];
    if (typeof v === 'bigint') v = Number(v);
    o[c] = v;
  }
  return o;
}

function prepare(sql) {
  return {
    async get(...args) {
      const rs = await client.execute({ sql, args: normArgs(args) });
      return toPlain(rs.rows[0], rs.columns);
    },
    async all(...args) {
      const rs = await client.execute({ sql, args: normArgs(args) });
      return rs.rows.map((r) => toPlain(r, rs.columns));
    },
    async run(...args) {
      const rs = await client.execute({ sql, args: normArgs(args) });
      return {
        changes: Number(rs.rowsAffected || 0),
        lastInsertRowid: rs.lastInsertRowid == null ? undefined : Number(rs.lastInsertRowid),
      };
    },
  };
}

// --- Schema ----------------------------------------------------------------

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    zip TEXT NOT NULL,
    type TEXT NOT NULL,
    purchase_price REAL,
    purchase_date TEXT,
    transfer_date TEXT,
    payment_date TEXT,
    land_share REAL,
    building_share REAL,
    total_sqm REAL,
    mea TEXT,
    distribution_key TEXT DEFAULT 'sqm',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    floor INTEGER,
    size_sqm REAL,
    rooms REAL,
    rent_cold REAL,
    rent_utilities REAL,
    persons_count INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date TEXT,
    address TEXT,
    iban TEXT,
    rent_cold REAL,
    rent_utilities REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    rent_cold REAL NOT NULL,
    rent_utilities REAL NOT NULL,
    deposit REAL,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lease_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'received',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meter_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    related_type TEXT,
    related_id INTEGER,
    filename TEXT NOT NULL,
    size INTEGER,
    content BLOB,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS utility_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    period_from TEXT NOT NULL,
    period_to TEXT NOT NULL,
    total_heating REAL DEFAULT 0,
    total_water REAL DEFAULT 0,
    total_maintenance REAL DEFAULT 0,
    total_insurance REAL DEFAULT 0,
    total_other REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salutation TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    zip TEXT,
    city TEXT,
    iban TEXT,
    tax_number TEXT,
    ownership_share REAL DEFAULT 100,
    role TEXT DEFAULT 'Eigentümer',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    property_id INTEGER,
    allocatable INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    plan TEXT DEFAULT 'paid',
    license_expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS license_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    duration_months INTEGER DEFAULT 12,
    used INTEGER DEFAULT 0,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS kredite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank TEXT NOT NULL,
    objekt TEXT,
    zweck TEXT,
    kreditsumme REAL NOT NULL,
    restschuld REAL,
    tilgung REAL,
    zinsen REAL,
    rate REAL,
    startdatum TEXT,
    laufzeit INTEGER,
    status TEXT DEFAULT 'aktiv',
    notizen TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

// Nachträgliche Spalten für bereits bestehende Datenbanken (idempotent).
const MIGRATIONS = [
  `ALTER TABLE tenants ADD COLUMN rent_cold REAL`,
  `ALTER TABLE tenants ADD COLUMN rent_utilities REAL`,
  `ALTER TABLE properties ADD COLUMN distribution_key TEXT DEFAULT 'sqm'`,
  `ALTER TABLE properties ADD COLUMN transfer_date TEXT`,
  `ALTER TABLE properties ADD COLUMN payment_date TEXT`,
  `ALTER TABLE properties ADD COLUMN land_share REAL`,
  `ALTER TABLE properties ADD COLUMN building_share REAL`,
  `ALTER TABLE properties ADD COLUMN total_sqm REAL`,
  `ALTER TABLE properties ADD COLUMN mea TEXT`,
  `ALTER TABLE units ADD COLUMN persons_count INTEGER DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'paid'`,
  `ALTER TABLE documents ADD COLUMN content BLOB`,
];

let readyPromise = null;

async function init() {
  await client.executeMultiple(SCHEMA_SQL);

  for (const stmt of MIGRATIONS) {
    try { await client.execute(stmt); } catch (e) { /* Spalte existiert bereits */ }
  }

  // Standard-Admin anlegen bzw. Passwort aus IMMO_ADMIN_PASSWORD durchsetzen.
  // Kein hartkodiertes Passwort im Code: ist die Env-Variable nicht gesetzt, wird
  // ein zufälliges (kryptografisch sicheres) Passwort erzeugt und einmalig geloggt.
  const adminPw = process.env.IMMO_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
  const adminRow = (await client.execute("SELECT id FROM users WHERE role='admin'")).rows[0];
  if (!adminRow) {
    const hash = bcrypt.hashSync(adminPw, 10);
    await client.execute({
      sql: "INSERT INTO users (username, email, password_hash, role, license_expires_at) VALUES ('admin', 'admin@immo-app.de', ?, 'admin', '2099-12-31')",
      args: [hash],
    });
    if (!process.env.IMMO_ADMIN_PASSWORD) {
      console.warn('⚠️  IMMO_ADMIN_PASSWORD nicht gesetzt – zufälliges Admin-Passwort erzeugt:', adminPw);
    }
  } else if (process.env.IMMO_ADMIN_PASSWORD) {
    await client.execute({
      sql: 'UPDATE users SET password_hash=? WHERE id=?',
      args: [bcrypt.hashSync(adminPw, 10), Number(adminRow.id)],
    });
  }
}

// Stellt sicher, dass Schema + Admin genau einmal initialisiert werden.
// Wird pro Kaltstart (Vercel) bzw. beim Boot (Railway) aufgerufen.
function ready() {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

module.exports = { prepare, ready, client, raw: client };
