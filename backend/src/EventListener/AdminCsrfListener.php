<?php

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * CSRF protection for the admin.
 *
 * Every admin request that changes data must carry "X-Requested-With: dz-store".
 * A form on another website cannot send a custom header, and a script on another
 * website would need the browser's CORS permission, which this API never gives.
 * So a request with the header comes from our own admin pages.
 *
 * Runs before the security firewall (priority 20 > 8), so the login is protected too.
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 20)]
final class AdminCsrfListener
{
    public const HEADER = 'X-Requested-With';
    public const VALUE = 'dz-store';

    public function __invoke(RequestEvent $event): void
    {
        $request = $event->getRequest();

        if (!str_starts_with($request->getPathInfo(), '/api/admin')) {
            return;
        }

        if (in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        if ($request->headers->get(self::HEADER) !== self::VALUE) {
            $event->setResponse(new JsonResponse(['error' => 'Missing security header.'], 403));
        }
    }
}
