import { enlaceWhatsApp, mensajeRecordatorio } from "@/lib/invitacion";
import { verificarFirma } from "@/lib/motor";
import { estaCompleta, pasosPrevio } from "@/lib/previo";
import { supabaseAdmin } from "@/lib/supabase";
import { urlBase } from "@/lib/url";
import type { Respuestas, SectorId } from "@/config/tipos";

/**
 * Recordatorio si el previo no se termina (decisión de Aitor, 18-sep). Lo llama n8n una vez al
 * día, firmado con HMAC (cuerpo vacío: se firma "timestamp.").
 *
 * Devuelve los previos sin terminar con más de 48 h desde la invitación, sin recordatorio
 * enviado y cuya reunión no ha pasado, y los marca como avisados en la misma operación (cada
 * diagnóstico recibe UN recordatorio como mucho, aunque n8n llame dos veces).
 */
const HORAS_ESPERA = 48;

export async function POST(req: Request) {
  const crudo = await req.text();
  const ok = verificarFirma(
    process.env.DIAGNOSTICO_HMAC_SECRET,
    req.headers.get("x-orkesta-timestamp"),
    req.headers.get("x-orkesta-signature"),
    crudo,
  );
  if (!ok) return Response.json({ error: "Firma no válida" }, { status: 401 });

  const limite = new Date(Date.now() - HORAS_ESPERA * 3600_000).toISOString();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .update({ recordatorio_enviado_at: new Date().toISOString() })
    .eq("tipo", "diagnostico")
    .in("estado", ["invitado", "previo_en_curso"])
    .is("recordatorio_enviado_at", null)
    .lt("created_at", limite)
    .or(`fecha_reunion.is.null,fecha_reunion.gte.${hoy}`)
    .select(
      "id, token, sector, empresa, contacto_nombre, contacto_email, contacto_telefono, fecha_reunion, hora_reunion, respuestas_previo",
    );
  if (error) {
    console.error("[motor] pendientes", error);
    return Response.json({ error: "No se ha podido consultar" }, { status: 500 });
  }

  const base = await urlBase();
  const pendientes = (data ?? []).map((d) => {
    const enlace = `${base}/d/${d.token}`;
    const nombre = d.contacto_nombre ?? "";
    const mensaje = mensajeRecordatorio({ nombre, enlace, fechaReunion: d.fecha_reunion, horaReunion: d.hora_reunion });
    const r = (d.respuestas_previo ?? {}) as Respuestas;
    const pasos = pasosPrevio(d.sector as SectorId, r);
    return {
      diagnostico_id: d.id,
      empresa: d.empresa,
      contacto: { nombre, email: d.contacto_email, telefono: d.contacto_telefono },
      fecha_reunion: d.fecha_reunion,
      respondidas: pasos.filter((p) => estaCompleta(p.pregunta, r)).length,
      total: pasos.length,
      enlace,
      mensaje,
      whatsapp: enlaceWhatsApp(d.contacto_telefono, mensaje),
    };
  });
  return Response.json({ pendientes });
}
