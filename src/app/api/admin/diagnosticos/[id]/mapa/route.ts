import { z } from "zod";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import { exigirTokenJarvis } from "@/lib/acceso";
import type { CalculoVisita } from "@/lib/calculo";
import { validarMapa } from "@/lib/mapa";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * JARVIS sube el mapa (spec §5.4): `PUT` con el JSON `mapa_v1` y el Bearer
 * `DIAGNOSTICO_ADMIN_TOKEN` (fuera de Clerk en el middleware). Se valida contra el diagnóstico;
 * si algo no cuadra, 422 con la lista de errores. Queda en borrador hasta que Aitor lo publique.
 */
const ESTADOS_CON_MAPA = ["visita_cerrada", "mapa_borrador"];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = exigirTokenJarvis(req);
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: d } = await db
    .from("diagnosticos")
    .select("id, estado, procesos, calculo")
    .eq("id", id)
    .maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!ESTADOS_CON_MAPA.includes(d.estado)) {
    return Response.json(
      {
        error:
          d.estado === "mapa_publicado"
            ? "El mapa ya está publicado: despublícalo en el panel para cambiarlo"
            : "La visita tiene que estar cerrada",
      },
      { status: 409 },
    );
  }

  const r = validarMapa(await req.json().catch(() => null), {
    procesos: (d.procesos ?? []) as TarjetaProceso[],
    calculo: (d.calculo ?? null) as CalculoVisita | null,
  });
  if (!r.ok)
    return Response.json({ error: "El mapa no es válido", errores: r.errores }, { status: 422 });

  const { error } = await db
    .from("diagnosticos")
    .update({ mapa: r.mapa, estado: "mapa_borrador" })
    .eq("id", id)
    .in("estado", ESTADOS_CON_MAPA);
  if (error) {
    console.error("[mapa] guardar", error);
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  }
  return Response.json({ guardado: true, estado: "mapa_borrador" });
}
