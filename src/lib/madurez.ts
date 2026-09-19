/**
 * Madurez en IA del equipo (batería v2 §6). Fórmula fija: aquí salen todas las cifras y la IA
 * solo redacta. Incluye las reglas de anonimato: nada se enseña por debajo de los mínimos.
 */
import {
  AREA_SIN_DECIR,
  MINIMO_POR_AREA,
  MINIMO_RESPUESTAS,
  MINIMO_TEMAS_TAREA,
  NIVELES,
  OTRAS_AREAS,
  PESOS,
  PREGUNTAS_ENCUESTA,
  type Dimension,
  type PreguntaEncuesta,
} from "@/config/consultor/encuesta";

export type RespuestaEncuesta = Record<string, string | string[] | null>;

export interface Dimensiones {
  uso: number | null;
  competencia: number | null;
  seguridad: number | null;
  actitud: number | null;
}

export interface Grupo {
  nombre: string;
  respuestas: number;
  indice: number;
  nivel: number;
  nombreNivel: string;
  dimensiones: Dimensiones;
  /** Cuántas personas en cada nivel (1-5). */
  distribucion: number[];
}

export interface Madurez {
  version: "madurez_v1";
  respuestas: number;
  /** false mientras no se llegue al mínimo de respuestas: no se enseña nada. */
  publicable: boolean;
  empresa: Grupo | null;
  areas: Grupo[];
  alertas: { id: string; texto: string }[];
  formacion: { etiqueta: string; votos: number }[];
  formacionPorArea: { area: string; ranking: { etiqueta: string; votos: number }[] }[];
  /** Solo con suficientes respuestas; nunca se enseñan literales al cliente. */
  tareas: string[];
  calculado_at: string;
}

const PREGUNTAS = new Map(PREGUNTAS_ENCUESTA.map((p) => [p.id, p]));

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Puntos de una respuesta. `null` = no cuenta (excluir o sin contestar). */
export function puntosDe(
  p: PreguntaEncuesta,
  v: string | string[] | null | undefined,
): number | null {
  if (v === null || v === undefined) return null;
  // §6 `s.usos`: los puntos son el número de usos marcados (máx. 4); "No la uso" = 0.
  if (p.id === "s.usos") {
    if (!Array.isArray(v)) return null;
    if (v.includes("No la uso")) return 0;
    return Math.min(4, v.length);
  }
  if (Array.isArray(v)) return null;
  const o = p.opciones?.find((x) => x.etiqueta === v);
  if (!o || o.puntos === undefined || o.puntos === "excluir") return null;
  return o.puntos;
}

/** Dimensiones de una persona. Una dimensión sin preguntas válidas no cuenta. */
export function dimensionesDe(r: RespuestaEncuesta): Dimensiones {
  const por = (d: Dimension) =>
    media(
      PREGUNTAS_ENCUESTA.filter((p) => p.dimension === d)
        .map((p) => puntosDe(p, r[p.id]))
        .filter((x): x is number => x !== null),
    );
  return {
    uso: por("uso"),
    competencia: por("competencia"),
    seguridad: por("seguridad"),
    actitud: por("actitud"),
  };
}

/**
 * Índice 0-100 de una persona: (0,30·U + 0,30·C + 0,20·S + 0,20·A) / 4 × 100. Si falta alguna
 * dimensión, su peso se reparte entre las demás.
 */
export function indiceDe(d: Dimensiones): number | null {
  const presentes = (Object.keys(PESOS) as Dimension[]).filter((k) => d[k] !== null);
  if (!presentes.length) return null;
  const suma = presentes.reduce((s, k) => s + PESOS[k], 0);
  const valor = presentes.reduce((s, k) => s + (PESOS[k] / suma) * (d[k] as number), 0);
  return (valor / 4) * 100;
}

export function nivelDe(indice: number) {
  return NIVELES.find((n) => indice <= n.hasta) ?? NIVELES[NIVELES.length - 1];
}

