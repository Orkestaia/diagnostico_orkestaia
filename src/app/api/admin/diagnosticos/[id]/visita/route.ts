import { z } from "zod";
import type { SectorId } from "@/config/tipos";
import { exigirAdmin } from "@/lib/acceso";
import { ESTADOS_VISITA_EDITABLE } from "@/lib/diagnosticos";
import { supabaseAdmin } from "@/lib/supabase";
import { validarParche, type ParcheVisita, type PrivadoVisita, type RespuestasVisita } from "@/lib/visita";

/**
 * Guarda la visita (spec §9): respuestas, tarjetas y privado. Acepta lotes de la cola sin conexión
 * (un parche ya unido). El servidor separa lo visible de lo 🔒 aunque la pantalla se equivoque.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });

  const cuerpo = (await req.json().catch(() => null)) as ParcheVisita | null;
  if (!cuerpo || typeof cuerpo !== "object") return Response.json({ error: "Datos no válidos" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: d, error } = await db
    .from("diagnosticos")
    .select("id, estado, sector, respuestas_visita, privado")
    .eq("id", id)
    .maybeSingle();
  if (error || !d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!(ESTADOS_VISITA_EDITABLE as readonly string[]).includes(d.estado)) {
    return Response.json({ error: "La visita ya está cerrada" }, { status: 409 });
  }

  const { ok, rechazados } = validarParche(d.sector as SectorId, cuerpo);
  const rv = (d.respuestas_visita ?? {}) as RespuestasVisita;
  const pr = (d.privado ?? {}) as PrivadoVisita;

  const respuestas_visita: RespuestasVisita = {
    ...rv,
    inicio_at: rv.inicio_at ?? ok.inicio_at,
    campos: ok.campos ? { ...rv.campos, ...ok.campos } : rv.campos,
    correcciones_previo: ok.correcciones_previo ? { ...rv.correcciones_previo, ...ok.correcciones_previo } : rv.correcciones_previo,
  };
  const privadoProcesos = { ...(pr.procesos ?? {}) };
  for (const [tid, v] of Object.entries(ok.privado_procesos ?? {})) privadoProcesos[tid] = { ...privadoProcesos[tid], ...v };
  const privado: PrivadoVisita = {
    ...pr,
    campos: ok.privado_campos ? { ...pr.campos, ...ok.privado_campos } : pr.campos,
    procesos: privadoProcesos,
  };

  const cambios: Record<string, unknown> = { respuestas_visita, privado, estado: "visita_en_curso" };
  if (ok.procesos) cambios.procesos = ok.procesos;

  const { error: e2 } = await db
    .from("diagnosticos")
    .update(cambios)
    .eq("id", id)
    .in("estado", ESTADOS_VISITA_EDITABLE as unknown as string[]);
  if (e2) {
    console.error("[visita] guardar", e2);
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  }
  return Response.json({ guardado: true, rechazados });
}
