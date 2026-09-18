import { SignIn } from "@clerk/nextjs";

export default function PaginaSignIn() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <SignIn />
    </main>
  );
}
