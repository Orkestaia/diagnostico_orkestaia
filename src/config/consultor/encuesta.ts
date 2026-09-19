/**
 * Batería del consultor v2 §6 — encuesta de madurez en IA para el equipo. Transcrito sin cambios.
 * Los puntos solo los ve el cálculo, nunca quien responde.
 */

export type Dimension = "uso" | "competencia" | "seguridad" | "actitud";

export interface OpcionEncuesta {
  etiqueta: string;
  /** Puntos de la opción. `"excluir"` = la pregunta no cuenta en su dimensión para esa persona. */
  puntos?: number | "excluir";
}

export interface PreguntaEncuesta {
  id: string;
  texto: string;
  tipo: "chips" | "multi" | "texto" | "area";
  opciones?: OpcionEncuesta[];
  /** Dimensión del cálculo; sin ella, la pregunta es informativa. */
  dimension?: Dimension;
  max?: number;
  opcional?: boolean;
  /** Ayuda corta bajo la pregunta. */
  nota?: string;
}

/** Aviso al empezar (§6). */
export const AVISO_ENCUESTA =
  "Es anónima y voluntaria. Sirve para saber qué formación os vendría bien, no para evaluar a nadie.";

export const AREA_SIN_DECIR = "Prefiero no decirlo";
export const MAX_TEXTO_ENCUESTA = 200;
/** §6: abierta 7 días (editable al crearla). */
export const DIAS_ENCUESTA = 7;

