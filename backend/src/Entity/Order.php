<?php

namespace App\Entity;

use App\Domain\DeliveryType;
use App\Domain\OrderStatus;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/** "order" is a reserved word in SQL, so the table is called "orders". */
#[ORM\Entity]
#[ORM\Table(name: 'orders')]
#[ORM\Index(name: 'orders_phone_idx', columns: ['phone'])]
#[ORM\Index(name: 'orders_status_created_idx', columns: ['status', 'created_at'])]
class Order
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 12, unique: true)]
    private string $number;

    #[ORM\Column(length: 80)]
    private string $customerName;

    /** Normalized: "0555123456". */
    #[ORM\Column(length: 10)]
    private string $phone;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'wilaya_code', referencedColumnName: 'code', nullable: false)]
    private Wilaya $wilaya;

    #[ORM\Column(length: 80)]
    private string $commune;

    /** Empty for stop-desk orders. */
    #[ORM\Column(length: 255)]
    private string $address;

    #[ORM\Column(length: 10, enumType: DeliveryType::class)]
    private DeliveryType $deliveryType;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $note;

    #[ORM\Column]
    private int $subtotal = 0;

    #[ORM\Column]
    private int $deliveryFee = 0;

    #[ORM\Column]
    private int $total = 0;

    #[ORM\Column(length: 20, enumType: OrderStatus::class)]
    private OrderStatus $status = OrderStatus::New;

    /** The language the buyer used, so a future SMS can be sent in it. */
    #[ORM\Column(length: 2)]
    private string $locale;

    /** @var Collection<int, OrderItem> */
    #[ORM\OneToMany(targetEntity: OrderItem::class, mappedBy: 'order', cascade: ['persist'])]
    #[ORM\OrderBy(['id' => 'ASC'])]
    private Collection $items;

    /** @var Collection<int, OrderStatusChange> */
    #[ORM\OneToMany(targetEntity: OrderStatusChange::class, mappedBy: 'order', cascade: ['persist'])]
    #[ORM\OrderBy(['id' => 'ASC'])]
    private Collection $history;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        string $number,
        string $customerName,
        string $phone,
        Wilaya $wilaya,
        string $commune,
        string $address,
        DeliveryType $deliveryType,
        ?string $note,
        string $locale,
    ) {
        $this->number = $number;
        $this->customerName = $customerName;
        $this->phone = $phone;
        $this->wilaya = $wilaya;
        $this->commune = $commune;
        $this->address = $address;
        $this->deliveryType = $deliveryType;
        $this->note = $note;
        $this->locale = $locale;
        $this->items = new ArrayCollection();
        $this->history = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
        $this->history->add(new OrderStatusChange($this, null, OrderStatus::New, null, 'buyer'));
    }

    public function getId(): ?int { return $this->id; }
    public function getNumber(): string { return $this->number; }
    public function getCustomerName(): string { return $this->customerName; }
    public function getPhone(): string { return $this->phone; }
    public function getWilaya(): Wilaya { return $this->wilaya; }
    public function getCommune(): string { return $this->commune; }
    public function getAddress(): string { return $this->address; }
    public function getDeliveryType(): DeliveryType { return $this->deliveryType; }
    public function getNote(): ?string { return $this->note; }
    public function getSubtotal(): int { return $this->subtotal; }
    public function getDeliveryFee(): int { return $this->deliveryFee; }
    public function getTotal(): int { return $this->total; }
    public function getStatus(): OrderStatus { return $this->status; }
    public function getLocale(): string { return $this->locale; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    /** @return Collection<int, OrderItem> */
    public function getItems(): Collection { return $this->items; }

    /** @return Collection<int, OrderStatusChange> */
    public function getHistory(): Collection { return $this->history; }

    public function addItem(ProductVariant $variant, int $quantity): void
    {
        $item = new OrderItem($this, $variant, $quantity, $this->locale);
        $this->items->add($item);
        $this->subtotal += $item->getLineTotal();
    }

    public function setDeliveryFee(int $fee): void
    {
        $this->deliveryFee = $fee;
        $this->total = $this->subtotal + $fee;
    }

    /** @throws \DomainException when the move is not allowed */
    public function moveTo(OrderStatus $to, ?string $note, string $changedBy): void
    {
        if (!$this->status->canMoveTo($to)) {
            throw new \DomainException(sprintf('An order cannot go from "%s" to "%s".', $this->status->value, $to->value));
        }

        $this->history->add(new OrderStatusChange($this, $this->status, $to, $note, $changedBy));
        $this->status = $to;
        $this->updatedAt = new \DateTimeImmutable();
    }
}
