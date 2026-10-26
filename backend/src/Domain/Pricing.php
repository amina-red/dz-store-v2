<?php

namespace App\Domain;

/**
 * Every price rule of the shop, in one place. All amounts are whole dinars (DA).
 *
 * The server always recomputes prices with these rules. A price sent by the browser
 * is never trusted.
 */
final class Pricing
{
    /** A variant's own price wins, then the product's sale price, then its normal price. */
    public static function unitPrice(int $basePrice, ?int $salePrice, ?int $variantPrice): int
    {
        return $variantPrice ?? $salePrice ?? $basePrice;
    }

    /** Delivery is free once the subtotal reaches $freeFrom. $freeFrom = 0 means never free. */
    public static function deliveryFee(int $subtotal, int $wilayaFee, int $freeFrom): int
    {
        if ($freeFrom > 0 && $subtotal >= $freeFrom) {
            return 0;
        }

        return $wilayaFee;
    }

    /** A sale price must be positive and lower than the normal price. */
    public static function isValidSalePrice(int $basePrice, ?int $salePrice): bool
    {
        return $salePrice === null || ($salePrice > 0 && $salePrice < $basePrice);
    }
}
