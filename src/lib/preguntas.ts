/**
 * Lectura de respuestas: visibilidad (`mostrar_si`) y valores numéricos de los `rango`.
 * Funciones puras, compartidas por el previo, la visita y `calculo.ts`.
 */
import { preguntasDeSector } from "@/config/sectores";
import type { Condicion, Entradas, Pregunta, Respuestas, SectorId } from "@/config/tipos";

export function indicePreguntas(sector: SectorId): Map<string, Pregunta> {
  return new Map(preguntasDeSector(sector).map((p) => [p.id, p]));
}

function textoDe(v: Respuestas[string] | undefined): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/** Valor numérico de una respuesta según su pregunta. */
function numeroDe(p: Pregunta | undefined, v: Respuestas[string] | undefined) {
  if (v === undefined || v === "") return undefined;
  if (v === null || typeof v === "number") return v;
  if (typeof v !== "string" || !p?.opciones) return undefined;
  const op = p.opciones.find((o) => o.etiqueta === v);
  return op && "valor" in op ? op.valor : undefined;
}

function cumple(c: Condicion, r: Respuestas, indice: Map<string, Pregunta>): boolean {
  const v = r[c.id];
  if (c.op === "gt") {
    const n = numeroDe(indice.get(c.id), v);
    return typeof n === "number" && n > c.valor;
  }
  const s = textoDe(v);
  if (s === undefined) return false;
  return c.op === "eq" ? s === c.valor : s !== c.valor;
}

/** ¿Se enseña la pregunta con estas respuestas? (encadena: si su condición está oculta, también). */
export function esVisible(
  p: Pregunta,
  r: Respuestas,
  indice: Map<string, Pregunta>,
  profundidad = 0,
): boolean {
  if (!p.mostrarSi) return true;
  if (profundidad > 5) return false;
  const madre = indice.get(p.mostrarSi.id);
  if (madre && !esVisible(madre, r, indice, profundidad + 1)) return false;
  return cumple(p.mostrarSi, r, indice);
}

/**
 * Entradas para las fórmulas. Una respuesta a una pregunta que ahora está oculta (p. ej.
 * `presupuestos_mes` después de cambiar a "No hacemos presupuestos") cuenta como no respondida.
 */
export function leerEntradas(r: Respuestas, sector: SectorId): Entradas {
  const indice = indicePreguntas(sector);
  const visible = (id: string) => {
    const p = indice.get(id);
    return !p || esVisible(p, r, indice);
  };
  return {
    n: (id) => (visible(id) ? numeroDe(indice.get(id), r[id]) : undefined),
    s: (id) => (visible(id) ? textoDe(r[id]) : undefined),
    t: (id) => (visible(id) ? textoDe(r[id]) : undefined),
  };
}
