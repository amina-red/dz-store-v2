import Link from "next/link";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export default async function NotFound() {
  const t = translator(await getLocale());
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-brand">404</p>
      <p className="mt-4 text-lg">{t("notFound")}</p>
      <Link href="/" className="btn-primary mt-8">
        {t("backHome")}
      </Link>
    </div>
  );
}
