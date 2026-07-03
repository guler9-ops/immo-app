const express = require('express');
const router = express.Router();
const db = require('../database');

const MAX_OWNERS = 10;

router.get('/', (req, res) => {
  const owners = db.prepare('SELECT * FROM owners ORDER BY created_at ASC').all();
  const propertyCount = db.prepare('SELECT COUNT(*) as count FROM properties').get().count;
  res.json({ owners, propertyCount, licensePerProperty: 9.99 });
});

router.post('/', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM owners').get().count;
  if (count >= MAX_OWNERS) {
    return res.status(400).json({ error: `Maximal ${MAX_OWNERS} Eigentümer erlaubt.` });
  }
  const { salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO owners (salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share || 100, role || 'Eigentümer', notes);
  res.status(201).json(db.prepare('SELECT * FROM owners WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes } = req.body;
  db.prepare(`
    UPDATE owners SET salutation=?, first_name=?, last_name=?, email=?, phone=?, address=?, zip=?, city=?, iban=?, tax_number=?, ownership_share=?, role=?, notes=?
    WHERE id=?
  `).run(salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM owners WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM owners WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
