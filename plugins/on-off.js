let handler = async (m, { conn, command, args, isOwner, isAdmin, isROwner }) => {
  let isEnable = /true|enable|on|1/i.test(command);
  let type = (args[0] || '').toLowerCase();

  const chat = global.db.data.chats[m.chat] || {};
  const bot = global.db.data.settings[conn.user.jid] || {};

  switch (type) {

    // ANTI-LINK
    case 'antilink':
      if (m.isGroup && !(isAdmin || isOwner)) {
        global.dfail('admin', m, conn);
        throw false;
      }
      chat.antiLink = isEnable;
      break;

    // ANTI-PRIVADO
    case 'antiprivado':
    case 'private':
      if (!isROwner) {
        global.dfail('rowner', m, conn);
        throw false;
      }
      bot.antiPrivate = isEnable;
      break;

    // ANTI-ARABES
    case 'antiarabes':
    case 'antiárabes':
    case 'arabes':
      if (m.isGroup && !(isAdmin || isOwner)) {
        global.dfail('admin', m, conn);
        throw false;
      }
      chat.antiArabes = isEnable;
      break;

    default:
      return m.reply('⚠️ Debes indicar un sistema válido:\n\n`antilink`, `antiprivado`, `antiarabes`');
  }

  m.reply(`🗣️ El sistema *${type}* fue *${isEnable ? 'Activado' : 'Desactivado'}*`);
};

handler.help = ['enable <sistema>', 'disable <sistema>'];
handler.tags = ['moderacion'];
handler.command = /^(enable|disable|on|off|1|0)$/i;

export default handler;