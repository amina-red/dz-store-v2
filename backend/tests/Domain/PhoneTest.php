<?php

namespace App\Tests\Domain;

use App\Domain\Phone;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class PhoneTest extends TestCase
{
    /** @return iterable<string, array{string, ?string}> */
    public static function numbers(): iterable
    {
        yield 'local with spaces' => ['0555 12 34 56', '0555123456'];
        yield 'local plain' => ['0661001122', '0661001122'];
        yield 'with +213' => ['+213 770 45 67 89', '0770456789'];
        yield 'with 00213' => ['00213555123456', '0555123456'];
        yield 'with 213 and dots' => ['213.555.12.34.56', '0555123456'];
        yield '+213 then 0' => ['+213 0555 12 34 56', '0555123456'];
        yield 'nine digits' => ['555123456', '0555123456'];
        yield 'landline refused' => ['031 92 12 34', null];
        yield 'too short' => ['0555 12 34', null];
        yield 'too long' => ['0555 12 34 567', null];
        yield 'starts with 08' => ['0855123456', null];
        yield 'letters' => ['call me', null];
        yield 'empty' => ['', null];
    }

    #[DataProvider('numbers')]
    public function testNormalize(string $raw, ?string $expected): void
    {
        self::assertSame($expected, Phone::normalize($raw));
    }

    public function testFormat(): void
    {
        self::assertSame('0555 12 34 56', Phone::format('0555123456'));
    }
}
