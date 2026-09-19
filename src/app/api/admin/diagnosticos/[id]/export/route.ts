import { z } from "zod";
import { exigirTokenJarvis } from "@/lib/acceso";
import {
  COLUMNAS_EXPORT,
  exportJson,
  exportMarkdown,
  exportTranscripcion,
  nombreArchivo,
  type FilaExport,
} from "@/lib/exportar";
import { resultadoMadurez } from "@/lib/datosEncuesta";
import { temasDeTranscripcion } from "@/lib/grabacion";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Export para JARVIS (spec §5.1): `?formato=md` (por defecto) o `json`.
 * Sin Clerk (el middleware la deja pasar): Bearer `DIAGNOSTICO_ADMIN_TOKEN`.
 */
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = exigirTokenJarvis(req);
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });
  const formato = new URL(req.url).searchParams.get("formato") ?? "md";
  if (!["md", "json", "transcripcion"].includes(formato))
    return Response.json({ error: "formato: md, json o transcripcion" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("diagnosticos")
    .select(COLUMNAS_EXPORT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return Response.json({ error: "No encontrado" }, { status: 404 });
  const { data: grabacion } = await supabaseAdmin()
    .from("diagnostico_grabaciones")
    .select("orden, duracion_s, estado, texto")
    .eq("diagnostico_id", id)
    .order("orden");
  const parcial = data as unknown as FilaExport;
  const fila: FilaExport = {
    ...parcial,
    transcripcion: grabacion ?? [],
    madurez: await resultadoMadurez(id),
    temas: (grabacion ?? []).some((g) => g.texto)
      ? await temasDeTranscripcion(id, parcial.empresa)
      : null,
  };
  const hoy = new Date().toISOString().slice(0, 10);
  const cabeceras = { "Cache-Control": "no-store" };

  if (formato === "json") return Response.json(exportJson(fila, hoy), { headers: cabeceras });
  if (formato === "transcripcion") {
    return new Response(exportTranscripcion(fila, hoy), {
      headers: {
        ...cabeceras,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `inline; filename="${nombreArchivo(fila, hoy).replace("_raw.md", "_transcripcion.md")}"`,
      },
    });
  }
  return new Response(exportMarkdown(fila, hoy), {
    headers: {
      ...cabeceras,
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${nombreArchivo(fila, hoy)}"`,
    },
  });
}
