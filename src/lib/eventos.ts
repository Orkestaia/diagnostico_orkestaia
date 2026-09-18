import "server-only";
import { movimientosPrevio } from "@/config/previo";
import { quickWinsDeSector, SECTORES } from "@/config/sectores";
import { VALIDAR_COMUNES } from "@/config/sectores/comunes";
import type { Respuestas, SectorId } from "@/config/tipos";
import { calcularQuickWins } from "./calculo";
import { indicePreguntas } from "./preguntas";
import { pasosPrevio } from "./previo";

/**
 * Payload de `diagnostico.previo_completado` (spec del motor §4, modo `pre_reunion`).
 * Las cifras van SOLO en `resumen_cifras` (email interno de Aitor); el motor no las pasa al
 * modelo. `quick_wins` lleva `peso` en lugar de cifras.
 */
export interface FilaEvento {
  id: string;
  token: string;
  origen: string | null;
  config_version: string;
  sector: SectorId;
  subsector: string | null;
  empresa: string | null;
  contacto_nombre: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  fecha_reunion: string | null;
  respuestas_previo: Respuestas;
}

export function payloadPrevioCompletado(d: FilaEvento, base: string) {
  const r = d.respuestas_previo;
  const sector = SECTORES[d.sector];
  const movs = movimientosPrevio(d.sector);
  const indice = indicePreguntas(d.sector);

  const respuestas_legibles = pasosPrevio(d.sector, r)
    .filter((p) => r[p.pregunta.id] !== undefined && r[p.pregunta.id] !== null && r[p.pregunta.id] !== "")
    .map((p) => {
      const v = r[p.pregunta.id];
      return {
        fase: movs[p.movimiento].numero,
        pregunta: indice.get(p.pregunta.id)?.texto ?? p.pregunta.id,
        respuesta: Array.isArray(v) ? v.join(", ") : String(v),
      };
    });

  const qw = calcularQuickWins(r, d.sector);
  const elegidos = qw.elegidos.filter((x) => !x.relleno);
  const config = new Map(quickWinsDeSector(d.sector).map((q) => [q.id, q]));

  const quick_wins = elegidos.map((x, i) => {
    const c = config.get(x.id);
    return {
      id: x.id,
      titulo_base: x.tituloBase,
      antes_base: c?.antes ?? "",
      despues_base: c?.despues ?? "",
      tipo: x.tipo,
      categoria: x.categoria,
      peso: i + 1,
      validar_base: [...sector.validar, ...x.validar],
    };
  });

  const conHoras = elegidos.filter((x) => x.horas);
  const resumen_cifras = {
    horas_mes_total: {
      min: conHoras.reduce((s, x) => s + (x.horas?.min ?? 0), 0),
      max: conHoras.reduce((s, x) => s + (x.horas?.max ?? 0), 0),
    },
    ajustado_por_tope: qw.ajustadoPorTope,
    quick_wins: elegidos.map((x) => ({
      id: x.id,
      horas: x.horas,
      eur: x.eur,
      oportunidades: x.oportunidades,
      unidad_oportunidad: x.unidadOportunidad ?? null,
      perfil: x.perfil,
      sin_cifras: x.sinCifras,
    })),
  };

  return {
    diagnostico_id: d.id,
    modo: "pre_reunion",
    origen: d.origen,
    config_version: d.config_version,
    sector: d.sector,
    subsector: d.subsector,
    empresa: d.empresa,
    contacto: { nombre: d.contacto_nombre, email: d.contacto_email, telefono: d.contacto_telefono },
    fecha_reunion: d.fecha_reunion,
    respuestas_legibles,
    prioridad_tarea: typeof r["prioridad.tarea"] === "string" ? r["prioridad.tarea"] : null,
    quick_wins,
    no_automatizar_base: sector.noAutomatizar,
    validar_base: VALIDAR_COMUNES,
    resumen_cifras,
    urls: { mapa: `${base}/m/${d.token}`, admin: `${base}/admin` },
  };
}
