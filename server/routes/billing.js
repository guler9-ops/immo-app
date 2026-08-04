// AllDesk Immo – Stripe-Einmalkauf (Lizenz für X Monate).
// Konfiguration ausschließlich über Umgebungsvariablen (keine Preise im Code):
//   STRIPE_SECRET_KEY      – Stripe Secret Key (gleiches Konto wie ERP)
//   STRIPE_WEBHOOK_SECRET  – Signing-Secret des Immo-Webhooks
//   IMMO_PRICE_CENTS       – Preis in Cent (brutto), z. B. 29900
//   IMMO_PERIOD_MONTHS     – Laufzeit je Kauf in Monaten (Default 12)
//   APP_URL                – öffentliche URL der App (für success/cancel)
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PRICE_CENTS = parseInt(process.env.IMMO_PRICE_CENTS || '0', 10);
const PERIOD_MONTHS = parseInt(process.env.IMMO_PERIOD_MONTHS || '12', 10);
const APP_URL = (process.env.APP_URL || 'https://immo-app-production-4312.up.railway.app').replace(/\/$/, '');
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || (APP_URL + '/?bezahlt=1');
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || (APP_URL + '/?abbruch=1');

async function stripe(path, params) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + STRIPE_SECRET, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || ('Stripe HTTP ' + r.status));
  return d;
}

// Token dekodieren OHNE Lizenz-Sperre (Kauf/Refresh müssen auch bei abgelaufener Lizenz gehen)
function userFromToken(req) {
  const a = req.headers.authorization || '';
  if (!a.startsWith('Bearer ')) return null;
  try { return jwt.verify(a.slice(7), JWT_SECRET); } catch (e) { return null; }
}

function issueToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, plan: user.plan, license_expires_at: user.license_expires_at },
    JWT_SECRET, { expiresIn: '7d' }
  );
}

function extendLicense(userId, months) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  const base = user.license_expires_at && new Date(user.license_expires_at) > new Date()
    ? new Date(user.license_expires_at) : new Date();
  base.setMonth(base.getMonth() + (parseInt(months, 10) || PERIOD_MONTHS));
  const newExpiry = base.toISOString().slice(0, 10);
  db.prepare('UPDATE users SET license_expires_at = ?, plan = ? WHERE id = ?').run(newExpiry, 'paid', userId);
  return newExpiry;
}

// Öffentliche Preis-/Verfügbarkeitsinfo für den Kauf-Screen
router.get('/config', (req, res) => {
  res.json({
    enabled: !!(STRIPE_SECRET && PRICE_CENTS > 0),
    price_cents: PRICE_CENTS,
    period_months: PERIOD_MONTHS,
    currency: 'eur',
  });
});

// Checkout starten (angemeldet, aber Lizenz darf abgelaufen sein)
router.post('/checkout', async (req, res) => {
  const u = userFromToken(req);
  if (!u) return res.status(401).json({ error: 'Nicht angemeldet' });
  if (!STRIPE_SECRET || PRICE_CENTS <= 0) return res.status(400).json({ error: 'Zahlung noch nicht konfiguriert' });
  const dbUser = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(u.id);
  if (!dbUser) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
  try {
    const params = {
      'mode': 'payment',
      'success_url': SUCCESS_URL,
      'cancel_url': CANCEL_URL,
      'client_reference_id': String(dbUser.id),
      'metadata[userId]': String(dbUser.id),
      'metadata[months]': String(PERIOD_MONTHS),
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][product_data][name]': 'AllDesk Immo – Lizenz ' + PERIOD_MONTHS + ' Monate',
      'line_items[0][price_data][unit_amount]': String(PRICE_CENTS),
      'line_items[0][quantity]': '1',
    };
    if (dbUser.email) params['customer_email'] = dbUser.email;
    const session = await stripe('checkout/sessions', params);
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: 'Stripe: ' + e.message });
  }
});

// Nach der Zahlung: frisches Token mit aktualisierter Lizenz holen (verlängert der Webhook)
router.post('/refresh', (req, res) => {
  const u = userFromToken(req);
  if (!u) return res.status(401).json({ error: 'Nicht angemeldet' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
  if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
  const expired = user.role !== 'admin' && new Date(user.license_expires_at) < new Date();
  res.json({
    token: issueToken(user),
    user: { id: user.id, username: user.username, role: user.role, license_expires_at: user.license_expires_at },
    license_expired: expired,
  });
});

// Webhook (RAW Body!) – wird in index.js VOR express.json gemountet.
function webhookHandler(req, res) {
  const raw = req.body; // Buffer (express.raw)
  if (STRIPE_WEBHOOK_SECRET) {
    try {
      const sig = req.headers['stripe-signature'] || '';
      const parts = Object.fromEntries(sig.split(',').map(p => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
      const signed = parts.t + '.' + raw.toString('utf8');
      const expected = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signed).digest('hex');
      const a = Buffer.from(parts.v1 || '', 'utf8'), b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).send('bad signature');
    } catch (e) { return res.status(400).send('bad signature'); }
  }
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch (e) { return res.status(400).send('bad payload'); }
  try {
    if (event.type === 'checkout.session.completed') {
      const obj = event.data.object || {};
      if (obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required') {
        const userId = (obj.metadata && obj.metadata.userId) || obj.client_reference_id;
        const months = (obj.metadata && obj.metadata.months) || PERIOD_MONTHS;
        if (userId) {
          const exp = extendLicense(parseInt(userId, 10), months);
          console.log('💳 Immo: Lizenz verlängert für User', userId, '→', exp);
        }
      }
    }
  } catch (e) { console.warn('Immo Stripe-Webhook:', e.message); }
  res.json({ received: true });
}

module.exports = { router, webhookHandler };
