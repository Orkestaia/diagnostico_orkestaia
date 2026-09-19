/**
 * Batería del consultor v1 — §2 Tarjeta de proceso (bloque B).
 * Transcrito sin cambios. Los campos 🔒 van en `privado`, nunca en `procesos`.
 */
import type { Perfil } from "../tipos";

export const AREAS = ["Captación", "Operación", "Administración", "Clientes", "Dirección"] as const;
export type Area = (typeof AREAS)[number];

/** `quien`: chips → perfil de coste (banco §2.1). */
export const QUIEN: { etiqueta: string; perfil: Perfil }[] = [
  { etiqueta: "Dirección o profesional", perfil: "directivo" },
  { etiqueta: "Responsable", perfil: "tactico" },
  { etiqueta: "Comercial", perfil: "tactico" },
  { etiqueta: "Administración o recepción", perfil: "operativo" },
];

/** `volumen`: periodo → multiplicador a mes. Día: × 21 (hostelería × 26). */
export const PERIODOS = [
  { id: "dia", etiqueta: "día" },
  { id: "semana", etiqueta: "semana" },
  { id: "mes", etiqueta: "mes" },
] as const;
export type Periodo = (typeof PERIODOS)[number]["id"];
export const DIAS_MES = 21;
export const DIAS_MES_HOSTELERIA = 26;
export const SEMANAS_MES = 4.3;

export const ERRORES = ["Nunca", "A veces", "A menudo"] as const;
export const IMPACTO_CLIENTE = [
  "Ninguno",
  "Espera",
  "Error visible",
  "Pérdida de cliente",
] as const;
/** §7 Clasificación de iniciativas. La definitiva la pone JARVIS. */
export const TIPOS_INICIATIVA = [
  "Quick win",
  "Apuesta estructural",
  "Marginal",
  "No rentable",
] as const;
export const RIESGOS_CUMPLIMIENTO = [
  "Ninguno",
  "Datos personales",
  "Datos sensibles",
  "Decisión sobre personas",
] as const;

export const LIMITES_TARJETA = {
  nombre: 60,
  paso: 60,
  cita: 200,
  pasosMin: 3,
  pasosMax: 9,
  /** 0-70 % (banco §2.2: nunca más de 0,7). */
  pctMax: 0.7,
  /** Spec §10: campos de texto de la visita ≤ 2.000. */
  textoVisita: 2000,
} as const;

/** Un paso de "cómo se hace hoy". Por defecto lo hace una persona. */
export interface Paso {
  id: string;
  texto: string;
  quien: "persona" | "sistema";
}

/** Campos visibles para el cliente (van en `diagnosticos.procesos`). */
export interface TarjetaProceso {
  id: string;
  nombre: string;
  area: Area | null;
  /** Nombre de la plantilla de origen (batería §3), si viene de una. */
  plantilla: string | null;
  disparador: string;
  pasos: Paso[];
  quien: string | null;
  quienPersonas: number | null;
  volumen: number | null;
  volumenUnidad: string;
  volumenPeriodo: Periodo;
  minutosPorVez: number | null;
  herramientas: string[];
  atasco: string;
  errores: (typeof ERRORES)[number] | null;
  erroresEjemplo: string;
  cita: string;
  visto: boolean;
  prioridadCliente: 1 | 2 | 3 | null;
  /** "Tarjeta rápida" (JARVIS, 19-sep): solo nombre, volumen y minutos; se completa si hay tiempo. */
  rapida: boolean;
  /**
   * De dónde salen volumen y minutos: precargados del previo o acordados en la visita.
   * Pasa a "visita" en cuanto Aitor los toca delante del cliente.
   */
  origenDatos: "previo" | "visita";
  /**
   * Registro FIJO de las horas que consume hoy (JARVIS, 19-sep): se escribe al cerrar la visita y
   * no se recalcula nunca. Es la línea base para medir el resultado real después.
   */
  hoyRegistro: { horasMes: number; fecha: string; origen: "previo" | "visita" } | null;

  // ── Campos de profundización (batería v2 §2, nivel P) ──
  /** "¿Cuántas personas o áreas lo tocan de principio a fin?" */
  traspasos: number | null;
  /** "¿Qué pasa cuando esa persona falta o se va de vacaciones?" */
  dependenciaPersona: { texto?: string; aqui?: string } | null;
  /** "¿Qué casos se salen de lo normal y cómo se resuelven?" */
  excepciones: string;
  /** "¿En qué punto se pierde información o hay que volver a preguntar?" */
  perdidaInfo: string;
  /** "¿Qué datos necesita y de dónde salen?" */
  datosEntrada: string;
  /** "¿Qué produce y quién lo usa después?" */
  salida: string;
  /** "¿Hay que rehacerlo o corregirlo?" */
  retrabajo: (typeof ERRORES)[number] | null;
  impactoCliente: (typeof IMPACTO_CLIENTE)[number] | null;
  /** "¿En qué momentos del mes o del año se dispara?" */
  picos: string;
}

/** Campos 🔒 de cada tarjeta (van en `diagnosticos.privado.procesos[id]`). */
export interface TarjetaPrivada {
  pctAutomatizable: number | null;
  ideaSolucion: string;
  dependencias: string;
  nota: string;
  /** §7: se propone aquí y se confirma en JARVIS. */
  tipoIniciativa: (typeof TIPOS_INICIATIVA)[number] | null;
  /** Obligatorio si `tipoIniciativa` = "No rentable" (§7). */
  motivoDescarte: string;
  riesgoCumplimiento: (typeof RIESGOS_CUMPLIMIENTO)[number] | null;
}

/** Tarjeta vacía con valores por defecto. */
export function tarjetaNueva(p: Partial<TarjetaProceso> & { id: string }): TarjetaProceso {
  return {
    nombre: "",
    area: null,
    plantilla: null,
    disparador: "",
    pasos: [],
    quien: null,
    quienPersonas: null,
    volumen: null,
    volumenUnidad: "",
    volumenPeriodo: "mes",
    minutosPorVez: null,
    herramientas: [],
    atasco: "",
    errores: null,
    erroresEjemplo: "",
    cita: "",
    visto: false,
    prioridadCliente: null,
    rapida: false,
    origenDatos: "visita",
    hoyRegistro: null,
    traspasos: null,
    dependenciaPersona: null,
    excepciones: "",
    perdidaInfo: "",
    datosEntrada: "",
    salida: "",
    retrabajo: null,
    impactoCliente: null,
    picos: "",
    ...p,
  };
}

/** Tarjetas objetivo por visita (JARVIS, 19-sep: 5-7, empezando por las que traen datos del previo). */
export const TARJETAS_VISITA = { min: 5, max: 7 };
