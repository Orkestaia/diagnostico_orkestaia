import { describe, expect, it } from "vitest";
import { diaReunion, enlaceWhatsApp, fechaLarga, mensajeInvitacion, telefonoWhatsApp } from "./invitacion";

describe("Mensaje de invitación (spec §3)", () => {
  it("[día] en formato «lunes 21»", () => {
    expect(diaReunion("2026-09-21")).toBe("lunes 21");
    expect(diaReunion("2026-11-01")).toBe("domingo 1");
    expect(fechaLarga("2026-09-21")).toBe("lunes 21 de septiembre");
  });
  it("con fecha: texto literal de la spec", () => {
    expect(
      mensajeInvitacion({ nombre: "Pedro", empresa: "Elustondo Abogados", enlace: "https://x/d/abc", fechaReunion: "2026-09-21" }),
    ).toBe(
      "Hola Pedro, soy Aitor, de Orkesta. Para aprovechar al máximo el diagnóstico del lunes 21 en Elustondo Abogados, te dejo unas preguntas rápidas: son 5 minutos y se hacen desde el móvil. Así ese día empezamos directamente por lo importante.\n\nhttps://x/d/abc\n\nSi te quedas a medias, el enlace guarda lo que lleves. Nos vemos el lunes 21.",
    );
  });
  it("sin fecha: texto literal de la spec", () => {
    expect(mensajeInvitacion({ nombre: "Pedro", empresa: "Elustondo Abogados", enlace: "https://x/d/abc", fechaReunion: null })).toBe(
      "Hola Pedro, soy Aitor, de Orkesta. Antes de vernos, te dejo unas preguntas rápidas sobre cómo trabajáis en Elustondo Abogados: son 5 minutos y se hacen desde el móvil.\n\nhttps://x/d/abc\n\nSi te quedas a medias, el enlace guarda lo que lleves.",
    );
  });
});

describe("Teléfono para wa.me", () => {
  it("normaliza y añade 34 a los españoles de 9 cifras", () => {
    expect(telefonoWhatsApp("943 12 34 56")).toBe("34943123456");
    expect(telefonoWhatsApp("+34 600-111-222")).toBe("34600111222");
    expect(telefonoWhatsApp("0033612345678")).toBe("33612345678");
    expect(telefonoWhatsApp("123")).toBeNull();
    expect(telefonoWhatsApp(null)).toBeNull();
  });
  it("enlace con el mensaje codificado", () => {
    expect(enlaceWhatsApp("600111222", "Hola, ¿qué tal?")).toBe("https://wa.me/34600111222?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F");
    expect(enlaceWhatsApp("", "x")).toBeNull();
  });
});
