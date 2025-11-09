async function handler(m, { conn }) {
  let group = m.chat
  let link = 'https://chat.whatsapp.com/' + await conn.groupInviteCode(group)
  await conn.reply(m.chat, link, m, { detectLink: true })
}

handler.command = ['link', 'enlace']
handler.group = true
handler.admin = true

export default handler