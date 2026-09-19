import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import { supabaseAdmin } from "@/lib/supabase";

/** Registra que el cliente acepta la grabación (fecha y hora). Solo la primera vez. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: d } = await db
    .from("diagnosticos")
    .select("grabacion_consentimiento_at")
    .eq("id", id)
    .maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  if (d.grabacion_consentimiento_at)
    return Response.json({ consentimiento_at: d.grabacion_consentimiento_at });
  const ahora = new Date().toISOString();
  const { error } = await db
    .from("diagnosticos")
    .update({ grabacion_consentimiento_at: ahora })
    .eq("id", id);
  if (error) {
    console.error("[grabacion] consentimiento", error);
    return Response.json({ error: "No se ha podido guardar" }, { status: 500 });
  }
  return Response.json({ consentimiento_at: ahora });
}
