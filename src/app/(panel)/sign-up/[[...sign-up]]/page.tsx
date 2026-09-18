import { SignUp } from "@clerk/nextjs";

export default function PaginaSignUp() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <SignUp />
    </main>
  );
}
