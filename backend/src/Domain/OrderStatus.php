<?php

namespace App\Domain;

/**
 * The life of a cash-on-delivery order.
 *
 *   new -> confirmed -> shipped -> delivered
 *    |        |           |
 *    +--------+-> cancelled     shipped -> returned (refused at the door)
 *
 * Any other move is refused, so an order can never jump from "new" to "delivered"
 * or come back from "delivered".
 */
enum OrderStatus: string
{
    case New = 'new';
    case Confirmed = 'confirmed';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Returned = 'returned';
    case Cancelled = 'cancelled';

    /** @return list<self> */
    public function nextStatuses(): array
    {
        return match ($this) {
            self::New => [self::Confirmed, self::Cancelled],
            self::Confirmed => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered, self::Returned],
            self::Delivered, self::Returned, self::Cancelled => [],
        };
    }

    public function canMoveTo(self $to): bool
    {
        return in_array($to, $this->nextStatuses(), true);
    }

    /** Moving into this status puts the ordered quantities back in stock. */
    public function restocks(): bool
    {
        return $this === self::Cancelled || $this === self::Returned;
    }

    public function isFinal(): bool
    {
        return $this->nextStatuses() === [];
    }
}