function grupo(nombre: string, rs: RespuestaEncuesta[]): Grupo {
  const personas = rs.map((r) => ({ d: dimensionesDe(r), i: indiceDe(dimensionesDe(r)) }));
  const indices = personas.map((p) => p.i).filter((x): x is number => x !== null);
  const indice = media(indices) ?? 0;
  const n = nivelDe(indice);
  const dim = (k: keyof Dimensiones) =>
    media(personas.map((p) => p.d[k]).filter((x): x is number => x !== null));
  const distribucion = [0, 0, 0, 0, 0];
  for (const i of indices) distribucion[nivelDe(i).nivel - 1]++;
  return {
    nombre,
    respuestas: rs.length,
    indice,
    nivel: n.nivel,
    nombreNivel: n.nombre,
    dimensiones: {
      uso: dim("uso"),
      competencia: dim("competencia"),
      seguridad: dim("seguridad"),
      actitud: dim("actitud"),
    },
    distribucion,
  };
}

function ranking(rs: RespuestaEncuesta[]) {
  const votos = new Map<string, number>();
  for (const r of rs) {
    const v = r["s.aprender"];
    if (Array.isArray(v)) for (const x of v) votos.set(x, (votos.get(x) ?? 0) + 1);
  }
  return [...votos.entries()]
    .map(([etiqueta, n]) => ({ etiqueta, votos: n }))
    .sort((a, b) => b.votos - a.votos || a.etiqueta.localeCompare(b.etiqueta));
}

const proporcion = (rs: RespuestaEncuesta[], id: string, etiqueta: string) =>
  rs.length ? rs.filter((r) => r[id] === etiqueta).length / rs.length : 0;

/**
 * Alertas del §6. `normasDireccion` es lo que contestó dirección en `ia.normas` (bloque F):
 * sirve para la brecha de comunicación.
 */
export function alertas(
  rs: RespuestaEncuesta[],
  areas: Grupo[],
  empresa: Grupo,
  normasDireccion?: string,
) {
  const a: { id: string; texto: string }[] = [];
  if (proporcion(rs, "s.datos", "Sí, sin pensarlo mucho") >= 0.2) {
    a.push({
      id: "ia_en_la_sombra",
      texto:
        "IA en la sombra: hay quien mete información de la empresa en herramientas de IA sin pensarlo.",
    });
  }
  const sinControl = [empresa, ...areas].filter(
    (g) => (g.dimensiones.uso ?? 0) >= 2.5 && (g.dimensiones.seguridad ?? 0) < 1.5,
  );
  for (const g of sinControl) {
    a.push({
      id: "uso_sin_control",
      texto: `Uso sin control en ${g.nombre === empresa.nombre ? "toda la empresa" : g.nombre}: se usa mucho y se protege poco.`,
    });
  }
  for (const g of areas) {
    if ((g.dimensiones.competencia ?? 0) < 2 && (g.dimensiones.uso ?? 0) >= 2) {
      a.push({
        id: "brecha_formacion",
        texto: `Brecha de formación en ${g.nombre}: usan IA más de lo que saben usarla.`,
      });
    }
  }
  if (normasDireccion === "Escritas y comunicadas") {
    const sinEnterarse = rs.filter(
      (r) => r["s.normas"] === "No hay" || r["s.normas"] === "No lo sé",
    ).length;
    if (rs.length && sinEnterarse / rs.length >= 0.5) {
      a.push({
        id: "brecha_comunicacion",
        texto:
          "Brecha de comunicación: dirección dice que hay normas escritas y la mitad del equipo no las conoce.",
      });
    }
  }
  if (proporcion(rs, "s.sentir", "Me preocupa que me sustituya") >= 0.3) {
    a.push({
      id: "miedo",
      texto: "Miedo: a una parte del equipo le preocupa que la IA le sustituya.",
    });
  }
  return a;
}

/**
 * Resultado completo. Aplica el anonimato: sin el mínimo de respuestas no hay nada que enseñar,
 * las áreas pequeñas se juntan en "Otras áreas" y los textos libres solo salen con 5 o más.
 */
