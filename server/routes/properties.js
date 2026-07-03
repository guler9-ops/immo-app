const express = require('express');
const router = express.Router();
const db = require('../database');

// Alle Objekte
router.get('/', (req, res) => {
  const properties = db.prepare(`
    SELECT p.*, COUNT(u.id) as unit_count
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(properties);
});

// Einzelnes Objekt
router.get('/:id', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!property) return res.status(404).json({ error: 'Nicht gefunden' });
  const units = db.prepare('SELECT * FROM units WHERE property_id = ?').all(req.params.id);
  res.json({ ...property, units });
});

// Objekt erstellen
router.post('/', (req, res) => {
  const { name, address, city, zip, type, purchase_price, purchase_date, transfer_date, payment_date,
          land_share, building_share, total_sqm, mea, distribution_key, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO properties (name, address, city, zip, type, purchase_price, purchase_date,
      transfer_date, payment_date, land_share, building_share, total_sqm, mea, distribution_key, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, address, city, zip, type, purchase_price, purchase_date,
         transfer_date, payment_date, land_share, building_share, total_sqm, mea,
         distribution_key || 'sqm', notes);
  res.status(201).json(db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid));
});

// Objekt aktualisieren
router.put('/:id', (req, res) => {
  const { name, address, city, zip, type, purchase_price, purchase_date, transfer_date, payment_date,
          land_share, building_share, total_sqm, mea, distribution_key, notes } = req.body;
  db.prepare(`
    UPDATE properties SET name=?, address=?, city=?, zip=?, type=?, purchase_price=?, purchase_date=?,
      transfer_date=?, payment_date=?, land_share=?, building_share=?, total_sqm=?, mea=?,
      distribution_key=?, notes=?
    WHERE id=?
  `).run(name, address, city, zip, type, purchase_price, purchase_date,
         transfer_date, payment_date, land_share, building_share, total_sqm, mea,
         distribution_key || 'sqm', notes, req.params.id);
  res.json(db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id));
});

// Objekt löschen
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
