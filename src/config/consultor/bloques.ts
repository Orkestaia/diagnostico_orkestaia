/**
 * Batería del consultor v2 (19-sep) — §1 (bloques y frases) y §4 (preguntas por bloque).
 * Transcrito sin cambios. Los `id` de la v1 se conservan aunque su bloque cambie de letra.
 *
 * - `privado: true` = campo 🔒: va en `diagnosticos.privado` y solo se carga y se pinta con la
 *   vista privada activada.
 * - `nivel`: "N" (núcleo, se hace siempre, destacada) o "P" (profundizar, plegada debajo del
 *   bloque). Un bloque se puede cerrar con preguntas P sin contestar.
 */
import { OPCIONES_EXITO, OPCIONES_INFO_CLIENTES } from "../sectores/comunes";

export type BloqueId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

/** N = núcleo (siempre) · P = profundizar (menú, no se hacen todas). */
export type Nivel = "N" | "P";

export interface Bloque {
  id: BloqueId;
  nombre: string;
  minutos: number;
  area: string;
  frase: string;
  /** Aviso fijo en pantalla durante el bloque. */
  aviso?: string;
}

export const BLOQUES: Bloque[] = [
  {
    id: "A",
    nombre: "Contexto y objetivos",
    minutos: 15,
    area: "Negocio",
    frase: "Empezamos por lo que ya me contaste. Corrígeme todo lo que haga falta.",
  },
  {
    id: "B",
    nombre: "Procesos",
    minutos: 50,
    area: "Procesos operativos",
    frase: "Ahora, proceso a proceso. Enséñamelo como lo hacéis de verdad.",
  },
  {
    id: "C",
    nombre: "Números",
    minutos: 15,
    area: "Hoja de ruta económica",
    frase: "Pongamos números a lo que hemos visto. Aproximados valen.",
  },
  {
    id: "D",
    nombre: "Datos e información",
    minutos: 15,
    area: "Datos",
    frase: "Dónde vive la información y cuánto os podéis fiar de ella.",
  },
  {
    id: "E",
    nombre: "Herramientas",
    minutos: 15,
    area: "Stack tecnológico",
    frase: "Qué herramientas tocáis y cómo se hablan entre ellas.",
  },
  {
    id: "F",
    nombre: "Equipo e IA",
    minutos: 15,
    area: "Equipo y alfabetización en IA",
    frase: "Hablemos de personas: quién usa ya la IA y quién podría tirar del carro.",
  },
  {
    id: "G",
    nombre: "Cumplimiento",
    minutos: 10,
    area: "Cumplimiento",
    frase: "Lo que no se ve pero importa: datos personales y normas.",
    aviso: "Esto no es una auditoría legal: sirve para saber dónde mirar con vuestro asesor.",
  },
  {
    id: "H",
    nombre: "Cierre",
    minutos: 15,
    area: "Hoja de ruta económica",
    frase: "Cerramos: qué es lo primero que te gustaría resolver.",
  },
];

/** §0 Reglas de la visita (recordatorio para Aitor, vista privada). */
export const REGLAS_VISITA = [
  "ni precio ni plazos de implantación",
  '"enséñame, no me cuentes"',
  "cifras aproximadas valen",
  "sin nombres técnicos",
];

export type TipoCampo =
  | "texto"
  | "numero"
  | "chips"
  | "multi"
  | "si_no"
  | "si_no_nose"
  | "fecha"
  | "fecha_texto"
  | "lista_equipo"
  | "lista_herramientas"
  | "lista_datos"
  | "escala"
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
  nivel: Nivel;
  opciones?: string[];
  opcional?: boolean;
  /** Máximo de elementos (elegir tarjetas). */
  max?: number;
  /** `escala`: además de 1-5, una nota libre. */
  nota?: boolean;
  /**
   * Pregunta repetida (Aitor, 22-sep): la misma que ya se contestó en el previo. La visita la
   * enseña rellenada con esa respuesta, editable, con la etiqueta «respondido en el previo». Si
   * Aitor la cambia, se guarda como respuesta de la visita (la del previo no se toca).
   */
  mismoQuePrevio?: string;
}

