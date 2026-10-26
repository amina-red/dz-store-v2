<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * One line of an order. The product name, options and price are copied when the
 * order is placed, so editing or deleting a product later never changes old orders.
 */
#[ORM\Entity]
#[ORM\Table(name: 'order_item')]
class OrderItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Order $order;

    /** Null once the variant is deleted; the copied fields below stay. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?ProductVariant $variant;

    #[ORM\Column(length: 160)]
    private string $productName;

    #[ORM\Column(length: 70)]
    private string $variantLabel;

    #[ORM\Column]
    private int $unitPrice;

    #[ORM\Column]
    private int $quantity;

    #[ORM\Column]
    private int $lineTotal;

    public function __construct(Order $order, ProductVariant $variant, int $quantity, string $locale)
    {
        $this->order = $order;
        $this->variant = $variant;
        $this->productName = $variant->getProduct()->getName($locale);
        $this->variantLabel = $variant->getLabel();
        $this->unitPrice = $variant->getUnitPrice();
        $this->quantity = $quantity;
        $this->lineTotal = $this->unitPrice * $quantity;
    }

    public function getId(): ?int { return $this->id; }
    public function getOrder(): Order { return $this->order; }
    public function getVariant(): ?ProductVariant { return $this->variant; }
    public function getProductName(): string { return $this->productName; }
    public function getVariantLabel(): string { return $this->variantLabel; }
    public function getUnitPrice(): int { return $this->unitPrice; }
    public function getQuantity(): int { return $this->quantity; }
    public function getLineTotal(): int { return $this->lineTotal; }
}
