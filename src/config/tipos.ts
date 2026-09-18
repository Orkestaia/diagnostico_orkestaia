/**
 * Tipos de la configuración del banco de sectores (banco §1) y de la batería del consultor.
 *
 * Los textos de `src/config/**` se transcriben del banco y de la batería SIN cambiarlos.
 * `scripts/verificar-config.ts` los compara con los documentos de JARVIS.
 */

export const CONFIG_VERSION = "banco_v1";

export type SectorId =
  | "servicios_profesionales"
  | "hosteleria_eventos"
  | "industria_distribucion"
  | "salud"
  | "otro";

/** Banco §1: chips (una opción) · multi (varias) · rango (chips con valor) · texto · url · si_no */
export type TipoPregunta = "chips" | "multi" | "rango" | "texto" | "url" | "si_no";

export interface Opcion {
  etiqueta: string;
  /** Solo en `rango`: el número entre corchetes. `null` = "No lo sé" (desactiva cifras). */
  valor?: number | null;
  /** Clave interna cuando el banco la da entre paréntesis (p. ej. `prioridad.exito`). */
  clave?: string;
  /** `dia.quien` (sector otro): perfil de coste que implica la opción. */
  perfil?: Perfil;
  /** `dia.docs_repetitivos`: grupo de subsector al que pertenece la opción. */
  grupo?: string;
}

/** `mostrar_si` del banco: pregunta condicional. */
export type Condicion =
  | { id: string; op: "eq"; valor: string }
  | { id: string; op: "neq"; valor: string }
  | { id: string; op: "gt"; valor: number };

export interface Pregunta {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  opciones?: Opcion[];
  mostrarSi?: Condicion;
  opcional?: boolean;
  /** `multi` con límite (p. ej. "máx. 2"). */
  maxSeleccion?: number;
  /** Nota literal del banco que acompaña a la pregunta, si la hay. */
  nota?: string;
}

export type Perfil = "operativo" | "tactico" | "directivo";

export type CategoriaQW =
  | "captacion"
  | "administracion"
  | "documentacion"
  | "clientes"
  | "operaciones";

export type TipoQW = "tiempo" | "oportunidad" | "mixto" | "riesgo";

/**
 * Valor de una respuesta tal como se guarda: la etiqueta elegida (chips, rango, si_no), la
 * lista de etiquetas (multi) o el texto. Los tests pueden pasar el número directamente.
 */
export type ValorRespuesta = string | string[] | number | null;
export type Respuestas = Record<string, ValorRespuesta>;

/**
 * Lectura de entradas para las fórmulas.
 * - `n(id)`: número de un `rango`. `null` = "No lo sé". `undefined` = no preguntado o sin responder.
 * - `s(id)`: etiqueta elegida en `chips` / `si_no`.
 * - `t(id)`: texto libre.
 */
export interface Entradas {
  n(id: string): number | null | undefined;
  s(id: string): string | undefined;
  t(id: string): string | undefined;
}

export interface QuickWin {
  id: string;
  tituloBase: string;
  categoria: CategoriaQW;
  tipo: TipoQW;
  /** Texto literal de la columna "Cálculo" (o "Elegible si") del banco, para trazabilidad. */
  formula: string;
  esfuerzo: string;
  etiquetas: string[];
  palabrasClave: string[];
  antes: string;
  despues: string;
  /** Banco §10: la tarea desde el punto de vista del lead. Nunca la solución. */
  etiquetaTarea: string;
  /** Perfil de coste. `null` si el QW no tiene horas (oportunidad o riesgo). */
  perfil: (e: Entradas) => Perfil | null;
  /**
   * ¿Puede aparecer? Con una entrada `null` ("No lo sé") el QW puede aparecer sin cifras
   * (banco §2.3 "Sin dato"); con una entrada `undefined` no se puede evaluar y no aparece.
   */
  elegible: (e: Entradas) => boolean;
  /**
   * Horas al mes que consume hoy la tarea, ANTES de aplicar el % automatizable.
   * `null` = falta un dato ("No lo sé"): el QW sale sin cifras. Ausente = el QW no tiene tiempo.
   */
  horasBase?: (e: Entradas) => number | null;
  /** % automatizable (se limita a 0,7 en `calculo.ts`, banco §2.2). */
  pct?: number | ((e: Entradas) => number);
  /** Conteo mensual de oportunidades. `null` = falta un dato. Ausente = no aplica. */
  oportunidades?: (e: Entradas) => number | null;
  /** Texto que acompaña al conteo de oportunidades ("consultas que esperan al día siguiente"). */
  unidadOportunidad?: string;
  /** Riesgo cualitativo aunque tenga horas (HE-QW3: "Riesgo si incidencias ≠ Nunca"). */
  riesgo?: (e: Entradas) => boolean;
}

export interface FrasesOrkestador {
  bienvenidaLeadMagnet: string;
  bienvenidaPreReunion: string;
  movimientoI: string;
  movimientoII: string;
  movimientoIV: string;
  movimientoV: string;
  componiendo: string;
  finalPreReunion: string;
}

export interface Sector {
  id: SectorId;
  /** Etiqueta de `negocio.sector`. */
  nombre: string;
  subsectores: string[];
  avisoFijo?: string;
  fraseIII: string;
  preguntas: Pregunta[];
  quickWins: QuickWin[];
  noAutomatizar: string[];
  validar: string[];
  /** Banco §9: las 3 preguntas del movimiento III en el previo. */
  previoIII: [string, string, string];
  /** Banco §5.5: aviso del mapa en `otro`. */
  avisoMapa?: string;
  /** Solo salud: se transcribe ya, se activa en el sprint 2. */
  activoEnInvitaciones: boolean;
}
