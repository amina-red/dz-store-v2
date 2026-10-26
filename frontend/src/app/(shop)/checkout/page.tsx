import type { Metadata } from "next";
import { fetchWilayas } from "@/lib/api-server";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const wilayas = await fetchWilayas();
  return <CheckoutForm wilayas={wilayas} />;
}
