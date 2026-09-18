/**
 * Previo del cliente (spec §3, banco §9): qué preguntas le tocan, en qué orden, y si una
 * respuesta es válida. Funciones puras: las usan la página del cliente y la API.
 */
import { movimientosPrevio, type Movimiento } from "@/config/previo";
import type { Pregunta, Respuestas, SectorId, ValorRespuesta } from "@/config/tipos";
import { esVisible, indicePreguntas } from "./preguntas";

/** Spec §10: textos del previo ≤ 280. */
export const MAX_TEXTO_PREVIO = 280;

export interface PasoPrevio {
  movimiento: number;
  pregunta: Pregunta;
}

/** Ids de todas las preguntas que el previo de este sector puede hacer. */
export function idsPrevio(sector: SectorId): Set<string> {
  return new Set(movimientosPrevio(sector).flatMap((m) => m.preguntas));
}

/** Preguntas visibles ahora mismo, en orden, con su movimiento (depende de las respuestas). */
export function pasosPrevio(sector: SectorId, r: Respuestas): PasoPrevio[] {
  const indice = indicePreguntas(sector);
  const movs: Movimiento[] = movimientosPrevio(sector);
  const pasos: PasoPrevio[] = [];
  movs.forEach((m, i) => {
    for (const id of m.preguntas) {
      const p = indice.get(id);
      if (p && esVisible(p, r, indice)) pasos.push({ movimiento: i, pregunta: p });
    }
  });
  return pasos;
}

export function estaRespondida(p: Pregunta, v: ValorRespuesta | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

/** Primera pregunta visible sin responder (para reanudar), o -1 si está todo. */
export function primeraPendiente(sector: SectorId, r: Respuestas): number {
  return pasosPrevio(sector, r).findIndex((x) => !x.pregunta.opcional && !estaRespondida(x.pregunta, r[x.pregunta.id]));
}

/** ¿Es un valor aceptable para esta pregunta? (lo que llega del navegador no es de fiar) */
export function valorValido(p: Pregunta, v: unknown): v is ValorRespuesta {
  if (v === null || v === "") return true; // borrar una respuesta
  const etiquetas = new Set((p.opciones ?? []).map((o) => o.etiqueta));
  switch (p.tipo) {
    case "chips":
    case "rango":
      return typeof v === "string" && etiquetas.has(v);
    case "si_no":
      return v === "Sí" || v === "No";
    case "multi":
      return (
        Array.isArray(v) &&
        v.length <= (p.maxSeleccion ?? etiquetas.size) &&
        new Set(v).size === v.length &&
        v.every((x) => typeof x === "string" && etiquetas.has(x))
      );
    case "texto":
    case "url":
      return typeof v === "string" && v.length <= MAX_TEXTO_PREVIO;
  }
}

/**
 * Valida un lote de respuestas del previo. Devuelve solo las aceptadas y la lista de
 * rechazadas (id desconocido para este sector o valor que no encaja).
 */
export function filtrarRespuestas(sector: SectorId, lote: Record<string, unknown>) {
  const ids = idsPrevio(sector);
  const indice = indicePreguntas(sector);
  const aceptadas: Respuestas = {};
  const rechazadas: string[] = [];
  for (const [id, v] of Object.entries(lote)) {
    const p = indice.get(id);
    if (!ids.has(id) || !p || !valorValido(p, v)) rechazadas.push(id);
    else aceptadas[id] = typeof v === "string" ? v.trim() : (v as ValorRespuesta);
  }
  return { aceptadas, rechazadas };
}

/** Estados en los que el previo todavía acepta cambios (spec §10: al completarse, solo lectura). */
export const ESTADOS_PREVIO_EDITABLE = ["invitado", "previo_en_curso"] as const;
