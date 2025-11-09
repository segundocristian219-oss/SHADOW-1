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
  if (!/^(\.n|n)\b/i.test(content.trim())) return

  await conn.sendMessage(m.chat, { react: { text: '🔊', key: m.key } })

  const users = participants.map(u => conn.decodeJid(u.id))
  const userText = content.trim().replace(/^(\.n|n)\b\s*/i, '')
  const finalText = userText || ''
  const q = m.quoted ? m.quoted : m
  const hasQuoted = !!m.quoted

  try {
    if (hasQuoted) {
      await conn.copyNForward(m.chat, q, true, { quoted: fkontak, mentions: users })
      if (finalText) {
        await conn.sendMessage(m.chat, { text: finalText, mentions: users }, { quoted: fkontak })
      }
    } else {
      const textToSend = finalText || '🔊 Notificación'
      await conn.sendMessage(m.chat, { text: textToSend, mentions: users }, { quoted: fkontak })
    }
  } catch {
    await conn.sendMessage(m.chat, { text: '🔊 Notificación', mentions: users }, { quoted: fkontak })
  }
}

handler.customPrefix = /^(\.n|n)\b/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler