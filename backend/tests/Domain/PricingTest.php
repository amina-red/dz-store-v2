<?php

namespace App\Tests\Domain;

use App\Domain\Pricing;
use PHPUnit\Framework\TestCase;

final class PricingTest extends TestCase
{
    public function testVariantPriceWinsOverSaleAndBase(): void
    {
        self::assertSame(6000, Pricing::unitPrice(5400, 4900, 6000));
    }

    public function testSalePriceWinsOverBase(): void
    {
        self::assertSame(4900, Pricing::unitPrice(5400, 4900, null));
    }

    public function testBasePriceWhenNothingElse(): void
    {
        self::assertSame(5400, Pricing::unitPrice(5400, null, null));
    }

    public function testDeliveryIsPaidBelowThreshold(): void
    {
        self::assertSame(600, Pricing::deliveryFee(9999, 600, 10000));
    }

    public function testDeliveryIsFreeFromThreshold(): void
    {
        self::assertSame(0, Pricing::deliveryFee(10000, 600, 10000));
    }

    public function testZeroThresholdMeansNeverFree(): void
    {
        self::assertSame(600, Pricing::deliveryFee(1_000_000, 600, 0));
    }

    public function testSalePriceRules(): void
    {
        self::assertTrue(Pricing::isValidSalePrice(5400, null));
        self::assertTrue(Pricing::isValidSalePrice(5400, 4900));
        self::assertFalse(Pricing::isValidSalePrice(5400, 5400));
        self::assertFalse(Pricing::isValidSalePrice(5400, 6000));
        self::assertFalse(Pricing::isValidSalePrice(5400, 0));
    }
}
