import { after } from "next/server";
import { leerPrevio } from "@/lib/datosPrevio";
import { payloadPrevioCompletado, type FilaEvento } from "@/lib/eventos";
import { demasiadas, dentroDelLimite } from "@/lib/limite";
import { enviarEvento } from "@/lib/motor";
import { ESTADOS_PREVIO_EDITABLE, primeraPendiente } from "@/lib/previo";
import { resumenFinal } from "@/lib/resumenPrevio";
import { supabaseAdmin } from "@/lib/supabase";
import { urlBase } from "@/lib/url";

/**
 * Cierra el previo (spec §9): estado → previo_completado y evento a n8n. La pantalla final no
 * espera al motor: se responde al momento con el resumen de las plantillas fijas.
 * CRM: en el sprint 2.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await leerPrevio(token);
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });

  // Idempotente: si ya estaba completado, se devuelve el resumen sin volver a enviar nada.
  if (!(ESTADOS_PREVIO_EDITABLE as readonly string[]).includes(d.estado)) {
    return Response.json({ resumen: resumenFinal(d.respuestas_previo, d.sector, d.informe) });
  }
  if (!(await dentroDelLimite(token))) return demasiadas();

  const pendiente = primeraPendiente(d.sector, d.respuestas_previo);
  if (pendiente !== -1) return Response.json({ error: "Faltan respuestas", pendiente }, { status: 422 });

  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .update({ estado: "previo_completado", previo_completado_at: new Date().toISOString() })
    .eq("id", d.id)
    .in("estado", ESTADOS_PREVIO_EDITABLE as unknown as string[])
    .select(
      "id, token, origen, config_version, sector, subsector, empresa, contacto_nombre, contacto_email, contacto_telefono, fecha_reunion, respuestas_previo",
    )
    .maybeSingle();
  if (error) {
    console.error("[previo] completar", error);
    return Response.json({ error: "No se ha podido completar" }, { status: 500 });
  }

  // Si otra petición lo completó a la vez, `data` viene vacío y no se envía el evento dos veces.
  if (data) {
    const base = await urlBase();
    after(() => enviarEvento("diagnostico.previo_completado", payloadPrevioCompletado(data as FilaEvento, base)));
  }
  return Response.json({ resumen: resumenFinal(d.respuestas_previo, d.sector, d.informe) });
}
