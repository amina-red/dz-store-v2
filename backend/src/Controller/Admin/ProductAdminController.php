<?php

namespace App\Controller\Admin;

use App\Domain\Pricing;
use App\Entity\Category;
use App\Entity\Product;
use App\Entity\ProductVariant;
use App\Http\ApiException;
use App\Http\Input;
use App\Service\Presenter;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/api/admin/products')]
final class ProductAdminController extends AbstractController
{
    private const PER_PAGE = 30;
    private const MAX_PRICE = 10_000_000;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Presenter $presenter,
        private readonly SluggerInterface $slugger,
    ) {
    }

    /** All products, hidden ones included. GET ?q=&page= */
    #[Route('', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $search = trim($request->query->getString('q'));

        $qb = $this->em->createQueryBuilder()->select('p.id')->from(Product::class, 'p');
        if ($search !== '') {
            $qb->where('LOWER(p.nameAr) LIKE :q OR LOWER(p.nameFr) LIKE :q OR LOWER(p.nameEn) LIKE :q OR LOWER(p.slug) LIKE :q')
                ->setParameter('q', '%'.mb_strtolower(addcslashes($search, '%_\\')).'%');
        }
        $total = (int) (clone $qb)->select('COUNT(p.id)')->getQuery()->getSingleScalarResult();
        $ids = array_map('intval', array_column(
            $qb->orderBy('p.createdAt', 'DESC')->addOrderBy('p.id', 'DESC')
                ->setFirstResult(($page - 1) * self::PER_PAGE)->setMaxResults(self::PER_PAGE)
                ->getQuery()->getScalarResult(),
            'id',
        ));

        $products = $ids === [] ? [] : $this->em->createQuery(
            'SELECT p, v, c FROM App\Entity\Product p LEFT JOIN p.variants v JOIN p.category c WHERE p.id IN (:ids)'
        )->setParameter('ids', $ids)->getResult();
        $byId = [];
        foreach ($products as $p) {
            $byId[$p->getId()] = $p;
        }

        $items = [];
        foreach ($ids as $id) {
            if (isset($byId[$id])) {
                $items[] = [...$this->presenter->productSummary($byId[$id]), 'totalStock' => $byId[$id]->getTotalStock()];
            }
        }

        return $this->json([
            'items' => $items,
            'page' => $page,
            'total' => $total,
            'pages' => (int) ceil($total / self::PER_PAGE),
        ]);
    }

    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        return $this->json($this->presenter->product($this->find($id)));
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $product = $this->save(null, Input::fromRequest($request));

        return $this->json($this->presenter->product($product), 201);
    }

    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $product = $this->save($this->find($id), Input::fromRequest($request));

        return $this->json($this->presenter->product($product));
    }

    /**
     * Deleting keeps past orders intact (they store a copy of name and price).
     * To stop selling a product for a while, hide it instead (isActive = false).
     */
    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $this->em->remove($this->find($id));
        $this->em->flush();

        return new JsonResponse(null, 204);
    }

    /**
     * Body:
     * {
     *   "name": {"ar": "...", "fr": "...", "en": "..."}, "description": {...},
     *   "basePrice": 5400, "salePrice": 4900, "categoryId": 1, "isActive": true,
     *   "images": ["/uploads/products/abc.webp"],
     *   "variants": [{"id": 3, "color": "Beige", "size": "M", "sku": null, "stock": 6, "priceOverride": null}, ...]
     * }
     * Variants with an id are updated, without an id are created, and the ones missing from the list are deleted.
     */
    private function save(?Product $product, Input $in): Product
    {
        $names = $in->translations('name', 160);
        $descriptions = $in->translations('description', 5000, required: false);
        $basePrice = $in->int('basePrice', 1, self::MAX_PRICE);
        $salePrice = $in->int('salePrice', 1, self::MAX_PRICE, required: false);
        $isActive = $in->bool('isActive', true);
        $categoryId = $in->int('categoryId', 1, PHP_INT_MAX);
        $images = $this->images($in);
        $variantData = $this->variants($in);

        if ($basePrice !== null && !Pricing::isValidSalePrice($basePrice, $salePrice)) {
            $in->addError('salePrice', 'The sale price must be lower than the normal price.');
        }

        $category = $categoryId !== null ? $this->em->find(Category::class, $categoryId) : null;
        if ($categoryId !== null && $category === null) {
            $in->addError('categoryId', 'This category does not exist.');
        }

        $in->throwIfInvalid();
        assert($category instanceof Category && $basePrice !== null);

        if ($product === null) {
            $product = new Product($this->uniqueSlug($names, null), $category, $basePrice);
            $this->em->persist($product);
        } else {
            $product->setCategory($category);
        }

        $product->setNames($names);
        $product->setDescriptions($descriptions);
        $product->setPrices($basePrice, $salePrice);
        $product->setImages($images);
        $product->setActive($isActive);

        $this->syncVariants($product, $variantData);

        try {
            $this->em->flush();
        } catch (UniqueConstraintViolationException) {
            throw new ApiException(409, 'This SKU is already used by another product.', ['variants' => 'Duplicate SKU.']);
        }

        return $product;
    }

    /** @return list<string> */
    private function images(Input $in): array
    {
        $images = $in->raw('images') ?? [];
        if (!is_array($images) || !array_is_list($images) || count($images) > 10) {
            $in->addError('images', 'Up to 10 photos.');

            return [];
        }

        foreach ($images as $url) {
            // Our own uploads, or an https URL (e.g. Cloudinary). Never javascript: or data: URLs.
            if (!is_string($url) || !preg_match('#^(/uploads/products/[a-f0-9]{32}\.(jpg|png|webp)|https://[^\s"<>]+)$#', $url)) {
                $in->addError('images', 'One of the photo links is not valid.');

                return [];
            }
        }

        return $images;
    }

    /** @return list<array{id: ?int, color: string, size: string, sku: ?string, stock: int, priceOverride: ?int}> */
    private function variants(Input $in): array
    {
        $raw = $in->raw('variants');
        if (!is_array($raw) || !array_is_list($raw) || $raw === [] || count($raw) > 200) {
            $in->addError('variants', 'Add at least one variant (up to 200).');

            return [];
        }

        $out = [];
        $seen = [];
        foreach ($raw as $i => $v) {
            $key = 'variants.'.$i;
            if (!is_array($v)) {
                $in->addError($key, 'Invalid variant.');
                continue;
            }
            $color = is_string($v['color'] ?? null) ? trim($v['color']) : '';
            $size = is_string($v['size'] ?? null) ? trim($v['size']) : '';
            $sku = is_string($v['sku'] ?? null) && trim($v['sku']) !== '' ? trim($v['sku']) : null;
            $stock = $v['stock'] ?? null;
            $price = $v['priceOverride'] ?? null;
            $id = $v['id'] ?? null;

            if (mb_strlen($color) > 40 || mb_strlen($size) > 20 || ($sku !== null && mb_strlen($sku) > 60)) {
                $in->addError($key, 'Color up to 40 characters, size up to 20, SKU up to 60.');
            }
            if (!is_int($stock) || $stock < 0 || $stock > 100_000) {
                $in->addError($key.'.stock', 'Stock must be a whole number from 0 to 100000.');
            }
            if ($price !== null && (!is_int($price) || $price < 1 || $price > self::MAX_PRICE)) {
                $in->addError($key.'.priceOverride', 'Invalid price.');
            }
            if ($id !== null && !is_int($id)) {
                $in->addError($key, 'Invalid variant id.');
            }
            $pair = mb_strtolower($color.'|'.$size);
            if (isset($seen[$pair])) {
                $in->addError($key, 'Two variants have the same color and size.');
            }
            $seen[$pair] = true;

            $out[] = [
                'id' => is_int($id) ? $id : null,
                'color' => $color,
                'size' => $size,
                'sku' => $sku,
                'stock' => is_int($stock) ? $stock : 0,
                'priceOverride' => is_int($price) ? $price : null,
            ];
        }

        return $out;
    }

    /** @param list<array{id: ?int, color: string, size: string, sku: ?string, stock: int, priceOverride: ?int}> $data */
    private function syncVariants(Product $product, array $data): void
    {
        $existing = [];
        foreach ($product->getVariants() as $variant) {
            $existing[$variant->getId()] = $variant;
        }

        // Existing variants the admin did not send by id, by "color|size". If a "new" row has the
        // same color and size as one of them, we reuse it: deleting and re-inserting the same pair
        // in one save would break the unique (product, color, size) rule.
        $sentIds = array_filter(array_column($data, 'id'));
        $reusable = [];
        foreach ($existing as $id => $variant) {
            if (!in_array($id, $sentIds, true)) {
                $reusable[mb_strtolower($variant->getColor().'|'.$variant->getSize())] = $variant;
            }
        }

        $kept = [];
        foreach ($data as $row) {
            $variant = $row['id'] !== null ? ($existing[$row['id']] ?? null) : null;
            if ($row['id'] !== null && $variant === null) {
                throw ApiException::invalid(['variants' => 'A variant does not belong to this product.']);
            }
            $variant ??= $reusable[mb_strtolower($row['color'].'|'.$row['size'])] ?? null;
            if ($variant === null) {
                $variant = new ProductVariant($product, $row['color'], $row['size'], $row['stock']);
            } else {
                $variant->setOptions($row['color'], $row['size']);
                $variant->setStock($row['stock']);
                $kept[$variant->getId()] = true;
            }
            $variant->setSku($row['sku']);
            $variant->setPriceOverride($row['priceOverride']);
        }

        foreach ($existing as $id => $variant) {
            if (!isset($kept[$id])) {
                $product->removeVariant($variant);
            }
        }
    }

    /** "Abaya en lin" -> "abaya-en-lin", then "abaya-en-lin-2" if it is taken. @param array{ar: string, fr: string, en: string} $names */
    private function uniqueSlug(array $names, ?int $ignoreId): string
    {
        $source = $names['fr'] !== '' ? $names['fr'] : ($names['en'] !== '' ? $names['en'] : $names['ar']);
        $base = mb_substr($this->slugger->slug($source)->lower()->toString(), 0, 140);
        if ($base === '') {
            $base = 'product';
        }

        $repository = $this->em->getRepository(Product::class);
        $slug = $base;
        for ($n = 2; ($found = $repository->findOneBy(['slug' => $slug])) !== null && $found->getId() !== $ignoreId; ++$n) {
            $slug = $base.'-'.$n;
        }

        return $slug;
    }

    private function find(int $id): Product
    {
        $product = $this->em->find(Product::class, $id);
        if ($product === null) {
            throw ApiException::notFound('Product not found.');
        }

        return $product;
    }
}
