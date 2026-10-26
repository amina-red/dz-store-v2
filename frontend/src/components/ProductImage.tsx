/* eslint-disable @next/next/no-img-element */

/**
 * A product photo, or a calm placeholder when the product has none yet.
 * Plain <img> on purpose: photos come from the API (/uploads/...) or any https host
 * the shop owner pastes, so next/image would need every host configured.
 */
export function ProductImage({ src, alt, eager = false }: { src: string | null; alt: string; eager?: boolean }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-line-strong" role="img" aria-label={alt}>
        <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className="h-full w-full object-cover"
    />
  );
}