export function calcularMadurez(
  respuestas: RespuestaEncuesta[],
  opciones: { normasDireccion?: string; ahora?: string } = {},
): Madurez {
  const calculado_at = opciones.ahora ?? new Date().toISOString();
  const base: Madurez = {
    version: "madurez_v1",
    respuestas: respuestas.length,
    publicable: respuestas.length >= MINIMO_RESPUESTAS,
    empresa: null,
    areas: [],
    alertas: [],
    formacion: [],
    formacionPorArea: [],
    tareas: [],
    calculado_at,
  };
  if (!base.publicable) return base;

  const empresa = grupo("Toda la empresa", respuestas);

  const porNombre = new Map<string, RespuestaEncuesta[]>();
  for (const r of respuestas) {
    const a =
      typeof r["s.area"] === "string" && r["s.area"] ? (r["s.area"] as string) : AREA_SIN_DECIR;
    porNombre.set(a, [...(porNombre.get(a) ?? []), r]);
  }
  const grandes = [...porNombre.entries()].filter(
    ([nombre, rs]) => rs.length >= MINIMO_POR_AREA && nombre !== AREA_SIN_DECIR,
  );
  const resto = [...porNombre.entries()].filter(
    ([nombre, rs]) => rs.length < MINIMO_POR_AREA || nombre === AREA_SIN_DECIR,
  );
  const restoRs = resto.flatMap(([, rs]) => rs);
  const areas = grandes.map(([nombre, rs]) => grupo(nombre, rs));
  // "Otras áreas" solo se enseña si ella misma llega al mínimo; si no, sus respuestas solo
  // cuentan en el total (§6).
  if (restoRs.length >= MINIMO_POR_AREA) areas.push(grupo(OTRAS_AREAS, restoRs));

  const tareas = respuestas
    .map((r) => (typeof r["s.tarea"] === "string" ? (r["s.tarea"] as string).trim() : ""))
    .filter(Boolean);

  return {
    ...base,
    empresa,
    areas: areas.sort((a, b) => b.respuestas - a.respuestas || a.nombre.localeCompare(b.nombre)),
    alertas: alertas(respuestas, areas, empresa, opciones.normasDireccion),
    formacion: ranking(respuestas),
    formacionPorArea: areas
      .filter((g) => g.nombre !== OTRAS_AREAS)
      .map((g) => ({
        area: g.nombre,
        ranking: ranking(respuestas.filter((r) => r["s.area"] === g.nombre)),
      })),
    // Nunca se enseñan literales al cliente: la IA los agrupa en temas y solo con 5 o más.
    tareas: tareas.length >= MINIMO_TEMAS_TAREA ? tareas : [],
    calculado_at,
  };
}

/** Saca solo las respuestas válidas de un envío (ids y opciones de la batería). */
export function sanearRespuestaEncuesta(
  cuerpo: unknown,
  areas: string[],
): RespuestaEncuesta | null {
  if (!cuerpo || typeof cuerpo !== "object") return null;
  const entrada = cuerpo as Record<string, unknown>;
  const r: RespuestaEncuesta = {};
  for (const p of PREGUNTAS_ENCUESTA) {
    const v = entrada[p.id];
    if (v === undefined || v === null) continue;
    if (p.tipo === "texto") {
      if (typeof v === "string" && v.trim()) r[p.id] = v.trim().slice(0, 200);
      continue;
    }
    if (p.tipo === "area") {
      if (typeof v === "string" && [...areas, AREA_SIN_DECIR].includes(v)) r[p.id] = v;
      continue;
    }
    const validas = (p.opciones ?? []).map((o) => o.etiqueta);
    if (p.tipo === "multi") {
      if (!Array.isArray(v)) continue;
      const xs = v.filter((x): x is string => typeof x === "string" && validas.includes(x));
      if (xs.length) r[p.id] = p.max ? xs.slice(0, p.max) : xs;
    } else if (typeof v === "string" && validas.includes(v)) {
      r[p.id] = v;
    }
  }
  // Una respuesta vacía no cuenta como respuesta.
  return Object.keys(r).length ? r : null;
}

export { PREGUNTAS };
