import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Parte 🔒 de la visita. La pantalla solo la pide al activar la vista privada y la olvida al
 * volver a la vista cliente: mientras tanto no está ni en el HTML ni en la memoria de la página.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Id no válido" }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("diagnosticos").select("privado, interno").eq("id", id).maybeSingle();
  if (error || !data) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json(
    { privado: data.privado ?? {}, interno: data.interno ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
