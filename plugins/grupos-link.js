import fetch from 'node-fetch'

const handler = async (m, { conn }) => {
  const chat = m.chat

  try {
    const code = await conn.groupInviteCode(chat)
    const link = `🗡️ https://chat.whatsapp.com/${code}`

    let ppUrl = null
    try {
      ppUrl = await conn.profilePictureUrl(chat, 'image')
    } catch {}

    if (ppUrl) {
      const pic = await conn.getFile(ppUrl)
      await conn.sendMessage(
        chat,
        { image: pic.data, caption: link },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        chat,
        { text: link },
        { quoted: m }
      )
    }

    await conn.sendMessage(chat, { react: { text: '✅', key: m.key } })
  } catch {}
}

handler.customPrefix = /^\.?(link)$/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler