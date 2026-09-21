import "server-only";
import { resultadoMadurez } from "./datosEncuesta";
import {
  COLUMNAS_EXPORT,
  exportJson,
  exportMarkdown,
  exportTranscripcion,
  nombreArchivo,
  type FilaExport,
} from "./exportar";
import { temasDeTranscripcion } from "./grabacion";
import { leerRedaccion } from "./redaccion";
import { supabaseAdmin } from "./supabase";

/**
 * Lo que necesita el export de un diagnóstico, venga la petición de JARVIS (Bearer) o del panel
 * (Clerk): la fila, la transcripción por fragmentos, la madurez del equipo y los temas.
 */
export async function cargarExport(id: string): Promise<FilaExport | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("diagnosticos")
    .select(COLUMNAS_EXPORT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const { data: grabacion } = await db
    .from("diagnostico_grabaciones")
    .select("orden, duracion_s, estado, texto")
    .eq("diagnostico_id", id)
    .order("orden");
  const fila = data as unknown as FilaExport;
  return {
    ...fila,
    transcripcion: grabacion ?? [],
    madurez: await resultadoMadurez(id),
    redaccion: await leerRedaccion(id),
    temas: (grabacion ?? []).some((g) => g.texto)
      ? await temasDeTranscripcion(id, fila.empresa)
      : null,
  };
}

export const FORMATOS_EXPORT = ["md", "json", "transcripcion"] as const;
export type FormatoExport = (typeof FORMATOS_EXPORT)[number];

/** Respuesta HTTP del export. `descarga` = que el navegador lo guarde como archivo. */
export function respuestaExport(
  fila: FilaExport,
  formato: FormatoExport,
  descarga = false,
): Response {
  const hoy = new Date().toISOString().slice(0, 10);
  const disposicion = descarga ? "attachment" : "inline";
  const cabeceras = { "Cache-Control": "no-store" };
  if (formato === "json") {
    const nombre = nombreArchivo(fila, hoy, "json");
    return new Response(JSON.stringify(exportJson(fila, hoy), null, 2), {
      headers: {
        ...cabeceras,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `${disposicion}; filename="${nombre}"`,
      },
    });
  }
  const md =
    formato === "transcripcion" ? exportTranscripcion(fila, hoy) : exportMarkdown(fila, hoy);
  const nombre =
    formato === "transcripcion"
      ? nombreArchivo(fila, hoy).replace("_raw.md", "_transcripcion.md")
      : nombreArchivo(fila, hoy);
  return new Response(md, {
    headers: {
      ...cabeceras,
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `${disposicion}; filename="${nombre}"`,
    },
  });
}
