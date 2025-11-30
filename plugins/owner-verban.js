let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply(`⚠️ *Falta el número*\n\n📌 *Ejemplo:* .verban +52 722 758 4934`);

    const number = args.join(" ").replace(/\D/g, "");
    const jid = number + "@s.whatsapp.net";

    await m.reply(`🔍 *Verificando si el número está baneado en WhatsApp...*`);

    try {
        let exists = false;
        let ppExists = false;
        let sendError = null;
        let confidence = 0;

        try {
            const wa = await conn.onWhatsApp(jid);
            exists = !!(wa && wa[0] && wa[0].exists);
        } catch (e) {}

        if (!exists) {
            confidence = 90;
            return m.reply(
`📱 Número: https://wa.me/${number}

🔴 *ESTADO:* NO EXISTE / BLOQUEO PERMANENTE
🔎 *Confianza:* ${confidence}%`
            );
        }

        try {
            const pp = await conn.profilePictureUrl(jid, 'image');
            if (pp) ppExists = true;
        } catch (e) {
            ppExists = false;
        }

        try {
            await conn.sendPresenceUpdate('available', jid);
        } catch (e) {
            sendError = e;
        }

        if (!sendError) {
            confidence = ppExists ? 95 : 85;
            return m.reply(
`📱 Número: https://wa.me/${number}

🟢 *ESTADO:* NO ESTÁ BANEADO
🔎 *Confianza:* ${confidence}%`
            );
        }

        const msg = String(sendError?.message || "");
        const code = sendError?.output?.statusCode || sendError?.status || null;

        const temporary =
            /not-allowed/i.test(msg) ||
            /temporarily/i.test(msg) ||
            /not-authorized/i.test(msg) ||
            code === 403;

        const permanent =
            /unregistered/i.test(msg) ||
            /does not exist/i.test(msg) ||
            /404/.test(msg) ||
            code === 404;

        if (temporary) {
            confidence = 90;
            return m.reply(
`📱 Número: https://wa.me/${number}

🟠 *ESTADO:* BLOQUEO TEMPORAL
🔎 *Confianza:* ${confidence}%`
            );
        }

        if (permanent) {
            confidence = ppExists ? 60 : 95;
            return m.reply(
`📱 Número: https://wa.me/${number}

🔴 *ESTADO:* BLOQUEO PERMANENTE
🔎 *Confianza:* ${confidence}%`
            );
        }

        return m.reply(
`📱 Número: https://wa.me/${number}

⚪ *ESTADO:* INDETERMINADO
🔎 Detalle del error: ${msg.slice(0,120)}
🔎 *Confianza:* 50%`
        );

    } catch (e) {
        return m.reply("❌ Ocurrió un error al verificar el número.");
    }
};

handler.command = /^verban$/i;
export default handler;