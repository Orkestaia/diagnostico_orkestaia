/**
 * Mapa del cliente (`mapa_v1`, spec §7). JARVIS escribe el contenido; la app lo valida antes de
 * guardarlo y lo pinta en `/m/[token]` y en el PDF. Las cifras no las inventa nadie: tienen que
 * coincidir con el `calculo` que la app hizo al cerrar la visita.
 */
import { z } from "zod";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { CalculoVisita } from "./calculo";
import { aristaSchema, nodoSchema } from "./diagrama";

const texto = (max: number) => z.string().trim().min(1).max(max);
const rango = z.object({ min: z.number().min(0), max: z.number().min(0) });

/** §7: 9 columnas y 4 filas como máximo. */
export const MAX_COLUMNAS = 9;
export const MAX_FILAS = 4;

export const diagramaMapaSchema = z.object({
  titulo: texto(80),
  nodos: z
    .array(
      nodoSchema.extend({
        texto: texto(60),
        col: z
          .number()
          .int()
          .min(0)
          .max(MAX_COLUMNAS - 1),
        fila: z
          .number()
          .int()
          .min(0)
          .max(MAX_FILAS - 1),
      }),
    )
    .min(2)
    .max(MAX_COLUMNAS * MAX_FILAS),
  aristas: z.array(aristaSchema.extend({ etiqueta: z.string().trim().max(20).optional() })),
  pie: texto(80),
});

export const itemRutaSchema = z.object({
  titulo: texto(70),
  antes: texto(220),
  despues: texto(220),
  esfuerzo: texto(40),
  proceso_id: z.string().nullable(),
  depende_de: z.array(texto(100)).max(6).default([]),
  diagrama: diagramaMapaSchema.nullable().optional(),
});

export const mapaSchema = z.object({
  version: z.literal("mapa_v1"),
  empresa: texto(120),
  sector: texto(60),
  fecha_diagnostico: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frase_apertura: texto(160),
  resumen: texto(600),
  fugas: z
    .array(
      z.object({
        proceso_id: z.string(),
        titulo: texto(70),
        horas_mes_hoy: z.number().min(0),
        ahorro_horas_mes: rango,
        // En la spec; el mapa de prueba no lo enseña al cliente hasta que Aitor y JARVIS decidan.
        ahorro_eur_mes: rango.optional(),
        supuestos: z.array(texto(160)).max(6).default([]),
      }),
    )
    .max(12),
  hoja_de_ruta: z
    .array(
      z.object({
        fase: z.number().int().min(1).max(3),
        nombre: texto(40),
        plazo: texto(40),
        items: z.array(itemRutaSchema).min(1).max(8),
      }),
    )
    .min(1)
    .max(3),
  no_automatizar: z.array(texto(160)).max(8).default([]),
  validar: z.array(texto(160)).max(8).default([]),
  siguiente_paso: z.object({ texto: texto(200), cta_url: z.string().url() }),
});

export type Mapa = z.infer<typeof mapaSchema>;
export type DiagramaMapa = z.infer<typeof diagramaMapaSchema>;
export type ItemRuta = z.infer<typeof itemRutaSchema>;

export interface ErrorMapa {
  ruta: string;
  mensaje: string;
}

/** Tolerancia para comparar con el cálculo: el export redondea las horas (0,5 h). */
const TOLERANCIA = 0.51;
const igual = (a: number, b: number) => Math.abs(a - b) <= TOLERANCIA;

function erroresDiagrama(d: DiagramaMapa, ruta: string): ErrorMapa[] {
  const e: ErrorMapa[] = [];
  const ids = d.nodos.map((n) => n.id);
  if (new Set(ids).size !== ids.length) e.push({ ruta, mensaje: "Hay ids de nodo repetidos" });
  // Regla de marca (§7): siempre hay una persona decidiendo.
  if (!d.nodos.some((n) => n.humano)) {
    e.push({
      ruta,
      mensaje: "El diagrama necesita al menos un paso de una persona (humano: true)",
    });
  }
  d.aristas.forEach((a, i) => {
    if (!ids.includes(a.de) || !ids.includes(a.a)) {
      e.push({
        ruta: `${ruta}.aristas[${i}]`,
        mensaje: `La flecha ${a.de} → ${a.a} apunta a un nodo que no existe`,
      });
    }
  });
  return e;
}

