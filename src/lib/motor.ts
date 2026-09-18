import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Comunicación con el motor de n8n (spec del motor §3): firma HMAC-SHA256 con marca de tiempo.
 *   X-Orkesta-Timestamp: segundos Unix
 *   X-Orkesta-Signature: hex(HMAC_SHA256(secreto, timestamp + "." + cuerpo_crudo))
 * Desfase máximo ±300 s. Si n8n no está configurado, la app sigue funcionando sin él.
 */

export const DESFASE_MAX_S = 300;

export function firmar(secreto: string, timestamp: string, cuerpo: string): string {
  return createHmac("sha256", secreto).update(`${timestamp}.${cuerpo}`).digest("hex");
}

export function verificarFirma(
  secreto: string | undefined,
  timestamp: string | null,
  firma: string | null,
  cuerpo: string,
  ahora = Math.floor(Date.now() / 1000),
): boolean {
  if (!secreto || !timestamp || !firma || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(ahora - Number(timestamp)) > DESFASE_MAX_S) return false;
  const esperada = Buffer.from(firmar(secreto, timestamp, cuerpo), "hex");
  const recibida = Buffer.from(firma, "hex");
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export type EventoMotor =
  | "diagnostico.previo_completado"
  | "diagnostico.visita_cerrada"
  | "diagnostico.mapa_publicado";

/**
 * Envía un evento a n8n. Nunca lanza: si n8n no está o falla, se registra y la app sigue.
 * Devuelve si se entregó.
 */
export async function enviarEvento(evento: EventoMotor, payload: Record<string, unknown>): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;
  const secreto = process.env.DIAGNOSTICO_HMAC_SECRET;
  if (!url || !secreto) {
    console.info(`[motor] ${evento} no enviado: n8n sin configurar`);
    return false;
  }
  const cuerpo = JSON.stringify({ evento, ...payload });
  const ts = String(Math.floor(Date.now() / 1000));
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Orkesta-Timestamp": ts,
        "X-Orkesta-Signature": firmar(secreto, ts, cuerpo),
      },
      body: cuerpo,
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error(`[motor] ${evento} respondió ${r.status}`);
    return r.ok;
  } catch (e) {
    console.error(`[motor] ${evento} falló`, e);
    return false;
  }
}
