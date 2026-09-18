import { describe, expect, it } from "vitest";
import { bienvenida, loQueHeEntendido, prosa, resumenFinal, tituloFinal, unir } from "./resumenPrevio";

describe("prosa y unir", () => {
  it("convierte rangos en texto", () => {
    expect(prosa("15-60 min")).toBe("entre 15 y 60 minutos");
    expect(prosa("1-3 h")).toBe("entre 1 y 3 horas");
    expect(prosa("Más de 3 h")).toBe("más de 3 horas");
    expect(prosa("Menos de 10")).toBe("menos de 10");
    expect(prosa("6-15")).toBe("entre 6 y 15");
    expect(prosa("Casi nada")).toBe("casi nada");
  });
  it("une listas", () => {
    expect(unir(["a"])).toBe("a");
    expect(unir(["a", "b", "c"])).toBe("a, b y c");
  });
});

describe("Lo que he entendido", () => {
  const r = {
    "negocio.equipo": "6-15",
    "negocio.rol": "Dirección o propiedad",
    "captacion.canales": ["Recomendación", "Web o formulario", "WhatsApp", "Email"],
    "captacion.consultas_mes": "30-100",
    "captacion.tiempo_respuesta": "El mismo día",
    "captacion.hace_presupuestos": "Sí",
    "captacion.presupuestos_mes": "5-15",
    "dia.expedientes_mes": "5-15",
    "dia.minutos_documentacion": "1-3 h",
    "dia.llamadas_estado": "15-30",
    "herramientas.lista": ["Excel u hojas de cálculo", "Google Workspace", "Programa de facturación"],
    "prioridad.tarea": "Perseguir papeles a los herederos",
  };

  it("servicios profesionales, las 5 frases", () => {
    expect(loQueHeEntendido(r, "servicios_profesionales")).toEqual([
      "Sois entre 6 y 15 personas y tú diriges el negocio.",
      "Los clientes os llegan sobre todo por recomendación, la web y WhatsApp. Recibís entre 30 y 100 consultas nuevas al mes y soléis contestar el mismo día. Hacéis entre 5 y 15 presupuestos al mes.",
      "Abrís entre 5 y 15 expedientes al mes, perseguir la documentación de cada uno lleva entre 1 y 3 horas y os preguntan «¿cómo va lo mío?» entre 15 y 30 veces a la semana.",
      "En el día a día usáis Excel, Google Workspace y un programa de facturación.",
      "Si pudieras quitarte una tarea de encima, sería: «Perseguir papeles a los herederos».",
    ]);
  });

  it("«Solo yo» y «No lo sé» no inventan nada", () => {
    const f = loQueHeEntendido(
      { "negocio.equipo": "Solo yo", "negocio.rol": "Dirección o propiedad", "captacion.consultas_mes": "No lo sé", "captacion.tiempo_respuesta": "1-2 días" },
      "otro",
    );
    expect(f).toEqual(["Trabajas por tu cuenta.", "Soléis contestar las consultas nuevas en uno o dos días."]);
  });

  it("hostelería", () => {
    const f = loQueHeEntendido(
      { "dia.solicitudes_evento": "1-5", "dia.llamadas_perdidas": "Algunas", "dia.resenas": "Cuando se puede" },
      "hosteleria_eventos",
    );
    expect(f).toEqual([
      "Recibís entre 1 y 5 peticiones de eventos al mes, en pleno servicio se quedan algunas llamadas sin coger y las reseñas se contestan cuando se puede.",
    ]);
  });

  it("industria", () => {
    const f = loQueHeEntendido(
      { "dia.pedidos_mes": "50-200", "dia.estado_trabajos": "Preguntando", "dia.facturas_proveedor": "30-100" },
      "industria_distribucion",
    );
    expect(f[0]).toBe(
      "Entran entre 50 y 200 pedidos al mes fuera de la tienda online, sabéis cómo va cada trabajo preguntando y recibís entre 30 y 100 facturas de proveedor al mes.",
    );
  });

  it("otro", () => {
    const f = loQueHeEntendido(
      { "dia.proceso_repetitivo": "Cuadrar la caja", "dia.veces_mes": "10-50", "dia.minutos_vez": "15-60 min" },
      "otro",
    );
    expect(f[0]).toBe("La tarea que más se repite es «Cuadrar la caja»: entre 10 y 50 veces al mes y entre 15 y 60 minutos cada vez.");
  });
});

describe("Títulos y resumen", () => {
  it("título con y sin fecha", () => {
    expect(tituloFinal("Pedro", "2026-09-21")).toBe("Gracias, Pedro. Con esto el lunes 21 vamos directos a lo importante.");
    expect(tituloFinal("Pedro", null)).toBe("Gracias, Pedro. Con esto, cuando nos veamos, vamos directos a lo importante.");
  });
  it("bienvenida con y sin fecha", () => {
    expect(bienvenida("Pedro", "2026-09-21")).toBe(
      "Hola, Pedro. Antes de vernos el lunes 21, cuéntame cómo trabajáis. Así el día del diagnóstico empezamos por lo importante.",
    );
    expect(bienvenida("Pedro", null)).toBe(
      "Hola, Pedro. Antes de vernos, cuéntame cómo trabajáis. Así el día del diagnóstico empezamos por lo importante.",
    );
  });
  it("el texto del motor sustituye a las plantillas", () => {
    const r = { "dia.plazos": "Excel" };
    expect(resumenFinal(r, "servicios_profesionales", null).delMotor).toBe(false);
    const m = resumenFinal(r, "servicios_profesionales", { resumen_entendido: ["x"], temas_reunion: ["y"] });
    expect(m).toEqual({ entendido: ["x"], temas: ["y"], delMotor: true });
  });
});
