/**
 * Banco de sectores v1 — partes comunes (§2.1, §3, §4, §10).
 * Fuente: ORKESTA - JARVIS/01_ORKESTA_CORE/sales-system/diagnostico-app/
 *         diagnostico-app_banco-sectores_v1_2026-09-18.md
 * Transcrito sin cambiar textos ni valores. Si cambia el banco, cambiar aquí y pasar
 * `npm run verificar-config`.
 */
import type { Entradas, FrasesOrkestador, Perfil, Pregunta, QuickWin, SectorId } from "../tipos";

// ── §2.1 Coste por hora según quién hace la tarea (coste interno, no tarifa) ──
export const COSTE_PERFIL: Record<Perfil, number> = {
  operativo: 14,
  tactico: 25,
  directivo: 40,
};

// ── §3 Frases del Orkestador (comunes) ──
export const FRASES: FrasesOrkestador = {
  bienvenidaLeadMagnet:
    "Soy el Orkestador. En unos 7 minutos vemos dónde se te va el tiempo. Tú respondes; yo llevo el compás.",
  bienvenidaPreReunion:
    "Hola, [nombre]. Antes de vernos el [fecha], cuéntame cómo trabajáis. Así el día del diagnóstico empezamos por lo importante.",
  movimientoI: "Empezamos por lo básico: quiénes sois y cómo trabajáis.",
  movimientoII: "Ahora, la entrada: cómo os encuentran y qué pasa con cada consulta.",
  movimientoIV: "Qué instrumentos tocáis hoy. No hace falta cambiarlos todos para mejorar.",
  movimientoV: "Última parte. Si solo pudiéramos arreglar una cosa, ¿cuál sería?",
  componiendo: "Componiendo tu mapa…",
  finalPreReunion: "Gracias, [nombre]. Con esto el [fecha] vamos directos a lo importante.",
};

/** `negocio.sector`: etiqueta del banco → id de sector. */
export const SECTOR_POR_ETIQUETA: Record<string, SectorId> = {
  "Servicios profesionales": "servicios_profesionales",
  "Hostelería y eventos": "hosteleria_eventos",
  "Industria, distribución o servicios técnicos": "industria_distribucion",
  "Salud y clínicas": "salud",
  Otro: "otro",
};

// ── §3 · I · Tu negocio ──
export const PREGUNTAS_I: Pregunta[] = [
  {
    id: "negocio.empresa",
    texto: "¿Cómo se llama tu empresa?",
    tipo: "texto",
    nota: "se salta si viene rellena",
  },
  {
    id: "negocio.sector",
    texto: "¿A qué os dedicáis?",
    tipo: "chips",
    opciones: Object.keys(SECTOR_POR_ETIQUETA).map((etiqueta) => ({ etiqueta })),
    nota: "se salta si viene rellena",
  },
  {
    id: "negocio.subsector",
    texto: "¿Y más en concreto?",
    tipo: "chips",
    nota: "Según el sector (§5)",
  },
  {
    id: "negocio.equipo",
    texto: "¿Cuántas personas sois?",
    tipo: "rango",
    opciones: [
      { etiqueta: "Solo yo", valor: 1 },
      { etiqueta: "2-5", valor: 3.5 },
      { etiqueta: "6-15", valor: 10 },
      { etiqueta: "16-50", valor: 30 },
      { etiqueta: "Más de 50", valor: 70 },
    ],
  },
  {
    id: "negocio.rol",
    texto: "¿Cuál es tu papel?",
    tipo: "chips",
    opciones: [
      { etiqueta: "Dirección o propiedad" },
      { etiqueta: "Responsable de un área" },
      { etiqueta: "Administración" },
      { etiqueta: "Comercial" },
      { etiqueta: "Otro" },
    ],
  },
  { id: "negocio.web", texto: "¿Tenéis web? (opcional)", tipo: "url", opcional: true },
];

// ── §3 · II · Cómo llegan tus clientes ──
const SI_PRESUPUESTOS = { id: "captacion.hace_presupuestos", op: "eq", valor: "Sí" } as const;

