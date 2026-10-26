<?php

namespace App\Service;

use App\Domain\Phone;
use App\Entity\Category;
use App\Entity\Order;
use App\Entity\OrderStatusChange;
use App\Entity\Product;
use App\Entity\ProductVariant;
use App\Entity\Wilaya;

/**
 * Turns entities into the JSON the frontend receives. Keeping it in one class makes
 * the API shape easy to read, and nothing private (password hashes...) can leak by accident.
 */
final class Presenter
{
    /** @return array<string, mixed> */
    public function category(Category $category, ?int $productCount = null): array
    {
        $data = [
            'id' => $category->getId(),
            'slug' => $category->getSlug(),
            'name' => ['ar' => $category->getNameAr(), 'fr' => $category->getNameFr(), 'en' => $category->getNameEn()],
            'position' => $category->getPosition(),
        ];
        if ($productCount !== null) {
            $data['productCount'] = $productCount;
        }

        return $data;
    }

    /** Product card in lists. @return array<string, mixed> */
    public function productSummary(Product $product): array
    {
        $colors = [];
        $sizes = [];
        foreach ($product->getVariants() as $variant) {
            if ($variant->getColor() !== '') {
                $colors[$variant->getColor()] = true;
            }
            if ($variant->getSize() !== '') {
                $sizes[$variant->getSize()] = true;
            }
        }

        return [
            'id' => $product->getId(),
            'slug' => $product->getSlug(),
            'name' => $product->getNames(),
            'price' => $product->getDisplayPrice(),
            'basePrice' => $product->getBasePrice(),
            'salePrice' => $product->getSalePrice(),
            'image' => $product->getImages()[0] ?? null,
            'category' => $this->category($product->getCategory()),
            'inStock' => $product->getTotalStock() > 0,
            'colors' => array_keys($colors),
            'sizes' => array_keys($sizes),
            'isActive' => $product->isActive(),
        ];
    }

    /** Full product page. @return array<string, mixed> */
    public function product(Product $product): array
    {
        return [
            ...$this->productSummary($product),
            'description' => $product->getDescriptions(),
            'images' => $product->getImages(),
            // array_values: after a variant is removed the collection keys have gaps, and JSON would turn the list into an object.
            'variants' => array_values(array_map($this->variant(...), $product->getVariants()->toArray())),
        ];
    }

    /** @return array<string, mixed> */
    public function variant(ProductVariant $variant): array
    {
        return [
            'id' => $variant->getId(),
            'color' => $variant->getColor(),
            'size' => $variant->getSize(),
            'label' => $variant->getLabel(),
            'sku' => $variant->getSku(),
            'stock' => $variant->getStock(),
            'price' => $variant->getUnitPrice(),
            'priceOverride' => $variant->getPriceOverride(),
        ];
    }

    /** @return array<string, mixed> */
    public function wilaya(Wilaya $wilaya): array
    {
        return [
            'code' => $wilaya->getCode(),
            'name' => ['ar' => $wilaya->getNameAr(), 'fr' => $wilaya->getNameFr()],
            'homeFee' => $wilaya->getHomeFee(),
            'deskFee' => $wilaya->getDeskFee(),
            'isActive' => $wilaya->isActive(),
        ];
    }

    /** What the buyer sees on the tracking page: no address, no full phone. @return array<string, mixed> */
    public function orderForBuyer(Order $order): array
    {
        return [
            'number' => $order->getNumber(),
            'status' => $order->getStatus()->value,
            'createdAt' => $order->getCreatedAt()->format(DATE_ATOM),
            'deliveryType' => $order->getDeliveryType()->value,
            'wilaya' => $this->wilaya($order->getWilaya())['name'],
            'subtotal' => $order->getSubtotal(),
            'deliveryFee' => $order->getDeliveryFee(),
            'total' => $order->getTotal(),
            'items' => $this->orderItems($order),
            'history' => array_map(
                static fn (OrderStatusChange $c) => ['status' => $c->getToStatus()->value, 'at' => $c->getChangedAt()->format(DATE_ATOM)],
                $order->getHistory()->toArray(),
            ),
        ];
    }

    /** Admin list row. @return array<string, mixed> */
    public function orderRow(Order $order, int $pastRefusals): array
    {
        return [
            'id' => $order->getId(),
            'number' => $order->getNumber(),
            'customerName' => $order->getCustomerName(),
            'phone' => Phone::format($order->getPhone()),
            'wilaya' => ['code' => $order->getWilaya()->getCode(), 'name' => $order->getWilaya()->getNameFr()],
            'deliveryType' => $order->getDeliveryType()->value,
            'total' => $order->getTotal(),
            'status' => $order->getStatus()->value,
            'itemCount' => array_sum(array_map(static fn ($i) => $i->getQuantity(), $order->getItems()->toArray())),
            'pastRefusals' => $pastRefusals,
            'createdAt' => $order->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    /** Admin detail. @return array<string, mixed> */
    public function orderForAdmin(Order $order, int $pastRefusals): array
    {
        return [
            ...$this->orderRow($order, $pastRefusals),
            'commune' => $order->getCommune(),
            'address' => $order->getAddress(),
            'note' => $order->getNote(),
            'subtotal' => $order->getSubtotal(),
            'deliveryFee' => $order->getDeliveryFee(),
            'locale' => $order->getLocale(),
            'nextStatuses' => array_map(static fn ($s) => $s->value, $order->getStatus()->nextStatuses()),
            'items' => $this->orderItems($order),
            'history' => array_map(
                static fn (OrderStatusChange $c) => [
                    'from' => $c->getFromStatus()?->value,
                    'to' => $c->getToStatus()->value,
                    'note' => $c->getNote(),
                    'by' => $c->getChangedBy(),
                    'at' => $c->getChangedAt()->format(DATE_ATOM),
                ],
                $order->getHistory()->toArray(),
            ),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function orderItems(Order $order): array
    {
        $items = [];
        foreach ($order->getItems() as $item) {
            $items[] = [
                'productName' => $item->getProductName(),
                'variantLabel' => $item->getVariantLabel(),
                'unitPrice' => $item->getUnitPrice(),
                'quantity' => $item->getQuantity(),
                'lineTotal' => $item->getLineTotal(),
                'productSlug' => $item->getVariant()?->getProduct()->getSlug(),
                'image' => $item->getVariant()?->getProduct()->getImages()[0] ?? null,
            ];
        }

        return $items;
    }
}
