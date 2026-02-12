const express = require("express");
const cors = require("cors");
const fs = require("fs");

const USERS_PATH = "./users.json";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

/* ================= HELPERS ================= */

function getUser(email, password) {
  const users = JSON.parse(fs.readFileSync(USERS_PATH, "utf8"));

  const user = users[email];
  if (!user) return null;

  if (user.password !== password) return null;

  return {
    email,
    excel: user.excel,
  };
}

/* ================= API ================= */

app.get("/", (req, res) => {
  res.json({ status: "Backend funcionando correctamente 🚀" });
});

/* LOGIN */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const user = getUser(email, password);

  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  res.json({
    ok: true,
    excel: user.excel,
  });
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
