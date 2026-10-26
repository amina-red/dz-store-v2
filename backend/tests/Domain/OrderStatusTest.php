<?php

namespace App\Tests\Domain;

use App\Domain\OrderStatus;
use PHPUnit\Framework\TestCase;

final class OrderStatusTest extends TestCase
{
    public function testHappyPath(): void
    {
        self::assertTrue(OrderStatus::New->canMoveTo(OrderStatus::Confirmed));
        self::assertTrue(OrderStatus::Confirmed->canMoveTo(OrderStatus::Shipped));
        self::assertTrue(OrderStatus::Shipped->canMoveTo(OrderStatus::Delivered));
    }

    public function testCannotSkipSteps(): void
    {
        self::assertFalse(OrderStatus::New->canMoveTo(OrderStatus::Shipped));
        self::assertFalse(OrderStatus::New->canMoveTo(OrderStatus::Delivered));
        self::assertFalse(OrderStatus::Confirmed->canMoveTo(OrderStatus::Delivered));
    }

    public function testCannotCancelOnceShipped(): void
    {
        self::assertFalse(OrderStatus::Shipped->canMoveTo(OrderStatus::Cancelled));
        self::assertTrue(OrderStatus::Shipped->canMoveTo(OrderStatus::Returned));
    }

    public function testFinalStatusesGoNowhere(): void
    {
        foreach ([OrderStatus::Delivered, OrderStatus::Returned, OrderStatus::Cancelled] as $final) {
            self::assertTrue($final->isFinal());
            foreach (OrderStatus::cases() as $to) {
                self::assertFalse($final->canMoveTo($to), $final->value.' -> '.$to->value);
            }
        }
    }

    public function testOnlyCancelAndReturnPutStockBack(): void
    {
        $restocking = array_filter(OrderStatus::cases(), static fn (OrderStatus $s) => $s->restocks());
        self::assertSame([OrderStatus::Returned, OrderStatus::Cancelled], array_values($restocking));
    }
}
