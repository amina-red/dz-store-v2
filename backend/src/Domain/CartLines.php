<?php

namespace App\Domain;

/**
 * Reads the "items" the browser sends: [{"variantId": 12, "quantity": 2}, ...].
 *
 * Lines for the same variant are merged. The result maps variant id => quantity,
 * sorted by id (locking rows in id order avoids deadlocks between two orders).
 */
final class CartLines
{
    public const MAX_LINES = 20;
    public const MAX_QUANTITY = 10;

    /**
     * @param mixed $items the decoded JSON value
     *
     * @return array<int, int>
     *
     * @throws \InvalidArgumentException with a message that can be shown to the buyer
     */
    public static function parse(mixed $items): array
    {
        if (!is_array($items) || !array_is_list($items)) {
            throw new \InvalidArgumentException('Items must be a list.');
        }

        $lines = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                throw new \InvalidArgumentException('Each item needs a variantId and a quantity.');
            }

            $variantId = $item['variantId'] ?? null;
            $quantity = $item['quantity'] ?? null;

            if (!is_int($variantId) || $variantId <= 0 || !is_int($quantity) || $quantity <= 0) {
                throw new \InvalidArgumentException('Each item needs a variantId and a quantity.');
            }

            $lines[$variantId] = ($lines[$variantId] ?? 0) + $quantity;
        }

        if ($lines === []) {
            throw new \InvalidArgumentException('The cart is empty.');
        }

        if (count($lines) > self::MAX_LINES) {
            throw new \InvalidArgumentException(sprintf('At most %d different products per order.', self::MAX_LINES));
        }

        foreach ($lines as $quantity) {
            if ($quantity > self::MAX_QUANTITY) {
                throw new \InvalidArgumentException(sprintf('At most %d pieces of one product per order.', self::MAX_QUANTITY));
            }
        }

        ksort($lines);

        return $lines;
    }
}
