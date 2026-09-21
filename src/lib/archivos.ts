import "server-only";
import { createHash } from "node:crypto";
import { cargarExport } from "./datosExport";
import { exportMarkdown, exportTranscripcion, nombreArchivo } from "./exportar";
import { mapaSchema } from "./mapa";
import { mapaMarkdown } from "./mapaTexto";
import { supabaseAdmin } from "./supabase";

/**
 * Archivos de cada diagnóstico para guardarlos fuera de la app (decisión de Aitor, 21-sep):
 * en su carpeta de JARVIS (`03_PIPELINE/01_leads/<cliente>/`, con un script en su PC) y en Google
 * Drive (`Diagnósticos Orkesta/<cliente>/`, con n8n). Los dos piden lo mismo aquí y solo
 * reescriben un archivo si su huella (`hash`) ha cambiado.
 */

export interface ArchivoCliente {
  nombre: string;
  contenido: string;
  hash: string;
}

export interface CarpetaCliente {
  diagnostico_id: string;
  empresa: string;
  /** Nombre de carpeta válido en Windows y en Drive. */
  carpeta: string;
  archivos: ArchivoCliente[];
}

/** Caracteres que Windows no admite en un nombre de carpeta, más los de control. */
const PROHIBIDOS = /[\\/:*?"<>|\x00-\x1f]/g;

/** Nombre de carpeta a partir de la empresa: quita lo que Windows no admite; mantiene tildes. */
export function nombreCarpeta(empresa: string): string {
  const limpio = empresa
    .replace(PROHIBIDOS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
  return limpio || "Sin nombre";
}

/** Línea de cabecera con la fecha de generación: no cuenta para decidir si el archivo cambió. */
const LINEA_GENERADO = /^> Generado por la app[^\n]*\n/m;

/** Huella del contenido. Si solo cambia la fecha de generación, el archivo no se vuelve a subir. */
export const huella = (s: string) =>
  createHash("sha256").update(s.replace(LINEA_GENERADO, "")).digest("hex").slice(0, 16);

/**
 * Copia del mapa publicado (revisión con JARVIS, 21-sep). Una por publicación: el nombre lleva la
 * fecha en que se publicó, así una corrección posterior no borra la copia de lo que se entregó.
 */
async function copiaDelMapa(id: string, base: string): Promise<ArchivoCliente | null> {
  const { data } = await supabaseAdmin()
    .from("diagnosticos")
    .select("empresa, token, mapa, mapa_publicado_at, mapa_caduca_at")
    .eq("id", id)
    .eq("estado", "mapa_publicado")
    .maybeSingle();
  if (!data?.mapa_publicado_at) return null;
  const r = mapaSchema.safeParse(data.mapa);
  if (!r.success) return null;
  const contenido = mapaMarkdown(r.data, {
    empresa: data.empresa,
    enlace: `${base}/m/${data.token}`,
    publicadoAt: data.mapa_publicado_at,
    caducaAt: data.mapa_caduca_at,
  });
  return {
    nombre: `${String(data.mapa_publicado_at).slice(0, 10)}_mapa-publicado.md`,
    contenido,
    hash: huella(contenido),
  };
}

/**
 * Diagnósticos que ya tienen algo que guardar: visita cerrada o alguna transcripción. El informe
 * completo va siempre; la transcripción, solo si se grabó.
 */
export async function carpetasClientes(base: string): Promise<CarpetaCliente[]> {
  const db = supabaseAdmin();
  const [{ data: cerrados }, { data: grabados }] = await Promise.all([
    db.from("diagnosticos").select("id").not("visita_cerrada_at", "is", null),
    db.from("diagnostico_grabaciones").select("diagnostico_id").eq("estado", "transcrito"),
  ]);
  const ids = [
    ...new Set([
      ...(cerrados ?? []).map((d) => d.id as string),
      ...(grabados ?? []).map((g) => g.diagnostico_id as string),
    ]),
  ];

  const hoy = new Date().toISOString().slice(0, 10);
  const carpetas: CarpetaCliente[] = [];
  for (const id of ids) {
    const f = await cargarExport(id);
    if (!f) continue;
    // El nombre lleva una fecha que no cambia (visita, reunión o previo), no la de hoy: así el
    // archivo se sobrescribe en vez de duplicarse cada día.
    const estable = (f.visita_cerrada_at ?? f.fecha_reunion ?? f.previo_completado_at ?? hoy).slice(
      0,
      10,
    );
    const raw = exportMarkdown(f, hoy);
    const archivos: ArchivoCliente[] = [
      { nombre: nombreArchivo(f, estable), contenido: raw, hash: huella(raw) },
    ];
    const copiaMapa = await copiaDelMapa(id, base);
    if (copiaMapa) archivos.push(copiaMapa);
    if ((f.transcripcion ?? []).length) {
      const t = exportTranscripcion(f, hoy);
      archivos.push({
        nombre: nombreArchivo(f, estable).replace("_raw.md", "_transcripcion.md"),
        contenido: t,
        hash: huella(t),
      });
    }
    carpetas.push({
      diagnostico_id: f.id,
      empresa: f.empresa,
      carpeta: nombreCarpeta(f.empresa),
      archivos,
    });
  }
  return carpetas;
}
