const handler = async (m, { conn }) => {
  const chat = m.chat;

  conn.sendMessage(chat, {
    react: { text: "🔗", key: m.key }
  });

  try {
    const [meta, code] = await Promise.all([
      conn.groupMetadata(chat),
      conn.groupInviteCode(chat).catch(() => null)
    ]);

    const groupName = meta.subject || "Grupo";
    const link = code 
      ? `https://chat.whatsapp.com/${code}` 
      : "Sin enlace disponible";

    const fallback = "https://files.catbox.moe/xr2m6u.jpg";
    let ppBuffer;

    try {
      const url = await conn.profilePictureUrl(chat, "image").catch(() => null);
      if (url) {
        const controller = new AbortController();
        const idTimeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(idTimeout);
        if (res.ok) ppBuffer = Buffer.from(await res.arrayBuffer());
      }
    } catch {}

    if (!ppBuffer) {
      const res = await fetch(fallback);
      ppBuffer = Buffer.from(await res.arrayBuffer());
    }

    await conn.sendMessage(
      chat,
      {
        image: ppBuffer,
        caption: `*${groupName}*\n${link}`
      },
      { quoted: m }
    );

  } catch (err) {
    console.error("Error en .link:", err);
  }
};

handler.help = ["𝖫𝗂𝗇𝗄"];
handler.tags = ["𝖦𝖱𝖴𝖯𝖮𝖲"];
handler.customPrefix = /^\.?(link)$/i;
handler.command = new RegExp();
handler.group = true;
handler.admin = true;

export default handler;