/**
 * Comprobación de plausibilidad al cerrar la visita (revisión con JARVIS, 21-sep). Avisa, no
 * bloquea: Aitor ve los avisos y decide si corrige o cierra igualmente. Los avisos quedan en el
 * `calculo` para que JARVIS los tenga en cuenta al preparar el mapa.
 */
import { PRECARGAS } from "@/config/previo";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { Respuestas, SectorId } from "@/config/tipos";
import { hoyHorasMes, redondearHoras, topeEquipo, volumenMes } from "./calculo";
import { leerEntradas } from "./preguntas";

/**
 * Más de esto cada vez merece una pregunta, salvo en Operación y Dirección, donde una tarea larga
 * es normal (Aitor y JARVIS, 22-sep: en Colino «Primera respuesta a una consulta nueva» es de
 * Clientes y no saltaba). Las tarjetas sin área también avisan.
 */
export const MAX_MINUTOS_POR_VEZ = 60;
export const AREAS_SIN_AVISO_MINUTOS: readonly string[] = ["Operación", "Dirección"];
/** Diferencia con el previo a partir de la que se avisa (el doble o la mitad). */
export const FACTOR_CONTRADICCION = 2;

export interface AvisoPlausibilidad {
  tipo: "minutos" | "tope" | "previo";
  tarjetaId: string | null;
  mensaje: string;
}

const h = (x: number) => `${String(redondearHoras(x)).replace(".", ",")} h`;

export function avisosPlausibilidad(
  procesos: TarjetaProceso[],
  ctx: {
    sector: SectorId;
    personas: number | null;
    previo: Respuestas;
    /** Respuestas del previo que no cuentan (por confirmar: se contestaron a otro texto). */
    porConfirmar?: Iterable<string>;
  },
): AvisoPlausibilidad[] {
  const avisos: AvisoPlausibilidad[] = [];
  const nombre = (t: TarjetaProceso) => t.nombre || "Proceso sin nombre";

  for (const t of procesos) {
    if (
      !AREAS_SIN_AVISO_MINUTOS.includes(t.area ?? "") &&
      (t.minutosPorVez ?? 0) > MAX_MINUTOS_POR_VEZ
    ) {
      avisos.push({
        tipo: "minutos",
        tarjetaId: t.id,
        mensaje: `«${nombre(t)}»: ${t.minutosPorVez} min cada vez es mucho para esta tarea. ¿Es por vez o por tanda?`,
      });
    }
  }

  const total = procesos.reduce((s, t) => s + (hoyHorasMes(t, ctx.sector) ?? 0), 0);
  if (ctx.personas && total > topeEquipo(ctx.personas)) {
    avisos.push({
      tipo: "tope",
      tarjetaId: null,
      mensaje: `Las horas de hoy suman ${h(total)} al mes, más que el tope de la app para ${ctx.personas} ${ctx.personas === 1 ? "persona" : "personas"} (${h(topeEquipo(ctx.personas))}). Revisa volúmenes y minutos.`,
    });
  }

  const fuera = new Set(ctx.porConfirmar ?? []);
  const e = leerEntradas(ctx.previo, ctx.sector);
  for (const pc of PRECARGAS) {
    if (pc.sector !== "todos" && pc.sector !== ctx.sector) continue;
    if (typeof pc.tarjeta !== "string" || fuera.has(pc.volumen.desde)) continue;
    const delPrevio = volumenMes(e.n(pc.volumen.desde) ?? null, pc.volumen.periodo, ctx.sector);
    if (!delPrevio) continue;
    for (const t of procesos.filter((x) => x.plantilla === pc.tarjeta)) {
      const enVisita = volumenMes(t.volumen, t.volumenPeriodo, ctx.sector);
      if (!enVisita) continue;
      const r = enVisita / delPrevio;
      if (r >= FACTOR_CONTRADICCION || r <= 1 / FACTOR_CONTRADICCION) {
        avisos.push({
          tipo: "previo",
          tarjetaId: t.id,
          mensaje: `«${nombre(t)}»: en la visita salen unas ${Math.round(enVisita)} al mes y en el previo contestó unas ${Math.round(delPrevio)}. ¿Cuál vale?`,
        });
      }
    }
  }
  return avisos;
}
