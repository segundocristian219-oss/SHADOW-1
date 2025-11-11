let handler = async (m, { conn }) => {
  try {
    if (!m.isGroup) 
      return conn.reply(m.chat, '⚠️ Este comando solo funciona en grupos.', m);

    // Si hay un mensaje citado, reenviar ese; si no, reenviar el mismo
    const messageToForward = m.quoted ? m.quoted : m;

    if (!messageToForward.message)
      return conn.reply(m.chat, '❌ No hay ningún mensaje para reenviar.', m);

    // Obtener participantes del grupo
    const meta = await conn.groupMetadata(m.chat);
    let participants = meta.participants.map(p => p.id);
    const botId = conn.user?.id || conn.user?.jid;
    if (botId) participants = participants.filter(id => id !== botId);

    // Enviar notificación arriba
    await conn.sendMessage(m.chat, {
      text: '📣 *Notificación: mensaje reenviado*',
      mentions: participants
    }, { quoted: m });

    // Reenviar el mensaje original (texto, imagen, video, sticker, etc.)
    await conn.copyNForward(m.chat, messageToForward, false, { readViewOnce: true });

  } catch (err) {
    console.error('Error en .n:', err);
    await conn.reply(m.chat, '❌ Ocurrió un error al reenviar.\n\n' + err.message, m);
  }
}

handler.customPrefix = /^(\.n|n)(\s|$)/i;
handler.command = new RegExp();
handler.group = true;
export default handler;