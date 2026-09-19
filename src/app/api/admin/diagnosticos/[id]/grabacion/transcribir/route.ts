import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import { MAX_INTENTOS, transcribirFragmento } from "@/lib/grabacion";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;

/** Reintenta los fragmentos pendientes o con error (uno detrás de otro, hasta ~4 min). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });
  const db = supabaseAdmin();
  const { data: d } = await db.from("diagnosticos").select("empresa").eq("id", id).maybeSingle();
  if (!d) return Response.json({ error: "No encontrado" }, { status: 404 });
  const { data: pendientes } = await db
    .from("diagnostico_grabaciones")
    .select("id")
    .eq("diagnostico_id", id)
    .in("estado", ["pendiente", "error"])
    .lt("intentos", MAX_INTENTOS)
    .not("audio_path", "is", null)
    .order("orden");
  const limite = Date.now() + 240_000;
  let hechos = 0;
  for (const f of pendientes ?? []) {
    if (Date.now() > limite) break;
    await transcribirFragmento(f.id, d.empresa);
    hechos++;
  }
  return Response.json({ procesados: hechos, quedaban: pendientes?.length ?? 0 });
}
