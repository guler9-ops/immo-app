const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `IMMO-${seg()}-${seg()}-${seg()}`;
}

// Alle Kunden auflisten
router.get('/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, email, role, license_expires_at, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// Kunden anlegen
router.post('/users', requireAuth, requireAdmin, (req, res) => {
  const { username, email, password, duration_months = 12 } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: 'Username bereits vergeben' });

  const hash = bcrypt.hashSync(password, 10);
  const expires = new Date();
  expires.setMonth(expires.getMonth() + duration_months);
  const license_expires_at = expires.toISOString().slice(0, 10);

  const result = db.prepare(
    "INSERT INTO users (username, email, password_hash, role, license_expires_at) VALUES (?, ?, ?, 'customer', ?)"
  ).run(username, email || null, hash, license_expires_at);

  const user = db.prepare('SELECT id, username, email, role, license_expires_at, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// Kunden-Passwort ändern
router.put('/users/:id', requireAuth, requireAdmin, (req, res) => {
  const { password, license_expires_at, email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden' });

  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), user.id);
  }
  if (license_expires_at) {
    db.prepare('UPDATE users SET license_expires_at = ? WHERE id = ?').run(license_expires_at, user.id);
  }
  if (email !== undefined) {
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, user.id);
  }
  res.json(db.prepare('SELECT id, username, email, role, license_expires_at FROM users WHERE id = ?').get(user.id));
});

// Kunden löschen
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ? AND role != "admin"').run(req.params.id);
  res.json({ success: true });
});

// Lizenzcode generieren
router.post('/license-codes', requireAuth, requireAdmin, (req, res) => {
  const { user_id, duration_months = 12 } = req.body;
  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
  } while (db.prepare('SELECT id FROM license_codes WHERE code = ?').get(code) && attempts < 10);

  const result = db.prepare(
    'INSERT INTO license_codes (code, user_id, duration_months) VALUES (?, ?, ?)'
  ).run(code, user_id || null, duration_months);

  res.status(201).json(db.prepare('SELECT * FROM license_codes WHERE id = ?').get(result.lastInsertRowid));
});

// Alle Lizenzcodes auflisten
router.get('/license-codes', requireAuth, requireAdmin, (req, res) => {
  const codes = db.prepare(`
    SELECT lc.*, u.username FROM license_codes lc
    LEFT JOIN users u ON u.id = lc.user_id
    ORDER BY lc.created_at DESC
  `).all();
  res.json(codes);
});

// Lizenzcode löschen (nur unbenutzte)
router.delete('/license-codes/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM license_codes WHERE id = ? AND used = 0').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
