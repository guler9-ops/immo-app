// Vercel Serverless Function – Einstiegspunkt für alle /api/*-Requests.
// Die vollständige Express-App wird aus dem server-Verzeichnis geladen und von
// Vercel als Request-Handler aufgerufen. Das Routing (/api/(.*) -> /api) regelt
// vercel.json.
module.exports = require('../server/app');
