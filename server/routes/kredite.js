const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM kredite ORDER BY created_at DESC').all());
});

router.post('/', (req, res) => {
  const { bank, objekt, zweck, kreditsumme, restschuld, tilgung, zinsen, rate, startdatum, laufzeit, status, notizen } = req.body;
  const result = db.prepare(`
    INSERT INTO kredite (bank, objekt, zweck, kreditsumme, restschuld, tilgung, zinsen, rate, startdatum, laufzeit, status, notizen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bank, objekt, zweck, kreditsumme, restschuld || kreditsumme, tilgung, zinsen, rate, startdatum, laufzeit, status || 'aktiv', notizen);
  res.status(201).json(db.prepare('SELECT * FROM kredite WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { bank, objekt, zweck, kreditsumme, restschuld, tilgung, zinsen, rate, startdatum, laufzeit, status, notizen } = req.body;
  db.prepare(`
    UPDATE kredite SET bank=?, objekt=?, zweck=?, kreditsumme=?, restschuld=?, tilgung=?, zinsen=?, rate=?, startdatum=?, laufzeit=?, status=?, notizen=? WHERE id=?
  `).run(bank, objekt, zweck, kreditsumme, restschuld, tilgung, zinsen, rate, startdatum, laufzeit, status, notizen, req.params.id);
  res.json(db.prepare('SELECT * FROM kredite WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM kredite WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
