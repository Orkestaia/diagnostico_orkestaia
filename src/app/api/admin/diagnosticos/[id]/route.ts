import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import { BUCKET_AUDIO } from "@/lib/grabacion";
import { supabaseAdmin } from "@/lib/supabase";

const vacioANull = (s: z.ZodString) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), s.nullable());

/**
 * Datos de contacto y de la reunión que se pueden corregir desde el panel. No se cambia el tipo
 * de negocio: decide las preguntas del previo y ya se han contestado con ellas.
 */
const edicion = z
  .object({
    empresa: z.string().trim().min(1).max(120),
    contacto_nombre: z.string().trim().min(1).max(80),
    contacto_email: z.string().trim().email().max(160),
    contacto_telefono: vacioANull(z.string().trim().max(30)),
    fecha_reunion: vacioANull(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    hora_reunion: vacioANull(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)),
    lugar_reunion: vacioANull(z.string().trim().max(120)),
  })
  .partial()
  .refine((d) => !(d.hora_reunion && d.fecha_reunion === null), {
    message: "Sin fecha no puede haber hora",
    path: ["hora_reunion"],
  });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });
  const cuerpo = edicion.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) {
    return Response.json(
      { error: "Datos no válidos", detalle: cuerpo.error.issues },
      { status: 400 },
    );
  }
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .update(cuerpo.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[diagnosticos] editar", error);
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  }
  if (!data) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json({ guardado: true });
}

/**
 * Borra un diagnóstico entero: respuestas, tarjetas, notas, grabaciones y encuesta (las tablas
 * hijas caen por `on delete cascade`) y el audio que quedara sin transcribir en el bucket.
 * No se puede deshacer, así que el nombre de la empresa tiene que coincidir: es la confirmación.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });

  const cuerpo = z.object({ empresa: z.string() }).safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) return Response.json({ error: "Falta la confirmación" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: d } = await db
    .from("diagnosticos")
    .select("id, empresa")
    .eq("id", id)
    .maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (d.empresa !== cuerpo.data.empresa) {
    return Response.json({ error: "El nombre de la empresa no coincide" }, { status: 409 });
  }

  // Audio pendiente de transcribir: el de los fragmentos ya transcritos se borró al transcribirse.
  const { data: ficheros } = await db.storage.from(BUCKET_AUDIO).list(id);
  if (ficheros?.length) {
    await db.storage.from(BUCKET_AUDIO).remove(ficheros.map((f) => `${id}/${f.name}`));
  }

  const { error } = await db.from("diagnosticos").delete().eq("id", id);
  if (error) {
    console.error("[diagnosticos] borrar", error);
    return Response.json({ error: "No se ha podido borrar" }, { status: 500 });
  }
  return Response.json({ borrado: true });
}
