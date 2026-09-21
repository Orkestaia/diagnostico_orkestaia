import { describe, expect, it } from "vitest";
import { tarjetaNueva } from "@/config/consultor/tarjeta";
import { CAMBIOS_REDACCION, respuestasPorConfirmar, VERSIONES_BANCO } from "@/config/redacciones";
import { industriaDistribucion } from "@/config/sectores/industria_distribucion";
import { CONFIG_VERSION } from "@/config/tipos";
import { avisosPlausibilidad } from "./plausibilidad";
import { loQueHeEntendido } from "./resumenPrevio";
import { sugeridasDelPrevio } from "./visita";

// Icónica Imagen (21-sep): contestó «Menos de 50» a la redacción anterior de dia.pedidos_mes.
const iconica = { "dia.pedidos_mes": "Menos de 50" };

describe("redacciones del banco (banco_v1.1)", () => {
  it("la última versión es la de la app y los cambios apuntan a versiones conocidas", () => {
    expect(VERSIONES_BANCO.at(-1)).toBe(CONFIG_VERSION);
    for (const cambios of Object.values(CAMBIOS_REDACCION))
      for (const c of cambios) expect(VERSIONES_BANCO).toContain(c.desde);
  });

  it("el texto actual de dia.pedidos_mes no es el anterior", () => {
    const p = industriaDistribucion.preguntas.find((x) => x.id === "dia.pedidos_mes")!;
    expect(p.texto).not.toBe(CAMBIOS_REDACCION["dia.pedidos_mes"][0].anterior);
  });

  it("una respuesta de banco_v1 a una pregunta que cambió queda por confirmar", () => {
    const r = respuestasPorConfirmar(iconica, { configVersion: "banco_v1" });
    expect(r.get("dia.pedidos_mes")?.textoContestado).toMatch(/fuera de la tienda online/);
  });

  it("no queda por confirmar si se contestó con la redacción nueva o se corrigió en la visita", () => {
    expect(
      respuestasPorConfirmar(iconica, {
        configVersion: "banco_v1",
        redaccion: { "dia.pedidos_mes": "banco_v1.1" },
      }).size,
    ).toBe(0);
    expect(respuestasPorConfirmar(iconica, { configVersion: "banco_v1.1" }).size).toBe(0);
    expect(
      respuestasPorConfirmar(iconica, {
        configVersion: "banco_v1",
        correcciones: { "dia.pedidos_mes": "50-200" },
      }).size,
    ).toBe(0);
  });

  it("la tarjeta «Entrada de pedidos» se sugiere, pero sin volumen", () => {
    const antes = sugeridasDelPrevio("industria_distribucion", iconica);
    expect(antes.find((t) => t.nombre === "Entrada de pedidos")?.volumen).toBe(25);
    const ahora = sugeridasDelPrevio("industria_distribucion", iconica, ["dia.pedidos_mes"]);
    const t = ahora.find((x) => x.nombre === "Entrada de pedidos")!;
    expect(t.volumen).toBeNull();
    expect(t.origenDatos).toBe("visita");
  });

  it("«lo que he entendido» de la visita no usa la respuesta por confirmar", () => {
    expect(loQueHeEntendido(iconica, "industria_distribucion").join()).toMatch(/pedidos/);
    expect(loQueHeEntendido(iconica, "industria_distribucion", ["dia.pedidos_mes"]).join()).not.toMatch(
      /pedidos/,
    );
  });
});

describe("plausibilidad al cerrar la visita", () => {
  const ctx = { sector: "industria_distribucion" as const, personas: 3, previo: {} };

  it("sin nada raro, sin avisos", () => {
    const t = tarjetaNueva({ id: "a", nombre: "Facturas", area: "Administración", volumen: 40, volumenPeriodo: "mes", minutosPorVez: 10 });
    expect(avisosPlausibilidad([t], ctx)).toEqual([]);
  });

  it("más de 60 minutos: avisa en todas las áreas menos Operación y Dirección", () => {
    const t = tarjetaNueva({ id: "a", nombre: "Facturas", area: "Administración", volumen: 4, volumenPeriodo: "mes", minutosPorVez: 90 });
    for (const area of ["Administración", "Clientes", "Captación", null] as const)
      expect(avisosPlausibilidad([{ ...t, area }], ctx).map((a) => a.tipo), String(area)).toEqual(["minutos"]);
    for (const area of ["Operación", "Dirección"] as const)
      expect(avisosPlausibilidad([{ ...t, area }], ctx), area).toEqual([]);
  });

  it("horas de hoy por encima del tope de la app", () => {
    // 3 personas → tope 105 h/mes. 200 al mes × 45 min = 150 h.
    const t = tarjetaNueva({ id: "a", nombre: "Pedidos", area: "Operación", volumen: 200, volumenPeriodo: "mes", minutosPorVez: 45 });
    expect(avisosPlausibilidad([t], ctx).map((a) => a.tipo)).toEqual(["tope"]);
  });

  it("contradicción con el previo, salvo si la respuesta está por confirmar", () => {
    const t = tarjetaNueva({
      id: "a",
      nombre: "Entrada de pedidos",
      plantilla: "Entrada de pedidos",
      area: "Operación",
      volumen: 300,
      volumenPeriodo: "mes",
      minutosPorVez: 2,
    });
    const conPrevio = { ...ctx, previo: iconica };
    expect(avisosPlausibilidad([t], conPrevio).map((a) => a.tipo)).toEqual(["previo"]);
    expect(avisosPlausibilidad([t], { ...conPrevio, porConfirmar: ["dia.pedidos_mes"] })).toEqual([]);
  });
});
