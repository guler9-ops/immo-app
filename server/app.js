const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./database');
const { requireAuth } = require('./middleware/auth');

const app = express();

// CORS bewusst NICHT permissiv (kein Wildcard '*'): Frontend und API teilen sich
// dieselbe Origin (auf Vercel/Railway sowie via Vite-Proxy in der Entwicklung),
// daher werden standardmäßig keine Cross-Origin-Header gesetzt. Bei Bedarf lassen
// sich erlaubte Origins über CORS_ORIGIN oder APP_URL (kommagetrennt) freigeben.
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.APP_URL || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : { origin: false }));

// Stripe-Webhook braucht den ROHEN Body für die Signaturprüfung → VOR express.json mounten.
const billing = require('./routes/billing');
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), billing.webhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Vor jedem API-Request sicherstellen, dass Schema + Admin initialisiert sind.
// Auf Vercel läuft jede Funktion evtl. als Kaltstart – ready() ist idempotent.
app.use('/api', async (req, res, next) => {
  try {
    await db.ready();
    next();
  } catch (e) {
    console.error('DB-Init fehlgeschlagen:', e);
    res.status(500).json({ error: 'Datenbank nicht verfügbar' });
  }
});

// Öffentliche Routen (kein Login nötig)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/billing', billing.router);   // /config, /checkout, /refresh (Auth intern, ohne Lizenz-Sperre)

// Geschützte API-Routen (Login + gültige Lizenz erforderlich)
app.use('/api/properties',    requireAuth, require('./routes/properties'));
app.use('/api/units',         requireAuth, require('./routes/units'));
app.use('/api/tenants',       requireAuth, require('./routes/tenants'));
app.use('/api/leases',        requireAuth, require('./routes/leases'));
app.use('/api/payments',      requireAuth, require('./routes/payments'));
app.use('/api/meter-readings',requireAuth, require('./routes/meter_readings'));
app.use('/api/documents',     requireAuth, require('./routes/documents'));
app.use('/api/utility-bills', requireAuth, require('./routes/utility_bills'));
app.use('/api/messages',      requireAuth, require('./routes/messages'));
app.use('/api/costs',         requireAuth, require('./routes/costs'));
app.use('/api/owners',        requireAuth, require('./routes/owners'));
app.use('/api/kredite',       requireAuth, require('./routes/kredite'));
app.use('/api/admin',         requireAuth, require('./routes/admin'));

// Dashboard
app.get('/api/dashboard', requireAuth, async (req, res) => {
  const stats = {
    properties: (await db.prepare('SELECT COUNT(*) as count FROM properties').get()).count,
    units: (await db.prepare('SELECT COUNT(*) as count FROM units').get()).count,
    tenants: (await db.prepare('SELECT COUNT(*) as count FROM tenants').get()).count,
    active_leases: (await db.prepare("SELECT COUNT(*) as count FROM leases WHERE status = 'active'").get()).count,
    monthly_rent: (await db.prepare(`
      SELECT COALESCE(SUM(l.rent_cold + l.rent_utilities), 0) as total
      FROM leases l WHERE l.status = 'active'
    `).get()).total,
    recent_payments: await db.prepare(`
      SELECT pay.*, t.first_name || ' ' || t.last_name as tenant_name, u.name as unit_name
      FROM payments pay
      JOIN leases l ON l.id = pay.lease_id
      JOIN tenants t ON t.id = l.tenant_id
      JOIN units u ON u.id = l.unit_id
      ORDER BY pay.date DESC LIMIT 5
    `).all(),
    overdue_payments: await db.prepare(`
      SELECT l.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        u.name as unit_name, p.name as property_name
      FROM leases l
      JOIN tenants t ON t.id = l.tenant_id
      JOIN units u ON u.id = l.unit_id
      JOIN properties p ON p.id = u.property_id
      WHERE l.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM payments pay
          WHERE pay.lease_id = l.id
            AND pay.type = 'rent'
            AND strftime('%Y-%m', pay.date) = strftime('%Y-%m', 'now')
        )
      LIMIT 5
    `).all(),
  };
  res.json(stats);
});

// Frontend ausliefern (nur relevant für lokalen Betrieb / Railway – auf Vercel
// übernimmt das die statische Auslieferung des client/dist-Builds).
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

module.exports = app;
