import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { dark } from "@clerk/ui/themes";

/**
 * Clerk solo se carga en el panel y en el login. El previo y el mapa del cliente no lo
 * necesitan y así no descargan ni un byte de Clerk (spec §2: LCP < 2,5 s en móvil).
 *
 * v7: la clave es `theme` (antes `baseTheme`) y el tema viene de `@clerk/ui/themes`. Se parte
 * del tema oscuro oficial y solo se ajustan los colores de marca (misma solución que Mission
 * Control: tocar variables sueltas sobre el tema claro deja inputs blancos).
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={esES}
      appearance={{
        theme: dark,
        variables: {
          colorBackground: "#121212",
          colorPrimary: "#00b4d8",
          borderRadius: "0.6rem",
        },
        elements: { card: "border border-white/10" },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
