<?php

namespace App\Entity;

use App\Domain\Pricing;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'product')]
#[ORM\Index(name: 'product_active_created_idx', columns: ['is_active', 'created_at'])]
class Product
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 160, unique: true)]
    private string $slug;

    #[ORM\Column(length: 160)]
    private string $nameAr = '';

    #[ORM\Column(length: 160)]
    private string $nameFr = '';

    #[ORM\Column(length: 160)]
    private string $nameEn = '';

    #[ORM\Column(type: Types::TEXT)]
    private string $descriptionAr = '';

    #[ORM\Column(type: Types::TEXT)]
    private string $descriptionFr = '';

    #[ORM\Column(type: Types::TEXT)]
    private string $descriptionEn = '';

    /** Normal price in DA. */
    #[ORM\Column]
    private int $basePrice;

    /** Sale price in DA, lower than the normal price; null = not on sale. */
    #[ORM\Column(nullable: true)]
    private ?int $salePrice = null;

    /** @var list<string> image URLs, the first one is the main photo */
    #[ORM\Column(type: Types::JSON)]
    private array $images = [];

    #[ORM\Column]
    private bool $isActive = true;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'RESTRICT')]
    private Category $category;

    /** @var Collection<int, ProductVariant> */
    #[ORM\OneToMany(targetEntity: ProductVariant::class, mappedBy: 'product', cascade: ['persist'], orphanRemoval: true)]
    #[ORM\OrderBy(['id' => 'ASC'])]
    private Collection $variants;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $slug, Category $category, int $basePrice)
    {
        $this->slug = $slug;
        $this->category = $category;
        $this->basePrice = $basePrice;
        $this->variants = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getSlug(): string { return $this->slug; }
    public function setSlug(string $slug): void { $this->slug = $slug; }
    public function getCategory(): Category { return $this->category; }
    public function setCategory(Category $category): void { $this->category = $category; }
    public function getBasePrice(): int { return $this->basePrice; }
    public function getSalePrice(): ?int { return $this->salePrice; }
    public function isActive(): bool { return $this->isActive; }
    public function setActive(bool $active): void { $this->isActive = $active; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    /** @return array{ar: string, fr: string, en: string} */
    public function getNames(): array
    {
        return ['ar' => $this->nameAr, 'fr' => $this->nameFr, 'en' => $this->nameEn];
    }

    /** @return array{ar: string, fr: string, en: string} */
    public function getDescriptions(): array
    {
        return ['ar' => $this->descriptionAr, 'fr' => $this->descriptionFr, 'en' => $this->descriptionEn];
    }

    /** The name in one language, falling back to French, then Arabic. */
    public function getName(string $locale): string
    {
        $names = $this->getNames();
        $name = $names[$locale] ?? '';

        return $name !== '' ? $name : ($names['fr'] !== '' ? $names['fr'] : $names['ar']);
    }

    /** @param array{ar: string, fr: string, en: string} $names */
    public function setNames(array $names): void
    {
        $this->nameAr = $names['ar'];
        $this->nameFr = $names['fr'];
        $this->nameEn = $names['en'];
    }

    /** @param array{ar: string, fr: string, en: string} $descriptions */
    public function setDescriptions(array $descriptions): void
    {
        $this->descriptionAr = $descriptions['ar'];
        $this->descriptionFr = $descriptions['fr'];
        $this->descriptionEn = $descriptions['en'];
    }

    public function setPrices(int $basePrice, ?int $salePrice): void
    {
        if (!Pricing::isValidSalePrice($basePrice, $salePrice)) {
            throw new \InvalidArgumentException('The sale price must be lower than the normal price.');
        }
        $this->basePrice = $basePrice;
        $this->salePrice = $salePrice;
    }

    /** @return list<string> */
    public function getImages(): array { return $this->images; }

    /** @param list<string> $images */
    public function setImages(array $images): void { $this->images = array_values($images); }

    /** @return Collection<int, ProductVariant> */
    public function getVariants(): Collection { return $this->variants; }

    public function addVariant(ProductVariant $variant): void
    {
        if (!$this->variants->contains($variant)) {
            $this->variants->add($variant);
        }
    }

    public function removeVariant(ProductVariant $variant): void
    {
        $this->variants->removeElement($variant);
    }

    /** The price shown on product cards: the sale price if there is one. */
    public function getDisplayPrice(): int
    {
        return $this->salePrice ?? $this->basePrice;
    }

    public function getTotalStock(): int
    {
        $total = 0;
        foreach ($this->variants as $variant) {
            $total += $variant->getStock();
        }

        return $total;
    }
}
