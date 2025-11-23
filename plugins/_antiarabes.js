// plugins/antiarabe.js — sistema completo integrado en un solo export
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// =============== BASE EN ./tmp/ =================
const TMP_DIR = path.join(process.cwd(), "tmp");
const DB_FILE = path.join(TMP_DIR, "antiarabe.json");

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");

const loadDB = () => {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return {}; }
};
const saveDB = d => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

const enableGroup  = id => { const db=loadDB(); db[id]=1; saveDB(db); };
const disableGroup = id => { const db=loadDB(); delete db[id]; saveDB(db); };
const isEnabled    = id => !!loadDB()[id];

// =============== PREFIJOS ARABES =================
const ARABES = [
  "20","212","213","216","218","222","224","230","234","235","237","238","249",
  "250","251","252","253","254","255","257","258","260","263","269","960","961",
  "962","963","964","965","966","967","968","970","971","972","973","974","975","976"
];

const DIGITS = x => String(x || "").replace(/\D/g, "");
const isArab = jid => ARABES.some(p => DIGITS(jid).startsWith(p));

// =============== ADMIN CHECK (LID + NORMAL) =================
const lidParser = arr => arr.map(v => ({
  id: (typeof v?.id === "string" && v.id.endsWith("@lid") && v.jid) ? v.jid : v.id,
  admin: v?.admin ?? null
}));

async function isAdminByNumber(conn, chatId, number) {
  try {
    const meta = await conn.groupMetadata(chatId);
    const raw  = meta?.participants || [];
    const norm = lidParser(raw);

    const adminNums = new Set();
    for (let i = 0; i < raw.length; i++) {
      const r = raw[i], n = norm[i];
      const isAdmin = ["admin","superadmin"].includes(r?.admin) ||
                      ["admin","superadmin"].includes(n?.admin);

      if (isAdmin) {
        [r?.id, r?.jid, n?.id].forEach(x => {
          const d = DIGITS(x || "");
          if (d) adminNums.add(d);
        });
      }
    }
    return adminNums.has(number);
  } catch {
    return false;
  }
}


// =============== COMANDO .antiarabe =================
async function cmd(msg, { conn }) {
  const chat = msg.key.remoteJid;
  if (!chat.endsWith("@g.us"))
    return conn.sendMessage(chat, { text: "❌ Solo en grupos." }, { quoted: msg });

  await conn.sendMessage(chat, { react: { text: "🛡️", key: msg.key } });

  const sender = DIGITS(msg.key.participant || msg.key.remoteJid);
  const isFromMe = msg.key.fromMe;

  const isAdmin = await isAdminByNumber(conn, chat, sender);

  // Cargar owners si quieres
  let owners = [];
  try { owners = JSON.parse(fs.readFileSync(path.join(__dirname, "../owner.json"), "utf8")); }
  catch { owners = global.owner || []; }

  const isOwner = Array.isArray(owners) && owners.some(([id]) => id === sender);

  if (!isAdmin && !isOwner && !isFromMe) {
    return conn.sendMessage(chat, { text: "🚫 Solo admins pueden usar esto." }, { quoted: msg });
  }

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  const opt = (text.split(" ")[1] || "").toLowerCase();

  if (!["on","off"].includes(opt)) {
    return conn.sendMessage(chat, { text: "✳️ Usa:\n\n.antiarabe on / off" }, { quoted: msg });
  }

  if (opt === "on") enableGroup(chat);
  else disableGroup(chat);

  await conn.sendMessage(chat, {
    text: `🛡️ AntiÁrabe ha sido *${opt === "on" ? "activado" : "desactivado"}*.`
  }, { quoted: msg });

  await conn.sendMessage(chat, { react: { text: "✅", key: msg.key } });
}


// =============== DETECTOR AUTOMÁTICO =================
async function detector(update, { conn }) {
  const { id: chatId, participants, action } = update;
  if (action !== "add") return;
  if (!isEnabled(chatId)) return;

  for (const jid of participants) {
    if (isArab(jid)) {
      await conn.groupParticipantsUpdate(chatId, [jid], "remove").catch(() => {});
      await conn.sendMessage(chatId, {
        text: "🚫 Usuario eliminado automáticamente por prefijo árabe."
      });
    }
  }
}


// =============== EXPORT ÚNICO =================
export default {
  command: ["antiarabe"],   // comando
  handler: cmd,             // función del comando
  events: {
    "group-participants.update": detector  // listener de entradas
  }
};