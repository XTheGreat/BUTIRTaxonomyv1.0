import { Suspense } from "react";
import LoginForm from "./LoginForm";
import LoginDariUrl from "./LoginDariUrl";

// Dibuat statis (tanpa searchParams di server) agar HTML-nya disajikan dari CDN, bukan dirender
// per permintaan. Pilihan peran dari ?sebagai= dibaca di sisi klien oleh LoginDariUrl.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm awal="guru" />}>
      <LoginDariUrl />
    </Suspense>
  );
}
