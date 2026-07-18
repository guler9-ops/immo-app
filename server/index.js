const express = require('express');
const cors = require('cors');
const path = require('path');

// Datenbank initialisieren
require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API-Routen
app.use('/api/properties', require('./routes/properties'));
app.use('/api/units', require('./routes/units'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/leases', require('./routes/leases'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/meter-readings', require('./routes/meter_readings'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/utility-bills', require('./routes/utility_bills'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/costs', require('./routes/costs'));
app.use('/api/owners', require('./routes/owners'));
app.use('/api/kredite', require('./routes/kredite'));

// Dashboard-Statistiken
app.get('/api/dashboard', (req, res) => {
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

// Frontend ausliefern (nach dem Build)
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
  console.log(`   API verfügbar unter http://localhost:${PORT}/api`);
});
