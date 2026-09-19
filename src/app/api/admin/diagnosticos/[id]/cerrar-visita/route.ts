import { after } from "next/server";
import { z } from "zod";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { Respuestas, SectorId } from "@/config/tipos";
import { exigirAdmin } from "@/lib/acceso";
import { calcularVisita, costesConCorreccion, personasEquipo } from "@/lib/calculo";
import { ESTADOS_VISITA_EDITABLE } from "@/lib/diagnosticos";
import { enviarEvento } from "@/lib/motor";
import { supabaseAdmin } from "@/lib/supabase";
import { urlBase } from "@/lib/url";
import { conRegistroHoy, costeHora, type PrivadoVisita, type RespuestasVisita } from "@/lib/visita";

/**
 * Cierra la visita (spec §4 y §9): estado → visita_cerrada, registro FIJO de las horas de hoy de
 * cada tarjeta (JARVIS), `calculo` completo para el export y evento a n8n ("listo para JARVIS").
 * Exige el coste por hora con su origen (JARVIS: se pregunta siempre).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: d, error } = await db
    .from("diagnosticos")
    .select("id, estado, sector, empresa, respuestas_previo, respuestas_visita, procesos, privado")
    .eq("id", id)
    .maybeSingle();
  if (error || !d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!(ESTADOS_VISITA_EDITABLE as readonly string[]).includes(d.estado)) {
    return Response.json({ error: "La visita ya está cerrada" }, { status: 409 });
  }

  const sector = d.sector as SectorId;
  const privado = (d.privado ?? {}) as PrivadoVisita;
  const coste = costeHora(privado.campos);
  if (!coste) {
    return Response.json({ error: "Falta el coste por hora (vista privada, bloque C)", falta: "coste" }, { status: 422 });
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const procesos = conRegistroHoy((d.procesos ?? []) as TarjetaProceso[], sector, hoy);
  const rv = (d.respuestas_visita ?? {}) as RespuestasVisita;
  const equipo = rv.campos?.["a.equipo"] as { rol: string; numero: number | null }[] | undefined;
  const previo = { ...(d.respuestas_previo ?? {}), ...(rv.correcciones_previo ?? {}) } as Respuestas;
  const calculo = {
    ...calcularVisita(procesos, privado.procesos ?? {}, {
      sector,
      personas: personasEquipo(equipo, previo, sector),
      costes: costesConCorreccion(coste),
    }),
    coste_origen: coste.origen,
    calculado_at: new Date().toISOString(),
  };

  const { data: cerrado, error: e2 } = await db
    .from("diagnosticos")
    .update({ estado: "visita_cerrada", visita_cerrada_at: new Date().toISOString(), procesos, calculo })
    .eq("id", id)
    .in("estado", ESTADOS_VISITA_EDITABLE as unknown as string[])
    .select("id")
    .maybeSingle();
  if (e2) {
    console.error("[visita] cerrar", e2);
    return Response.json({ error: "No se ha podido cerrar" }, { status: 500 });
  }
  if (cerrado) {
    const base = await urlBase();
    after(() =>
      enviarEvento("diagnostico.visita_cerrada", {
        diagnostico_id: d.id,
        empresa: d.empresa,
        urls: { admin: `${base}/admin/d/${d.id}/visita` },
      }),
    );
  }
  return Response.json({ cerrada: true, procesos });
}