/**
 * Valida un mapa contra su diagnóstico. Devuelve el mapa limpio o la lista de errores (el PUT
 * responde 422 con ella para que JARVIS sepa qué corregir).
 */
export function validarMapa(
  entrada: unknown,
  ctx: { procesos: TarjetaProceso[]; calculo: CalculoVisita | null },
): { ok: true; mapa: Mapa } | { ok: false; errores: ErrorMapa[] } {
  const r = mapaSchema.safeParse(entrada);
  if (!r.success) {
    return {
      ok: false,
      errores: r.error.issues.map((i) => ({ ruta: i.path.join("."), mensaje: i.message })),
    };
  }
  const mapa = r.data;
  const errores: ErrorMapa[] = [];
  if (!ctx.calculo) {
    return {
      ok: false,
      errores: [{ ruta: "", mensaje: "La visita no está cerrada: todavía no hay cálculo" }],
    };
  }
  const ids = new Set(ctx.procesos.map((t) => t.id));
  const calc = new Map(ctx.calculo.tarjetas.map((t) => [t.id, t]));

  mapa.fugas.forEach((f, i) => {
    const ruta = `fugas[${i}]`;
    const c = calc.get(f.proceso_id);
    if (!ids.has(f.proceso_id) || !c) {
      errores.push({ ruta, mensaje: `El proceso ${f.proceso_id} no existe en el diagnóstico` });
      return;
    }
    // Las cifras vienen del cálculo de la app, no se escriben a mano (§7).
    if (c.hoyHorasMes === null || !igual(f.horas_mes_hoy, c.hoyHorasMes)) {
      errores.push({
        ruta: `${ruta}.horas_mes_hoy`,
        mensaje: `No coincide con el cálculo (${c.hoyHorasMes ?? "sin dato"} h)`,
      });
    }
    if (!c.ahorroHoras) {
      errores.push({
        ruta: `${ruta}.ahorro_horas_mes`,
        mensaje: "El cálculo no tiene ahorro para este proceso",
      });
    } else if (
      !igual(f.ahorro_horas_mes.min, c.ahorroHoras.min) ||
      !igual(f.ahorro_horas_mes.max, c.ahorroHoras.max)
    ) {
      errores.push({
        ruta: `${ruta}.ahorro_horas_mes`,
        mensaje: `No coincide con el cálculo (${c.ahorroHoras.min}-${c.ahorroHoras.max} h)`,
      });
    }
    if (
      f.ahorro_eur_mes &&
      (!c.ahorroEur ||
        !igual(f.ahorro_eur_mes.min, c.ahorroEur.min) ||
        !igual(f.ahorro_eur_mes.max, c.ahorroEur.max))
    ) {
      errores.push({ ruta: `${ruta}.ahorro_eur_mes`, mensaje: "No coincide con el cálculo" });
    }
  });

  mapa.hoja_de_ruta.forEach((fase, i) => {
    fase.items.forEach((item, j) => {
      const ruta = `hoja_de_ruta[${i}].items[${j}]`;
      if (item.proceso_id && !ids.has(item.proceso_id)) {
        errores.push({
          ruta: `${ruta}.proceso_id`,
          mensaje: `El proceso ${item.proceso_id} no existe en el diagnóstico`,
        });
      }
      if (fase.fase === 1 && !item.diagrama) {
        errores.push({
          ruta: `${ruta}.diagrama`,
          mensaje: "Los puntos de la fase 1 llevan diagrama «Con el sistema»",
        });
      }
      if (item.diagrama) errores.push(...erroresDiagrama(item.diagrama, `${ruta}.diagrama`));
    });
  });

  return errores.length ? { ok: false, errores } : { ok: true, mapa };
}