export const PREGUNTAS_II: Pregunta[] = [
  {
    id: "captacion.canales",
    texto: "¿Por dónde os llegan los clientes?",
    tipo: "multi",
    opciones: [
      "Recomendación",
      "Web o formulario",
      "WhatsApp",
      "Teléfono",
      "Email",
      "Redes sociales",
      "Google / ficha de Maps",
      "Partners o distribuidores",
      "Licitaciones",
      "Ferias o networking",
    ].map((etiqueta) => ({ etiqueta })),
  },
  {
    id: "captacion.consultas_mes",
    texto: "¿Cuántas consultas nuevas recibís al mes?",
    tipo: "rango",
    opciones: [
      { etiqueta: "Menos de 10", valor: 5 },
      { etiqueta: "10-30", valor: 20 },
      { etiqueta: "30-100", valor: 60 },
      { etiqueta: "100-300", valor: 180 },
      { etiqueta: "Más de 300", valor: 400 },
      { etiqueta: "No lo sé", valor: null },
    ],
  },
  {
    id: "captacion.tiempo_respuesta",
    texto: "¿Cuánto tardáis en contestar una consulta nueva?",
    tipo: "chips",
    opciones: ["Menos de 1 hora", "El mismo día", "1-2 días", "Más"].map((etiqueta) => ({
      etiqueta,
    })),
  },
  {
    id: "captacion.fuera_horario",
    texto: "¿Cuántas llegan fuera de horario?",
    tipo: "rango",
    opciones: [
      { etiqueta: "Casi ninguna", valor: 0.05 },
      { etiqueta: "Una de cada cuatro", valor: 0.25 },
      { etiqueta: "La mitad", valor: 0.5 },
      { etiqueta: "Más de la mitad", valor: 0.65 },
      { etiqueta: "No lo sé", valor: null },
    ],
  },
  {
    id: "captacion.hace_presupuestos",
    texto: "¿Hacéis presupuestos o propuestas?",
    tipo: "si_no",
  },
  {
    id: "captacion.presupuestos_mes",
    texto: "¿Cuántos al mes?",
    tipo: "rango",
    opciones: [
      { etiqueta: "1-5", valor: 3 },
      { etiqueta: "5-15", valor: 10 },
      { etiqueta: "15-40", valor: 25 },
      { etiqueta: "Más de 40", valor: 60 },
    ],
    mostrarSi: SI_PRESUPUESTOS,
  },
  {
    id: "captacion.minutos_presupuesto",
    texto: "¿Cuánto os lleva preparar uno?",
    tipo: "rango",
    opciones: [
      { etiqueta: "Menos de 30 min", valor: 20 },
      { etiqueta: "30-60 min", valor: 45 },
      { etiqueta: "1-3 h", valor: 120 },
      { etiqueta: "Más de 3 h", valor: 240 },
    ],
    mostrarSi: SI_PRESUPUESTOS,
  },
  {
    id: "captacion.seguimiento",
    texto: "Cuando no contestan a un presupuesto, ¿les volvéis a escribir?",
    tipo: "rango",
    opciones: [
      { etiqueta: "Siempre", valor: 0.9 },
      { etiqueta: "A veces", valor: 0.5 },
      { etiqueta: "Casi nunca", valor: 0.1 },
    ],
    mostrarSi: SI_PRESUPUESTOS,
  },
];

// ── §3 · IV · Tus herramientas ──
export const OPCIONES_INFO_CLIENTES = [
  "En un programa",
  "En Excel",
  "En el email y WhatsApp",
  "En papel o de memoria",
  "Repartida en varios sitios",
];

