/**
 * Tipos y columnas de `diagnosticos` (spec §8).
 *
 * Regla: nunca `select *`. Cada uso tiene su lista de columnas. `privado`, `interno` y
 * `calculo` NO aparecen en ninguna lista pública (`/d/*`, `/m/*`).
 */
import type { SectorId } from "@/config/tipos";

export type EstadoDiagnostico =
  | "invitado"
  | "previo_en_curso"
  | "previo_completado"
  | "visita_en_curso"
  | "visita_cerrada"
  | "mapa_borrador"
  | "mapa_publicado"
  | "en_curso"
  | "componiendo"
  | "informe_listo"
  | "error";

export const ETIQUETA_ESTADO: Record<EstadoDiagnostico, string> = {
  invitado: "Invitado",
  previo_en_curso: "Previo en curso",
  previo_completado: "Previo completado",
  visita_en_curso: "Visita en curso",
  visita_cerrada: "Visita cerrada",
  mapa_borrador: "Mapa en borrador",
  mapa_publicado: "Mapa publicado",
  en_curso: "En curso",
  componiendo: "Componiendo",
  informe_listo: "Informe listo",
  error: "Error",
};

export const ORIGENES = ["bni", "web", "chatbot", "cold_email", "referido", "manual"] as const;
export type Origen = (typeof ORIGENES)[number];

export const ETIQUETA_ORIGEN: Record<Origen, string> = {
  bni: "BNI",
  web: "Web",
  chatbot: "Chatbot",
  cold_email: "Cold email",
  referido: "Referido",
  manual: "Manual",
};

/** Listado del panel (Clerk). */
export const COLUMNAS_LISTADO =
  "id, token, estado, sector, subsector, empresa, contacto_nombre, contacto_email, contacto_telefono, fecha_reunion, hora_reunion, lugar_reunion, tipo_negocio, origen, crm_contacto_id, created_at, updated_at, previo_completado_at, visita_cerrada_at";

export interface FilaListado {
  id: string;
  token: string;
  estado: EstadoDiagnostico;
  sector: SectorId;
  subsector: string | null;
  empresa: string | null;
  contacto_nombre: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  fecha_reunion: string | null;
  hora_reunion: string | null;
  lugar_reunion: string | null;
  tipo_negocio: string | null;
  origen: Origen | null;
  crm_contacto_id: string | null;
  created_at: string;
  updated_at: string;
  previo_completado_at: string | null;
  visita_cerrada_at: string | null;
}

/**
 * Previo del cliente (`/d/[token]`, sin cuenta). Solo lo que el cliente necesita ver.
 * `informe` lleva únicamente los textos visibles que devuelve el motor (lo entendido, temas).
 */
export const COLUMNAS_PREVIO =
  "id, estado, sector, subsector, empresa, contacto_nombre, fecha_reunion, hora_reunion, lugar_reunion, respuestas_previo, informe, previo_completado_at";

/**
 * Visita (Clerk): todo lo visible. `privado`, `interno` y `calculo` NO van aquí: la parte privada
 * se pide aparte (`/privado`) y solo con la vista privada activada.
 */
export const COLUMNAS_VISITA =
  "id, token, estado, sector, subsector, tipo_negocio, empresa, contacto_nombre, fecha_reunion, hora_reunion, lugar_reunion, respuestas_previo, respuestas_visita, procesos, visita_cerrada_at";

/** Estados en los que la visita acepta cambios. */
export const ESTADOS_VISITA_EDITABLE = ["invitado", "previo_en_curso", "previo_completado", "visita_en_curso"] as const;
