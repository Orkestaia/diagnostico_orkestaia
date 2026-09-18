import { z } from "zod";
import type { Paso } from "@/config/consultor/tarjeta";

/*
 * Tipos de los diagramas de proceso. `nodoSchema` y `aristaSchema` son COPIA de
 * orkesta-web/lib/proyectos.ts (mismo formato de datos que los casos del portfolio, spec §1).
 */

export const nodoSchema = z.object({
  id: z.string(),
  texto: z.string(),
  col: z.number().int().min(0),
  fila: z.number().int().min(0),
  /** Paso que hace una persona, no el sistema. Se pinta en violeta. */
  humano: z.boolean().default(false),
});

export const aristaSchema = z.object({
  de: z.string(),
  a: z.string(),
  etiqueta: z.string().optional(),
});

export type Nodo = z.infer<typeof nodoSchema>;
export type Arista = z.infer<typeof aristaSchema>;

/**
 * Diagrama "Así es hoy" a partir de los pasos de una tarjeta (spec §4): en línea, de izquierda
 * a derecha, un nodo por paso. Los pasos vacíos no se dibujan.
 */
export function diagramaDesdePasos(pasos: Paso[]): { nodos: Nodo[]; aristas: Arista[] } {
  const validos = pasos.filter((p) => p.texto.trim() !== "");
  const nodos: Nodo[] = validos.map((p, i) => ({
    id: p.id,
    texto: p.texto.trim(),
    col: i,
    fila: 0,
    humano: p.quien === "persona",
  }));
  const aristas: Arista[] = nodos.slice(1).map((n, i) => ({ de: nodos[i].id, a: n.id }));
  return { nodos, aristas };
}
