<?php

namespace App\Entity;

use App\Domain\DeliveryType;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'wilaya')]
class Wilaya
{
    /** The official number, 1 to 58. */
    #[ORM\Id]
    #[ORM\Column]
    private int $code;

    #[ORM\Column(length: 60)]
    private string $nameAr;

    #[ORM\Column(length: 60)]
    private string $nameFr;

    /** Delivery to the buyer's address, in DA. */
    #[ORM\Column]
    private int $homeFee;

    /** Pick-up at the delivery office, in DA; null = no office in this wilaya. */
    #[ORM\Column(nullable: true)]
    private ?int $deskFee;

    #[ORM\Column]
    private bool $isActive = true;

    public function __construct(int $code, string $nameAr, string $nameFr, int $homeFee, ?int $deskFee)
    {
        $this->code = $code;
        $this->nameAr = $nameAr;
        $this->nameFr = $nameFr;
        $this->homeFee = $homeFee;
        $this->deskFee = $deskFee;
    }

    public function getCode(): int { return $this->code; }
    public function getNameAr(): string { return $this->nameAr; }
    public function getNameFr(): string { return $this->nameFr; }
    public function getHomeFee(): int { return $this->homeFee; }
    public function getDeskFee(): ?int { return $this->deskFee; }
    public function isActive(): bool { return $this->isActive; }

    public function update(int $homeFee, ?int $deskFee, bool $active): void
    {
        $this->homeFee = $homeFee;
        $this->deskFee = $deskFee;
        $this->isActive = $active;
    }

    /** Null when this delivery type is not offered here. */
    public function feeFor(DeliveryType $type): ?int
    {
        if (!$this->isActive) {
            return null;
        }

        return $type === DeliveryType::Home ? $this->homeFee : $this->deskFee;
    }
}
