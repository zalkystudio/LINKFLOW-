
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "database", "history.db");

async function initDatabase() {
  const SQL = await initSqlJs();

  let db;

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_url TEXT NOT NULL,
      final_url TEXT,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  function save() {
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  }

  function addHistory(original, finalUrl, status) {
    db.run(
      "INSERT INTO history (original_url, final_url, status) VALUES (?, ?, ?)",
      [original, finalUrl || null, status]
    );
    save();
  }

  function getHistory() {
    const result = db.exec(
      "SELECT * FROM history ORDER BY id DESC LIMIT 50"
    );

    if (!result.length) return [];

    return result[0].values.map(row =>
      Object.fromEntries(
        result[0].columns.map((col, i) => [col, row[i]])
      )
    );
  }

  return { addHistory, getHistory };
}

module.exports = initDatabase;
