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
}

/** Campos 🔒 de cada tarjeta (van en `diagnosticos.privado.procesos[id]`). */
export interface TarjetaPrivada {
  pctAutomatizable: number | null;
  ideaSolucion: string;
  dependencias: string;
  nota: string;
}
