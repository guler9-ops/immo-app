const express = require('express');
const router = express.Router();
const db = require('../database');

const MAX_OWNERS = 10;

router.get('/', async (req, res) => {
  const owners = await db.prepare('SELECT * FROM owners ORDER BY created_at ASC').all();
  const propertyCount = (await db.prepare('SELECT COUNT(*) as count FROM properties').get()).count;
  res.json({ owners, propertyCount, licensePerProperty: 9.99 });
});

router.post('/', async (req, res) => {
  const count = (await db.prepare('SELECT COUNT(*) as count FROM owners').get()).count;
  if (count >= MAX_OWNERS) {
    return res.status(400).json({ error: `Maximal ${MAX_OWNERS} Eigentümer erlaubt.` });
  }
  const { salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes } = req.body;
  const result = await db.prepare(`
    INSERT INTO owners (salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share || 100, role || 'Eigentümer', notes);
  res.status(201).json(await db.prepare('SELECT * FROM owners WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', async (req, res) => {
  const { salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes } = req.body;
  await db.prepare(`
    UPDATE owners SET salutation=?, first_name=?, last_name=?, email=?, phone=?, address=?, zip=?, city=?, iban=?, tax_number=?, ownership_share=?, role=?, notes=?
    WHERE id=?
  `).run(salutation, first_name, last_name, email, phone, address, zip, city, iban, tax_number, ownership_share, role, notes, req.params.id);
  res.json(await db.prepare('SELECT * FROM owners WHERE id = ?').get(req.params.id));
});

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM owners WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
