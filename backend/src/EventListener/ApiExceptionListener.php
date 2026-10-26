<?php

namespace App\EventListener;

use App\Http\ApiException;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

/** Turns every error under /api into the same JSON shape: {"error": "...", "fields": {...}}. */
#[AsEventListener(event: KernelEvents::EXCEPTION, priority: -10)]
final class ApiExceptionListener
{
    public function __construct(
        private readonly LoggerInterface $logger,
        #[Autowire('%kernel.environment%')]
        private readonly string $kernelEnvironment,
    ) {
    }

    public function __invoke(ExceptionEvent $event): void
    {
        if (!str_starts_with($event->getRequest()->getPathInfo(), '/api')) {
            return;
        }

        $error = $event->getThrowable();

        if ($error instanceof ApiException) {
            $body = ['error' => $error->getMessage()];
            if ($error->getFields() !== []) {
                $body['fields'] = $error->getFields();
            }
            $event->setResponse(new JsonResponse($body, $error->getStatus()));

            return;
        }

        if ($error instanceof HttpExceptionInterface) {
            $status = $error->getStatusCode();
            $message = $status === 404 ? 'Not found.' : ($error->getMessage() ?: 'Request refused.');
            $event->setResponse(new JsonResponse(['error' => $message], $status, $error->getHeaders()));

            return;
        }

        $this->logger->error('Unhandled API error', ['exception' => $error]);
        $message = $this->kernelEnvironment === 'dev' ? $error->getMessage() : 'Something went wrong on our side. Please try again.';
        $event->setResponse(new JsonResponse(['error' => $message], 500));
    }
}
