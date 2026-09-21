/**
 * Mapa del cliente (`mapa_v1`, spec §7). JARVIS escribe el contenido; la app lo valida antes de
 * guardarlo y lo pinta en `/m/[token]` y en el PDF. Las cifras no las inventa nadie: tienen que
 * coincidir con el `calculo` que la app hizo al cerrar la visita.
 */
import { z } from "zod";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { CalculoVisita } from "./calculo";
import { aristaSchema, diagramaDesdePasos, nodoSchema } from "./diagrama";

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
  // La regla de las etiquetas (obligatoria en bifurcaciones, prohibida en tramos lineales) va en
  // `validarMapa`, no aquí: el esquema es el que se usa al LEER los mapas ya guardados.
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
  /**
   * Revisión con JARVIS (21-sep): rango de semanas con margen, nunca fechas. Opcional para que
   * los mapas guardados antes sigan valiendo.
   */
  plazo_orientativo: z
    .object({ min_semanas: z.number().int().min(1).max(52), max_semanas: z.number().int().min(1).max(78) })
    .refine((p) => p.max_semanas > p.min_semanas, {
      message: "El plazo es un rango con margen: max_semanas tiene que ser mayor que min_semanas",
    })
    .optional(),
  diagrama: diagramaMapaSchema.nullable().optional(),
});

export const mapaSchema = z.object({
  // «mapa_v1.2» (spec §7, 21-sep) solo añade campos opcionales: se aceptan las dos.
  version: z.enum(["mapa_v1", "mapa_v1.2"]),
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
  // ── Secciones de la revisión con JARVIS (21-sep). Todas opcionales: los mapas ya guardados
  // (el de prueba de Clínica Colino) no las tienen y tienen que seguir abriéndose. ──
  /** 3-5 hallazgos, cada uno con la evidencia que lo sostiene (lo que se vio o se dijo). */
  hallazgos: z
    .array(
      z.object({
        titulo: texto(90),
        evidencia: texto(240),
        /** v1.2: «Lo que no esperabais». Máximo uno por mapa (se valida en `validarMapa`). */
        inesperado: z.boolean().optional(),
      }),
    )
    .min(3)
    .max(5)
    .optional(),
  lo_que_ya_funciona: z.array(texto(160)).min(1).max(6).optional(),
  /** Lo que preocupa al cliente y cómo lo abordamos. */
  preocupaciones: z
    .array(z.object({ preocupacion: texto(160), como_lo_abordamos: texto(240) }))
    .min(1)
    .max(6)
    .optional(),
  /** Lo que se podría automatizar pero no compensa, con el motivo. */
  no_rentables: z
    .array(z.object({ que: texto(100), motivo: texto(200) }))
    .min(1)
    .max(8)
    .optional(),
  /** v1.2: regalo de 10 minutos. Texto plano: se copia o se descarga como .txt, sin PDF. */
  regalo: z
    .object({
      titulo: texto(70),
      descripcion: texto(200),
      tipo: z.enum(["checklist", "plantilla", "ficha"]),
      contenido: texto(2000),
    })
    .optional(),
  /** v1.2: coste de no hacer nada. Las horas las calcula la app; JARVIS solo decide si se ve. */
  coste_inaccion: z.object({ mostrar: z.boolean() }).optional(),
  no_automatizar: z.array(texto(160)).max(8).default([]),
  validar: z.array(texto(160)).max(8).default([]),
  siguiente_paso: z.object({ texto: texto(200), cta_url: z.string().url() }),
});

export type Mapa = z.infer<typeof mapaSchema>;
export type DiagramaMapa = z.infer<typeof diagramaMapaSchema>;
export type ItemRuta = z.infer<typeof itemRutaSchema>;

/** Máximo de palabras de la etiqueta de una flecha. */
export const MAX_PALABRAS_ETIQUETA = 3;

export interface ErrorMapa {
  ruta: string;
  mensaje: string;
}

/**
 * Plazos: nunca fechas (revisión con JARVIS, 21-sep). Detecta días (12/10; «3-4» es un rango y pasa), meses por su nombre y
 * años (2026). «4 a 6 semanas» o «2 a 3 meses» pasan.
 */
const PARECE_FECHA =
  /\b\d{1,2}[/.]\d{1,2}\b|\b20\d\d\b|\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/i;

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
  const salidas = new Map<string, number>();
  for (const a of d.aristas) salidas.set(a.de, (salidas.get(a.de) ?? 0) + 1);
  d.aristas.forEach((a, i) => {
    const r = `${ruta}.aristas[${i}]`;
    if (!ids.includes(a.de) || !ids.includes(a.a)) {
      e.push({ ruta: r, mensaje: `La flecha ${a.de} → ${a.a} apunta a un nodo que no existe` });
    }
    // Revisión con JARVIS (21-sep): si un paso se bifurca, cada salida dice por qué; en los
    // tramos lineales, nada (la flecha ya lo dice todo).
    const etiqueta = a.etiqueta?.trim() ?? "";
    if ((salidas.get(a.de) ?? 0) >= 2) {
      if (!etiqueta) {
        e.push({
          ruta: `${r}.etiqueta`,
          mensaje: `El paso ${a.de} tiene varias salidas: cada flecha lleva etiqueta`,
        });
      } else if (etiqueta.split(/\s+/).length > MAX_PALABRAS_ETIQUETA) {
        e.push({
          ruta: `${r}.etiqueta`,
          mensaje: `La etiqueta tiene más de ${MAX_PALABRAS_ETIQUETA} palabras`,
        });
      }
    } else if (etiqueta) {
      e.push({
        ruta: `${r}.etiqueta`,
        mensaje: "Tramo lineal: la flecha no lleva etiqueta",
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
  const porId = new Map(ctx.procesos.map((t) => [t.id, t]));
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

  const inesperados = (mapa.hallazgos ?? []).filter((x) => x.inesperado).length;
  if (inesperados > 1) {
    errores.push({
      ruta: "hallazgos",
      mensaje: "Solo un hallazgo puede ser «inesperado» (Lo que no esperabais)",
    });
  }

  mapa.hoja_de_ruta.forEach((fase, i) => {
    if (PARECE_FECHA.test(fase.plazo)) {
      errores.push({
        ruta: `hoja_de_ruta[${i}].plazo`,
        mensaje: "El plazo va en semanas o meses con margen, nunca con fechas",
      });
    }
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
      if (item.diagrama) {
        errores.push(...erroresDiagrama(item.diagrama, `${ruta}.diagrama`));
        // Revisión con JARVIS (21-sep): no hay «Con el sistema» sin su «Así es hoy» de la visita
        // (los pasos de la tarjeta del proceso, al menos dos).
        const p = item.proceso_id ? porId.get(item.proceso_id) : undefined;
        if (!p || diagramaDesdePasos(p.pasos).nodos.length < 2) {
          errores.push({
            ruta: `${ruta}.diagrama`,
            mensaje: p
              ? `El proceso ${p.id} no tiene pasos dibujados en la visita: sin «Así es hoy» no hay «Con el sistema»`
              : "Un diagrama «Con el sistema» necesita el proceso de la visita (proceso_id) con su «Así es hoy»",
          });
        }
      }
    });
  });

  return errores.length ? { ok: false, errores } : { ok: true, mapa };
}
