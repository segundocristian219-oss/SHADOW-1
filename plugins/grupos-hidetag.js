let handler = async (m, { conn }) => {
  try {
    if (!m.isGroup)
      return conn.reply(m.chat, '⚠️ Este comando solo funciona en grupos.', m);

    // Texto después del .n
    const body = m.text || '';
    const text = body.replace(/^(\.n|n)\s*/i, '').trim();

    // Info del grupo
    const groupMetadata = await conn.groupMetadata(m.chat);
    const participants = groupMetadata.participants.map(p => p.id);
    const botNumber = conn.user?.id || conn.user?.jid;
    const mentions = participants.filter(id => id !== botNumber);

    // === CASO 1: Mensaje citado (foto, video, sticker, etc.) ===
    if (m.quoted) {
      const quoted = m.quoted;
      const msg = quoted.msg || quoted;

      await conn.sendMessage(m.chat, {
        text: '📣 *Notificación:* mensaje reenviado',
        mentions
      }, { quoted: m });

      // Detectamos tipo de mensaje citado
      const type = Object.keys(msg)[0];
      const content = msg[type];

      // Si es imagen, video o sticker
      if (/(image|video|sticker|document|audio)/.test(type)) {
        const media = await quoted.download?.(); // Descarga el contenido
        if (media) {
          await conn.sendMessage(m.chat, {
            [type.split('Message')[0]]: media,
            caption: quoted.text || quoted.caption || '',
            mentions
          }, { quoted: m });
          return;
        }
      }

      // Si no es media, reenviamos directamente el texto
      await conn.sendMessage(m.chat, {
        text: quoted.text || '📄 *Mensaje reenviado*',
        mentions
      }, { quoted: m });
      return;
    }

    // === CASO 2: Texto simple (.n hola) ===
    if (text.length > 0) {
      await conn.sendMessage(m.chat, {
        text: '📣 *Notificación:* mensaje reenviado',
        mentions
      }, { quoted: m });

      await conn.sendMessage(m.chat, { text, mentions }, { quoted: m });
      return;
    }

    // === CASO 3: Nada ===
    await conn.reply(m.chat, '❌ No hay nada para reenviar.', m);

  } catch (err) {
    console.error('Error en .n:', err);
    await conn.reply(m.chat, '❌ Ocurrió un error al reenviar.\n' + err.message, m);
  }
};

handler.customPrefix = /^(\.n|n)(\s|$)/i;
handler.command = new RegExp();
handler.group = true;
export default handler;