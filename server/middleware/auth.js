const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'immo-secret-key-change-in-production';

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht angemeldet' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    req.user = decoded;

    // Lizenz prüfen (außer für Admin)
    if (decoded.role !== 'admin') {
      const expires = new Date(decoded.license_expires_at);
      if (expires < new Date()) {
        return res.status(403).json({ error: 'Lizenz abgelaufen', code: 'LICENSE_EXPIRED' });
      }
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Ungültiges Token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Kein Zugriff' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
