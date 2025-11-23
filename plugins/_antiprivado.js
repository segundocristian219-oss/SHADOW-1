export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
  if (m.isBaileys && m.fromMe) return true;
  if (m.isGroup) return false;
  if (!m.message || !m.text) return true;

  const keywords = /PIEDRA|PAPEL|TIJERA|serbot|jadibot/i;
  if (keywords.test(m.text)) return true;

  const botSettings = global.db.data.settings?.[this.user.jid] || {};
  if (botSettings.antiPrivate && !isOwner && !isROwner) {
    await m.reply(
      `> "⭐ Hola @${m.sender.split`@`[0]}, lo siento, no está permitido escribirme al privado ⚠️. Serás bloqueado/a.\n\n> ⭐ Puedes comunicarte con mi creador para más información:\n\n 𝑪𝒓𝒊𝒔𝒕𝒊𝒂𝒏: wa.me/5215565238431"`,
      false,
      { mentions: [m.sender] }
    );
    await this.updateBlockStatus(m.chat, 'block');
  }

  return false;
}