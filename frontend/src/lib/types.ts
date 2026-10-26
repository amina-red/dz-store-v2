// The JSON shapes the Symfony API returns. Keep in sync with backend/src/Service/Presenter.php.

export type Locale = "ar" | "fr" | "en";
export type Translated = { ar: string; fr: string; en: string };

export type Category = {
  id: number;
  slug: string;
  name: Translated;
  position: number;
  productCount?: number;
};

export type ProductSummary = {
  id: number;
  slug: string;
  name: Translated;
  price: number;
  basePrice: number;
  salePrice: number | null;
  image: string | null;
  category: Category;
  inStock: boolean;
  colors: string[];
  sizes: string[];
  isActive: boolean;
  totalStock?: number;
};

export type Variant = {
  id: number;
  color: string;
  size: string;
  label: string;
  sku: string | null;
  stock: number;
  price: number;
  priceOverride: number | null;
};

export type Product = ProductSummary & {
  description: Translated;
  images: string[];
  variants: Variant[];
};

export type Paginated<T> = {
  items: T[];
  page: number;
  perPage?: number;
  total: number;
  pages: number;
};

export type Wilaya = {
  code: number;
  name: { ar: string; fr: string };
  homeFee: number;
  deskFee: number | null;
  isActive: boolean;
};

export type DeliveryType = "home" | "desk";

export type QuoteLine = {
  variantId: number;
  quantity: number;
  problem: null | "out_of_stock" | "not_enough_stock" | "unavailable";
  productId?: number;
  slug?: string;
  name?: Translated;
  variantLabel?: string;
  image?: string | null;
  unitPrice?: number;
  lineTotal?: number;
  stock?: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  deliveryFee: number | null;
  total: number | null;
  freeDeliveryFrom: number;
  ok: boolean;
};

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled";

export type OrderItem = {
  productName: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  productSlug: string | null;
  image: string | null;
};

export type TrackedOrder = {
  number: string;
  status: OrderStatus;
  createdAt: string;
  deliveryType: DeliveryType;
  wilaya: { ar: string; fr: string };
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
  history: { status: OrderStatus; at: string }[];
};

export type AdminOrderRow = {
  id: number;
  number: string;
  customerName: string;
  phone: string;
  wilaya: { code: number; name: string };
  deliveryType: DeliveryType;
  total: number;
  status: OrderStatus;
  itemCount: number;
  pastRefusals: number;
  createdAt: string;
};

export type AdminOrder = AdminOrderRow & {
  commune: string;
  address: string;
  note: string | null;
  subtotal: number;
  deliveryFee: number;
  locale: Locale;
  nextStatuses: OrderStatus[];
  items: OrderItem[];
  history: { from: OrderStatus | null; to: OrderStatus; note: string | null; by: string; at: string }[];
};

export type Stats = {
  ordersToday: number;
  waitingForCall: number;
  toShip: number;
  last30Days: { delivered: number; returned: number; revenue: number; returnRate: number | null };
  lowStockVariants: number;
  topWilayas: { code: number; name: string; orders: number }[];
};

export type ApiErrorBody = { error: string; fields?: Record<string, string> };
