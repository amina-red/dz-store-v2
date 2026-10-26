<?php

namespace App\Service;

use App\Domain\DeliveryType;
use App\Domain\OrderNumber;
use App\Domain\OrderStatus;
use App\Domain\Pricing;
use App\Entity\BlockedPhone;
use App\Entity\Order;
use App\Entity\Wilaya;
use App\Http\ApiException;
use Doctrine\ORM\EntityManagerInterface;

/** Everything that happens when a buyer presses "Confirm my order". */
final class OrderPlacer
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CartQuoter $quoter,
        private readonly int $maxPendingPerPhone,
    ) {
    }

    /**
     * @param array<int, int> $lines variant id => quantity, sorted by id
     */
    public function place(
        string $customerName,
        string $phone,
        Wilaya $wilaya,
        string $commune,
        string $address,
        DeliveryType $deliveryType,
        ?string $note,
        string $locale,
        array $lines,
    ): Order {
        $wilayaFee = $wilaya->feeFor($deliveryType);
        if ($wilayaFee === null) {
            throw ApiException::invalid(['deliveryType' => 'This delivery option is not available in this wilaya.']);
        }

        if ($this->em->find(BlockedPhone::class, $phone) !== null) {
            // Vague on purpose: we do not tell fake buyers that they are blocked.
            throw new ApiException(403, 'We cannot take this order. Please contact the shop.');
        }

        return $this->em->wrapInTransaction(function () use ($customerName, $phone, $wilaya, $commune, $address, $deliveryType, $note, $locale, $lines, $wilayaFee): Order {
            // One order at a time per phone number, so the "3 pending orders" limit
            // cannot be passed by sending 10 orders in the same second.
            $this->em->getConnection()->executeStatement('SELECT pg_advisory_xact_lock(hashtext(:phone))', ['phone' => $phone]);

            $pending = (int) $this->em->createQuery(
                'SELECT COUNT(o.id) FROM App\Entity\Order o WHERE o.phone = :phone AND o.status = :status AND o.createdAt > :since'
            )
                ->setParameter('phone', $phone)
                ->setParameter('status', OrderStatus::New)
                ->setParameter('since', new \DateTimeImmutable('-24 hours'))
                ->getSingleScalarResult();

            if ($pending >= $this->maxPendingPerPhone) {
                throw new ApiException(429, 'You already have orders waiting for confirmation. We will call you soon.');
            }

            $variants = $this->quoter->loadVariants($lines, lock: true);
            $quote = $this->quoter->quote($lines, $variants, $wilaya, $deliveryType);

            if (!$quote['ok']) {
                throw new ApiException(409, 'Some products are no longer available in this quantity. Please check your cart.', [
                    'items' => 'stock',
                ]);
            }

            $order = new Order($this->newNumber(), $customerName, $phone, $wilaya, $commune, $address, $deliveryType, $note, $locale);

            foreach ($lines as $variantId => $quantity) {
                $variant = $variants[$variantId];
                $variant->removeStock($quantity);
                $order->addItem($variant, $quantity);
            }

            $order->setDeliveryFee(Pricing::deliveryFee($order->getSubtotal(), $wilayaFee, $this->quoter->freeDeliveryFrom()));

            $this->em->persist($order);
            $this->em->flush();

            return $order;
        });
    }

    private function newNumber(): string
    {
        $repository = $this->em->getRepository(Order::class);
        do {
            $number = OrderNumber::generate();
        } while ($repository->findOneBy(['number' => $number]) !== null);

        return $number;
    }
}
