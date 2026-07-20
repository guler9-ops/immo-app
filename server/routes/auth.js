const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, plan: user.plan, license_expires_at: user.license_expires_at },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  const token = makeToken(user);
  const expired = user.role !== 'admin' && new Date(user.license_expires_at) < new Date();

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, license_expires_at: user.license_expires_at },
    license_expired: expired
  });
});

// Aktuellen User abrufen
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, license_expires_at, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Lizenzcode einlösen
router.post('/activate', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code erforderlich' });

  const lc = db.prepare('SELECT * FROM license_codes WHERE code = ? AND used = 0').get(code.trim().toUpperCase());
  if (!lc) return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Code' });

  // Lizenz verlängern: ab heute oder ab aktuellem Ablauf (je nachdem was später ist)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const base = user.license_expires_at && new Date(user.license_expires_at) > new Date()
    ? new Date(user.license_expires_at)
    : new Date();
  base.setMonth(base.getMonth() + lc.duration_months);
  const newExpiry = base.toISOString().slice(0, 10);

  db.prepare('UPDATE users SET license_expires_at = ? WHERE id = ?').run(newExpiry, user.id);
  db.prepare('UPDATE license_codes SET used = 1, used_at = datetime("now"), user_id = ? WHERE id = ?').run(user.id, lc.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const token = makeToken(updated);
  res.json({ token, user: updated, license_expires_at: newExpiry });
});

// Demo-Account anlegen (7 Tage)
router.post('/demo', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Gültige E-Mail erforderlich' });

  // Prüfen ob bereits Demo mit dieser E-Mail
  const existing = db.prepare('SELECT * FROM users WHERE email = ? AND plan = "demo"').get(email);
  if (existing) {
    // Einfach einloggen
    const token = makeToken(existing);
    const expired = new Date(existing.license_expires_at) < new Date();
    return res.json({ token, user: existing, license_expired: expired });
  }

  // Username aus E-Mail ableiten (einzigartig machen)
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
  let username = `demo_${base}`;
  let counter = 1;
  while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    username = `demo_${base}${counter++}`;
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  const license_expires_at = expires.toISOString().slice(0, 10);
  const hash = bcrypt.hashSync(Math.random().toString(36).slice(2), 8);

  const result = db.prepare(
    "INSERT INTO users (username, email, password_hash, role, plan, license_expires_at) VALUES (?, ?, ?, 'customer', 'demo', ?)"
  ).run(username, email, hash, license_expires_at);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = makeToken(user);
  res.status(201).json({ token, user, license_expired: false, is_new: true });
});

module.exports = router;
