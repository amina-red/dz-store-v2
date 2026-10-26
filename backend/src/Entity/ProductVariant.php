<?php

namespace App\Entity;

use App\Domain\Pricing;
use Doctrine\ORM\Mapping as ORM;

/**
 * One buyable version of a product: a color and a size, with its own stock.
 * A product without colors or sizes still has one variant with both empty.
 */
#[ORM\Entity]
#[ORM\Table(name: 'product_variant')]
#[ORM\UniqueConstraint(name: 'variant_product_color_size_uniq', columns: ['product_id', 'color', 'size'])]
class ProductVariant
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'variants')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Product $product;

    #[ORM\Column(length: 40)]
    private string $color = '';

    #[ORM\Column(length: 20)]
    private string $size = '';

    #[ORM\Column(length: 60, unique: true, nullable: true)]
    private ?string $sku = null;

    #[ORM\Column]
    private int $stock = 0;

    /** Overrides the product price for this variant only (e.g. XXL costs more); null = product price. */
    #[ORM\Column(nullable: true)]
    private ?int $priceOverride = null;

    public function __construct(Product $product, string $color, string $size, int $stock)
    {
        $this->product = $product;
        $this->color = $color;
        $this->size = $size;
        $this->stock = $stock;
        $product->addVariant($this);
    }

    public function getId(): ?int { return $this->id; }
    public function getProduct(): Product { return $this->product; }
    public function getColor(): string { return $this->color; }
    public function getSize(): string { return $this->size; }
    public function getSku(): ?string { return $this->sku; }
    public function setSku(?string $sku): void { $this->sku = $sku; }
    public function getStock(): int { return $this->stock; }
    public function setStock(int $stock): void { $this->stock = max(0, $stock); }
    public function getPriceOverride(): ?int { return $this->priceOverride; }
    public function setPriceOverride(?int $price): void { $this->priceOverride = $price; }

    public function setOptions(string $color, string $size): void
    {
        $this->color = $color;
        $this->size = $size;
    }

    public function getUnitPrice(): int
    {
        return Pricing::unitPrice($this->product->getBasePrice(), $this->product->getSalePrice(), $this->priceOverride);
    }

    /** "Beige / M", "Beige", "M" or "" */
    public function getLabel(): string
    {
        return implode(' / ', array_filter([$this->color, $this->size], static fn (string $part) => $part !== ''));
    }

    public function removeStock(int $quantity): void
    {
        if ($quantity > $this->stock) {
            throw new \LogicException('Not enough stock.');
        }
        $this->stock -= $quantity;
    }

    public function addStock(int $quantity): void
    {
        $this->stock += $quantity;
    }
}
