import { after } from "next/server";
import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import { enviarEvento } from "@/lib/motor";
import { supabaseAdmin } from "@/lib/supabase";
import { urlBase } from "@/lib/url";

/**
 * Publicar el mapa (spec §5.5): borrador → publicado. El enlace `/m/[token]` empieza a abrir y
 * caduca a los 12 meses (§10). `DELETE` lo vuelve a borrador (para corregir algo).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });

  const ahora = new Date();
  const caduca = new Date(ahora);
  caduca.setUTCFullYear(caduca.getUTCFullYear() + 1);
  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .update({
      estado: "mapa_publicado",
      mapa_publicado_at: ahora.toISOString(),
      mapa_caduca_at: caduca.toISOString(),
    })
    .eq("id", id)
    .eq("estado", "mapa_borrador")
    .not("mapa", "is", null)
    .select("id, token, empresa, contacto_nombre, contacto_email")
    .maybeSingle();
  if (error) {
    console.error("[mapa] publicar", error);
    return Response.json({ error: "No se ha podido publicar" }, { status: 500 });
  }
  if (!data) return Response.json({ error: "No hay un mapa en borrador" }, { status: 409 });

  const enlace = `${await urlBase()}/m/${data.token}`;
  after(() =>
    enviarEvento("diagnostico.mapa_publicado", {
      diagnostico_id: data.id,
      empresa: data.empresa,
      contacto: { nombre: data.contacto_nombre, email: data.contacto_email },
      urls: { mapa: enlace },
    }),
  );
  return Response.json({ publicado: true, enlace });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });
  const { data } = await supabaseAdmin()
    .from("diagnosticos")
    .update({ estado: "mapa_borrador" })
    .eq("id", id)
    .eq("estado", "mapa_publicado")
    .select("id")
    .maybeSingle();
  if (!data) return Response.json({ error: "No está publicado" }, { status: 409 });
  return Response.json({ estado: "mapa_borrador" });
}
