import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Comunicación con el motor de n8n (spec del motor §3, «plan B»): cabecera con un token secreto
 * sobre HTTPS, en las dos direcciones.
 *
 *   x-orkesta-token: <DIAGNOSTICO_MOTOR_TOKEN>
 *
 * Por qué no HMAC: la licencia de n8n no tiene variables, y el secreto acababa escrito en claro en
 * los nodos Code (legibles por MCP). Con cabecera, en n8n el token vive solo en credenciales
 * cifradas: «Header Auth» del webhook de entrada y de las peticiones a la app (decisión de
 * JARVIS, 19-sep). Si n8n no está configurado, la app sigue funcionando sin él.
 */

export const CABECERA = "x-orkesta-token";

/** Compara el token recibido con el de la app en tiempo constante. */
export function tokenMotorValido(recibido: string | null, esperado = process.env.DIAGNOSTICO_MOTOR_TOKEN): boolean {
  if (!esperado || esperado.length < 32 || !recibido) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const exigirTokenMotor = (req: Request): Response | null =>
  tokenMotorValido(req.headers.get(CABECERA)) ? null : Response.json({ error: "No autorizado" }, { status: 401 });

export type EventoMotor =
  | "diagnostico.previo_completado"
  | "diagnostico.visita_cerrada"
  | "diagnostico.mapa_publicado"
  // mapa_v1.2 (spec §7): el cliente elige sus prioridades / abre el mapa (este, apagado).
  | "diagnostico.prioridades_elegidas"
  | "diagnostico.mapa_abierto";

/**
 * Envía un evento a n8n. Nunca lanza: si n8n no está o falla, se registra y la app sigue.
 * Devuelve si se entregó.
 */
export async function enviarEvento(evento: EventoMotor, payload: Record<string, unknown>): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;
  const token = process.env.DIAGNOSTICO_MOTOR_TOKEN;
  if (!url || !token) {
    console.info(`[motor] ${evento} no enviado: n8n sin configurar`);
    return false;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", [CABECERA]: token },
      body: JSON.stringify({ evento, ...payload }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error(`[motor] ${evento} respondió ${r.status}`);
    return r.ok;
  } catch (e) {
    console.error(`[motor] ${evento} falló`, e);
    return false;
  }
}
