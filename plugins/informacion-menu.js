import fs from 'fs'

let handler = async (m, { conn }) => {

  let userId = m.mentionedJid?.[0] || m.sender
  let name = await conn.getName(userId)

  let uptime = clockString(process.uptime() * 1000)

  let hour = new Date().getHours()
  let saludo =
    hour < 4  ? "🌌 Aún es de madrugada..." :
    hour < 7  ? "🌅 El amanecer despierta..." :
    hour < 12 ? "🌞 Buenos días..." :
    hour < 14 ? "🍽️ Es mediodía..." :
    hour < 18 ? "🌄 Buenas tardes..." :
    hour < 20 ? "🌇 El atardecer pinta el cielo..." :
    hour < 23 ? "🌃 Buenas noches..." :
                "🌑 Medianoche..."

  let categories = {}
  for (let plugin of Object.values(global.plugins)) {
    if (!plugin.help || !plugin.tags) continue
    for (let tag of plugin.tags) {
      if (!categories[tag]) categories[tag] = []
      categories[tag].push(...plugin.help.map(cmd => `#${cmd}`))
    }
  }

  let menuText = `👋 Hola @${userId.split('@')[0]}
Bienvenido al menú de *Baki-Bot IA*

☀︎ Tiempo observándote: ${uptime}

${saludo}

──────────────
`

  for (let [tag, cmds] of Object.entries(categories)) {
    let t = tag.toUpperCase().replace(/_/g, ' ')
    menuText += `
╭━ ${t} ━╮
${cmds.map(a => `│ ▪️ ${a}`).join("\n")}
╰──────────╯`
  }

  // ORDEN CORRECTO PARA DS6
  await conn.sendMessage(
    m.chat,
    {
      ...global.rcanal,           // 🔥 debe ir de primeras
      video: { url: "https://cdn.russellxz.click/a1fe9136.mp4" },
      gifPlayback: true,
      caption: menuText,
      mentions: [userId]         // 🔥 esto activa la mención como la segunda captura
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