import { generateWAMessageFromContent, downloadContentFromMessage } from '@whiskeysockets/baileys'

const handler = async (m, { conn, participants }) => {
  if (!m.isGroup || m.key.fromMe) return

  const content = m.text || m.msg?.caption || ''
  if (!/^.?n(\s|$)/i.test(content.trim())) return

  // 📣 Reacción
  await conn.sendMessage(m.chat, { react: { text: '📣', key: m.key } })

  const users = participants.map(u => conn.decodeJid(u.id))
  const userText = content.trim().replace(/^.?n(\s|$)/i, '')
  const finalText = userText || ''
  const q = m.quoted ? m.quoted : m
  const mtype = q.mtype || ''
  const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage'].includes(mtype)
  const originalCaption = (q.msg?.caption || q.text || '').trim()
  const finalCaption = finalText || originalCaption || '📣 Notificación'

  try {
    if (m.quoted && isMedia) {
      if (mtype === 'imageMessage' || mtype === 'videoMessage') {
        // 🔁 Reenviar imagen o video (mostrará "Reenviado")
        await conn.copyNForward(m.chat, q, true)
      } else {
        // 🔊 Audio o sticker
        const media = await q.download()
        if (mtype === 'audioMessage') {
          await conn.sendMessage(m.chat, { audio: media, mimetype: 'audio/mpeg', ptt: false, mentions: users }, { quoted: q })
          if (finalText) await conn.sendMessage(m.chat, { text: finalText, mentions: users, detectLink: true }, { quoted: q })
        } else if (mtype === 'stickerMessage') {
          await conn.sendMessage(m.chat, { sticker: media }, { quoted: q })
        }
      }
    } else if (m.quoted && !isMedia) {
      // 💬 Texto citado
      await conn.sendMessage(m.chat, { text: finalCaption, mentions: users, detectLink: true }, { quoted: q })
    } else if (!m.quoted && isMedia) {
      if (mtype === 'imageMessage' || mtype === 'videoMessage') {
        // 🔁 Reenviar imagen/video enviado directamente
        await conn.copyNForward(m.chat, m, true)
      } else {
        const media = await m.download()
        if (mtype === 'audioMessage') {
          await conn.sendMessage(m.chat, { audio: media, mimetype: 'audio/mpeg', ptt: false, mentions: users }, { quoted: m })
          if (finalText) await conn.sendMessage(m.chat, { text: finalText, mentions: users, detectLink: true }, { quoted: m })
        } else if (mtype === 'stickerMessage') {
          await conn.sendMessage(m.chat, { sticker: media }, { quoted: m })
        }
      }
    } else {
      // ✉️ Texto sin citar nada
      await conn.sendMessage(m.chat, { text: finalCaption, mentions: users, detectLink: true }, { quoted: m })
    }
  } catch (e) {
    await conn.sendMessage(m.chat, { text: '📣 Notificación', mentions: users, detectLink: true }, { quoted: m })
  }
}

handler.customPrefix = /^.?n(\s|$)/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler