const express = require('express');
const cors = require('cors');
const path = require('path');

// Datenbank initialisieren
require('./database');

const app = express();
const PORT = process.env.PORT || 3001;
const { requireAuth } = require('./middleware/auth');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Öffentliche Routen (kein Login nötig)
app.use('/api/auth', require('./routes/auth'));

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
app.get('/api/dashboard', requireAuth, (req, res) => {
  const db = require('./database');
  const stats = {
    properties: db.prepare('SELECT COUNT(*) as count FROM properties').get().count,
    units: db.prepare('SELECT COUNT(*) as count FROM units').get().count,
    tenants: db.prepare('SELECT COUNT(*) as count FROM tenants').get().count,
    active_leases: db.prepare("SELECT COUNT(*) as count FROM leases WHERE status = 'active'").get().count,
    monthly_rent: db.prepare(`
      SELECT COALESCE(SUM(l.rent_cold + l.rent_utilities), 0) as total
      FROM leases l WHERE l.status = 'active'
    `).get().total,
    recent_payments: db.prepare(`
      SELECT pay.*, t.first_name || ' ' || t.last_name as tenant_name, u.name as unit_name
      FROM payments pay
      JOIN leases l ON l.id = pay.lease_id
      JOIN tenants t ON t.id = l.tenant_id
      JOIN units u ON u.id = l.unit_id
      ORDER BY pay.date DESC LIMIT 5
    `).all(),
    overdue_payments: db.prepare(`
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

// Frontend ausliefern
const clientDist = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🏠 ImmoApp Server läuft auf http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
});
