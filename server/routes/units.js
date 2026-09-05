const express = require('express');
const router = express.Router();
const db = require('../database');

// Alle Einheiten (optional: nach Objekt filtern)
router.get('/', async (req, res) => {
  const { property_id } = req.query;
  let query = `
    SELECT u.*, p.name as property_name,
      t.first_name || ' ' || t.last_name as tenant_name,
      l.rent_cold, l.rent_utilities, l.status as lease_status
    FROM units u
    LEFT JOIN properties p ON p.id = u.property_id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.status = 'active'
    LEFT JOIN tenants t ON t.id = l.tenant_id
  `;
  if (property_id) query += ' WHERE u.property_id = ?';
  query += ' ORDER BY u.created_at DESC';
  const units = property_id ? await db.prepare(query).all(property_id) : await db.prepare(query).all();
  res.json(units);
});

// Einzelne Einheit
router.get('/:id', async (req, res) => {
  const unit = await db.prepare(`
    SELECT u.*, p.name as property_name
    FROM units u
    LEFT JOIN properties p ON p.id = u.property_id
    WHERE u.id = ?
  `).get(req.params.id);
  if (!unit) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(unit);
});

// Einheit erstellen
router.post('/', async (req, res) => {
  const { property_id, name, type, floor, size_sqm, rooms, rent_cold, rent_utilities, notes } = req.body;
  const result = await db.prepare(`
    INSERT INTO units (property_id, name, type, floor, size_sqm, rooms, rent_cold, rent_utilities, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(property_id, name, type, floor, size_sqm, rooms, rent_cold, rent_utilities, notes);
  const created = await db.prepare('SELECT * FROM units WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Einheit aktualisieren
router.put('/:id', async (req, res) => {
  const { property_id, name, type, floor, size_sqm, rooms, rent_cold, rent_utilities, notes } = req.body;
  await db.prepare(`
    UPDATE units SET property_id=?, name=?, type=?, floor=?, size_sqm=?, rooms=?, rent_cold=?, rent_utilities=?, notes=?
    WHERE id=?
  `).run(property_id, name, type, floor, size_sqm, rooms, rent_cold, rent_utilities, notes, req.params.id);
  const updated = await db.prepare('SELECT * FROM units WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Einheit löschen
router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM units WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
