<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'category')]
class Category
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120, unique: true)]
    private string $slug;

    #[ORM\Column(length: 120)]
    private string $nameAr;

    #[ORM\Column(length: 120)]
    private string $nameFr;

    #[ORM\Column(length: 120)]
    private string $nameEn;

    #[ORM\Column]
    private int $position = 0;

    public function __construct(string $slug, string $nameAr, string $nameFr, string $nameEn, int $position = 0)
    {
        $this->slug = $slug;
        $this->nameAr = $nameAr;
        $this->nameFr = $nameFr;
        $this->nameEn = $nameEn;
        $this->position = $position;
    }

    public function getId(): ?int { return $this->id; }
    public function getSlug(): string { return $this->slug; }
    public function setSlug(string $slug): void { $this->slug = $slug; }
    public function getNameAr(): string { return $this->nameAr; }
    public function getNameFr(): string { return $this->nameFr; }
    public function getNameEn(): string { return $this->nameEn; }
    public function getPosition(): int { return $this->position; }
    public function setPosition(int $position): void { $this->position = $position; }

    public function rename(string $ar, string $fr, string $en): void
    {
        $this->nameAr = $ar;
        $this->nameFr = $fr;
        $this->nameEn = $en;
    }
}
