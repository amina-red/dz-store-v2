<?php

namespace App\Http;

/**
 * Throw this from any controller or service to answer with a JSON error:
 * {"error": "message", "fields": {"phone": "..."}}
 */
final class ApiException extends \RuntimeException
{
    /** @param array<string, string> $fields one message per invalid form field */
    public function __construct(
        private readonly int $status,
        string $message,
        private readonly array $fields = [],
    ) {
        parent::__construct($message);
    }

    public function getStatus(): int { return $this->status; }

    /** @return array<string, string> */
    public function getFields(): array { return $this->fields; }

    public static function notFound(string $message = 'Not found.'): self
    {
        return new self(404, $message);
    }

    /** @param array<string, string> $fields */
    public static function invalid(array $fields, string $message = 'Please check the highlighted fields.'): self
    {
        return new self(422, $message, $fields);
    }
}
