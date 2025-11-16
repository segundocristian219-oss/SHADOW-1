let handler = async (m, { sock }) => {
  try {
    if (!m.isGroup)
      return sock.sendMessage(m.chat, { text: '⚠️ Este comando solo funciona en grupos.' })

    // Obtener participantes
    const group = await sock.groupMetadata(m.chat)
    const mentions = group.participants.map(p => p.id)

    // Texto ingresado
    let text = m.body || m.text || ''  
    const cleanText = text.replace(/^(\.n|n)\s*/i, '').trim()

    // 🟦 1. SI RESPONDES A UN MENSAJE
    if (m.quotedMsg) {
      await sock.sendMessage(m.chat, {
        forward: m.quotedMsgObj,
        mentions
      })
      return
    }

    // 🟩 2. SI ES FOTO
    if (m.type === 'image') {
      await sock.sendMessage(m.chat, {
        image: m.msg.url ? { url: m.msg.url } : m.msg,
        caption: cleanText || 'Notificación',
        mentions
      })
      return
    }

    // 🟧 3. SI ES VIDEO
    if (m.type === 'video') {
      await sock.sendMessage(m.chat, {
        video: m.msg.url ? { url: m.msg.url } : m.msg,
        caption: cleanText || 'Notificación',
        mentions
      })
      return
    }

    // 🟨 4. SOLO TEXTO
    if (cleanText.length > 0) {
      await sock.sendMessage(m.chat, {
        text: cleanText || 'Notificación',
        mentions
      })
      return
    }

    // Si no hay nada
    await sock.sendMessage(m.chat, { text: '❌ No hay nada para reenviar.' })

  } catch (e) {
    console.log('Error en .n:', e)
    await sock.sendMessage(m.chat, { text: '⚠️ Error: ' + e.message })
  }
}

handler.customPrefix = /^(\.n|n)(\s|$)/i
handler.command = new RegExp()
handler.group = true
handler.admin = true

export default handler