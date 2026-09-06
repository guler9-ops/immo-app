const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('../database');

// Dateien werden im Speicher gepuffert und als BLOB in der Datenbank abgelegt.
// So bleiben Uploads auch in einer serverlosen Umgebung (Vercel) erhalten, in der
// das Dateisystem nicht dauerhaft ist.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Spaltenliste OHNE content – der BLOB soll nicht in Listen mitgeladen werden.
const DOC_FIELDS = 'id, name, category, related_type, related_id, filename, size, notes, created_at';

router.get('/', async (req, res) => {
  const { category, related_type, related_id } = req.query;
  let query = `SELECT ${DOC_FIELDS} FROM documents WHERE 1=1`;
  const params = [];
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (related_type) { query += ' AND related_type = ?'; params.push(related_type); }
  if (related_id) { query += ' AND related_id = ?'; params.push(related_id); }
  query += ' ORDER BY created_at DESC';
  const docs = await db.prepare(query).all(...params);
  res.json(docs);
});

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const { name, category, related_type, related_id, notes } = req.body;
  const filename = crypto.randomUUID() + path.extname(req.file.originalname);
  const result = await db.prepare(`
    INSERT INTO documents (name, category, related_type, related_id, filename, size, content, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name || req.file.originalname,
    category || 'Sonstiges',
    related_type || null,
    related_id || null,
    filename,
    req.file.size,
    req.file.buffer,          // BLOB
    notes || null
  );
  const created = await db.prepare(`SELECT ${DOC_FIELDS} FROM documents WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.get('/download/:filename', async (req, res) => {
  const doc = await db.prepare('SELECT name, content FROM documents WHERE filename = ?').get(req.params.filename);
  if (!doc || !doc.content) return res.status(404).json({ error: 'Datei nicht gefunden' });
  const buf = Buffer.from(doc.content);   // Uint8Array/ArrayBuffer -> Buffer

  // Dateiname auf sichere Zeichen begrenzen (verhindert Header-Injection über den
  // ursprünglich vom Nutzer gewählten Namen).
  const safeName = String(doc.name || 'dokument').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100) || 'dokument';

  // Inhalt strikt als Download ausliefern, nie vom Browser interpretieren lassen
  // (kein HTML-Rendering -> keine reflektierte XSS über hochgeladene Inhalte).
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.send(buf);
});

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
