<?php

namespace App\Service;

use App\Domain\DeliveryType;
use App\Domain\Pricing;
use App\Entity\ProductVariant;
use App\Entity\Wilaya;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Prices a cart with the server's own data. Used twice:
 *  - POST /api/orders/quote, so the checkout page shows the real total before ordering;
 *  - POST /api/orders, inside the transaction, with the variant rows locked.
 */
final class CartQuoter
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly int $freeDeliveryFrom,
    ) {
    }

    /**
     * Loads the variants of a cart. With $lock, the rows stay locked until the
     * transaction ends, so two buyers cannot take the same last piece.
     *
     * @param array<int, int> $lines variant id => quantity, sorted by id
     *
     * @return array<int, ProductVariant> by id
     */
    public function loadVariants(array $lines, bool $lock): array
    {
        $query = $this->em->createQuery(
            'SELECT v, p FROM App\Entity\ProductVariant v JOIN v.product p WHERE v.id IN (:ids) ORDER BY v.id'
        )->setParameter('ids', array_keys($lines));

        if ($lock) {
            $query->setLockMode(LockMode::PESSIMISTIC_WRITE);
        }

        $byId = [];
        foreach ($query->getResult() as $variant) {
            $byId[$variant->getId()] = $variant;
        }

        return $byId;
    }

    /**
     * @param array<int, int>               $lines    variant id => quantity
     * @param array<int, ProductVariant>    $variants by id
     *
     * @return array{lines: list<array<string, mixed>>, subtotal: int, deliveryFee: ?int, total: ?int, freeDeliveryFrom: int, ok: bool}
     */
    public function quote(array $lines, array $variants, ?Wilaya $wilaya, ?DeliveryType $deliveryType): array
    {
        $out = [];
        $subtotal = 0;
        $ok = true;

        foreach ($lines as $variantId => $quantity) {
            $variant = $variants[$variantId] ?? null;

            if ($variant === null || !$variant->getProduct()->isActive()) {
                $out[] = ['variantId' => $variantId, 'quantity' => $quantity, 'problem' => 'unavailable'];
                $ok = false;
                continue;
            }

            $product = $variant->getProduct();
            $unitPrice = $variant->getUnitPrice();
            $problem = null;
            if ($variant->getStock() === 0) {
                $problem = 'out_of_stock';
            } elseif ($variant->getStock() < $quantity) {
                $problem = 'not_enough_stock';
            }
            $ok = $ok && $problem === null;
            $subtotal += $unitPrice * $quantity;

            $out[] = [
                'variantId' => $variantId,
                'productId' => $product->getId(),
                'slug' => $product->getSlug(),
                'name' => $product->getNames(),
                'variantLabel' => $variant->getLabel(),
                'image' => $product->getImages()[0] ?? null,
                'unitPrice' => $unitPrice,
                'quantity' => $quantity,
                'lineTotal' => $unitPrice * $quantity,
                'stock' => $variant->getStock(),
                'problem' => $problem,
            ];
        }

        $deliveryFee = null;
        if ($wilaya !== null && $deliveryType !== null) {
            $wilayaFee = $wilaya->feeFor($deliveryType);
            if ($wilayaFee === null) {
                $ok = false;
            } else {
                $deliveryFee = Pricing::deliveryFee($subtotal, $wilayaFee, $this->freeDeliveryFrom);
            }
        }

        return [
            'lines' => $out,
            'subtotal' => $subtotal,
            'deliveryFee' => $deliveryFee,
            'total' => $deliveryFee === null ? null : $subtotal + $deliveryFee,
            'freeDeliveryFrom' => $this->freeDeliveryFrom,
            'ok' => $ok,
        ];
    }

    public function freeDeliveryFrom(): int
    {
        return $this->freeDeliveryFrom;
    }
}
