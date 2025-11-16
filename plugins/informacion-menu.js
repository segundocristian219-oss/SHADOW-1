import fs from 'fs'

let handler = async (m, { conn, args }) => {

  // === FECHA Y HORA DE CDMX ===
  let d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }))
  let locale = 'es'
  let week = d.toLocaleDateString(locale, { weekday: 'long' })
  let date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  let hourNow = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  // === DATOS DEL USUARIO ===
  let userId = m.mentionedJid?.[0] || m.sender
  let user = global.db.data.users[userId]
  let name = conn.getName(userId)

  let _uptime = process.uptime() * 1000
  let uptime = clockString(_uptime)

  // === SALUDO SEGÚN LA HORA (CDMX) ===
  let hourNum = parseInt(d.toLocaleTimeString('es-MX', { hour: 'numeric', hour12: false }))
  let saludo =
    hourNum < 4  ? "🌌 Aún es de madrugada... las almas rondan 👻" :
    hourNum < 7  ? "🌅 El amanecer despierta... buenos inicios ✨" :
    hourNum < 12 ? "🌞 Buenos días, que la energía te acompañe 💫" :
    hourNum < 14 ? "🍽️ Hora del mediodía... ¡a recargar fuerzas! 🔋" :
    hourNum < 18 ? "🌄 Buenas tardes... sigue brillando como el sol 🌸" :
    hourNum < 20 ? "🌇 El atardecer pinta el cielo... momento mágico 🏮" :
    hourNum < 23 ? "🌃 Buenas noches... que los espíritus te cuiden 🌙" :
    "🌑 Es medianoche... los fantasmas susurran en la oscuridad 👀"


  // === CATEGORÍAS DE COMANDOS ===
  let categories = {}
  for (let plugin of Object.values(global.plugins)) {
    if (!plugin.help || !plugin.tags) continue
    for (let tag of plugin.tags) {
      if (!categories[tag]) categories[tag] = []
      categories[tag].push(...plugin.help.map(cmd => `#${cmd}`))
    }
  }

  let decoEmojis = ['🌙', '👻', '🪄', '🏮', '📜', '💫', '😈', '🍡', '🔮', '🌸', '🪦', '✨']
  let emojiRandom = () => decoEmojis[Math.floor(Math.random() * decoEmojis.length)]

  // === MENÚ ===
  let menuText = `
📆  \`\`\`${week}, ${date}\`\`\`
⏰ *Hora CDMX:* ${hourNow}

👋🏻 𝖧𝗈𝗅𝖺 @${userId.split('@')[0]}  
𝖻𝗂𝖾𝗇𝗏𝖾𝗇𝗂𝖽𝗈 𝖺𝗅 𝗆𝖾𝗇𝗎𝗀𝗋𝗎𝗉𝗈 𝖽𝖾 *𝖻𝖺𝗄𝗂-𝖡𝗈𝗍 𝖨𝖠*

[ ☀︎ ] Tiempo observándote: ${uptime}

${saludo}
`.trim()

  // === LISTAS DE COMANDOS ===
  for (let [tag, cmds] of Object.entries(categories)) {
    let tagName = tag.toUpperCase().replace(/_/g, ' ')
    let deco = emojiRandom()
    menuText += `

╭━ ${deco} ${tagName} ━╮
${cmds.map(cmd => `│ ▪️ ${cmd}`).join('\n')}
╰─━━━━━━━━━━━╯`
  }

  // === ENVÍO DEL MENÚ ===
  await conn.sendMessage(
    m.chat,
    {
      video: { url: "https://cdn.russellxz.click/a1fe9136.mp4" },
      caption: menuText,
      gifPlayback: true,

      // ← global.rcanal sin romper nada
      ...(global.rcanal || {}),

      contextInfo: {
        ...(global.rcanal?.contextInfo || {}),

        // ← Mención real
        mentionedJid: [userId]
      }
    },
    { quoted: m }
  )
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu', 'menú', 'help', 'ayuda']
handler.rcanal = true

export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return `${h}h ${m}m ${s}s`
}