<?php

namespace App\Controller\Admin;

use App\Domain\OrderStatus;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin')]
final class StatsController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('/stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $today = new \DateTimeImmutable('today');
        $since = new \DateTimeImmutable('-30 days');

        $count = function (string $dql, array $params): int {
            $query = $this->em->createQuery($dql);
            foreach ($params as $name => $value) {
                $query->setParameter($name, $value);
            }

            return (int) $query->getSingleScalarResult();
        };

        $ordersToday = $count('SELECT COUNT(o.id) FROM App\Entity\Order o WHERE o.createdAt >= :today', ['today' => $today]);
        $waiting = $count('SELECT COUNT(o.id) FROM App\Entity\Order o WHERE o.status = :s', ['s' => OrderStatus::New]);
        $toShip = $count('SELECT COUNT(o.id) FROM App\Entity\Order o WHERE o.status = :s', ['s' => OrderStatus::Confirmed]);

        $delivered = $count(
            'SELECT COUNT(o.id) FROM App\Entity\Order o WHERE o.status = :s AND o.updatedAt >= :since',
            ['s' => OrderStatus::Delivered, 'since' => $since],
        );
        $returned = $count(
            'SELECT COUNT(o.id) FROM App\Entity\Order o WHERE o.status = :s AND o.updatedAt >= :since',
            ['s' => OrderStatus::Returned, 'since' => $since],
        );
        $revenue = $count(
            'SELECT COALESCE(SUM(o.total), 0) FROM App\Entity\Order o WHERE o.status = :s AND o.updatedAt >= :since',
            ['s' => OrderStatus::Delivered, 'since' => $since],
        );
        $lowStock = $count(
            'SELECT COUNT(v.id) FROM App\Entity\ProductVariant v JOIN v.product p WHERE p.isActive = true AND v.stock <= 2',
            [],
        );

        $topWilayas = $this->em->createQuery(
            'SELECT w.code AS code, w.nameFr AS name, COUNT(o.id) AS orders FROM App\Entity\Order o JOIN o.wilaya w
             WHERE o.createdAt >= :since GROUP BY w.code, w.nameFr ORDER BY orders DESC'
        )->setParameter('since', $since)->setMaxResults(5)->getArrayResult();

        return $this->json([
            'ordersToday' => $ordersToday,
            'waitingForCall' => $waiting,
            'toShip' => $toShip,
            'last30Days' => [
                'delivered' => $delivered,
                'returned' => $returned,
                'revenue' => $revenue,
                // Share of shipped parcels the buyer refused. Null when nothing was shipped yet.
                'returnRate' => ($delivered + $returned) > 0 ? round($returned / ($delivered + $returned), 3) : null,
            ],
            'lowStockVariants' => $lowStock,
            'topWilayas' => array_map(
                static fn (array $r) => ['code' => (int) $r['code'], 'name' => $r['name'], 'orders' => (int) $r['orders']],
                $topWilayas,
            ),
        ]);
    }
}
