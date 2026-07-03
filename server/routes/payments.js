const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { lease_id, month, year } = req.query;
  let query = `
    SELECT pay.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      u.name as unit_name,
      p.name as property_name
    FROM payments pay
    JOIN leases l ON l.id = pay.lease_id
    JOIN tenants t ON t.id = l.tenant_id
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE 1=1
  `;
  const params = [];
  if (lease_id) { query += ' AND pay.lease_id = ?'; params.push(lease_id); }
  if (month && year) { query += ' AND strftime("%Y-%m", pay.date) = ?'; params.push(`${year}-${month.toString().padStart(2,'0')}`); }
  query += ' ORDER BY pay.date DESC';
  const payments = db.prepare(query).all(...params);
  res.json(payments);
});

// Einnahmen-Übersicht
router.get('/summary', (req, res) => {
  const summary = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'rent' THEN amount ELSE 0 END) as rent_total,
      SUM(CASE WHEN type = 'utilities' THEN amount ELSE 0 END) as utilities_total,
      SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposit_total,
      SUM(amount) as total,
      COUNT(*) as count
    FROM payments
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month DESC
    LIMIT 24
  `).all();
  res.json(summary);
});

router.post('/', (req, res) => {
  const { lease_id, amount, type, date, description, status } = req.body;
  const result = db.prepare(`
    INSERT INTO payments (lease_id, amount, type, date, description, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(lease_id, amount, type, date, description, status || 'received');
  const created = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const { lease_id, amount, type, date, description, status } = req.body;
  db.prepare(`
    UPDATE payments SET lease_id=?, amount=?, type=?, date=?, description=?, status=?
    WHERE id=?
  `).run(lease_id, amount, type, date, description, status, req.params.id);
  const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
