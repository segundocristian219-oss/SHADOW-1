// sistema-fantasmas.js
// SISTEMA UNIFICADO: messageHandler + comando fantasmas/fankick + auto-check (iniciado con init(conn))

/**
 * messageHandler: registrar actividad de usuarios en groups
 * export: messageHandler (named)
 *
 * default export: command handler (fantasmas / fankick)
 *
 * IMPORTANT: antes de usar auto-revisión, llama init(conn) desde tu archivo principal
 *           (donde tengas la conexión `conn`) para que la auto-revisión tenga acceso a conn.
 */

// ---------------------------
// 1) REGISTRADOR DE ACTIVIDAD
// ---------------------------
export async function messageHandler(m, { conn }) {
    try {
        if (!m.isGroup) return
        if (!m.sender) return
        if (m.sender === conn.user.jid) return

        // Tipos ampliados para cubrir más casos reales
        const tiposValidos = [
            "conversation",
            "extendedTextMessage",
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "stickerMessage",
            "documentMessage",
            "buttonsResponseMessage",
            "listResponseMessage",
            "reactionMessage",
            "contactMessage",
            "contactsArrayMessage",
            "productMessage",
            "templateMessage",
            "viewOnceMessage"
        ]

        let tipo = m.message ? Object.keys(m.message)[0] : null
        if (!tipo || !tiposValidos.includes(tipo)) return

        // Asegurar existencia del nodo user en la DB
        if (!global.db) global.db = { data: { users: {}, chats: {} } }
        if (!global.db.data) global.db.data = global.db.data || { users: {}, chats: {} }

        if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {}

        let user = global.db.data.users[m.sender]

        if (!user.groups) user.groups = {}
        if (!user.groups[m.chat]) user.groups[m.chat] = {}

        // Guardar la hora del último mensaje
        user.groups[m.chat].lastMessage = Date.now()
    } catch (err) {
        console.error('[messageHandler] error:', err)
    }
}

// ---------------------------
// 2) COMANDO .FANTASMAS / .FANKICK
// ---------------------------
let handler = async (m, { conn, participants, command }) => {
    try {
        // Asegurar DB
        if (!global.db) global.db = { data: { users: {}, chats: {} } }
        if (!global.db.data) global.db.data = global.db.data || { users: {}, chats: {} }

        const HORAS = 72
        const INACTIVIDAD = HORAS * 60 * 60 * 1000
        const ahora = Date.now()

        // Si no recibieron participants, obtener metadata del grupo
        if (!participants || !Array.isArray(participants)) {
            let metadata = await conn.groupMetadata(m.chat).catch(() => null)
            if (!metadata) return conn.reply(m.chat, 'No pude obtener participantes del grupo.', m)
            participants = metadata.participants
        }

        let miembros = participants.map(v => v.id)
        let fantasmas = []

        for (let usuario of miembros) {
            if (usuario === conn.user.jid) continue

            let p = participants.find(u => u.id === usuario)
            // Comprobar admin de forma segura (propiedades posibles)
            let isAdmin = !!(p?.admin || p?.isAdmin || p?.isSuperAdmin)

            if (isAdmin) continue

            let dataUser = global.db.data.users[usuario]
            let lastMsg = dataUser?.groups?.[m.chat]?.lastMessage || 0

            // Si nunca habló o superó el TTL -> fantasma
            if (!lastMsg || ahora - lastMsg >= INACTIVIDAD) {
                fantasmas.push(usuario)
            }
        }

        if (fantasmas.length === 0) {
            return conn.reply(m.chat, "✨ No hay fantasmas en este grupo.", m)
        }

        if (command === "fankick") {
            // Intenta expulsar; envolver en try/catch por si falla
            try {
                await conn.groupParticipantsUpdate(m.chat, fantasmas, "remove")
                return conn.reply(
                    m.chat,
                    `🔥 Fantasmas eliminados:\n${fantasmas.map(v => '@' + v.split('@')[0]).join('\n')}`,
                    null,
                    { mentions: fantasmas }
                )
            } catch (e) {
                console.error('[fankick] error:', e)
                return conn.reply(m.chat, 'No pude expulsar a algunos participantes (falta permiso o error).', m)
            }
        }

        // Mostrar lista
        let mensaje = `
👻 *FANTASMAS DETECTADOS (72H)*

Grupo: ${await conn.getName(m.chat)}
Miembros: ${miembros.length}

${fantasmas.map(v => '👻 @' + v.split('@')[0]).join('\n')}

Usa *.fankick* para eliminarlos.
`
        conn.reply(m.chat, mensaje, null, { mentions: fantasmas })
    } catch (err) {
        console.error('[handler.fantasmas] error:', err)
    }
}

handler.help = ['fantasmas', 'fankick']
handler.tags = ['group']
handler.command = /^(fantasmas|sider|verfantasmas|fankick)$/i
handler.admin = true

export default handler

// ---------------------------
// 3) AUTO-REVISIÓN (24h) - requiere init(conn)
// ---------------------------
/**
 * initAutoFantasma(conn)
 * - Llamar desde tu main cuando tengas `conn` listo:
 *     import { initAutoFantasma } from './sistema-fantasmas.js'
 *     initAutoFantasma(conn)
 *
 * Esto asegura que el `conn` esté definido y evita closures con conn indefinido.
 */

export function initAutoFantasma(conn) {
    if (!conn) throw new Error('initAutoFantasma necesita conn como parámetro')

    // Evitar duplicar el setInterval
    if (global.autoFantasmaIniciado) return
    global.autoFantasmaIniciado = true

    const INTERVAL_MS = 24 * 60 * 60 * 1000 // 24h

    setInterval(async () => {
        try {
            if (!global.db || !global.db.data || !global.db.data.chats) return

            let chats = Object.keys(global.db.data.chats || {})

            for (let id of chats) {
                let chat = global.db.data.chats[id]
                if (!chat || !chat.autoFantasma) continue

                let metadata = await conn.groupMetadata(id).catch(() => null)
                if (!metadata) continue

                let participants = metadata.participants

                const HORAS = 72
                const INACTIVIDAD = HORAS * 60 * 60 * 1000
                const ahora = Date.now()

                let fantasmas = []

                for (let u of participants.map(v => v.id)) {
                    if (u === conn.user.jid) continue

                    let p = participants.find(x => x.id === u)
                    let isAdmin = !!(p?.admin || p?.isAdmin || p?.isSuperAdmin)
                    if (isAdmin) continue

                    let dataUser = global.db.data.users[u]
                    let lastMsg = dataUser?.groups?.[id]?.lastMessage || 0

                    if (!lastMsg || ahora - lastMsg >= INACTIVIDAD) {
                        fantasmas.push(u)
                    }
                }

                if (fantasmas.length === 0) continue

                let msg = `
👻 *AUTO-REVISIÓN DE FANTASMAS (72H)*

Grupo: ${await conn.getName(id)}

Fantasmas encontrados:
${fantasmas.map(v => '👻 @' + v.split('@')[0]).join('\n')}

Usa *.fankick* si quieres limpiar.`

                await conn.sendMessage(id, { text: msg, mentions: fantasmas }).catch(() => null)
            }
        } catch (err) {
            console.error('[autoFantasma] error:', err)
        }
    }, INTERVAL_MS)
}