import { describe, expect, it } from "vitest";
import { tarjetaNueva } from "@/config/consultor/tarjeta";
import { CAMPOS_VISITA } from "@/config/consultor/bloques";
import { conRegistroHoy, costeHora, sugeridasDelPrevio, sumarDiasHabiles, unirParches, validarParche, valorCampo } from "./visita";

describe("campos que pasaron de una opción a varias (22-sep)", () => {
  const campo = (id: string) => CAMPOS_VISITA.find((c) => c.id === id)!;
  it("d.info_clientes admite varias y e.exito como mucho 2", () => {
    expect(campo("d.info_clientes").tipo).toBe("multi");
    expect(campo("e.exito").tipo).toBe("multi");
    expect(campo("e.exito").max).toBe(2);
  });
  it("lo guardado como texto se lee como lista de un elemento, sin tocar el dato", () => {
    const c = campo("d.info_clientes");
    expect(valorCampo(c, "Excel u hojas de cálculo")).toEqual(["Excel u hojas de cálculo"]);
    expect(valorCampo(c, ["CRM", "Excel u hojas de cálculo"])).toEqual(["CRM", "Excel u hojas de cálculo"]);
    expect(valorCampo(c, null)).toEqual([]);
    expect(valorCampo({ tipo: "chips" }, "Un proveedor")).toBe("Un proveedor");
  });
});

describe("Privado nunca por la parte visible", () => {
  it("rechaza un campo 🔒 en campos visibles y uno visible en privado", () => {
    const { ok, rechazados } = validarParche("servicios_profesionales", {
      campos: { "a.historia": "Empezamos en 2010", "e.inversion": "> 10.000 €" },
      privado_campos: { "e.inversion": "> 10.000 €", "a.historia": "x" },
    });
    expect(ok.campos).toEqual({ "a.historia": "Empezamos en 2010" });
    expect(ok.privado_campos).toEqual({ "e.inversion": "> 10.000 €" });
    expect(rechazados.sort()).toEqual(["e.inversion", "privado:a.historia"]);
  });
  it("las preguntas 🔒 del sector (batería v2 §5) van a privado", () => {
    const clave = "id.proyecto_en_marcha";
    const r = validarParche("industria_distribucion", { campos: { [clave]: "no" }, privado_campos: { [clave]: "no" } });
    expect(r.ok.campos).toEqual({});
    expect(r.ok.privado_campos).toEqual({ [clave]: "no" });
  });
  it("una pregunta de otro sector no entra", () => {
    const r = validarParche("hosteleria_eventos", { campos: { "sp.reparto": "x", "he.peso_eventos": "eventos 60 %" } });
    expect(r.ok.campos).toEqual({ "he.peso_eventos": "eventos 60 %" });
    expect(r.rechazados).toEqual(["sp.reparto"]);
  });
  it("las notas privadas de Aitor (x.notas) no pueden ir por lo visible", () => {
    const r = validarParche("otro", { campos: { "x.notas": "ojo" }, privado_campos: { "x.notas": "ojo" } });
    expect(r.ok.campos).toEqual({});
    expect(r.ok.privado_campos).toEqual({ "x.notas": "ojo" });
  });
  it("sanea tarjetas: pct privado ≤ 0,7 y textos recortados", () => {
    const r = validarParche("otro", {
      procesos: [tarjetaNueva({ id: "t1", nombre: "x".repeat(200) })],
      privado_procesos: { t1: { pctAutomatizable: 0.95 } },
    });
    expect(r.ok.procesos![0].nombre).toHaveLength(60);
    expect(r.ok.privado_procesos!.t1.pctAutomatizable).toBe(0.7);
  });
});

