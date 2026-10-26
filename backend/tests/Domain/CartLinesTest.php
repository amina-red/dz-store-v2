<?php

namespace App\Tests\Domain;

use App\Domain\CartLines;
use App\Domain\OrderNumber;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class CartLinesTest extends TestCase
{
    public function testMergesDuplicatesAndSortsById(): void
    {
        $lines = CartLines::parse([
            ['variantId' => 9, 'quantity' => 1],
            ['variantId' => 3, 'quantity' => 2],
            ['variantId' => 9, 'quantity' => 2],
        ]);

        self::assertSame([3 => 2, 9 => 3], $lines);
    }

    /** @return iterable<string, array{mixed}> */
    public static function badCarts(): iterable
    {
        yield 'not a list' => [['variantId' => 1, 'quantity' => 1]];
        yield 'empty' => [[]];
        yield 'zero quantity' => [[['variantId' => 1, 'quantity' => 0]]];
        yield 'negative id' => [[['variantId' => -1, 'quantity' => 1]]];
        yield 'quantity as text' => [[['variantId' => 1, 'quantity' => '2']]];
        yield 'too many of one' => [[['variantId' => 1, 'quantity' => 6], ['variantId' => 1, 'quantity' => 5]]];
        yield 'null' => [null];
    }

    #[DataProvider('badCarts')]
    public function testRejectsBadCarts(mixed $items): void
    {
        $this->expectException(\InvalidArgumentException::class);
        CartLines::parse($items);
    }

    public function testRejectsMoreThan20Lines(): void
    {
        $items = [];
        for ($i = 1; $i <= 21; ++$i) {
            $items[] = ['variantId' => $i, 'quantity' => 1];
        }
        $this->expectException(\InvalidArgumentException::class);
        CartLines::parse($items);
    }

    public function testOrderNumbersAreReadable(): void
    {
        for ($i = 0; $i < 200; ++$i) {
            $number = OrderNumber::generate();
            self::assertTrue(OrderNumber::isValid($number), $number);
            self::assertDoesNotMatchRegularExpression('/[01OIL]/', substr($number, 2));
        }
        self::assertSame('DZ7K3F9Q', OrderNumber::normalize(' dz-7k3f 9q '));
    }
}
