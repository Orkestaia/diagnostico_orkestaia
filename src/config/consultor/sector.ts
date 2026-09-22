/**
 * Batería del consultor v2 §5 — profundización por sector. Transcrito sin cambios.
 * Son preguntas de nivel P que se añaden al bloque indicado según el sector del diagnóstico,
 * más las opciones de `cumpl.sector` (bloque G).
 */
import type { SectorId } from "../tipos";
import type { CampoVisita } from "./bloques";

export const PREGUNTAS_SECTOR: Record<SectorId, CampoVisita[]> = {
  servicios_profesionales: [
    {
      id: "sp.reparto",
      bloque: "A",
      texto: "¿Qué tipos de encargo tenéis y cuánto pesa cada uno?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "sp.horas_facturables",
      bloque: "C",
      texto:
        "¿Qué parte del tiempo de los profesionales se puede facturar y cuál se va en gestión?",
      tipo: "chips",
      privado: false,
      nivel: "P",
      opcional: true,
      opciones: ["< 50 %", "50-70 %", "> 70 %", "No lo sé"],
    },
    {
      id: "sp.plantillas",
      bloque: "D",
      texto: "¿Tenéis plantillas de documentos? ¿Dónde están y quién las actualiza?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "sp.conocimiento",
      bloque: "D",
      texto: "Si se va la persona más veterana, ¿qué conocimiento se pierde?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "sp.secreto",
      bloque: "G",
      texto: "¿Qué información no puede salir del despacho bajo ningún concepto?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
  ],
  hosteleria_eventos: [
    {
      id: "he.peso_eventos",
      bloque: "A",
      texto: "¿Cuánto pesan los eventos frente a la carta? ¿Y la temporada alta?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "he.rotacion",
      bloque: "F",
      texto: "¿Cuánta rotación hay en sala y cocina? ¿Cuánto se tarda en formar a alguien nuevo?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "he.proveedores",
      bloque: "D",
      texto: "¿Cómo se hacen los pedidos a proveedores y se controla el stock?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "he.reservas_datos",
      bloque: "D",
      texto: "¿Guardáis quién viene, cuándo y qué celebra?",
      tipo: "chips",
      privado: false,
      nivel: "P",
      opcional: true,
      opciones: ["No", "En la plataforma de reservas", "En nuestra propia base"],
    },
  ],
  industria_distribucion: [
    {
      id: "id.canales_venta",
      mismoQuePrevio: "captacion.canales",
      bloque: "A",
      texto: "¿Qué canales de venta tenéis y cuánto pesa cada uno?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "id.proyecto_en_marcha",
      bloque: "A",
      texto: "¿Tenéis ya un proyecto de digitalización o IA con otro proveedor? ¿Qué cubre?",
      tipo: "texto",
      privado: true,
      nivel: "P",
      opcional: true,
    },
    {
      id: "id.erp",
      bloque: "E",
      texto: "¿Qué programa de gestión o ERP usáis? ¿Se puede sacar la información de él?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "id.trazabilidad",
      bloque: "D",
      texto: "¿Podéis saber de qué lote o proveedor viene cada cosa?",
      tipo: "si_no_nose",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "id.planta",
      bloque: "F",
      texto: "¿El personal de taller o de ruta usa ordenador o móvil para trabajar?",
      tipo: "chips",
      privado: false,
      nivel: "P",
      opcional: true,
      opciones: ["No", "Algunos", "Todos"],
    },
  ],
  salud: [
    {
      id: "sa.programa_clinico",
      bloque: "E",
      texto: "¿Qué programa de gestión clínica usáis? ¿Permite enviar recordatorios o sacar datos?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "sa.gabinetes",
      bloque: "A",
      texto: "¿Cuántos profesionales y gabinetes tenéis? ¿Qué agenda está más saturada?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
    {
      id: "sa.datos_clinicos",
      bloque: "G",
      texto: "¿Dónde se guardan historias clínicas y consentimientos? ¿Quién accede?",
      tipo: "texto",
      privado: false,
      nivel: "P",
      opcional: true,
    },
  ],
  otro: [],
};

/** Opciones de `cumpl.sector` (§5). Siempre con "Otra" al final. */
export const NORMAS_SECTOR: Record<SectorId, string[]> = {
  servicios_profesionales: [
    "Secreto profesional",
    "Prevención de blanqueo",
    "Normas del colegio profesional",
  ],
  hosteleria_eventos: [
    "Información de alérgenos",
    "APPCC y seguridad alimentaria",
    "Registro de horario",
  ],
  industria_distribucion: [
    "Calidad (ISO)",
    "Prevención de riesgos y coordinación de empresas",
    "Trazabilidad",
    "Marcado CE",
  ],
  salud: ["Historia clínica", "Consentimiento informado", "Publicidad sanitaria"],
  otro: [],
};

/**
 * En `salud` nada clínico entra en la app: solo cómo funciona la clínica (§5). El aviso del
 * sector ya se enseña al cliente en el previo (`avisoFijo` del banco).
 */
export const SIN_DATOS_CLINICOS: SectorId = "salud";

/** Todos los campos de la visita para un sector: los comunes más los de §5, con `cumpl.sector`. */
export function camposDeSector(campos: CampoVisita[], sector: SectorId): CampoVisita[] {
  const normas = NORMAS_SECTOR[sector];
  return [
    ...campos.map((c) =>
      c.id === "cumpl.sector"
        ? { ...c, opciones: normas.length ? [...normas, "Otra"] : ["Otra"] }
        : c,
    ),
    ...PREGUNTAS_SECTOR[sector],
  ];
}
