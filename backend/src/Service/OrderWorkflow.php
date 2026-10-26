<?php

namespace App\Service;

use App\Domain\OrderStatus;
use App\Entity\Order;
use App\Http\ApiException;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

/** Admin status changes: confirm, ship, deliver, cancel, return. */
final class OrderWorkflow
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function move(int $orderId, OrderStatus $to, ?string $note, string $adminEmail): Order
    {
        return $this->em->wrapInTransaction(function () use ($orderId, $to, $note, $adminEmail): Order {
            // Lock the order: two admins clicking at once cannot restock twice.
            $order = $this->em->find(Order::class, $orderId, LockMode::PESSIMISTIC_WRITE);
            if ($order === null) {
                throw ApiException::notFound('Order not found.');
            }

            try {
                $order->moveTo($to, $note, $adminEmail);
            } catch (\DomainException $e) {
                throw new ApiException(409, $e->getMessage());
            }

            if ($to->restocks()) {
                foreach ($order->getItems() as $item) {
                    $variant = $item->getVariant();
                    if ($variant === null) {
                        continue; // the product was deleted since; nothing to put back
                    }
                    $this->em->lock($variant, LockMode::PESSIMISTIC_WRITE);
                    $this->em->refresh($variant);
                    $variant->addStock($item->getQuantity());
                }
            }

            $this->em->flush();

            return $order;
        });
    }

    /**
     * How many deliveries each phone refused before (orders "returned").
     *
     * @param list<string> $phones
     *
     * @return array<string, int>
     */
    public function refusalsByPhone(array $phones): array
    {
        if ($phones === []) {
            return [];
        }

        $rows = $this->em->createQuery(
            'SELECT o.phone AS phone, COUNT(o.id) AS refusals FROM App\Entity\Order o
             WHERE o.phone IN (:phones) AND o.status = :returned GROUP BY o.phone'
        )
            ->setParameter('phones', array_values(array_unique($phones)))
            ->setParameter('returned', OrderStatus::Returned)
            ->getArrayResult();

        $out = [];
        foreach ($rows as $row) {
            $out[$row['phone']] = (int) $row['refusals'];
        }

        return $out;
    }
}