describe("Cola: unir parches", () => {
  it("el más nuevo gana campo a campo y las tarjetas se sustituyen enteras", () => {
    const u = unirParches(
      { campos: { "a.historia": "1", "c.picos": "a" }, procesos: [tarjetaNueva({ id: "a" })], privado_procesos: { a: { nota: "n" } } },
      { campos: { "a.historia": "2" }, privado_procesos: { a: { ideaSolucion: "i" } } },
    );
    expect(u.campos).toEqual({ "a.historia": "2", "c.picos": "a" });
    expect(u.procesos).toHaveLength(1);
    expect(u.privado_procesos).toEqual({ a: { nota: "n", ideaSolucion: "i" } });
  });
});

describe("Tarjetas con datos del previo (banco §9)", () => {
  it("servicios profesionales: documentación con volumen y minutos, estado con volumen semanal", () => {
    const s = sugeridasDelPrevio("servicios_profesionales", {
      "captacion.consultas_mes": "10-30",
      "dia.expedientes_mes": "5-15",
      "dia.minutos_documentacion": "1-3 h",
      "dia.llamadas_estado": "5-15",
    });
    const doc = s.find((t) => t.nombre === "Recogida de documentación")!;
    expect(doc).toMatchObject({ volumen: 10, volumenPeriodo: "mes", minutosPorVez: 120, origenDatos: "previo", area: "Operación" });
    const est = s.find((t) => t.nombre === "Estado del asunto y comunicación con el cliente")!;
    expect(est).toMatchObject({ volumen: 10, volumenPeriodo: "semana", minutosPorVez: null });
    expect(s.find((t) => t.nombre === "Primera respuesta a una consulta nueva")!.volumen).toBe(20);
  });
  it("«No lo sé» no sugiere tarjeta", () => {
    expect(sugeridasDelPrevio("industria_distribucion", { "dia.pedidos_mes": "No lo sé" })).toEqual([]);
  });
  it("otro: tarjeta en blanco con el nombre de la tarea", () => {
    const s = sugeridasDelPrevio("otro", { "dia.proceso_repetitivo": "Cuadrar caja", "dia.veces_mes": "10-50", "dia.minutos_vez": "5-15 min" });
    expect(s[0]).toMatchObject({ nombre: "Cuadrar caja", volumen: 30, minutosPorVez: 10 });
  });
});

describe("Cierre", () => {
  it("+5 días hábiles saltando el fin de semana", () => {
    expect(sumarDiasHabiles("2026-09-18")).toBe("2026-09-25"); // viernes → viernes
    expect(sumarDiasHabiles("2026-09-21")).toBe("2026-09-28"); // lunes → lunes
  });
  it("registro fijo de las horas de hoy, con origen, y no se reescribe", () => {
    const t = [
      tarjetaNueva({ id: "a", volumen: 10, minutosPorVez: 30, origenDatos: "previo" }),
      tarjetaNueva({ id: "b", volumen: 2, volumenPeriodo: "semana", minutosPorVez: 60 }),
      tarjetaNueva({ id: "c" }),
    ];
    const r = conRegistroHoy(t, "otro", "2026-09-19");
    expect(r[0].hoyRegistro).toEqual({ horasMes: 5, fecha: "2026-09-19", origen: "previo" });
    expect(r[1].hoyRegistro).toEqual({ horasMes: 8.6, fecha: "2026-09-19", origen: "visita" });
    expect(r[2].hoyRegistro).toBeNull();
    const otra = conRegistroHoy([{ ...r[0], volumen: 99 }], "otro", "2026-10-01");
    expect(otra[0].hoyRegistro).toEqual(r[0].hoyRegistro);
  });
  it("coste por hora: exige los tres valores y el origen", () => {
    expect(costeHora({ "c.coste_perfil": { operativo: 16, tactico: 28, directivo: 45, origen: "cliente" } })).toEqual({
      operativo: 16, tactico: 28, directivo: 45, origen: "cliente",
    });
    expect(costeHora({ "c.coste_perfil": { operativo: 16, tactico: 28, directivo: 45 } })).toBeNull();
    expect(costeHora({})).toBeNull();
  });
});
