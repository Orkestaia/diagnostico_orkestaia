/** Banco de sectores v1 — §5.1 `servicios_profesionales` (+ §9 y §10). Transcrito sin cambios. */
import type { Entradas, Sector } from "../tipos";
import { equipo, hay, producto } from "./comunes";

/** "equipo ≤ 5" del banco. Si no se conoce el equipo, no se cumple. */
const equipoPequeno = (e: Entradas) => {
  const n = equipo(e);
  return n != null && n <= 5;
};

export const serviciosProfesionales: Sector = {
  id: "servicios_profesionales",
  nombre: "Servicios profesionales",
  subsectores: [
    "Despacho de abogados",
    "Asesoría o gestoría",
    "Arquitectura, ingeniería u oficina técnica",
    "Consultoría",
    "Otro",
  ],
  avisoFijo: "No escribas datos de tus clientes: solo cómo trabajáis.",
  fraseIII: "Vamos al día a día del despacho: lo que se repite y lo que nadie ve.",
  preguntas: [
    {
      id: "dia.expedientes_mes",
      texto: "¿Cuántos expedientes, casos o proyectos nuevos abrís al mes?",
      tipo: "rango",
      opciones: [
        { etiqueta: "1-5", valor: 3 },
        { etiqueta: "5-15", valor: 10 },
        { etiqueta: "15-40", valor: 25 },
        { etiqueta: "Más de 40", valor: 60 },
        { etiqueta: "No lo sé", valor: null },
      ],
    },
    {
      id: "dia.minutos_documentacion",
      texto:
        "Al empezar uno, ¿cuánto tiempo se va en pedir y perseguir documentación al cliente?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Casi nada", valor: 5 },
        { etiqueta: "15-60 min", valor: 35 },
        { etiqueta: "1-3 h", valor: 120 },
        { etiqueta: "Más de 3 h", valor: 240 },
      ],
    },
    {
      id: "dia.docs_repetitivos",
      texto: "¿Qué documentos redactáis casi iguales cada vez?",
      tipo: "multi",
      opciones: [
        { etiqueta: "Escritos y demandas", grupo: "Abogados" },
        { etiqueta: "Convenios", grupo: "Abogados" },
        { etiqueta: "Contratos", grupo: "Abogados" },
        { etiqueta: "Burofax y requerimientos", grupo: "Abogados" },
        { etiqueta: "Cartas y comunicaciones", grupo: "Asesoría" },
        { etiqueta: "Informes a clientes", grupo: "Asesoría" },
        { etiqueta: "Presentación de modelos", grupo: "Asesoría" },
        { etiqueta: "Memorias", grupo: "Arquitectura" },
        { etiqueta: "Informes técnicos", grupo: "Arquitectura" },
        { etiqueta: "Certificados", grupo: "Arquitectura" },
        { etiqueta: "Ofertas de honorarios", grupo: "Arquitectura" },
        { etiqueta: "Propuestas", grupo: "Consultoría" },
        { etiqueta: "Informes", grupo: "Consultoría" },
        { etiqueta: "Otro", grupo: "Todos" },
      ],
    },
    {
      id: "dia.horas_redaccion",
      texto: "¿Cuántas horas a la semana se van en redactar eso que se repite?",
      tipo: "rango",
      opciones: [
        { etiqueta: "0-2 h", valor: 1 },
        { etiqueta: "2-5 h", valor: 3.5 },
        { etiqueta: "5-10 h", valor: 7.5 },
        { etiqueta: "Más de 10 h", valor: 12 },
      ],
    },
    {
      id: "dia.llamadas_estado",
      texto: '¿Cuántas llamadas o mensajes de "¿cómo va lo mío?" recibís a la semana?',
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 5", valor: 3 },
        { etiqueta: "5-15", valor: 10 },
        { etiqueta: "15-30", valor: 22 },
        { etiqueta: "Más de 30", valor: 40 },
      ],
    },
    {
      id: "dia.plazos",
      texto: "¿Cómo controláis plazos y vencimientos?",
      tipo: "chips",
      opciones: ["Con un programa", "Calendario compartido", "Excel", "De memoria"].map(
        (etiqueta) => ({ etiqueta }),
      ),
    },
    {
      id: "dia.cobros",
      texto: "¿Tenéis que perseguir cobros o provisiones de fondos?",
      tipo: "chips",
      opciones: ["Casi nunca", "A veces", "A menudo"].map((etiqueta) => ({ etiqueta })),
    },
    {
      id: "dia.otro_proceso",
      texto: "¿Hay otra tarea que se repita mucho? (opcional)",
      tipo: "texto",
      opcional: true,
    },
  ],
  quickWins: [
    {
      id: "SP-QW1",
      tituloBase: "Documentación del cliente sin perseguir a nadie",
      categoria: "documentacion",
      tipo: "tiempo",
      formula: "`expedientes_mes × minutos_documentacion × 0,6`",
      esfuerzo: "2-3 semanas",
      etiquetas: ["horas", "rapidez"],
      palabrasClave: ["documentación", "papeles", "documentos", "perseguir"],
      antes: "Pides los documentos por email, esperas, recuerdas, vuelves a pedir.",
      despues:
        "El cliente recibe la lista de lo que necesitas y recordatorios hasta completarla. Tú ves qué falta en cada expediente.",
      etiquetaTarea: "Pedir y perseguir documentación",
      // operativo (tactico si equipo ≤ 5)
      perfil: (e) => (equipoPequeno(e) ? "tactico" : "operativo"),
      elegible: (e) => hay(e.n("dia.expedientes_mes")),
      horasBase: (e) => {
        const m = e.n("dia.minutos_documentacion");
        return producto(e.n("dia.expedientes_mes"), m == null ? m : m / 60);
      },
      pct: 0.6,
    },
    {
      id: "SP-QW2",
      tituloBase: "Borradores de los documentos que se repiten",
      categoria: "documentacion",
      tipo: "tiempo",
      formula: "`horas_redaccion × 4,3 × 0,3`",
      esfuerzo: "3-4 semanas",
      etiquetas: ["horas", "escalar"],
      palabrasClave: ["redactar", "escritos", "memorias", "informes"],
      antes: "Cada escrito empieza copiando el anterior y cambiando datos a mano.",
      despues:
        "El borrador sale con los datos del expediente ya puestos; tú aportas el criterio y lo firmas.",
      etiquetaTarea: "Redactar documentos que se repiten",
      // directivo (equipo ≤ 5) / tactico
      perfil: (e) => (equipoPequeno(e) ? "directivo" : "tactico"),
      elegible: (e) => hay(e.n("dia.horas_redaccion")),
      horasBase: (e) => producto(e.n("dia.horas_redaccion"), 4.3),
      pct: 0.3,
    },
    {
      id: "SP-QW3",
      tituloBase: "El cliente sabe cómo va lo suyo sin llamar",
      categoria: "clientes",
      tipo: "tiempo",
      formula: "`llamadas_estado × 4,3 × 6 min × 0,5`",
      esfuerzo: "2-3 semanas",
      etiquetas: ["rapidez", "clientes"],
      palabrasClave: ["llamadas", "estado", "cómo va"],
      antes: "El teléfono suena para preguntar cómo va lo suyo.",
      despues: "El cliente recibe un aviso cuando su asunto avanza y deja de tener que llamar.",
      etiquetaTarea: 'Atender las llamadas de "¿cómo va lo mío?"',
      perfil: () => "operativo",
      elegible: (e) => hay(e.n("dia.llamadas_estado")),
      horasBase: (e) => producto(e.n("dia.llamadas_estado"), 4.3, 6 / 60),
      pct: 0.5,
    },
    {
      id: "SP-QW4",
      tituloBase: "Plazos y vencimientos con avisos automáticos",
      categoria: "operaciones",
      tipo: "riesgo",
      formula: "Sin cifras. Elegible si `plazos ∈ {Excel, De memoria}`",
      esfuerzo: "1-2 semanas",
      etiquetas: ["errores", "control"],
      palabrasClave: ["plazos", "vencimientos"],
      antes: "Los plazos dependen de una hoja o de la memoria de alguien.",
      despues: "Cada plazo avisa con antelación a la persona responsable.",
      etiquetaTarea: "Controlar plazos y vencimientos",
      perfil: () => null,
      elegible: (e) => ["Excel", "De memoria"].includes(e.s("dia.plazos") ?? ""),
    },
    {
      id: "SP-QW5",
      tituloBase: "Recordatorios de cobro y provisiones",
      categoria: "administracion",
      tipo: "tiempo",
      formula:
        '`expedientes_mes × 15 min × 0,6` si `cobros = A menudo`; `× 0,3` si "A veces"',
      esfuerzo: "1-2 semanas",
      etiquetas: ["horas"],
      palabrasClave: ["cobros", "facturas", "provisiones"],
      antes: "Los cobros pendientes se revisan cuando alguien se acuerda.",
      despues: "Los recordatorios salen solos y tú solo intervienes cuando hace falta.",
      etiquetaTarea: "Perseguir cobros y provisiones",
      perfil: () => "operativo",
      elegible: (e) => ["A menudo", "A veces"].includes(e.s("dia.cobros") ?? ""),
      horasBase: (e) => producto(e.n("dia.expedientes_mes"), 15 / 60),
      pct: (e) => (e.s("dia.cobros") === "A menudo" ? 0.6 : 0.3),
    },
  ],
  noAutomatizar: [
    "el criterio profesional y la firma",
    "la primera conversación con un cliente nuevo",
    "cualquier comunicación en asuntos delicados (en despachos de familia o penal, nunca mensajes automáticos en casos de violencia)",
  ],
  validar: [
    "qué programa de gestión usáis y si permite conectarse",
    "dónde se guardan los expedientes",
    "quién revisa los borradores",
  ],
  previoIII: ["dia.expedientes_mes", "dia.minutos_documentacion", "dia.llamadas_estado"],
  activoEnInvitaciones: true,
};
