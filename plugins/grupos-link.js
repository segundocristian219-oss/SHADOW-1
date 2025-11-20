import fetch from 'node-fetch'

const handler = async (m, { conn }) => {
  const chat = m.chat

  try {
    const code = await conn.groupInviteCode(chat)
    const link = `https://chat.whatsapp.com/${code}`

    let ppUrl = null
    try {
      ppUrl = await conn.profilePictureUrl(chat, 'image')
    } catch {}

    if (ppUrl) {
      const pic = await conn.getFile(ppUrl)
      await conn.sendMessage(
        chat,
        {
          image: pic.data,
          caption: `🗡️ *Enlace del grupo:*\n${link}`,
          contextInfo: {
            externalAdReply: {
              title: "Invitación al grupo",
              body: "Haz clic para unirte",
              thumbnail: pic.data,
              sourceUrl: link,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        chat,
        {
          text: `🗡️ *Enlace del grupo:*\n${link}`,
          contextInfo: {
            externalAdReply: {
              title: "Invitación al grupo",
              body: "Haz clic para unirte",
              sourceUrl: link,
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        },
        { quoted: m }
      )
    }

    await conn.sendMessage(chat, { react: { text: '🔗', key: m.key } })
  } catch {}
}

handler.customPrefix = /^\.?(link)$/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler