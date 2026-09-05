// Lokaler / Railway-Start: Express-App aus app.js laden und lauschen.
// (Auf Vercel wird stattdessen api/index.js als Serverless-Function verwendet.)
const app = require('./app');
const db = require('./database');

const PORT = process.env.PORT || 3001;

// DB vorab initialisieren, damit der erste Request nicht warten muss.
db.ready().catch((e) => console.error('DB-Init fehlgeschlagen:', e));

app.listen(PORT, () => {
  console.log(`\n🏠 ImmoApp Server läuft auf http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
});
