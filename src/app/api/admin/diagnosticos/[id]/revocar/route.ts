import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import { enlaceWhatsApp, mensajeInvitacion } from "@/lib/invitacion";
import { supabaseAdmin } from "@/lib/supabase";
import { nuevoToken } from "@/lib/tokens";
import { enlacePrevio, urlBase } from "@/lib/url";

/**
 * Spec §10: revocar un enlace = generar un token nuevo. El enlace anterior deja de abrir
 * nada al momento; el diagnóstico y sus respuestas no cambian.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });

  const token = nuevoToken();
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .update({ token })
    .eq("id", id)
    .select("empresa, contacto_nombre, contacto_telefono, fecha_reunion")
    .single();
  if (error || !data) return Response.json({ error: "No encontrado" }, { status: 404 });

  const enlace = enlacePrevio(await urlBase(), token);
  const mensaje = mensajeInvitacion({
    nombre: data.contacto_nombre ?? "",
    empresa: data.empresa ?? "",
    enlace,
    fechaReunion: data.fecha_reunion,
  });
  return Response.json({ enlace, mensaje, whatsapp: enlaceWhatsApp(data.contacto_telefono, mensaje) });
}
