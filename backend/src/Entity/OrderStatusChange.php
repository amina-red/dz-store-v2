<?php

namespace App\Entity;

use App\Domain\OrderStatus;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'order_status_change')]
class OrderStatusChange
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'history')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Order $order;

    #[ORM\Column(length: 20, nullable: true, enumType: OrderStatus::class)]
    private ?OrderStatus $fromStatus;

    #[ORM\Column(length: 20, enumType: OrderStatus::class)]
    private OrderStatus $toStatus;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $note;

    /** The admin's email, or "buyer" for the order itself. */
    #[ORM\Column(length: 180)]
    private string $changedBy;

    #[ORM\Column]
    private \DateTimeImmutable $changedAt;

    public function __construct(Order $order, ?OrderStatus $from, OrderStatus $to, ?string $note, string $changedBy)
    {
        $this->order = $order;
        $this->fromStatus = $from;
        $this->toStatus = $to;
        $this->note = $note;
        $this->changedBy = $changedBy;
        $this->changedAt = new \DateTimeImmutable();
    }

    public function getFromStatus(): ?OrderStatus { return $this->fromStatus; }
    public function getToStatus(): OrderStatus { return $this->toStatus; }
    public function getNote(): ?string { return $this->note; }
    public function getChangedBy(): string { return $this->changedBy; }
    public function getChangedAt(): \DateTimeImmutable { return $this->changedAt; }
}
