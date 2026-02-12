const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");

const CREDENTIALS_PATH = "./credentials.json";
const TOKEN_PATH = "./token.json";

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/drive.readonly"],
});

console.log("Abre esta URL en el navegador:");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Pega aquí el código: ", (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error("Error", err);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log("Token guardado correctamente");
  });
});
