/**
 * Ultra-preciso / no intrusivo - verificación de estado WhatsApp
 * Requisitos: @whiskeysockets/baileys v6.7.18
 *
 * - NO envía mensajes visibles al contacto.
 * - Usa: onWhatsApp, profilePictureUrl, sendPresenceUpdate (no visible), fetchStatus (si existe).
 * - Retries, timeouts, análisis profundo de errores y scoring combinado.
 * - Cache en memoria (evita hammering si consultas repetidas).
 *
 * Comandos: .verban o .wa o .checkban
 */

const DEFAULT_TIMEOUT = 4500; // ms por probe
const RETRIES = 2;
const CACHE_TTL = 1000 * 60 * 2; // 2 minutos cache para el mismo número

// Simple cache en memoria: { jid: { ts, result } }
const _verbanCache = new Map();

const timeoutPromise = (p, ms, tag = "timeout") =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${tag}`)), ms)),
  ]);

const safeCall = async (fn) => {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error };
  }
};

const probeOnWhatsApp = (conn, jid) => safeCall(() => conn.onWhatsApp(jid));
const probeProfilePic = (conn, jid) => safeCall(() => conn.profilePictureUrl(jid, "image"));
const probePresence = (conn, jid) =>
  safeCall(async () => {
    // sendPresenceUpdate es "no visible" desde la perspectiva del objetivo (cliente)
    // Aun así algunas builds pueden comportarse distinto; lo intentamos y capturamos el error.
    return await conn.sendPresenceUpdate("available", jid);
  });
const probeFetchStatus = (conn, jid) =>
  safeCall(async () => {
    // Intentamos varias funciones que Baileys podría exponer
    if (typeof conn.fetchStatus === "function") return await conn.fetchStatus(jid);
    if (typeof conn.getStatus === "function") return await conn.getStatus(jid);
    if (typeof conn.fetchStatusMessage === "function") return await conn.fetchStatusMessage(jid);
    throw new Error("no-status-fn");
  });

const analyzeError = (err) => {
  const raw = String(err?.message || err || "");
  const lower = raw.toLowerCase();
  const code = err?.output?.statusCode || err?.status || err?.statusCode || err?.code || null;
  const flags = { permanent: false, temporary: false, raw };

  if (/unregister|unregistered|does not exist|no user|not found|404/.test(lower) || code === 404)
    flags.permanent = true;

  if (/not-allowed|forbidden|not-authorized|temporar|temporarily|rate limit|retry|403/.test(lower) || code === 403)
    flags.temporary = true;

  if (/not on whatsapp|not in whatsapp|no route|no-route|user not found/i.test(lower)) flags.permanent = true;

  return flags;
};

const computeConfidence = ({ signals }) => {
  let score = 50;
  if (signals.onWhatsApp === true) score += 20;
  if (signals.onWhatsApp === false) score -= 34;

  if (signals.ppExists === true) score += 12;
  if (signals.ppExists === false) score -= 6;

  if (signals.presenceOk === true) score += 18;
  if (signals.presenceOk === false) score -= 8;

  if (signals.statusOk === true) score += 8;
  if (signals.statusOk === false) score -= 4;

  if (signals.errorFlags?.permanent) score -= 46;
  if (signals.errorFlags?.temporary) score -= 26;

  // small bonus if multiple positive signals
  const positive = [signals.onWhatsApp, signals.ppExists, signals.presenceOk, signals.statusOk].filter(Boolean).length;
  if (positive >= 3) score += 6;

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
};

let handler = async (m, { conn, args }) => {
  if (!args[0]) return m.reply(`⚠️ *Falta el número*\n\n📌 *Ejemplo:* .verban +52 722 758 4934`);

  const number = args.join(" ").replace(/\D/g, "");
  if (!number) return m.reply("⚠️ Número inválido.");
  const jid = number + "@s.whatsapp.net";

  // Cache check
  const cached = _verbanCache.get(jid);
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
    return m.reply(`📱 Número: https://wa.me/${number}\n\n` + cached.result);
  }

  await m.reply(`🔍 *Iniciando verificación no intrusiva para* ${number} ...`);

  let lastErr = null;

  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      // lanzar probes en paralelo, cada uno con timeout
      const probes = await Promise.all([
        timeoutPromise(probeOnWhatsApp(conn, jid), DEFAULT_TIMEOUT, "onWhatsApp-timeout").catch(e => ({ ok: false, error: e })),
        timeoutPromise(probeProfilePic(conn, jid), DEFAULT_TIMEOUT, "pp-timeout").catch(e => ({ ok: false, error: e })),
        timeoutPromise(probePresence(conn, jid), DEFAULT_TIMEOUT, "presence-timeout").catch(e => ({ ok: false, error: e })),
        timeoutPromise(probeFetchStatus(conn, jid), DEFAULT_TIMEOUT, "status-timeout").catch(e => ({ ok: false, error: e }))
      ]);

      const [onWaRes, ppRes, presenceRes, statusRes] = probes;

      const waInfo = (onWaRes && onWaRes.ok && Array.isArray(onWaRes.value) && onWaRes.value[0]) ? onWaRes.value[0] : null;
      const onWhatsApp = waInfo ? !!waInfo.exists : (onWaRes && onWaRes.ok && !!onWaRes.value); // fallback
      const ppExists = !!(ppRes && ppRes.ok && ppRes.value);
      const presenceOk = !!(presenceRes && presenceRes.ok);
      const statusOk = !!(statusRes && statusRes.ok);

      const errors = [];
      if (onWaRes && !onWaRes.ok) errors.push(onWaRes.error);
      if (ppRes && !ppRes.ok) errors.push(ppRes.error);
      if (presenceRes && !presenceRes.ok) errors.push(presenceRes.error);
      if (statusRes && !statusRes.ok) errors.push(statusRes.error);

      const errorFlags = { permanent: false, temporary: false, raw: [] };
      for (const e of errors) {
        if (!e) continue;
        const a = analyzeError(e);
        if (a.permanent) errorFlags.permanent = true;
        if (a.temporary) errorFlags.temporary = true;
        errorFlags.raw.push(a.raw);
      }

      // Heurística de decisión
      let decision = "INDETERMINADO";
      const signals = { onWhatsApp, ppExists, presenceOk, statusOk, errorFlags };
      let confidence = computeConfidence({ signals });

      if (!onWhatsApp && errorFlags.permanent) {
        decision = "BLOQUEO PERMANENTE / NO EXISTE";
        confidence = Math.max(confidence, 96);
      } else if (presenceOk) {
        decision = "ACTIVO (NO BANEADO)";
        confidence = Math.max(confidence, 94);
      } else if (errorFlags.temporary && !errorFlags.permanent) {
        decision = "BLOQUEO TEMPORAL";
        confidence = Math.max(confidence, 91);
      } else if (errorFlags.permanent) {
        decision = "BLOQUEO PERMANENTE";
        confidence = ppExists ? Math.max(confidence, 72) : Math.max(confidence, 97);
      } else if (onWhatsApp && !presenceOk && ppExists) {
        decision = "POSIBLE ACTIVO (sin presencia observada)";
        confidence = Math.max(confidence, 84);
      } else if (onWhatsApp && !ppExists && !presenceOk) {
        decision = "POSIBLE SUSPENSIÓN / CUENTA MUY INACTIVA";
        confidence = Math.max(confidence, 74);
      }

      const formatted = [
        `${decision === "ACTIVO (NO BANEADO)" ? "🟢" : decision.includes("PERMANENTE") ? "🔴" : decision.includes("TEMPORAL") ? "🟠" : "⚪"} *ESTADO:* ${decision}`,
        `🖼️ Foto de perfil: ${ppExists ? "Sí" : "No"}`,
        `📡 Respuesta a presencia: ${presenceOk ? "Recibida" : "No recibida / error"}`,
        `🔎 onWhatsApp: ${onWhatsApp ? "Sí" : "No"}`,
        `🔍 Señales de error: ${errorFlags.raw.length ? errorFlags.raw.slice(0,3).join(" | ").slice(0,200) : "Ninguna relevante detectada"}`,
        `🔎 *Confianza:* ${confidence}%`
      ].join("\n");

      // Cachear resultado
      const resultText = `${formatted}`;
      _verbanCache.set(jid, { ts: Date.now(), result: resultText });

      return m.reply(`📱 Número: https://wa.me/${number}\n\n${resultText}`);
    } catch (e) {
      lastErr = e;
      // retry automáticamente (no sleep para no bloquear)
    }
  }

  // fallback si todo falla
  const fallback = `❌ No se pudo completar la verificación para ${number}.\nError: ${String(lastErr?.message || lastErr || "unknown")}`;
  return m.reply(fallback);
};

handler.command = /^verban$|^wa$|^checkban$/i;
export default handler;