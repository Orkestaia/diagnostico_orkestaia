import { SignOutButton } from "@clerk/nextjs";
import { esAdmin } from "@/lib/acceso";

export const dynamic = "force-dynamic";

/**
 * Todo /admin: sesión de Clerk (middleware) + email de Aitor (aquí). La cabecera del panel va en
 * (gestion)/layout.tsx: la visita, que se pone delante del cliente, no la lleva.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await esAdmin())) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ork-text">Esta cuenta no tiene acceso al panel.</p>
        <SignOutButton>
          <button className="rounded-lg border border-ork-border-hi px-4 py-2 text-ork-text">Salir</button>
        </SignOutButton>
      </main>
    );
  }

  return <>{children}</>;
}
