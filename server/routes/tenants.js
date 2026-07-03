const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const tenants = db.prepare(`
    SELECT t.*,
      COUNT(l.id) as active_leases,
      GROUP_CONCAT(u.name, ', ') as units
    FROM tenants t
    LEFT JOIN leases l ON l.tenant_id = t.id AND l.status = 'active'
    LEFT JOIN units u ON u.id = l.unit_id
    GROUP BY t.id
    ORDER BY t.last_name, t.first_name
  `).all();
  res.json(tenants);
});

router.get('/:id', (req, res) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Nicht gefunden' });
  const leases = db.prepare(`
    SELECT l.*, u.name as unit_name, p.name as property_name
    FROM leases l
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE l.tenant_id = ?
    ORDER BY l.start_date DESC
  `).all(req.params.id);
  res.json({ ...tenant, leases });
});

router.post('/', (req, res) => {
  const { first_name, last_name, email, phone, birth_date, address, iban, rent_cold, rent_utilities, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO tenants (first_name, last_name, email, phone, birth_date, address, iban, rent_cold, rent_utilities, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(first_name, last_name, email, phone, birth_date, address, iban, rent_cold, rent_utilities, notes);
  const created = db.prepare('SELECT * FROM tenants WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const { first_name, last_name, email, phone, birth_date, address, iban, rent_cold, rent_utilities, notes } = req.body;
  db.prepare(`
    UPDATE tenants SET first_name=?, last_name=?, email=?, phone=?, birth_date=?, address=?, iban=?, rent_cold=?, rent_utilities=?, notes=?
    WHERE id=?
  `).run(first_name, last_name, email, phone, birth_date, address, iban, rent_cold, rent_utilities, notes, req.params.id);
  const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