export const PREGUNTAS_ENCUESTA: PreguntaEncuesta[] = [
  { id: "s.area", texto: "¿En qué área trabajas?", tipo: "area" },
  {
    id: "s.frecuencia",
    texto: "¿Con qué frecuencia usas herramientas de IA (ChatGPT, Copilot, Gemini…) en tu trabajo?",
    tipo: "chips",
    dimension: "uso",
    opciones: [
      { etiqueta: "Nunca", puntos: 0 },
      { etiqueta: "Alguna vez al mes", puntos: 1 },
      { etiqueta: "Cada semana", puntos: 2 },
      { etiqueta: "Varias veces por semana", puntos: 3 },
      { etiqueta: "A diario", puntos: 4 },
    ],
  },
  {
    id: "s.usos",
    texto: "¿Para qué la usas?",
    tipo: "multi",
    dimension: "uso",
    nota: "Puedes marcar varias.",
    opciones: [
      { etiqueta: "Redactar textos o emails" },
      { etiqueta: "Resumir documentos" },
      { etiqueta: "Buscar información" },
      { etiqueta: "Analizar datos o Excel" },
      { etiqueta: "Traducir" },
      { etiqueta: "Presentaciones o imágenes" },
      { etiqueta: "Fórmulas o programación" },
      { etiqueta: "Preparar reuniones" },
      { etiqueta: "No la uso", puntos: 0 },
    ],
  },
  {
    id: "s.herramientas",
    texto: "¿Cuáles?",
    tipo: "multi",
    nota: "Puedes marcar varias.",
    opciones: [
      { etiqueta: "ChatGPT gratuito" },
      { etiqueta: "ChatGPT de pago" },
      { etiqueta: "Copilot" },
      { etiqueta: "Gemini" },
      { etiqueta: "Claude" },
      { etiqueta: "IA dentro de mis programas" },
      { etiqueta: "Otras" },
      { etiqueta: "Ninguna" },
    ],
  },
  {
    id: "s.cuenta",
    texto: "¿Con qué cuenta?",
    tipo: "chips",
    opciones: [
      { etiqueta: "De la empresa" },
      { etiqueta: "Personal" },
      { etiqueta: "Las dos" },
      { etiqueta: "No uso IA" },
    ],
  },
  {
    id: "s.nivel",
    texto: "¿Cómo describirías tu nivel?",
    tipo: "chips",
    dimension: "competencia",
    opciones: [
      { etiqueta: "No sé por dónde empezar", puntos: 0 },
      { etiqueta: "Hago preguntas sencillas", puntos: 1 },
      { etiqueta: "Sé pedir lo que quiero y corregir", puntos: 2 },
      { etiqueta: "Tengo formas de trabajar con IA que repito", puntos: 3 },
      { etiqueta: "Enseño a otros o automatizo tareas", puntos: 4 },
    ],
  },
  {
    id: "s.revision",
    texto: "Cuando la IA te da una respuesta, ¿qué haces?",
    tipo: "chips",
    dimension: "competencia",
    opciones: [
      { etiqueta: "No la uso", puntos: "excluir" },
      { etiqueta: "La uso tal cual", puntos: 0 },
      { etiqueta: "La reviso por encima", puntos: 2 },
      { etiqueta: "Compruebo datos y cifras antes de usarla", puntos: 3 },
      { etiqueta: "La contrasto y la ajusto siempre", puntos: 4 },
    ],
  },
  {
    id: "s.formacion",
    texto: "¿Qué formación en IA has recibido?",
    tipo: "chips",
    dimension: "competencia",
    opciones: [
      { etiqueta: "Ninguna", puntos: 0 },
      { etiqueta: "Vídeos o tutoriales por mi cuenta", puntos: 1 },
      { etiqueta: "Un curso corto", puntos: 2 },
      { etiqueta: "Formación organizada por la empresa", puntos: 3 },
      { etiqueta: "Formación continua o específica de mi puesto", puntos: 4 },
    ],
  },
  {
    id: "s.datos",
    texto: "¿Metes información de clientes o de la empresa en herramientas de IA?",
    tipo: "chips",
    dimension: "seguridad",
    opciones: [
      { etiqueta: "No uso IA", puntos: "excluir" },
      { etiqueta: "Sí, sin pensarlo mucho", puntos: 0 },
      { etiqueta: "No sé si puedo", puntos: 1 },
      { etiqueta: "A veces, con cuidado", puntos: 2 },
      { etiqueta: "Solo datos anonimizados o en herramientas autorizadas", puntos: 4 },
    ],
  },
  {
    id: "s.normas",
    texto: "¿Sabes si la empresa tiene normas sobre el uso de IA?",
    tipo: "chips",
    dimension: "seguridad",
    opciones: [
      { etiqueta: "No hay", puntos: 0 },
      { etiqueta: "No lo sé", puntos: 0 },
      { etiqueta: "Hay algo informal", puntos: 2 },
      { etiqueta: "Sí, y las conozco", puntos: 4 },
    ],
  },
  {
    id: "s.sentir",
    texto: "¿Qué sientes respecto a la IA en tu trabajo?",
    tipo: "chips",
    dimension: "actitud",
    opciones: [
      { etiqueta: "Me preocupa que me sustituya", puntos: 0 },
      { etiqueta: "Desconfío de lo que hace", puntos: 1 },
      { etiqueta: "Me da igual", puntos: 1 },
      { etiqueta: "Curiosidad", puntos: 3 },
      { etiqueta: "Ganas de usarla más", puntos: 4 },
    ],
  },
  {
    id: "s.hora",
    texto: "Si la empresa te diera 1 hora a la semana para aprender IA, ¿la usarías?",
    tipo: "chips",
    dimension: "actitud",
    opciones: [
      { etiqueta: "No", puntos: 0 },
      { etiqueta: "Probablemente no", puntos: 1 },
      { etiqueta: "Probablemente sí", puntos: 3 },
      { etiqueta: "Sí, sin duda", puntos: 4 },
    ],
  },
  {
    id: "s.repetitivo",
    texto:
      "¿Cuánto tiempo a la semana dedicas a tareas repetitivas que podrían hacerse más rápido?",
    tipo: "chips",
    opciones: [
      { etiqueta: "Menos de 1 h" },
      { etiqueta: "1-3 h" },
      { etiqueta: "3-6 h" },
      { etiqueta: "Más de 6 h" },
    ],
  },
  {
    id: "s.aprender",
    texto: "¿Qué te gustaría aprender?",
    tipo: "multi",
    max: 3,
    nota: "Máximo 3.",
    opciones: [
      { etiqueta: "Pedir mejor lo que quiero a la IA" },
      { etiqueta: "Resumir y analizar documentos" },
      { etiqueta: "Excel y datos con IA" },
      { etiqueta: "Emails y propuestas" },
      { etiqueta: "Presentaciones e imágenes" },
      { etiqueta: "Automatizar tareas repetitivas" },
      { etiqueta: "Usar la IA con seguridad" },
      { etiqueta: "Nada por ahora" },
    ],
  },
  {
    id: "s.tarea",
    texto: "Si pudieras quitarte una tarea de encima, ¿cuál sería?",
    tipo: "texto",
    opcional: true,
  },
];

/** Pesos del índice (§6). */
export const PESOS: Record<Dimension, number> = {
  uso: 0.3,
  competencia: 0.3,
  seguridad: 0.2,
  actitud: 0.2,
};

export const NIVELES = [
  { hasta: 20, nivel: 1, nombre: "Sin arrancar" },
  { hasta: 40, nivel: 2, nombre: "Curiosidad" },
  { hasta: 60, nivel: 3, nombre: "Uso personal" },
  { hasta: 80, nivel: 4, nombre: "Uso en equipo" },
  { hasta: 100, nivel: 5, nombre: "Referente" },
] as const;

/** §6 Anonimato: mínimos para enseñar resultados. */
export const MINIMO_RESPUESTAS = 3;
export const MINIMO_POR_AREA = 3;
export const MINIMO_TEMAS_TAREA = 5;
export const OTRAS_AREAS = "Otras áreas";
