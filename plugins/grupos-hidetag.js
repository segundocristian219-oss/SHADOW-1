import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

let thumb
fetch('https://i.postimg.cc/rFfVL8Ps/image.jpg')
  .then(r => r.arrayBuffer())
  .then(buf => thumb = Buffer.from(buf))
  .catch(() => thumb = null)

const handler = async (m, { conn, participants }) => {
  if (!m.isGroup || m.key.fromMe) return

  const content = m.text || m.msg?.caption || ''
  if (!/^.?n(\s|$)/i.test(content.trim())) return

  await conn.sendMessage(m.chat, { react: { text: '🔊', key: m.key } })

  const users = participants.map(u => conn.decodeJid(u.id))
  const userText = content.trim().replace(/^.?n(\s|$)/i, '')
  const finalText = userText || ''
  const q = m.quoted ? m.quoted : m
  const mtype = q.mtype || ''
  const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(mtype)
  const originalCaption = (q.msg?.caption || q.text || '').trim()
  const finalCaption = finalText || originalCaption || '🔊 Notificación'

  try {
    if (m.quoted && isMedia) {
      const media = await q.download()
      if (mtype === 'audioMessage') {
        await conn.sendMessage(m.chat, { audio: media, mimetype: 'audio/mpeg', ptt: false, mentions: users })
        if (finalText) await conn.sendMessage(m.chat, { text: finalText, mentions: users, detectLink: true })
      } else {
        const msg = { mentions: users, detectLink: true }
        if (mtype === 'imageMessage') msg.image = media, msg.caption = finalCaption
        if (mtype === 'videoMessage') msg.video = media, msg.caption = finalCaption, msg.mimetype = 'video/mp4'
        if (mtype === 'stickerMessage') msg.sticker = media
        await conn.sendMessage(m.chat, msg)
      }
    } else if (m.quoted && !isMedia) {
      await conn.sendMessage(m.chat, { text: finalCaption, mentions: users, detectLink: true })
    } else if (!m.quoted && isMedia) {
      const media = await m.download()
      if (mtype === 'audioMessage') {
        await conn.sendMessage(m.chat, { audio: media, mimetype: 'audio/mpeg', ptt: false, mentions: users })
        if (finalText) await conn.sendMessage(m.chat, { text: finalText, mentions: users, detectLink: true })
      } else {
        const msg = { mentions: users, detectLink: true }
        if (mtype === 'imageMessage') msg.image = media, msg.caption = finalCaption
        if (mtype === 'videoMessage') msg.video = media, msg.caption = finalCaption, msg.mimetype = 'video/mp4'
        if (mtype === 'stickerMessage') msg.sticker = media
        await conn.sendMessage(m.chat, msg)
      }
    } else {
      await conn.sendMessage(m.chat, { text: finalCaption, mentions: users, detectLink: true })
    }
  } catch {
    await conn.sendMessage(m.chat, { text: '🔊 Notificación', mentions: users, detectLink: true })
  }
}

handler.customPrefix = /^.?n(\s|$)/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler