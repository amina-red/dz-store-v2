<?php

namespace App\Controller\Admin;

use App\Entity\AdminUser;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/admin')]
final class AuthController extends AbstractController
{
    /**
     * The firewall's json_login handles this route before the controller runs
     * (see config/packages/security.yaml). We only get here if the body is not JSON.
     */
    #[Route('/login', name: 'api_admin_login', methods: ['POST'])]
    public function login(): JsonResponse
    {
        return $this->json(['error' => 'Send {"email": "...", "password": "..."} as JSON.'], 400);
    }

    /** Handled by the firewall's logout listener; this body never runs. */
    #[Route('/logout', name: 'api_admin_logout', methods: ['POST'])]
    public function logout(): never
    {
        throw new \LogicException('The firewall handles logout.');
    }

    #[Route('/me', methods: ['GET'])]
    public function me(#[CurrentUser] AdminUser $user): JsonResponse
    {
        return $this->json(['email' => $user->getEmail()]);
    }
}
