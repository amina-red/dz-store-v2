import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin DZ Store" },
  robots: { index: false, follow: false },
};

/** The admin is always French, left to right, whatever language the shop is shown in. */
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <div lang="fr" dir="ltr" className="min-h-screen bg-[#f4f2ee] [font-family:var(--font-jakarta),system-ui,sans-serif]">
      {children}
    </div>
  );
}
