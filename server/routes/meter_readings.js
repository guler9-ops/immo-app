const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
  const { unit_id } = req.query;
  let query = `
    SELECT mr.*, u.name as unit_name, p.name as property_name
    FROM meter_readings mr
    JOIN units u ON u.id = mr.unit_id
    JOIN properties p ON p.id = u.property_id
  `;
  const params = [];
  if (unit_id) { query += ' WHERE mr.unit_id = ?'; params.push(unit_id); }
  query += ' ORDER BY mr.date DESC';
  const readings = await db.prepare(query).all(...params);
  res.json(readings);
});

// Letzter Zählerstand pro Einheit und Typ
router.get('/latest', async (req, res) => {
  const latest = await db.prepare(`
    SELECT mr.unit_id, mr.type, mr.value, mr.date, u.name as unit_name, p.name as property_name
    FROM meter_readings mr
    JOIN units u ON u.id = mr.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE mr.id IN (
      SELECT id FROM meter_readings mr2
      WHERE mr2.unit_id = mr.unit_id AND mr2.type = mr.type
      ORDER BY mr2.date DESC LIMIT 1
    )
    ORDER BY u.name, mr.type
  `).all();
  res.json(latest);
});

router.post('/', async (req, res) => {
  const { unit_id, type, value, date, notes } = req.body;
  const result = await db.prepare(`
    INSERT INTO meter_readings (unit_id, type, value, date, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(unit_id, type, value, date, notes);
  const created = await db.prepare('SELECT * FROM meter_readings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const { unit_id, type, value, date, notes } = req.body;
  await db.prepare(`
    UPDATE meter_readings SET unit_id=?, type=?, value=?, date=?, notes=?
    WHERE id=?
  `).run(unit_id, type, value, date, notes, req.params.id);
  const updated = await db.prepare('SELECT * FROM meter_readings WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM meter_readings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
