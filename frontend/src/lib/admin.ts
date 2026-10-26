import type { OrderStatus } from "./types";

/** The admin is in French for now (see "Later" in the project file for an Arabic admin). */
export const STATUS: Record<OrderStatus, { label: string; action: string; badge: string }> = {
  new: { label: "Nouvelle", action: "Remettre en nouvelle", badge: "bg-warn-tint text-warn" },
  confirmed: { label: "Confirmée", action: "Confirmer", badge: "bg-info-tint text-info" },
  shipped: { label: "Expédiée", action: "Marquer expédiée", badge: "bg-brand-tint text-brand" },
  delivered: { label: "Livrée", action: "Marquer livrée", badge: "bg-ok-tint text-ok" },
  returned: { label: "Retournée", action: "Retour (refusée)", badge: "bg-bad-tint text-bad" },
  cancelled: { label: "Annulée", action: "Annuler", badge: "bg-[#f1f3f7] text-[#3d4a60]" },
};

export const STATUS_ORDER: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "returned", "cancelled"];

export function adminMoney(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} DA`;
}

export function adminDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-DZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Algiers",
  }).format(new Date(iso));
}
