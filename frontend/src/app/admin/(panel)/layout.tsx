"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api-client";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/products", label: "Produits" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/wilayas", label: "Livraison (wilayas)" },
  { href: "/admin/blocked", label: "Numéros bloqués" },
];

/**
 * Checks the session before showing any admin page. The real protection is on the
 * API (every /api/admin call needs the session); this only avoids showing empty pages.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<{ email: string }>("/api/admin/me")
      .then((me) => setEmail(me.email))
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) router.replace("/admin/login");
        else setFailed(true);
      });
  }, [router]);

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
  }

  if (!email) {
    return (
      <div className="p-10 text-ink-soft" aria-busy={!failed}>
        {failed ? "Le serveur ne répond pas. Vérifiez que l'API tourne, puis rechargez la page." : "Chargement…"}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="w-full bg-ink px-4 py-5 text-line md:w-60">
        <p className="px-2 text-xl font-extrabold text-white">
          DZ<span className="text-accent">Store</span> <span className="text-xs text-[#c9c2b6]">admin</span>
        </p>
        <nav aria-label="Admin" className="mt-5 flex flex-wrap gap-1 md:flex-col">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2.5 text-[15px] font-semibold ${active ? "bg-[#2e3a37] text-white" : "hover:bg-[#2e3a37]"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-[#2e3a37] px-2 pt-4 text-sm">
          <p className="truncate text-[#c9c2b6]">{email}</p>
          <div className="mt-2 flex gap-3">
            <Link href="/" className="underline">
              Voir la boutique
            </Link>
            <button type="button" onClick={logout} className="underline">
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
    </div>
  );
}