export const CAMPOS_VISITA: CampoVisita[] = [
  // ── A · Contexto y objetivos ──
  {
    id: "a.historia",
    bloque: "A",
    texto: "¿Cómo empezó el negocio y qué vendéis hoy?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "a.equipo",
    bloque: "A",
    texto: "Equipo por roles (rol + número)",
    tipo: "lista_equipo",
    privado: false,
    nivel: "N",
  },
  {
    id: "a.decisor",
    bloque: "A",
    texto: "¿Quién decide una inversión así? ¿Está hoy aquí?",
    tipo: "texto_si_no",
    privado: false,
    nivel: "N",
  },
  {
    id: "a.objetivo",
    bloque: "A",
    texto: "¿Dónde queréis estar dentro de 12 meses?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "a.merece_pena",
    bloque: "A",
    texto: "¿Qué haría que estas 3 horas merezcan la pena?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "a.probado",
    bloque: "A",
    texto: "¿Qué habéis probado ya (programas, IA, proveedores) y qué salió mal?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "a.doble",
    bloque: "A",
    texto: "Si mañana entraran el doble de clientes, ¿qué se rompería primero?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "a.como_gana",
    bloque: "A",
    texto:
      "¿De dónde sale la mayor parte de la facturación? ¿Qué producto o servicio es el más rentable?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "a.cliente_tipo",
    bloque: "A",
    texto: "¿Cómo es vuestro cliente tipo? ¿Qué os pide que hoy os cuesta darle?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "a.tendencia",
    bloque: "A",
    texto: "¿Cómo va el negocio?",
    tipo: "chips",
    privado: false,
    nivel: "P",
    opcional: true,
    opciones: ["Creciendo", "Estable", "Bajando"],
  },
  {
    id: "a.otras_personas",
    bloque: "A",
    texto: "¿Quién más debería estar en esta conversación y no está?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "a.ultima_inversion",
    bloque: "A",
    texto: "¿Cuál fue la última herramienta o proveedor que contratasteis? ¿Cómo salió?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "a.facturacion",
    bloque: "A",
    texto: "Rango de facturación anual",
    tipo: "chips",
    privado: true,
    nivel: "P",
    opcional: true,
    opciones: ["< 250.000 €", "250.000-1 M€", "1-5 M€", "> 5 M€", "Prefiere no decirlo"],
  },

  // ── C · Números ──
  {
    id: "c.coste_perfil",
    bloque: "C",
    texto: "Coste por hora de cada perfil (se pregunta siempre; por defecto 14 / 25 / 40 €)",
    tipo: "costes_perfil",
    privado: true,
    nivel: "N",
  },
  {
    id: "c.picos",
    bloque: "C",
    texto: "¿Hay temporadas o picos?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "c.perdidas",
    bloque: "C",
    texto: "¿Cuántas consultas o presupuestos creéis que se pierden al mes?",
    tipo: "numero",
    privado: false,
    nivel: "N",
  },
  {
    id: "c.horas_admin",
    bloque: "C",
    texto: "Entre todos, ¿cuántas horas a la semana se van en administración?",
    tipo: "numero",
    privado: false,
    nivel: "N",
  },
  {
    id: "c.ultimo_error",
    bloque: "C",
    texto: "El último error que os costó dinero: ¿qué pasó y cuánto costó más o menos?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "c.contratar",
    bloque: "C",
    texto:
      "Si tuvierais que contratar a alguien para absorber este trabajo, ¿cuánto os costaría al año?",
    tipo: "numero",
    privado: true,
    nivel: "P",
    opcional: true,
  },
  {
    id: "c.ticket",
    bloque: "C",
    texto: "Valor medio de un cliente o de un pedido",
    tipo: "numero",
    privado: true,
    nivel: "P",
    opcional: true,
  },
  {
    id: "c.margen",
    bloque: "C",
    texto: "Margen aproximado de lo que vendéis",
    tipo: "chips",
    privado: true,
    nivel: "P",
    opcional: true,
    opciones: ["< 10 %", "10-25 %", "25-50 %", "> 50 %", "No lo sé"],
  },

  // ── D · Datos e información ──
  {
    id: "datos.mapa",
    bloque: "D",
    texto:
      "Por cada tipo de dato (clientes, pedidos o expedientes, facturación, stock, documentos): dónde está, en qué formato, quién lo mantiene y cuánto os fiáis (1-5)",
    tipo: "lista_datos",
    privado: false,
    nivel: "N",
  },
  {
    id: "datos.duplicados",
    bloque: "D",
    texto: "¿Tenéis clientes, productos o expedientes duplicados o en varias versiones?",
    tipo: "chips",
    privado: false,
    nivel: "N",
    opciones: ["Nunca", "A veces", "A menudo", "No lo sé"],
  },
  {
    id: "datos.verdad",
    bloque: "D",
    texto: "Si dos sitios dan cifras distintas, ¿cuál manda?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "datos.excel_criticos",
    bloque: "D",
    texto: "¿Cuántos Excel hay que, si se rompen o se pierden, paran algo? ¿Cuáles?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "datos.documentos",
    bloque: "D",
    texto: "¿En qué forma están los documentos?",
    tipo: "multi",
    privado: false,
    nivel: "N",
    opciones: [
      "Papel",
      "PDF escaneado",
      "PDF digital",
      "Word/Excel",
      "Adjuntos de email",
      "Carpetas compartidas",
      "Gestor documental",
    ],
  },
  {
    id: "datos.buscar",
    bloque: "D",
    texto: "¿Cuánto tardáis en encontrar un documento de hace un año?",
    tipo: "chips",
    privado: false,
    nivel: "P",
    opcional: true,
    opciones: ["Menos de 1 min", "Unos minutos", "Más de 15 min", "A veces no aparece"],
  },
  {
    id: "datos.informes",
    bloque: "D",
    texto: "¿Qué cifras mira dirección y cómo se preparan?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "datos.a_ojo",
    bloque: "D",
    texto: '¿Qué decisión tomáis "a ojo" porque no hay datos?',
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "datos.copias",
    bloque: "D",
    texto: "¿Hay copias de seguridad y alguien ha comprobado que se pueden recuperar?",
    tipo: "si_no_nose",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "datos.accesos",
    bloque: "D",
    texto: "¿Quién puede ver y cambiar cada cosa? ¿Se quitan los accesos cuando alguien se va?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "datos.calidad",
    bloque: "D",
    texto: "Valoración de Aitor: calidad de los datos",
    tipo: "escala",
    privado: true,
    nivel: "N",
  },
  {
    id: "datos.preparacion_ia",
    bloque: "D",
    texto: "Valoración de Aitor: ¿están los datos listos para usar IA sobre ellos?",
    tipo: "escala",
    privado: true,
    nivel: "N",
  },

  // ── E · Herramientas (era el bloque D de la v1) ──
  {
    id: "d.inventario",
    bloque: "E",
    texto:
      "Por herramienta: nombre, para qué, quién la usa, ¿se conecta con otras? (sí / no / no sé), coste mensual aproximado, quién tiene las claves",
    tipo: "lista_herramientas",
    privado: false,
    nivel: "N",
  },
  {
    id: "d.info_clientes",
    bloque: "E",
    texto: "¿Dónde está la información de cada cliente?",
    // 22-sep (Aitor, tras el ensayo de Icónica): varias opciones. Lo guardado como texto se lee
    // como lista de un elemento (`valorCampo`). Pendiente de reflejar en la batería (banco_v1.2).
    tipo: "multi",
    privado: false,
    nivel: "N",
    opciones: OPCIONES_INFO_CLIENTES,
    mismoQuePrevio: "herramientas.info_clientes",
  },
  {
    id: "herr.integracion",
    bloque: "E",
    texto: "¿Las herramientas se pasan datos entre ellas o se copian a mano?",
    tipo: "chips",
    privado: false,
    nivel: "N",
    opciones: ["Todo a mano", "Algunas conectadas", "Bien conectadas"],
  },
  {
    id: "d.informatica",
    bloque: "E",
    texto: "¿Quién os lleva la informática y la web?",
    tipo: "chips",
    privado: false,
    nivel: "N",
    opciones: ["Alguien de dentro", "Un proveedor", "Nadie"],
  },
  {
    id: "herr.sin_usar",
    bloque: "E",
    texto: "¿Qué pagáis y casi no usáis?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "herr.permanencias",
    bloque: "E",
    texto: "¿Hay contratos o permanencias que venzan en los próximos 12 meses?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "herr.movil",
    bloque: "E",
    texto: "¿Se trabaja fuera de la oficina (móvil, tableta, en obra o en ruta)?",
    tipo: "chips",
    privado: false,
    nivel: "P",
    opcional: true,
    opciones: ["No", "A veces", "Mucho"],
  },
  {
    id: "herr.claves_compartidas",
    bloque: "E",
    texto: "¿Se comparten usuarios y contraseñas entre varias personas?",
    tipo: "si_no_nose",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "herr.ideal",
    bloque: "E",
    texto: "Si pudieras cambiar una herramienta mañana, ¿cuál y por qué?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "herr.coste_total",
    bloque: "E",
    texto: "Gasto mensual total en software",
    tipo: "numero",
    privado: true,
    nivel: "P",
    opcional: true,
  },

  // ── F · Equipo e IA ──
  {
    id: "ia.quien_usa",
    bloque: "F",
    texto: "¿Quién usa hoy IA en la empresa?",
    tipo: "multi",
    privado: false,
    nivel: "N",
    opciones: [
      "Nadie",
      "Dirección",
      "Algunos por su cuenta",
      "Equipos de forma organizada",
      "No lo sé",
    ],
  },
  {
    id: "ia.herramientas",
    bloque: "F",
    texto: "¿Qué herramientas?",
    tipo: "multi",
    privado: false,
    nivel: "N",
    opciones: [
      "ChatGPT gratuito",
      "ChatGPT de pago",
      "Copilot",
      "Gemini",
      "Claude",
      "IA dentro de nuestros programas",
      "Otras",
      "Ninguna",
    ],
  },
  {
    id: "ia.cuentas",
    bloque: "F",
    texto: "¿Con cuentas de la empresa o personales?",
    tipo: "chips",
    privado: false,
    nivel: "N",
    opciones: ["De empresa", "Personales", "Mezcla", "No lo sé"],
  },
  {
    id: "ia.ejemplo",
    bloque: "F",
    texto: "Enséñame un ejemplo real de para qué la usáis",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "ia.normas",
    bloque: "F",
    texto: "¿Hay normas sobre qué se puede meter en una herramienta de IA?",
    tipo: "chips",
    privado: false,
    nivel: "N",
    opciones: ["No hay", "Informales", "Escritas y comunicadas", "No lo sé"],
  },
  {
    id: "ia.formacion",
    bloque: "F",
    texto: "¿Qué formación en IA ha recibido el equipo?",
    tipo: "chips",
    privado: false,
    nivel: "N",
    opciones: ["Ninguna", "Cada uno por su cuenta", "Algún curso puntual", "Formación organizada"],
  },
  {
    id: "ia.actitud_equipo",
    bloque: "F",
    texto: "¿Cómo crees que se lo toma el equipo?",
    tipo: "multi",
    privado: false,
    nivel: "N",
    opciones: [
      "Ilusión",
      "Curiosidad",
      "Indiferencia",
      "Miedo a perder el puesto",
      "Rechazo",
      "No lo sé",
    ],
  },
  {
    id: "ia.campeon",
    bloque: "F",
    texto: "¿Quién de tu equipo tiraría del carro si empezáis?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "ia.areas",
    bloque: "F",
    texto: "Áreas de la empresa y cuántas personas hay en cada una (se usan en la encuesta)",
    tipo: "lista_equipo",
    privado: false,
    nivel: "N",
  },
  {
    id: "ia.encuesta",
    bloque: "F",
    texto: "¿Mandamos la encuesta anónima de 5 minutos al equipo? ¿Quién la reparte?",
    tipo: "texto_si_no",
    privado: false,
    nivel: "N",
  },
  {
    id: "ia.creencia",
    bloque: "F",
    texto: "¿Cuánto crees tú que la IA puede ayudaros?",
    tipo: "escala",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "ia.fallidos",
    bloque: "F",
    texto: "¿Habéis probado algo con IA que no funcionó? ¿Qué pasó?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "ia.tiempo_formacion",
    bloque: "F",
    texto: "¿Cuánto tiempo podría dedicar cada persona a formarse?",
    tipo: "chips",
    privado: false,
    nivel: "P",
    opcional: true,
    opciones: ["Ninguno", "1 h al mes", "1 h a la semana", "Más"],
  },
  {
    id: "ia.presupuesto_formacion",
    bloque: "F",
    texto: "Presupuesto para formación",
    tipo: "chips",
    privado: true,
    nivel: "P",
    opcional: true,
    opciones: ["Ninguno", "< 1.000 €", "1.000-5.000 €", "> 5.000 €", "No lo sabe"],
  },
  {
    id: "ia.valoracion_campeon",
    bloque: "F",
    texto: "Valoración de Aitor del campeón propuesto",
    tipo: "escala",
    privado: true,
    nivel: "P",
    opcional: true,
    nota: true,
  },

  // ── G · Cumplimiento ──
  {
    id: "d.datos_sensibles",
    bloque: "G",
    texto: "¿Manejáis datos sensibles?",
    tipo: "multi",
    privado: false,
    nivel: "N",
    opciones: ["Ninguno", "Salud", "Menores", "Financieros", "Otros"],
  },
  {
    id: "cumpl.responsable",
    bloque: "G",
    texto: "¿Quién se ocupa de la protección de datos?",
    tipo: "chips",
    privado: false,
    nivel: "N",
    opciones: [
      "Nadie",
      "Alguien de dentro",
      "La gestoría o asesoría",
      "Una consultora especializada",
    ],
  },
  {
    id: "cumpl.encargados",
    bloque: "G",
    texto:
      "Los proveedores que tratan vuestros datos (gestoría, software, nube), ¿tienen firmado un contrato de encargado del tratamiento?",
    tipo: "si_no_nose",
    privado: false,
    nivel: "N",
  },
  {
    id: "cumpl.fuera_ue",
    bloque: "G",
    texto: "¿Usáis herramientas que guardan datos fuera de la Unión Europea?",
    tipo: "si_no_nose",
    privado: false,
    nivel: "N",
  },
  {
    id: "cumpl.alfabetizacion",
    bloque: "G",
    texto:
      "La ley europea de IA obliga desde febrero de 2025 a que quien usa IA en la empresa sepa usarla con criterio. ¿Habéis hecho algo al respecto?",
    tipo: "si_no_nose",
    privado: false,
    nivel: "N",
  },
  {
    id: "cumpl.ia_personas",
    bloque: "G",
    texto: "¿Usáis o pensáis usar IA para alguna de estas cosas?",
    tipo: "multi",
    privado: false,
    nivel: "N",
    opciones: [
      "Seleccionar personal",
      "Evaluar empleados",
      "Decidir créditos o precios por persona",
      "Evaluar alumnos",
      "Reconocimiento facial",
      "Ninguna",
    ],
  },
  {
    id: "cumpl.ia_aviso",
    bloque: "G",
    texto:
      "¿Algún cliente habla con un chatbot o recibe textos o imágenes generados con IA? ¿Se le avisa?",
    tipo: "texto_si_no",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "cumpl.registro",
    bloque: "G",
    texto: "¿Tenéis el registro de actividades de tratamiento?",
    tipo: "si_no_nose",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "cumpl.dpd",
    bloque: "G",
    texto:
      "¿Tenéis delegado de protección de datos? (en algunos sectores, como centros sanitarios o educativos, es obligatorio; a confirmar con su asesor)",
    tipo: "si_no_nose",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "cumpl.consentimientos",
    bloque: "G",
    texto: "¿Cómo recogéis el permiso de los clientes para enviarles comunicaciones comerciales?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "cumpl.incidentes",
    bloque: "G",
    texto: "¿Ha habido algún incidente (email a quien no era, portátil perdido, acceso indebido)?",
    tipo: "texto_si_no",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "cumpl.sector",
    bloque: "G",
    texto: "¿Qué normas de vuestro sector os condicionan?",
    tipo: "multi",
    privado: false,
    nivel: "P",
    opcional: true,
    // Opciones por sector (§5) + "Otra": se añaden en `camposDeSector`.
  },
  {
    id: "cumpl.auditorias",
    bloque: "G",
    texto: "¿Os audita alguien (ISO, clientes grandes, la Administración)?",
    tipo: "texto",
    privado: false,
    nivel: "P",
    opcional: true,
  },
  {
    id: "cumpl.riesgo",
    bloque: "G",
    texto: "Valoración de Aitor: riesgo de cumplimiento",
    tipo: "escala",
    privado: true,
    nivel: "N",
    nota: true,
  },

  // ── H · Cierre (era el bloque E de la v1) ──
  {
    id: "e.prioridades",
    bloque: "H",
    texto: "De todo lo que hemos visto, ¿qué tres cosas resolverías primero?",
    tipo: "elegir_tarjetas",
    privado: false,
    nivel: "N",
    max: 3,
  },
  {
    id: "e.exito",
    bloque: "H",
    texto: "¿Qué tendría que pasar en 6 meses para decir que ha merecido la pena?",
    // 22-sep (Aitor): hasta 2 opciones, como `prioridad.exito` en el previo.
    tipo: "multi",
    max: 2,
    privado: false,
    nivel: "N",
    opciones: OPCIONES_EXITO.map((o) => o.etiqueta),
    mismoQuePrevio: "prioridad.exito",
  },
  {
    id: "e.restricciones",
    bloque: "H",
    texto: "¿Hay plazos, miedos o condiciones que deba tener en cuenta?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "e.preocupa",
    bloque: "H",
    texto: "¿Qué es lo que más te preocupa de empezar con esto?",
    tipo: "texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "e.entrega",
    bloque: "H",
    texto: "Fecha de entrega del mapa",
    tipo: "fecha",
    privado: false,
    nivel: "N",
  },
  {
    id: "e.presentacion",
    bloque: "H",
    texto: "¿Cuándo nos vemos para presentar el mapa? ¿Quién debería estar?",
    tipo: "fecha_texto",
    privado: false,
    nivel: "N",
  },
  {
    id: "e.inversion",
    bloque: "H",
    texto: "Rango de inversión que tendría sentido",
    tipo: "chips",
    privado: true,
    nivel: "N",
    opciones: ["< 1.000 €", "1.000-3.000 €", "3.000-10.000 €", "> 10.000 €", "Prefiere no decirlo"],
  },
  {
    id: "e.retorno",
    bloque: "H",
    texto: "¿En cuánto tiempo esperan recuperar la inversión?",
    tipo: "chips",
    privado: true,
    nivel: "P",
    opcional: true,
    opciones: ["< 6 meses", "6-12 meses", "> 12 meses", "No lo sabe"],
  },
  {
    id: "e.spri",
    bloque: "H",
    texto: "¿Industria o servicio a industria con centro en Euskadi? (ayuda SPRI)",
    tipo: "si_no_nose",
    privado: true,
    nivel: "P",
    opcional: true,
  },
  {
    id: "e.senales",
    bloque: "H",
    texto: "Decisor presente · urgencia real (1-5) · encaje (1-5) · riesgo principal",
    tipo: "senales",
    privado: true,
    nivel: "N",
  },
];

/** §2: ayudas que se enseñan junto a los pasos. No se guardan. */
export const SEGUIMIENTO_PASOS = [
  "¿Y después qué pasa?",
  "¿Quién más lo toca?",
  "¿Cómo te enteras de que ha terminado?",
  "¿Dónde lo apuntáis?",
  "¿Qué pasa si se retrasa?",
];

/** `e.entrega`: por defecto +5 días hábiles (sin festivos, solo fines de semana). */
export const DIAS_HABILES_ENTREGA = 5;

/**
 * Duración: el temporizador cuenta sobre los 150 min de trabajo (la agenda son 3 h) y avisa en
 * el minuto 150 para saltar al cierre.
 */
export const MINUTOS_VISITA = 150;
