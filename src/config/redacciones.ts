/**
 * Redacciones del banco de sectores (banco_v1.1, 21-sep).
 *
 * Cuando JARVIS cambia el texto de una pregunta que ya ha contestado algún cliente, la respuesta
 * guardada sigue siendo la del texto anterior. Aquí queda qué preguntas cambiaron y en qué
 * versión, para que:
 * - cada respuesta nueva guarde con qué versión se contestó (`respuestas_previo_redaccion`, DDL v5);
 * - una respuesta contestada con un texto anterior se trate como «por confirmar en la visita»: se
 *   enseña con el texto al que se contestó y no precarga nada.
 *
 * Nunca se modifica lo ya guardado: todo se decide al leer.
 */

/** Versiones del banco, de la más antigua a la actual. La última es `CONFIG_VERSION`. */
export const VERSIONES_BANCO = ["banco_v1", "banco_v1.1"] as const;
export type VersionBanco = (typeof VERSIONES_BANCO)[number];

export interface CambioRedaccion {
  /** Versión en la que entró el texto nuevo. */
  desde: VersionBanco;
  /** Texto que tenía la pregunta antes de esa versión. */
  anterior: string;
}

export const CAMBIOS_REDACCION: Record<string, CambioRedaccion[]> = {
  // 21-sep: JARVIS amplió la pregunta a encargos pasados a mano (Icónica ya había contestado).
  "dia.pedidos_mes": [
    { desde: "banco_v1.1", anterior: "¿Cuántos pedidos al mes entran fuera de la tienda online?" },
  ],
};

const orden = (v: string | null | undefined) => {
  const i = VERSIONES_BANCO.indexOf(v as VersionBanco);
  // Sin versión reconocible: la más antigua (así se comportaba todo antes de la v1.1).
  return i === -1 ? 0 : i;
};

export interface PorConfirmar {
  /** Texto de la pregunta al que contestó el cliente. */
  textoContestado: string;
  /** Versión con la que se contestó. */
  version: string;
}

/**
 * Respuestas del previo contestadas con un texto que ya no es el de la pregunta. La versión de
 * cada respuesta es la guardada con ella; si no la hay (respuestas de antes de la v1.1), la del
 * diagnóstico (`config_version`). Lo corregido en la visita ya está confirmado.
 */
export function respuestasPorConfirmar(
  respuestas: Record<string, unknown>,
  ctx: {
    redaccion?: Record<string, string> | null;
    configVersion?: string | null;
    correcciones?: Record<string, unknown> | null;
  },
): Map<string, PorConfirmar> {
  const r = new Map<string, PorConfirmar>();
  for (const [id, cambios] of Object.entries(CAMBIOS_REDACCION)) {
    const v = respuestas[id];
    if (v === undefined || v === null || v === "") continue;
    if (ctx.correcciones && id in ctx.correcciones) continue;
    const version = ctx.redaccion?.[id] ?? ctx.configVersion ?? VERSIONES_BANCO[0];
    // El primer cambio posterior a la respuesta dice a qué texto se contestó.
    const cambio = cambios.find((c) => orden(c.desde) > orden(version));
    if (cambio) r.set(id, { textoContestado: cambio.anterior, version });
  }
  return r;
}
