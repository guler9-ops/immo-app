const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { year, property_id } = req.query;
  let query = `
    SELECT c.*, p.name as property_name
    FROM costs c
    LEFT JOIN properties p ON p.id = c.property_id
    WHERE 1=1
  `;
  const params = [];
  if (year) { query += ` AND strftime('%Y', c.date) = ?`; params.push(year); }
  if (property_id) { query += ` AND c.property_id = ?`; params.push(property_id); }
  query += ` ORDER BY c.date DESC`;
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { date, amount, category, description, property_id, allocatable } = req.body;
  const result = db.prepare(`
    INSERT INTO costs (date, amount, category, description, property_id, allocatable)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(date, amount, category, description, property_id || null, allocatable ?? 1);
  const created = db.prepare(`
    SELECT c.*, p.name as property_name FROM costs c
    LEFT JOIN properties p ON p.id = c.property_id WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const { date, amount, category, description, property_id, allocatable } = req.body;
  db.prepare(`
    UPDATE costs SET date=?, amount=?, category=?, description=?, property_id=?, allocatable=? WHERE id=?
  `).run(date, amount, category, description, property_id || null, allocatable ?? 1, req.params.id);
  const updated = db.prepare(`
    SELECT c.*, p.name as property_name FROM costs c
    LEFT JOIN properties p ON p.id = c.property_id WHERE c.id = ?
  `).get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM costs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
