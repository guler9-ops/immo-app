const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
  const leases = await db.prepare(`
    SELECT l.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      u.name as unit_name,
      p.name as property_name
    FROM leases l
    JOIN tenants t ON t.id = l.tenant_id
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    ORDER BY l.created_at DESC
  `).all();
  res.json(leases);
});

router.get('/:id', async (req, res) => {
  const lease = await db.prepare(`
    SELECT l.*,
      t.first_name || ' ' || t.last_name as tenant_name,
      u.name as unit_name, u.size_sqm,
      p.name as property_name
    FROM leases l
    JOIN tenants t ON t.id = l.tenant_id
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!lease) return res.status(404).json({ error: 'Nicht gefunden' });
  const payments = await db.prepare('SELECT * FROM payments WHERE lease_id = ? ORDER BY date DESC').all(req.params.id);
  res.json({ ...lease, payments });
});

router.post('/', async (req, res) => {
  const { unit_id, tenant_id, start_date, end_date, rent_cold, rent_utilities, deposit, notes } = req.body;
  const result = await db.prepare(`
    INSERT INTO leases (unit_id, tenant_id, start_date, end_date, rent_cold, rent_utilities, deposit, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(unit_id, tenant_id, start_date, end_date, rent_cold, rent_utilities, deposit, notes);
  const created = await db.prepare('SELECT * FROM leases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const { unit_id, tenant_id, start_date, end_date, rent_cold, rent_utilities, deposit, status, notes } = req.body;
  await db.prepare(`
    UPDATE leases SET unit_id=?, tenant_id=?, start_date=?, end_date=?, rent_cold=?, rent_utilities=?, deposit=?, status=?, notes=?
    WHERE id=?
  `).run(unit_id, tenant_id, start_date, end_date, rent_cold, rent_utilities, deposit, status, notes, req.params.id);
  const updated = await db.prepare('SELECT * FROM leases WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM leases WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
