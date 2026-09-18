import { describe, expect, it } from "vitest";
import { claveCual, filtrarRespuestas, primeraPendiente } from "./previo";

describe("Opciones abiertas: hay que decir cuál (decisión de Aitor, 18-sep)", () => {
  const base = {
    "negocio.equipo": "2-5",
    "negocio.rol": "Dirección o propiedad",
    "captacion.canales": ["Teléfono"],
    "captacion.consultas_mes": "10-30",
    "captacion.tiempo_respuesta": "El mismo día",
    "captacion.hace_presupuestos": "No",
    "dia.proceso_repetitivo": "Cuadrar caja",
    "dia.veces_mes": "10-50",
    "dia.minutos_vez": "5-15 min",
    "prioridad.tarea": "Cuadrar caja",
    "prioridad.exito": ["Menos errores"],
  };
  it("«Software de mi sector» sin nombre deja la pregunta pendiente", () => {
    const r = { ...base, "herramientas.lista": ["Excel u hojas de cálculo", "Software de mi sector"] };
    expect(primeraPendiente("otro", r)).toBeGreaterThanOrEqual(0);
    expect(primeraPendiente("otro", { ...r, [claveCual("herramientas.lista", "Software de mi sector")]: "Aranzadi" })).toBe(-1);
  });
  it("«Otro» en el papel también pide cuál", () => {
    const r = { ...base, "negocio.rol": "Otro", "herramientas.lista": ["Excel u hojas de cálculo"] };
    expect(primeraPendiente("otro", r)).toBe(1);
  });
  it("el servidor acepta el cuál de opciones abiertas y rechaza el resto", () => {
    const { aceptadas, rechazadas } = filtrarRespuestas("otro", {
      "herramientas.lista::Un CRM": "HubSpot",
      "herramientas.lista::Excel u hojas de cálculo": "x",
      "herramientas.lista::Un CRM ": "y",
      "captacion.canales::Teléfono": "z",
    });
    expect(aceptadas).toEqual({ "herramientas.lista::Un CRM": "HubSpot" });
    expect(rechazadas).toHaveLength(3);
  });
});
