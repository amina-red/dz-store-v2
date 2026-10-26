"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api("/api/admin/login", { body: { email, password } });
      router.replace("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Trop de tentatives. Réessayez dans 15 minutes."
          : err instanceof ApiError && err.status === 401
            ? "Email ou mot de passe incorrect."
            : "Connexion impossible. Réessayez.",
      );
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-7">
        <p className="text-2xl font-extrabold text-brand">
          DZ<span className="text-accent">Store</span> <span className="text-sm text-ink-soft">admin</span>
        </p>
        <h1 className="text-xl font-extrabold">Connexion</h1>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-bad-tint p-3 text-sm font-semibold text-bad">
            {error}
          </p>
        )}
        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
