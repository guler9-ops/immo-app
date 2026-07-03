const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const { category, related_type, related_id } = req.query;
  let query = 'SELECT * FROM documents WHERE 1=1';
  const params = [];
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (related_type) { query += ' AND related_type = ?'; params.push(related_type); }
  if (related_id) { query += ' AND related_id = ?'; params.push(related_id); }
  query += ' ORDER BY created_at DESC';
  const docs = db.prepare(query).all(...params);
  res.json(docs);
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
  const { name, category, related_type, related_id, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO documents (name, category, related_type, related_id, filename, size, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name || req.file.originalname,
    category || 'Sonstiges',
    related_type || null,
    related_id || null,
    req.file.filename,
    req.file.size,
    notes || null
  );
  const created = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.get('/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
  res.download(filePath);
});

router.delete('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (doc) {
    const filePath = path.join(uploadDir, doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  }
  res.json({ success: true });
});

module.exports = router;
