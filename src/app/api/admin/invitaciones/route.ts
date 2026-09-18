import { z } from "zod";
import { tipoNegocio } from "@/config/catalogoSectores";
import { CONFIG_VERSION } from "@/config/tipos";
import { exigirAdmin } from "@/lib/acceso";
import { ORIGENES } from "@/lib/diagnosticos";
import { enlaceWhatsApp, mensajeInvitacion } from "@/lib/invitacion";
import { supabaseAdmin } from "@/lib/supabase";
import { nuevoToken } from "@/lib/tokens";
import { enlacePrevio, urlBase } from "@/lib/url";

const opcional = (s: z.ZodString) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s.optional());

const esquema = z
  .object({
    empresa: z.string().trim().min(1).max(120),
    contacto_nombre: z.string().trim().min(1).max(80),
    contacto_email: opcional(z.string().trim().email().max(160)),
    contacto_telefono: opcional(z.string().trim().max(30)),
    web: opcional(z.string().trim().max(200)),
    tipo_negocio: z.string(),
    fecha_reunion: opcional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    hora_reunion: opcional(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)),
    lugar_reunion: opcional(z.string().trim().max(120)),
    origen: z.enum(ORIGENES).default("manual"),
    crm_contacto_id: opcional(z.string().uuid()),
  })
  .superRefine((d, ctx) => {
    if (!tipoNegocio(d.tipo_negocio)) ctx.addIssue({ code: "custom", path: ["tipo_negocio"], message: "Tipo de negocio no válido" });
    if (d.hora_reunion && !d.fecha_reunion) ctx.addIssue({ code: "custom", path: ["fecha_reunion"], message: "Falta la fecha" });
  });

/** Crea un diagnóstico → enlace del previo + mensaje de WhatsApp listo para copiar (spec §9). */
export async function POST(req: Request) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const cuerpo = esquema.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) {
    return Response.json({ error: "Datos no válidos", detalle: cuerpo.error.issues }, { status: 400 });
  }
  const d = cuerpo.data;
  const tipo = tipoNegocio(d.tipo_negocio)!;
  const token = nuevoToken();

  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .insert({
      token,
      tipo: "diagnostico",
      origen: d.origen,
      sector: tipo.sector,
      subsector: tipo.subsector ?? null,
      tipo_negocio: tipo.etiqueta,
      empresa: d.empresa,
      contacto_nombre: d.contacto_nombre,
      contacto_email: d.contacto_email ?? null,
      contacto_telefono: d.contacto_telefono ?? null,
      web: d.web ?? null,
      fecha_reunion: d.fecha_reunion ?? null,
      hora_reunion: d.hora_reunion ?? null,
      lugar_reunion: d.lugar_reunion ?? null,
      crm_contacto_id: d.crm_contacto_id ?? null,
      config_version: CONFIG_VERSION,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[invitaciones] insert", error);
    return Response.json({ error: "No se ha podido crear el diagnóstico" }, { status: 500 });
  }

  const enlace = enlacePrevio(await urlBase(), token);
  const mensaje = mensajeInvitacion({
    nombre: d.contacto_nombre,
    empresa: d.empresa,
    enlace,
    fechaReunion: d.fecha_reunion ?? null,
    horaReunion: d.hora_reunion ?? null,
  });
  return Response.json(
    { id: data.id, enlace, mensaje, whatsapp: enlaceWhatsApp(d.contacto_telefono, mensaje) },
    { status: 201 },
  );
}
