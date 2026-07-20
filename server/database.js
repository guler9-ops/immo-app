const Database = require('better-sqlite3');
const path = require('path');

// Auf Railway: DB_PATH=/data/immo.db setzen + Volume unter /data mounten
const dbPath = process.env.DB_PATH || path.join(__dirname, 'immo.db');
const db = new Database(dbPath);

// Tabellen erstellen
db.exec(`
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
`);

// Migration: neue Spalten hinzufügen falls noch nicht vorhanden
try { db.exec(`ALTER TABLE tenants ADD COLUMN rent_cold REAL`); } catch(e) {}
try { db.exec(`ALTER TABLE tenants ADD COLUMN rent_utilities REAL`); } catch(e) {}
try { db.exec(`ALTER TABLE properties ADD COLUMN distribution_key TEXT DEFAULT 'sqm'`); } catch(e) {}
try { db.exec(`ALTER TABLE properties ADD COLUMN transfer_date TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE properties ADD COLUMN payment_date TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE properties ADD COLUMN land_share REAL`); } catch(e) {}
try { db.exec(`ALTER TABLE properties ADD COLUMN building_share REAL`); } catch(e) {}
try { db.exec(`ALTER TABLE properties ADD COLUMN total_sqm REAL`); } catch(e) {}
try { db.exec(`ALTER TABLE properties ADD COLUMN mea TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE units ADD COLUMN persons_count INTEGER DEFAULT 1`); } catch(e) {}

// Nutzer & Lizenzsystem
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
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
`);

// Standard-Admin anlegen falls noch nicht vorhanden
const bcrypt = require('bcryptjs');
const adminExists = db.prepare("SELECT id FROM users WHERE role='admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('ImmoAdmin2024!', 10);
  db.prepare("INSERT INTO users (username, email, password_hash, role, license_expires_at) VALUES (?, ?, ?, 'admin', '2099-12-31')")
    .run('admin', 'admin@immo-app.de', hash);
}

// Kredite-Tabelle
db.exec(`
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
`);

module.exports = db;
