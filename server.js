const express = require("express");
const path = require("path");
const initDatabase = require("./database");
const { resolveLink } = require("./resolver");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

let database;

app.post("/api/resolve", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        error: "Masukkan URL terlebih dahulu."
      });
    }

    const result = await resolveLink(url.trim());

    database.addHistory(
      result.originalUrl,
      result.finalUrl,
      String(result.status)
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error.message || "Gagal memproses URL."
    });
  }
});

app.get("/api/history", (req, res) => {
  res.json(database.getHistory());
});

async function startServer() {
  try {
    database = await initDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
  } catch (error) {
    console.error("Gagal menjalankan server:", error);
    process.exit(1);
  }
}

startServer();