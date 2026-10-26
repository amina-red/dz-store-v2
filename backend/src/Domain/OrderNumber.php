<?php

namespace App\Domain;

/**
 * Short order numbers buyers can read over the phone: "DZ7K3F9Q".
 *
 * No 0/O, 1/I/L, so nobody confuses two characters. 31^6 = 887 million
 * combinations, and random, so nobody can guess the number of another order.
 */
final class OrderNumber
{
    private const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    public static function generate(): string
    {
        $number = 'DZ';
        $max = strlen(self::ALPHABET) - 1;
        for ($i = 0; $i < 6; ++$i) {
            $number .= self::ALPHABET[random_int(0, $max)];
        }

        return $number;
    }

    public static function normalize(string $raw): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $raw) ?? '');
    }

    public static function isValid(string $number): bool
    {
        return preg_match('/^DZ['.self::ALPHABET.']{6}$/', $number) === 1;
    }
}
