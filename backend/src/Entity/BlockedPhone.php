<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'blocked_phone')]
class BlockedPhone
{
    /** Normalized: "0555123456". */
    #[ORM\Id]
    #[ORM\Column(length: 10)]
    private string $phone;

    #[ORM\Column(length: 255)]
    private string $reason;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $phone, string $reason)
    {
        $this->phone = $phone;
        $this->reason = $reason;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getPhone(): string { return $this->phone; }
    public function getReason(): string { return $this->reason; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
