"use client";

import { useSearchParams } from "next/navigation";
import LoginForm from "./LoginForm";

export default function LoginDariUrl() {
  const sebagai = useSearchParams().get("sebagai");
  return <LoginForm awal={sebagai === "siswa" ? "siswa" : "guru"} />;
}
