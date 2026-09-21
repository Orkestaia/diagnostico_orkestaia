/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { consentimientoActivo } from "@/config/consentimiento";
import { CasillaConsentimiento } from "./CasillaConsentimiento";

afterEach(() => {
  cleanup();
  delete process.env.CONSENTIMIENTO_AGREGADO_ACTIVO;
});

describe("consentimiento agregado", () => {
  it("apagado por defecto; solo se enciende con el interruptor a 1", () => {
    expect(consentimientoActivo()).toBe(false);
    process.env.CONSENTIMIENTO_AGREGADO_ACTIVO = "1";
    expect(consentimientoActivo()).toBe(true);
  });

  it("marcar y desmarcar guarda al momento; si falla, vuelve atrás", async () => {
    const enviados: unknown[] = [];
    let falla = false;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      enviados.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: falla ? 500 : 200 });
    }) as typeof fetch;
    render(<CasillaConsentimiento url="/api/d/A4fIy5X2jiYKIMEH7ITWb/consentimiento" inicial={null} />);
    const casilla = screen.getByRole("checkbox") as HTMLInputElement;
    expect(casilla.checked).toBe(false);

    await act(async () => casilla.click());
    expect(casilla.checked).toBe(true);
    await act(async () => casilla.click()); // retirarlo
    expect(enviados).toEqual([{ acepta: true }, { acepta: false }]);

    falla = true;
    await act(async () => casilla.click());
    expect(casilla.checked).toBe(false);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
