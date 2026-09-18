/**
 * Batería del consultor v1 — §1 (bloques y frases) y §4 (preguntas por bloque).
 * Transcrito sin cambios. `privado: true` = campo 🔒: va en `diagnosticos.privado` y solo se
 * carga y se pinta con la vista privada activada.
 */
import { OPCIONES_EXITO, OPCIONES_INFO_CLIENTES } from "../sectores/comunes";

export type BloqueId = "A" | "B" | "C" | "D" | "E";

export interface Bloque {
  id: BloqueId;
  nombre: string;
  minutos: number;
  frase: string;
}

export const BLOQUES: Bloque[] = [
  {
    id: "A",
    nombre: "Contexto",
    minutos: 20,
    frase: "Empezamos por lo que ya me contaste. Corrígeme todo lo que haga falta.",
  },
  {
    id: "B",
    nombre: "Procesos",
    minutos: 70,
    frase: "Ahora, proceso a proceso. Enséñamelo como lo hacéis de verdad.",
  },
  {
    id: "C",
    nombre: "Números",
    minutos: 45,
    frase: "Pongamos números a lo que hemos visto. Aproximados valen.",
  },
  {
    id: "D",
    nombre: "Herramientas",
    minutos: 25,
    frase: "Qué herramientas tocáis y dónde vive la información.",
  },
  {
    id: "E",
    nombre: "Cierre",
    minutos: 20,
    frase: "Cerramos: qué es lo primero que te gustaría resolver.",
  },
];

/** §1 Reglas de la visita (recordatorio para Aitor, vista privada). */
export const REGLAS_VISITA = [
  "ni precio ni plazo de implantación",
  '"enséñame, no me cuentes" (marcar `visto` cuando el cliente muestre el proceso real)',
  "cifras aproximadas valen",
  "no nombrar herramientas técnicas",
];

export type TipoCampo =
  | "texto"
  | "numero"
  | "chips"
  | "multi"
  | "si_no"
  | "si_no_nose"
  | "fecha"
  | "lista_equipo"
  | "lista_herramientas"
  | "texto_si_no"
  | "costes_perfil"
  | "elegir_tarjetas"
  | "senales";

export interface CampoVisita {
  id: string;
  bloque: BloqueId;
  texto: string;
  tipo: TipoCampo;
  privado: boolean;
  opciones?: string[];
  opcional?: boolean;
  /** Máximo de elementos (elegir tarjetas). */
  max?: number;
}

export const CAMPOS_VISITA: CampoVisita[] = [
  // ── A · Contexto ──
  { id: "a.historia", bloque: "A", texto: "¿Cómo empezó el negocio y qué vendéis hoy?", tipo: "texto", privado: false },
  { id: "a.equipo", bloque: "A", texto: "Equipo por roles (rol + número)", tipo: "lista_equipo", privado: false },
  { id: "a.decisor", bloque: "A", texto: "¿Quién decide una inversión así? ¿Está hoy aquí?", tipo: "texto_si_no", privado: false },
  { id: "a.objetivo", bloque: "A", texto: "¿Dónde queréis estar dentro de 12 meses?", tipo: "texto", privado: false },
  { id: "a.merece_pena", bloque: "A", texto: "¿Qué haría que estas 3 horas merezcan la pena?", tipo: "texto", privado: false },
  { id: "a.probado", bloque: "A", texto: "¿Qué habéis probado ya (programas, IA, proveedores) y qué salió mal?", tipo: "texto", privado: false },

  // ── C · Números ──
  { id: "c.picos", bloque: "C", texto: "¿Hay temporadas o picos?", tipo: "texto", privado: false },
  { id: "c.perdidas", bloque: "C", texto: "¿Cuántas consultas o presupuestos creéis que se pierden al mes?", tipo: "numero", privado: false },
  { id: "c.coste_perfil", bloque: "C", texto: "Coste por hora de cada perfil (por defecto 14 / 25 / 40 €)", tipo: "costes_perfil", privado: true },
  { id: "c.ticket", bloque: "C", texto: "Valor medio de un cliente o de un pedido (opcional)", tipo: "numero", privado: true, opcional: true },

  // ── D · Herramientas ──
  {
    id: "d.inventario",
    bloque: "D",
    texto:
      "Por herramienta: nombre, para qué, quién la usa, ¿se puede conectar con otras? (sí / no / no sé), coste mensual aproximado, quién tiene las claves",
    tipo: "lista_herramientas",
    privado: false,
  },
  { id: "d.info_clientes", bloque: "D", texto: "¿Dónde está la información de cada cliente?", tipo: "chips", privado: false, opciones: OPCIONES_INFO_CLIENTES },
  {
    id: "d.datos_sensibles",
    bloque: "D",
    texto: "¿Manejáis datos sensibles?",
    tipo: "multi",
    privado: false,
    opciones: ["Ninguno", "Salud", "Menores", "Financieros", "Otros"],
  },
  {
    id: "d.informatica",
    bloque: "D",
    texto: "¿Quién os lleva la informática y la web?",
    tipo: "chips",
    privado: false,
    opciones: ["Alguien de dentro", "Un proveedor", "Nadie"],
  },

  // ── E · Cierre ──
  { id: "e.prioridades", bloque: "E", texto: "De todo lo que hemos visto, ¿qué tres cosas resolverías primero?", tipo: "elegir_tarjetas", privado: false, max: 3 },
  {
    id: "e.exito",
    bloque: "E",
    texto: "¿Qué tendría que pasar en 6 meses para decir que ha merecido la pena?",
    tipo: "multi",
    privado: false,
    opciones: OPCIONES_EXITO.map((o) => o.etiqueta),
  },
  { id: "e.restricciones", bloque: "E", texto: "¿Hay plazos, miedos o condiciones que deba tener en cuenta?", tipo: "texto", privado: false },
  {
    id: "e.inversion",
    bloque: "E",
    texto: "Rango de inversión que tendría sentido",
    tipo: "chips",
    privado: true,
    opciones: ["< 1.000 €", "1.000-3.000 €", "3.000-10.000 €", "> 10.000 €", "Prefiere no decirlo"],
  },
  {
    id: "e.spri",
    bloque: "E",
    texto: "¿Industria o servicio a industria con centro en Euskadi? (posible ayuda SPRI)",
    tipo: "si_no_nose",
    privado: true,
  },
  { id: "e.entrega", bloque: "E", texto: "Fecha de entrega del mapa", tipo: "fecha", privado: false },
  {
    id: "e.senales",
    bloque: "E",
    texto: "Decisor presente · urgencia real (1-5) · encaje (1-5) · riesgo principal",
    tipo: "senales",
    privado: true,
  },
];

/** `e.entrega`: por defecto +5 días hábiles (sin festivos, solo fines de semana). */
export const DIAS_HABILES_ENTREGA = 5;

/** Batería §4 B: "entre 5 y 9 tarjetas bien rellenas". */
export const TARJETAS_OBJETIVO = { min: 5, max: 9 };