export const PREGUNTAS_IV: Pregunta[] = [
  {
    id: "herramientas.lista",
    texto: "¿Qué usáis en el día a día?",
    tipo: "multi",
    opciones: [
      "Excel u hojas de cálculo",
      "Google Workspace",
      "Microsoft 365",
      "Un CRM",
      "Programa de gestión o ERP",
      "Software de mi sector",
      "WhatsApp Business",
      "Agenda o reservas online",
      "Programa de facturación",
      "Nada en especial",
    ].map((etiqueta) => ({ etiqueta })),
  },
  {
    id: "herramientas.cuales",
    texto: "¿Cuál es el programa principal? (opcional)",
    tipo: "texto",
    opcional: true,
  },
  {
    id: "herramientas.info_clientes",
    texto: "¿Dónde está la información de cada cliente?",
    tipo: "chips",
    opciones: OPCIONES_INFO_CLIENTES.map((etiqueta) => ({ etiqueta })),
  },
  {
    id: "herramientas.horas_copiando",
    texto:
      "¿Cuántas horas a la semana se van en copiar datos entre programas o preparar informes?",
    tipo: "rango",
    opciones: [
      { etiqueta: "Casi ninguna", valor: 0.5 },
      { etiqueta: "1-3 h", valor: 2 },
      { etiqueta: "3-8 h", valor: 5 },
      { etiqueta: "Más de 8 h", valor: 10 },
    ],
  },
];

// ── §3 · V · Tu prioridad ──
export const OPCIONES_EXITO = [
  { etiqueta: "Más clientes", clave: "clientes" },
  { etiqueta: "Menos horas de administración", clave: "horas" },
  { etiqueta: "Menos errores", clave: "errores" },
  { etiqueta: "Responder más rápido", clave: "rapidez" },
  { etiqueta: "Crecer sin contratar", clave: "escalar" },
  { etiqueta: "Datos para decidir", clave: "control" },
];

export const PREGUNTAS_V: Pregunta[] = [
  {
    id: "prioridad.tarea",
    texto: "Si mañana pudieras quitarte una tarea de encima, ¿cuál sería?",
    tipo: "texto",
    nota: "texto + sugerencias: hasta 3 `etiqueta_tarea` (§10) de los quick wins elegibles",
  },
  {
    id: "prioridad.exito",
    texto: "¿Qué tendría que pasar en 6 meses para decir que ha merecido la pena? (máx. 2)",
    tipo: "multi",
    maxSeleccion: 2,
    opciones: OPCIONES_EXITO,
  },
  {
    id: "prioridad.urgencia",
    texto: "¿Para cuándo lo necesitas?",
    tipo: "chips",
    opciones: ["Lo necesito ya", "Este trimestre", "Estoy explorando"].map((etiqueta) => ({
      etiqueta,
    })),
  },
];

// ── Ayudas para las fórmulas ──

/** "≥ x" del banco. `null` ("No lo sé") deja pasar: el QW puede salir sin cifras (§2.3). */
export function alMenos(v: number | null | undefined, x: number): boolean {
  if (v === undefined) return false;
  return v === null || v >= x;
}

/** Hay dato utilizable y no es cero. `null` deja pasar (sin cifras). */
export function hay(v: number | null | undefined): boolean {
  if (v === undefined) return false;
  return v === null || v > 0;
}

/** Producto de entradas; si falta alguna (null o undefined) → null = sin cifras. */
export function producto(...vs: (number | null | undefined)[]): number | null {
  let r = 1;
  for (const v of vs) {
    if (v === null || v === undefined) return null;
    r *= v;
  }
  return r;
}

export const equipo = (e: Entradas) => e.n("negocio.equipo");
const consultas = (e: Entradas) => e.n("captacion.consultas_mes");
const presupuestos = (e: Entradas) => e.n("captacion.presupuestos_mes");

