const express = require("express");
const cors = require("cors");
const fs = require("fs");
const xlsx = require("xlsx");
const { google } = require("googleapis");

const USERS_PATH = "./users.json";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

/* ================= GOOGLE AUTH (PRODUCCIÓN) ================= */

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

auth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth });

/* ================= HELPERS ================= */

async function getFileIdByName(name) {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id, name)",
  });
  return res.data.files[0]?.id;
}

async function downloadExcel(fileId) {
  const res = await drive.files.export(
    {
      fileId,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}

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

app.get("/api/test", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = getUser(email, password);
  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  res.json({ ok: true, excel: user.excel });
});

/* DIETA */
app.get("/api/dieta/:file/hoja/:sheet", async (req, res) => {
  try {
    const { file, sheet } = req.params;

    const fileId = await getFileIdByName(file);
    if (!fileId) return res.status(404).json({ error: "Excel no encontrado" });

    const buffer = await downloadExcel(fileId);
    const workbook = xlsx.read(buffer, { type: "buffer" });

    const worksheet = workbook.Sheets[sheet];
    if (!worksheet)
      return res.status(404).json({ error: "Hoja no encontrada" });

    const data = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error leyendo hoja" });
  }
});

/* RECETA */
app.get("/api/receta/:file/:sheet/:nombre", async (req, res) => {
  try {
    const { file, sheet, nombre } = req.params;
    const buscado = decodeURIComponent(nombre).toLowerCase().trim();

    const fileId = await getFileIdByName(file);
    if (!fileId) return res.status(404).json({ error: "Excel no encontrado" });

    const buffer = await downloadExcel(fileId);
    const workbook = xlsx.read(buffer, { type: "buffer" });

    const worksheet = workbook.Sheets[sheet];
    if (!worksheet)
      return res.status(404).json({ error: "Hoja no encontrada" });

    const rows = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    const nameIndex = rows.findIndex(
      (r) => r[0]?.toString().toLowerCase().trim() === buscado
    );

    if (nameIndex === -1)
      return res.status(404).json({ error: "Receta no encontrada" });

    let startIndex = -1;
    for (let i = nameIndex - 1; i >= 0; i--) {
      if (!isNaN(Number(rows[i][0]))) {
        startIndex = i;
        break;
      }
    }

    const ingredientes = rows
      .slice(startIndex + 1, nameIndex)
      .filter((r) => r[0])
      .map((r) => ({
        ingrediente: r[0],
        cantidad: r[1] || "",
      }));

    res.json({
      numero: Number(rows[startIndex][0]),
      nombre: rows[nameIndex][0],
      ingredientes,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error leyendo receta" });
  }
});

/* START */
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
