const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, t.first_name || ' ' || t.last_name as tenant_name
    FROM messages m
    LEFT JOIN tenants t ON t.id = m.tenant_id
    ORDER BY m.sent_at DESC
  `).all();
  res.json(messages);
});

router.post('/', (req, res) => {
  const { tenant_id, type, subject, content } = req.body;
  const result = db.prepare(`
    INSERT INTO messages (tenant_id, type, subject, content)
    VALUES (?, ?, ?, ?)
  `).run(tenant_id || null, type, subject, content);
  const created = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