// ── §4 Quick wins comunes + §10 etiqueta_tarea ──
export const QUICK_WINS_COMUNES: QuickWin[] = [
  {
    id: "C-QW1",
    tituloBase: "Respuesta al momento y clasificación de consultas",
    categoria: "captacion",
    tipo: "mixto",
    formula:
      "Elegible si `consultas_mes ≥ 10`. Tiempo: `consultas_mes × 6 min × 0,5`. Oportunidad: `consultas_mes × fuera_horario` consultas que esperan al día siguiente",
    esfuerzo: "1-2 semanas",
    etiquetas: ["clientes", "rapidez"],
    palabrasClave: [],
    antes:
      "Las consultas esperan a que alguien tenga un hueco, y las de la tarde se contestan al día siguiente.",
    despues:
      "Cada consulta recibe respuesta al momento, se clasifica y te llega ordenada por prioridad. Tú solo atiendes las que merecen tu tiempo.",
    etiquetaTarea: "Contestar las consultas nuevas",
    perfil: () => "operativo",
    elegible: (e) => alMenos(consultas(e), 10),
    horasBase: (e) => producto(consultas(e), 6 / 60),
    pct: 0.5,
    oportunidades: (e) => producto(consultas(e), e.n("captacion.fuera_horario")),
    unidadOportunidad: "consultas que esperan al día siguiente",
  },
  {
    id: "C-QW2",
    tituloBase: "Seguimiento automático de presupuestos",
    categoria: "captacion",
    tipo: "mixto",
    formula:
      "Elegible si `hace_presupuestos = sí`. Tiempo: `presupuestos_mes × 10 min × 0,7`. Oportunidad: `presupuestos_mes × (1 − seguimiento)` presupuestos sin seguimiento",
    esfuerzo: "1-2 semanas",
    etiquetas: ["clientes"],
    palabrasClave: [],
    antes: "Los presupuestos se envían y, si no contestan, se quedan ahí.",
    despues:
      "Quien no contesta recibe un seguimiento amable en los días siguientes, y tú ves qué presupuestos siguen vivos.",
    etiquetaTarea: "Perseguir presupuestos sin respuesta",
    perfil: () => "tactico",
    elegible: (e) => e.s("captacion.hace_presupuestos") === "Sí",
    horasBase: (e) => producto(presupuestos(e), 10 / 60),
    pct: 0.7,
    oportunidades: (e) => {
      const seg = e.n("captacion.seguimiento");
      return producto(presupuestos(e), seg == null ? seg : 1 - seg);
    },
    unidadOportunidad: "presupuestos sin seguimiento",
  },
  {
    id: "C-QW3",
    tituloBase: "Adiós a copiar datos y preparar informes a mano",
    categoria: "administracion",
    tipo: "tiempo",
    formula: "Elegible si `horas_copiando ≥ 2`. `horas_copiando (h/semana) × 4,3 × 0,6`",
    esfuerzo: "2-3 semanas",
    etiquetas: ["horas", "control", "errores"],
    palabrasClave: [],
    antes: "Alguien pasa datos de un sitio a otro y monta informes a mano cada semana.",
    despues: "Los datos pasan solos entre herramientas y el informe está listo cada lunes.",
    etiquetaTarea: "Copiar datos y preparar informes",
    perfil: () => "operativo",
    elegible: (e) => alMenos(e.n("herramientas.horas_copiando"), 2),
    horasBase: (e) => producto(e.n("herramientas.horas_copiando"), 4.3),
    pct: 0.6,
  },
  {
    id: "C-QW4",
    tituloBase: "Presupuestos a partir de una plantilla inteligente",
    categoria: "captacion",
    tipo: "tiempo",
    formula:
      "Elegible si `presupuestos_mes ≥ 5` y `minutos_presupuesto ≥ 45`. `presupuestos_mes × minutos_presupuesto × 0,4`",
    esfuerzo: "2-3 semanas",
    etiquetas: ["horas", "escalar"],
    palabrasClave: [],
    antes: "Cada presupuesto se hace desde cero o copiando uno anterior.",
    despues: "El borrador sale de una plantilla con tus tarifas; tú lo revisas y lo ajustas.",
    etiquetaTarea: "Preparar presupuestos",
    // tactico (directivo si equipo = 1)
    perfil: (e) => (equipo(e) === 1 ? "directivo" : "tactico"),
    elegible: (e) =>
      alMenos(presupuestos(e), 5) && alMenos(e.n("captacion.minutos_presupuesto"), 45),
    horasBase: (e) => {
      const m = e.n("captacion.minutos_presupuesto");
      return producto(presupuestos(e), m == null ? m : m / 60);
    },
    pct: 0.4,
  },
];

/** §4 Validar (comunes) */
export const VALIDAR_COMUNES = [
  "si vuestros programas permiten conectarse con otros",
  "volumen real de consultas y presupuestos",
  "quién revisa lo que se envía en nombre de la empresa",
];

/** §2.3 "Sin dato": lo que se añade a validar cuando una entrada es "No lo sé". */
export const VALIDAR_VOLUMEN_REAL = "volumen real";
