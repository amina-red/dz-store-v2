<?php

namespace App\Domain;

/**
 * Algerian mobile numbers.
 *
 * Buyers type the same number in many ways: "0555 12 34 56", "+213 555 123 456",
 * "00213555123456". We store one form only, "0555123456", so that the order limit
 * per phone, the blocklist and the refusal history all see the same number.
 */
final class Phone
{
    /** Returns "05XXXXXXXX", "06XXXXXXXX" or "07XXXXXXXX", or null if it is not a valid mobile. */
    public static function normalize(string $raw): ?string
    {
        $digits = preg_replace('/\D+/', '', $raw) ?? '';

        if (str_starts_with($digits, '00213')) {
            $digits = substr($digits, 5);
        } elseif (str_starts_with($digits, '213')) {
            $digits = substr($digits, 3);
        }

        if (strlen($digits) === 9) {
            $digits = '0'.$digits;
        }

        return preg_match('/^0[567]\d{8}$/', $digits) === 1 ? $digits : null;
    }

    /** "0555123456" -> "0555 12 34 56" for display. */
    public static function format(string $normalized): string
    {
        if (strlen($normalized) !== 10) {
            return $normalized;
        }

        return sprintf(
            '%s %s %s %s',
            substr($normalized, 0, 4),
            substr($normalized, 4, 2),
            substr($normalized, 6, 2),
            substr($normalized, 8, 2),
        );
    }
}
