<?php

namespace App\Controller\Api;

use App\Entity\Product;
use App\Entity\Wilaya;
use App\Http\ApiException;
use App\Service\Presenter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class CatalogController extends AbstractController
{
    private const PER_PAGE = 12;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Presenter $presenter,
    ) {
    }

    #[Route('/categories', methods: ['GET'])]
    public function categories(): JsonResponse
    {
        $rows = $this->em->createQuery(
            'SELECT c AS category, COUNT(p.id) AS productCount FROM App\Entity\Category c
             LEFT JOIN App\Entity\Product p WITH p.category = c AND p.isActive = true
             GROUP BY c.id ORDER BY c.position ASC, c.id ASC'
        )->getResult();

        return $this->json(array_map(
            fn (array $row) => $this->presenter->category($row['category'], (int) $row['productCount']),
            $rows,
        ));
    }

    /** GET /api/products?category=women&q=abaya&sort=new|price_asc|price_desc&page=1 */
    #[Route('/products', methods: ['GET'])]
    public function products(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $sort = $request->query->getString('sort', 'new');
        $search = trim($request->query->getString('q'));
        $categorySlug = $request->query->getString('category');

        $qb = $this->em->createQueryBuilder()
            ->select('p.id')
            ->from(Product::class, 'p')
            ->join('p.category', 'c')
            ->where('p.isActive = true');

        if ($categorySlug !== '') {
            $qb->andWhere('c.slug = :category')->setParameter('category', $categorySlug);
        }

        if ($search !== '') {
            $qb->andWhere('LOWER(p.nameAr) LIKE :q OR LOWER(p.nameFr) LIKE :q OR LOWER(p.nameEn) LIKE :q')
                ->setParameter('q', '%'.mb_strtolower(addcslashes($search, '%_\\')).'%');
        }

        $total = (int) (clone $qb)->select('COUNT(p.id)')->getQuery()->getSingleScalarResult();

        match ($sort) {
            'price_asc' => $qb->addSelect('COALESCE(p.salePrice, p.basePrice) AS HIDDEN price')->orderBy('price', 'ASC'),
            'price_desc' => $qb->addSelect('COALESCE(p.salePrice, p.basePrice) AS HIDDEN price')->orderBy('price', 'DESC'),
            default => $qb->orderBy('p.createdAt', 'DESC'),
        };
        $qb->addOrderBy('p.id', 'DESC')
            ->setFirstResult(($page - 1) * self::PER_PAGE)
            ->setMaxResults(self::PER_PAGE);

        // Two steps: first the ids of this page (sorted, paginated), then the products
        // with their variants. Paginating a query that joins a collection gives wrong pages.
        $ids = array_map('intval', array_column($qb->getQuery()->getScalarResult(), 'id'));

        return $this->json([
            'items' => array_map($this->presenter->productSummary(...), $this->loadProducts($ids)),
            'page' => $page,
            'perPage' => self::PER_PAGE,
            'total' => $total,
            'pages' => (int) ceil($total / self::PER_PAGE),
        ]);
    }

    #[Route('/products/{slug}', methods: ['GET'])]
    public function product(string $slug): JsonResponse
    {
        $product = $this->em->getRepository(Product::class)->findOneBy(['slug' => $slug, 'isActive' => true]);
        if (!$product instanceof Product) {
            throw ApiException::notFound('Product not found.');
        }

        return $this->json($this->presenter->product($product));
    }

    #[Route('/wilayas', methods: ['GET'])]
    public function wilayas(): JsonResponse
    {
        $wilayas = $this->em->getRepository(Wilaya::class)->findBy(['isActive' => true], ['code' => 'ASC']);

        return $this->json(array_map($this->presenter->wilaya(...), $wilayas));
    }

    /**
     * @param list<int> $ids
     *
     * @return list<Product> in the same order as $ids
     */
    private function loadProducts(array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        $products = $this->em->createQuery(
            'SELECT p, v, c FROM App\Entity\Product p LEFT JOIN p.variants v JOIN p.category c WHERE p.id IN (:ids)'
        )->setParameter('ids', $ids)->getResult();

        $byId = [];
        foreach ($products as $product) {
            $byId[$product->getId()] = $product;
        }

        return array_values(array_filter(array_map(static fn (int $id) => $byId[$id] ?? null, $ids)));
    }
}
