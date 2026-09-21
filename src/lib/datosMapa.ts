import "server-only";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { SectorId } from "@/config/tipos";
import { hoyHorasMes } from "./calculo";
import { leerPrioridades } from "./datosInteraccion";
import type { Prioridades } from "./interaccionMapa";
import { tokenValido } from "./limite";
import { mapaSchema, type Mapa } from "./mapa";
import { supabaseAdmin } from "./supabase";

/**
 * Lo que necesita la página del mapa. Solo datos que el cliente puede ver: el mapa, y de cada
 * tarjeta de la visita lo visible (nombre, área, volumen, pasos, su frase…). Nada de `privado`,
 * `interno` ni del `calculo` completo (que lleva costes y euros): de él solo salen las horas.
 */
export interface ProcesoMapa {
  id: string;
  nombre: string;
  area: TarjetaProceso["area"];
  volumen: number | null;
  volumenUnidad: string;
  volumenPeriodo: TarjetaProceso["volumenPeriodo"];
  minutosPorVez: number | null;
  quien: string | null;
  herramientas: string[];
  cita: string;
  pasos: TarjetaProceso["pasos"];
  horasHoy: number | null;
}

export interface DatosMapa {
  id: string;
  token: string;
  estado: string;
  empresa: string;
  mapa: Mapa;
  procesos: ProcesoMapa[];
  publicadoAt: string | null;
  /** Hasta cuándo abre el enlace (spec §10: 12 meses). Se enseña al cliente para que no caduque sin aviso. */
  caducaAt: string | null;
  /**
   * La visita se cerró con avisos de plausibilidad: entonces no se enseña el coste de no hacer
   * nada (spec §7). Solo este booleano sale del `calculo`.
   */
  visitaConAvisos: boolean;
  /** Las 3 prioridades que ha elegido el cliente (mapa_v1.2), si ya las eligió. */
  prioridades: Prioridades | null;
}

const COLUMNAS =
  "id, token, estado, sector, empresa, mapa, procesos, mapa_publicado_at, mapa_caduca_at, calculo";

function aDatos(
  d: Record<string, unknown>,
  prioridades: Prioridades | null,
): DatosMapa | null {
  const r = mapaSchema.safeParse(d.mapa);
  if (!r.success) return null;
  const sector = d.sector as SectorId;
  const procesos = ((d.procesos ?? []) as TarjetaProceso[]).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    area: t.area,
    volumen: t.volumen,
    volumenUnidad: t.volumenUnidad,
    volumenPeriodo: t.volumenPeriodo,
    minutosPorVez: t.minutosPorVez,
    quien: t.quien,
    herramientas: t.herramientas,
    cita: t.cita,
    pasos: t.pasos,
    // El dato fijo del cierre manda (JARVIS, 19-sep); si no lo hay, el cálculo de hoy.
    horasHoy: t.hoyRegistro?.horasMes ?? hoyHorasMes(t, sector),
  }));
  return {
    id: d.id as string,
    token: d.token as string,
    estado: d.estado as string,
    empresa: d.empresa as string,
    mapa: r.data,
    procesos,
    publicadoAt: (d.mapa_publicado_at as string | null) ?? null,
    caducaAt: (d.mapa_caduca_at as string | null) ?? null,
    visitaConAvisos:
      ((d.calculo as { avisos_plausibilidad?: unknown[] } | null)?.avisos_plausibilidad?.length ??
        0) > 0,
    prioridades,
  };
}

/** Mapa del cliente por su enlace: solo si está publicado. Un borrador no lo ve nadie más que Aitor. */
export async function leerMapaPublico(token: string): Promise<DatosMapa | null> {
  if (!tokenValido(token)) return null;
  const { data } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS)
    .eq("token", token)
    .eq("estado", "mapa_publicado")
    .maybeSingle();
  return data ? aDatos(data, await leerPrioridades(data.id as string)) : null;
}

/** Para el panel (Clerk): el mapa en cualquier estado, para revisarlo antes de publicar. */
export async function leerMapaAdmin(id: string): Promise<DatosMapa | null> {
  const { data } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS)
    .eq("id", id)
    .maybeSingle();
  return data ? aDatos(data, await leerPrioridades(id)) : null;
}
