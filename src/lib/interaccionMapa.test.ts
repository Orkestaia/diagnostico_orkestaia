import { describe, expect, it } from "vitest";
import colino from "./__fixtures__/mapa-colino.json";
import {
  dispositivoDe,
  mejorasElegibles,
  nuevasPrioridades,
  registrarApertura,
  validarPrioridades,
} from "./interaccionMapa";
import { mapaSchema } from "./mapa";

const mapa = mapaSchema.parse(colino);
const titulos = mejorasElegibles(mapa);

describe("prioridades del cliente", () => {
  it("elige entre las mejoras de la hoja de ruta", () => {
    expect(titulos).toHaveLength(5);
    expect(validarPrioridades(mapa, titulos.slice(0, 3))).toEqual({ ok: true, seleccion: titulos.slice(0, 3) });
    expect(validarPrioridades(mapa, [])).toEqual({ ok: true, seleccion: [] });
  });
  it("como mucho 3, sin inventadas y sin repetir", () => {
    expect(validarPrioridades(mapa, titulos.slice(0, 4)).ok).toBe(false);
    expect(validarPrioridades(mapa, ["Otra cosa"]).ok).toBe(false);
    expect(validarPrioridades(mapa, [titulos[0], titulos[0]])).toEqual({ ok: true, seleccion: [titulos[0]] });
    expect(validarPrioridades(mapa, "x").ok).toBe(false);
  });
  it("se guardan con fecha y cuentan los cambios", () => {
    const a = nuevasPrioridades(null, [titulos[0]], new Date("2026-09-25T10:00:00Z"));
    expect(a).toEqual({ seleccion: [titulos[0]], fecha: "2026-09-25T10:00:00.000Z", cambios: 0 });
    expect(nuevasPrioridades(a, [titulos[1]], new Date("2026-09-26T10:00:00Z")).cambios).toBe(1);
  });
});

describe("aviso de apertura del mapa", () => {
  const t0 = new Date("2026-09-25T10:00:00Z");
  const horas = (h: number) => new Date(t0.getTime() + h * 3600_000);
  const movil = { id: "aaaa", tipo: "movil" as const };

  it("primera apertura: aviso al momento", () => {
    const r = registrarApertura(null, movil, t0);
    expect(r.aviso).toBe("primera");
    expect(r.aperturas.total).toBe(1);
  });

  it("reaperturas: como mucho un aviso al día; otro dispositivo, al momento", () => {
    let a = registrarApertura(null, movil, t0).aperturas;
    let r = registrarApertura(a, movil, horas(2));
    expect(r.aviso).toBeNull();
    a = r.aperturas;
    r = registrarApertura(a, { id: "bbbb", tipo: "escritorio" }, horas(3));
    expect(r.aviso).toBe("otro_dispositivo");
    a = r.aperturas;
    r = registrarApertura(a, movil, horas(20));
    expect(r.aviso).toBeNull();
    r = registrarApertura(r.aperturas, movil, horas(28));
    expect(r.aviso).toBe("reapertura");
    expect(r.aperturas.total).toBe(5);
    expect(r.aperturas.dispositivos.map((d) => d.tipo)).toEqual(["movil", "escritorio"]);
  });

  it("tipo de dispositivo por el navegador, sin guardar el navegador", () => {
    expect(dispositivoDe("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile")).toBe("movil");
    expect(dispositivoDe("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tableta");
    expect(dispositivoDe("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128")).toBe("escritorio");
    expect(dispositivoDe(null)).toBe("escritorio");
  });
});
