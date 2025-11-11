import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'

let thumb
fetch('https://i.postimg.cc/rFfVL8Ps/image.jpg')
  .then(r => r.arrayBuffer())
  .then(buf => thumb = Buffer.from(buf))
  .catch(() => thumb = null)

const handler = async (m, { conn, participants }) => {
  if (!m.isGroup || m.key.fromMe) return

  const fkontak = {
    key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
    message: { locationMessage: { name: '𝖧𝗈𝗅𝖺, 𝖲𝗈𝗒 𝖡𝖺𝗄𝗂-𝖡𝗈𝗍', jpegThumbnail: thumb } },
    participant: '0@s.whatsapp.net'
  }

  const content = m.text || m.msg?.caption || ''
  if (!/^\.?n(\s|$)/i.test(content.trim())) return

  await conn.sendMessage(m.chat, { react: { text: '🔊', key: m.key } })

  const users = participants.map(u => conn.decodeJid(u.id))
  const userText = content.trim().replace(/^\.?n(\s|$)/i, '')
  const finalText = userText || ''
  const q = m.quoted ? m.quoted : m
  const mtype = q.mtype || ''
  const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(mtype)
  const originalCaption = (q.msg?.caption || q.text || '').trim()
  const finalCaption = finalText || originalCaption || '🔊 Notificación'
  const hasLink = /https?:\/\/\S+/.test(finalCaption)

  try {
    if (m.quoted && isMedia) {
      const media = await q.download()
      const tasks = []

      if (mtype === 'audioMessage') {
        tasks.push(conn.sendMessage(
          m.chat,
          { audio: media, mimetype: 'audio/mpeg', ptt: false, mentions: users },
          { quoted: fkontak }
        ))

        if (finalText) {
          if (hasLink) {
            tasks.push(conn.sendMessage(m.chat, { text: finalText, mentions: users, detectLink: true }))
          } else {
            tasks.push(conn.sendMessage(m.chat, { text: finalText, mentions: users, detectLink: true }, { quoted: fkontak }))
          }
        }
      } else {
        if (mtype === 'imageMessage') {
          const captionHasLink = /https?:\/\/\S+/.test(originalCaption)
          if (captionHasLink && !finalText) {
            tasks.push(conn.sendMessage(m.chat, { image: media, caption: '', mentions: users }, { quoted: fkontak }))
            tasks.push(conn.sendMessage(m.chat, { text: originalCaption, detectLink: true }))
          } else {
            tasks.push(conn.sendMessage(m.chat, { image: media, caption: finalCaption, mentions: users, detectLink: true }, { quoted: fkontak }))
            if (finalText && hasLink) {
              tasks.push(conn.sendMessage(m.chat, { text: finalText, detectLink: true, mentions: users }))
            }
          }
        } else if (mtype === 'videoMessage') {
          const captionHasLink = /https?:\/\/\S+/.test(originalCaption)
          if (captionHasLink && !finalText) {
            tasks.push(conn.sendMessage(m.chat, { video: media, caption: '', mimetype: 'video/mp4', mentions: users }, { quoted: fkontak }))
            tasks.push(conn.sendMessage(m.chat, { text: originalCaption, detectLink: true }))
          } else {
            tasks.push(conn.sendMessage(m.chat, { video: media, caption: finalCaption, mimetype: 'video/mp4', mentions: users, detectLink: true }, { quoted: fkontak }))
            if (finalText && hasLink) {
              tasks.push(conn.sendMessage(m.chat, { text: finalText, detectLink: true, mentions: users }))
            }
          }
        } else if (mtype === 'stickerMessage') {
          tasks.push(conn.sendMessage(m.chat, { sticker: media }, { quoted: fkontak }))
          if (finalText) {
            if (hasLink) tasks.push(conn.sendMessage(m.chat, { text: finalText, detectLink: true, mentions: users }))
            else tasks.push(conn.sendMessage(m.chat, { text: finalText, mentions: users }, { quoted: fkontak }))
          }
        }
      }

      await Promise.all(tasks)
      return
    }

    if (hasLink) {
      await conn.sendMessage(m.chat, {
        text: finalCaption,
        mentions: users,
        detectLink: true
      })
      return
    }

    await conn.sendMessage(m.chat, { text: finalCaption, mentions: users, detectLink: true }, { quoted: fkontak })

  } catch (e) {
    console.error(e)
    await conn.sendMessage(m.chat, { text: '🔊 Notificación', mentions: users, detectLink: true }, { quoted: fkontak })
  }
}

handler.customPrefix = /^\.?n(\s|$)/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler