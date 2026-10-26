<?php

namespace App\Http;

use Symfony\Component\HttpFoundation\Request;

/**
 * Reads and checks a JSON request body, collecting one message per bad field.
 *
 *     $in = Input::fromRequest($request);
 *     $name = $in->string('customerName', min: 2, max: 80);
 *     $in->throwIfInvalid();   // 422 with every problem at once
 */
final class Input
{
    /** @var array<string, string> */
    private array $errors = [];

    /** @param array<string, mixed> $data */
    public function __construct(private readonly array $data)
    {
    }

    public static function fromRequest(Request $request): self
    {
        $content = $request->getContent();
        if ($content === '') {
            return new self([]);
        }

        try {
            $data = json_decode($content, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ApiException(400, 'The request body is not valid JSON.');
        }

        if (!is_array($data) || array_is_list($data) && $data !== []) {
            throw new ApiException(400, 'The request body must be a JSON object.');
        }

        return new self($data);
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->data);
    }

    public function raw(string $key): mixed
    {
        return $this->data[$key] ?? null;
    }

    /** Trimmed text. Returns '' (and records an error) when invalid. */
    public function string(string $key, int $min = 0, int $max = 255, bool $required = true): string
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required && $min > 0) {
                $this->errors[$key] = 'This field is required.';
            }

            return '';
        }

        if (!is_string($value)) {
            $this->errors[$key] = 'This field must be text.';

            return '';
        }

        $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
        $length = mb_strlen($value);

        if ($length < $min) {
            $this->errors[$key] = $min === 1 ? 'This field is required.' : sprintf('At least %d characters.', $min);
        } elseif ($length > $max) {
            $this->errors[$key] = sprintf('At most %d characters.', $max);
        }

        return $value;
    }

    /** Multi-line text (keeps line breaks). Null when empty. */
    public function text(string $key, int $max = 2000): ?string
    {
        $value = $this->data[$key] ?? null;
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            $this->errors[$key] = 'This field must be text.';

            return null;
        }
        $value = trim($value);
        if (mb_strlen($value) > $max) {
            $this->errors[$key] = sprintf('At most %d characters.', $max);
        }

        return $value === '' ? null : $value;
    }

    public function int(string $key, int $min, int $max, bool $required = true): ?int
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = 'This field is required.';
            }

            return null;
        }

        if (!is_int($value)) {
            $this->errors[$key] = 'This field must be a whole number.';

            return null;
        }

        if ($value < $min || $value > $max) {
            $this->errors[$key] = sprintf('Must be between %d and %d.', $min, $max);
        }

        return $value;
    }

    public function bool(string $key, bool $default): bool
    {
        $value = $this->data[$key] ?? null;
        if ($value === null) {
            return $default;
        }
        if (!is_bool($value)) {
            $this->errors[$key] = 'This field must be true or false.';

            return $default;
        }

        return $value;
    }

    /**
     * @template T of \BackedEnum
     *
     * @param class-string<T> $enum
     *
     * @return T|null
     */
    public function enum(string $key, string $enum): ?\BackedEnum
    {
        $value = $this->data[$key] ?? null;
        $case = is_string($value) ? $enum::tryFrom($value) : null;
        if ($case === null) {
            $this->errors[$key] = 'Choose one of the options.';
        }

        return $case;
    }

    /** {"ar": "...", "fr": "...", "en": "..."} with at least one language filled. @return array{ar: string, fr: string, en: string} */
    public function translations(string $key, int $max, bool $required = true): array
    {
        $value = $this->data[$key] ?? [];
        $out = ['ar' => '', 'fr' => '', 'en' => ''];

        if (!is_array($value)) {
            $this->errors[$key] = 'Expected {"ar", "fr", "en"}.';

            return $out;
        }

        foreach (['ar', 'fr', 'en'] as $lang) {
            $text = $value[$lang] ?? '';
            if (!is_string($text)) {
                $this->errors[$key.'.'.$lang] = 'This field must be text.';
                continue;
            }
            $text = trim($text);
            if (mb_strlen($text) > $max) {
                $this->errors[$key.'.'.$lang] = sprintf('At most %d characters.', $max);
            }
            $out[$lang] = $text;
        }

        if ($required && $out['ar'] === '' && $out['fr'] === '' && $out['en'] === '') {
            $this->errors[$key] = 'Fill in at least one language.';
        }

        return $out;
    }

    public function addError(string $key, string $message): void
    {
        $this->errors[$key] = $message;
    }

    public function isValid(): bool
    {
        return $this->errors === [];
    }

    public function throwIfInvalid(): void
    {
        if ($this->errors !== []) {
            throw ApiException::invalid($this->errors);
        }
    }
}
