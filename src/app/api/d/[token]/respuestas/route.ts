import { z } from "zod";
import { leerPrevio } from "@/lib/datosPrevio";
import { demasiadas, dentroDelLimite } from "@/lib/limite";
import { ESTADOS_PREVIO_EDITABLE, filtrarRespuestas } from "@/lib/previo";
import { supabaseAdmin } from "@/lib/supabase";

const esquema = z.object({ respuestas: z.record(z.string(), z.unknown()) });

/**
 * Autoguardado del previo (spec §9). Se fusiona con lo que ya había. Solo mientras el previo
 * está abierto: al completarse queda en solo lectura (spec §10).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await leerPrevio(token);
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (!(ESTADOS_PREVIO_EDITABLE as readonly string[]).includes(d.estado)) {
    return Response.json({ error: "El previo ya está completado" }, { status: 409 });
  }
  if (!(await dentroDelLimite(token))) return demasiadas();

  const cuerpo = esquema.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) return Response.json({ error: "Datos no válidos" }, { status: 400 });

  const { aceptadas, rechazadas } = filtrarRespuestas(d.sector, cuerpo.data.respuestas);
  const respuestas = { ...d.respuestas_previo, ...aceptadas };
  for (const [k, v] of Object.entries(aceptadas)) if (v === null || v === "") delete respuestas[k];

  const { error } = await supabaseAdmin()
    .from("diagnosticos")
    .update({ respuestas_previo: respuestas, estado: "previo_en_curso" })
    .eq("id", d.id)
    .in("estado", ESTADOS_PREVIO_EDITABLE as unknown as string[]);
  if (error) {
    console.error("[previo] guardar", error);
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  }
  return Response.json({ guardado: Object.keys(aceptadas), rechazadas });
}
