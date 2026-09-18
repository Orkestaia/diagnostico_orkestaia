/** Banco de sectores v1 — §5.3 `industria_distribucion` (+ §9 y §10). Transcrito sin cambios. */
import type { Sector } from "../tipos";
import { hay, producto } from "./comunes";

/** ID-QW5: "(A veces: 1 / Habitualmente: 3)" licitaciones al mes. */
const LICITACIONES_MES: Record<string, number> = { "A veces": 1, Habitualmente: 3 };

export const industriaDistribucion: Sector = {
  id: "industria_distribucion",
  nombre: "Industria, distribución o servicios técnicos",
  subsectores: [
    "Fabricación o taller",
    "Distribución o suministros",
    "Rotulación e imagen",
    "Instalaciones o mantenimiento",
    "Construcción o reformas",
  ],
  fraseIII: "Vamos al taller y a la oficina: pedidos, presupuestos y papeles.",
  preguntas: [
    {
      id: "dia.canales_pedido",
      texto: "¿Cómo os llegan los pedidos o encargos?",
      tipo: "multi",
      opciones: [
        "Tienda online",
        "Email con PDF",
        "WhatsApp",
        "Teléfono",
        "A través de un comercial",
        "En persona",
      ].map((etiqueta) => ({ etiqueta })),
    },
    {
      id: "dia.pedidos_mes",
      texto: "¿Cuántos pedidos al mes entran fuera de la tienda online?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 50", valor: 25 },
        { etiqueta: "50-200", valor: 125 },
        { etiqueta: "200-600", valor: 400 },
        { etiqueta: "Más de 600", valor: 800 },
        { etiqueta: "No lo sé", valor: null },
      ],
    },
    {
      id: "dia.minutos_pedido",
      texto: "¿Cuánto lleva pasar cada uno al programa?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 5 min", valor: 3 },
        { etiqueta: "5-15 min", valor: 10 },
        { etiqueta: "15-30 min", valor: 22 },
      ],
    },
    {
      id: "dia.visita_presupuesto",
      texto: "¿Necesitáis visita o medición para presupuestar?",
      tipo: "si_no",
      mostrarSi: { id: "captacion.hace_presupuestos", op: "eq", valor: "Sí" },
    },
    {
      id: "dia.tarifas",
      texto: "¿Cuántas tarifas o catálogos de proveedores actualizáis al año?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Ninguna", valor: 0 },
        { etiqueta: "1-10", valor: 5 },
        { etiqueta: "10-30", valor: 20 },
        { etiqueta: "Más de 30", valor: 40 },
      ],
    },
    {
      id: "dia.horas_tarifa",
      texto: "¿Cuánto lleva actualizar cada una?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 1 h", valor: 0.5 },
        { etiqueta: "1-4 h", valor: 2.5 },
        { etiqueta: "Más de 4 h", valor: 6 },
      ],
      mostrarSi: { id: "dia.tarifas", op: "gt", valor: 0 },
    },
    {
      id: "dia.estado_trabajos",
      texto: "¿Cómo sabéis en qué punto está cada trabajo o pedido?",
      tipo: "chips",
      opciones: ["Con un programa", "Excel", "Pizarra o papel", "Preguntando"].map(
        (etiqueta) => ({ etiqueta }),
      ),
    },
    {
      id: "dia.llamadas_estado",
      texto:
        "¿Cuántas llamadas de clientes preguntando por su pedido o trabajo recibís a la semana?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 5", valor: 3 },
        { etiqueta: "5-15", valor: 10 },
        { etiqueta: "15-30", valor: 22 },
        { etiqueta: "Más de 30", valor: 40 },
      ],
    },
    {
      id: "dia.facturas_proveedor",
      texto: "¿Cuántas facturas de proveedor recibís al mes?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 30", valor: 15 },
        { etiqueta: "30-100", valor: 65 },
        { etiqueta: "100-300", valor: 200 },
        { etiqueta: "Más de 300", valor: 400 },
      ],
    },
    {
      id: "dia.minutos_factura",
      texto: "¿Cuánto lleva revisar y cuadrar cada una con su albarán?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 3 min", valor: 2 },
        { etiqueta: "3-10 min", valor: 6 },
        { etiqueta: "Más de 10 min", valor: 12 },
      ],
    },
    {
      id: "dia.licitaciones",
      texto: "¿Os presentáis a licitaciones públicas?",
      tipo: "chips",
      opciones: ["No", "A veces", "Habitualmente"].map((etiqueta) => ({ etiqueta })),
    },
    {
      id: "dia.horas_licitacion",
      texto: "¿Cuántas horas lleva preparar una?",
      tipo: "rango",
      opciones: [
        { etiqueta: "Menos de 5 h", valor: 3 },
        { etiqueta: "5-15 h", valor: 10 },
        { etiqueta: "Más de 15 h", valor: 20 },
      ],
      mostrarSi: { id: "dia.licitaciones", op: "neq", valor: "No" },
    },
  ],
  quickWins: [
    {
      id: "ID-QW1",
      tituloBase: "Pedidos que entran solos en el programa",
      categoria: "operaciones",
      tipo: "tiempo",
      formula: "`pedidos_mes × minutos_pedido × 0,6`",
      esfuerzo: "3-4 semanas",
      etiquetas: ["horas", "errores", "escalar"],
      palabrasClave: ["pedidos", "teclear", "ERP"],
      antes: "Los pedidos llegan por email o WhatsApp y alguien los teclea en el programa.",
      despues:
        "El pedido se lee solo y queda preparado en el programa; una persona lo revisa y lo confirma.",
      etiquetaTarea: "Pasar pedidos al programa",
      perfil: () => "operativo",
      elegible: (e) => hay(e.n("dia.pedidos_mes")),
      horasBase: (e) => {
        const m = e.n("dia.minutos_pedido");
        return producto(e.n("dia.pedidos_mes"), m == null ? m : m / 60);
      },
      pct: 0.6,
    },
    {
      id: "ID-QW2",
      tituloBase: "Tarifas de proveedores actualizadas sin horas de copia",
      categoria: "administracion",
      tipo: "tiempo",
      formula: "`tarifas / 12 × horas_tarifa × 60 min × 0,5`",
      esfuerzo: "2-4 semanas",
      etiquetas: ["horas", "errores"],
      palabrasClave: ["tarifas", "precios", "catálogo"],
      antes: "Cada tarifa nueva de un proveedor son horas de copiar precios.",
      despues: "La tarifa se carga sola y solo revisas lo que ha cambiado.",
      etiquetaTarea: "Actualizar tarifas de proveedores",
      perfil: () => "operativo",
      elegible: (e) => hay(e.n("dia.tarifas")),
      // "× 60 min" y el paso a horas (÷ 60) se anulan: tarifas/12 × horas_tarifa h/mes.
      horasBase: (e) => {
        const t = e.n("dia.tarifas");
        return producto(t == null ? t : t / 12, e.n("dia.horas_tarifa"));
      },
      pct: 0.5,
    },
    {
      id: "ID-QW3",
      tituloBase: "El cliente sabe cómo va su pedido sin llamar",
      categoria: "clientes",
      tipo: "tiempo",
      formula: "`llamadas_estado × 4,3 × 6 min × 0,5`",
      esfuerzo: "2-3 semanas",
      etiquetas: ["rapidez", "clientes"],
      palabrasClave: ["estado", "llamadas", "seguimiento"],
      antes: 'El teléfono suena para preguntar "¿cómo va lo mío?".',
      despues: "El cliente recibe avisos cuando su pedido avanza.",
      etiquetaTarea: "Atender llamadas sobre el estado de pedidos",
      perfil: () => "operativo",
      elegible: (e) => hay(e.n("dia.llamadas_estado")),
      horasBase: (e) => producto(e.n("dia.llamadas_estado"), 4.3, 6 / 60),
      pct: 0.5,
    },
    {
      id: "ID-QW4",
      tituloBase: "Facturas de proveedor cuadradas con su albarán",
      categoria: "administracion",
      tipo: "tiempo",
      formula: "`facturas_proveedor × minutos_factura × 0,5`",
      esfuerzo: "3-4 semanas",
      etiquetas: ["horas", "errores"],
      palabrasClave: ["facturas", "albaranes", "cuadrar"],
      antes: "Cada factura se revisa a mano contra su albarán.",
      despues: "Solo revisas las que no cuadran.",
      etiquetaTarea: "Cuadrar facturas con albaranes",
      perfil: () => "operativo",
      elegible: (e) => hay(e.n("dia.facturas_proveedor")),
      horasBase: (e) => {
        const m = e.n("dia.minutos_factura");
        return producto(e.n("dia.facturas_proveedor"), m == null ? m : m / 60);
      },
      pct: 0.5,
    },
    {
      id: "ID-QW5",
      tituloBase: "Licitaciones: aviso y resumen del pliego",
      categoria: "captacion",
      tipo: "tiempo",
      formula: "`(A veces: 1 / Habitualmente: 3) × horas_licitacion × 60 min × 0,3`",
      esfuerzo: "2-3 semanas",
      etiquetas: ["clientes", "escalar"],
      palabrasClave: ["licitaciones", "pliegos", "concursos"],
      antes: "Os enteráis tarde de las licitaciones y leer cada pliego lleva horas.",
      despues:
        "Os llega el aviso con un resumen del pliego para decidir en minutos si os presentáis.",
      etiquetaTarea: "Preparar licitaciones",
      perfil: () => "tactico",
      elegible: (e) => (e.s("dia.licitaciones") ?? "No") !== "No",
      horasBase: (e) =>
        producto(LICITACIONES_MES[e.s("dia.licitaciones") ?? ""], e.n("dia.horas_licitacion")),
      pct: 0.3,
    },
  ],
  noAutomatizar: [
    "la confirmación final de pedidos grandes",
    "el precio de un presupuesto a medida",
    "la decisión de presentarse a una licitación",
  ],
  validar: [
    "qué programa de gestión o ERP usáis y si permite conectarse",
    "formato en el que llegan los pedidos",
    "quién revisa antes de confirmar",
  ],
  previoIII: ["dia.pedidos_mes", "dia.estado_trabajos", "dia.facturas_proveedor"],
  activoEnInvitaciones: true,
};
