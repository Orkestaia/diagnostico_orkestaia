import { z } from "zod";
import { exigirAdmin } from "@/lib/acceso";
import {
  cargarExport,
  FORMATOS_EXPORT,
  respuestaExport,
  type FormatoExport,
} from "@/lib/datosExport";

/**
 * Los mismos archivos que el export de JARVIS, descargados desde el panel con la sesión de
 * Aitor (Clerk). `?ver=1` los abre en el navegador en vez de guardarlos.
 */
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return Response.json({ error: "Id no válido" }, { status: 400 });
  const url = new URL(req.url);
  const formato = (url.searchParams.get("formato") ?? "md") as FormatoExport;
  if (!FORMATOS_EXPORT.includes(formato))
    return Response.json({ error: "formato: md, json o transcripcion" }, { status: 400 });

  const fila = await cargarExport(id);
  if (!fila) return Response.json({ error: "No encontrado" }, { status: 404 });
  return respuestaExport(fila, formato, url.searchParams.get("ver") !== "1");
}
