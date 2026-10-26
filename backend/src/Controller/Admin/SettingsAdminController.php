<?php

namespace App\Controller\Admin;

use App\Domain\Phone;
use App\Entity\BlockedPhone;
use App\Entity\Wilaya;
use App\Http\ApiException;
use App\Http\Input;
use App\Service\Presenter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/** Delivery prices per wilaya, and the phone blocklist. */
#[Route('/api/admin')]
final class SettingsAdminController extends AbstractController
{
    private const MAX_FEE = 100_000;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Presenter $presenter,
    ) {
    }

    #[Route('/wilayas', methods: ['GET'])]
    public function wilayas(): JsonResponse
    {
        $wilayas = $this->em->getRepository(Wilaya::class)->findBy([], ['code' => 'ASC']);

        return $this->json(array_map($this->presenter->wilaya(...), $wilayas));
    }

    /** Body: {"homeFee": 600, "deskFee": 400, "isActive": true}. deskFee null = no stop desk. */
    #[Route('/wilayas/{code}', requirements: ['code' => '\d+'], methods: ['PUT'])]
    public function updateWilaya(int $code, Request $request): JsonResponse
    {
        $wilaya = $this->em->find(Wilaya::class, $code);
        if ($wilaya === null) {
            throw ApiException::notFound('Wilaya not found.');
        }

        $in = Input::fromRequest($request);
        $home = $in->int('homeFee', 0, self::MAX_FEE);
        $desk = $in->int('deskFee', 0, self::MAX_FEE, required: false);
        $active = $in->bool('isActive', $wilaya->isActive());
        $in->throwIfInvalid();
        assert($home !== null);

        $wilaya->update($home, $desk, $active);
        $this->em->flush();

        return $this->json($this->presenter->wilaya($wilaya));
    }

    #[Route('/blocked-phones', methods: ['GET'])]
    public function blockedPhones(): JsonResponse
    {
        $rows = $this->em->getRepository(BlockedPhone::class)->findBy([], ['createdAt' => 'DESC']);

        return $this->json(array_map(static fn (BlockedPhone $b) => [
            'phone' => $b->getPhone(),
            'formatted' => Phone::format($b->getPhone()),
            'reason' => $b->getReason(),
            'createdAt' => $b->getCreatedAt()->format(DATE_ATOM),
        ], $rows));
    }

    /** Body: {"phone": "0555 12 34 56", "reason": "Refused 3 parcels"} */
    #[Route('/blocked-phones', methods: ['POST'])]
    public function block(Request $request): JsonResponse
    {
        $in = Input::fromRequest($request);
        $phone = Phone::normalize($in->string('phone', min: 1, max: 30));
        $reason = $in->string('reason', max: 255, required: false);
        if ($phone === null) {
            $in->addError('phone', 'Enter a mobile number starting with 05, 06 or 07.');
        }
        $in->throwIfInvalid();
        assert($phone !== null);

        if ($this->em->find(BlockedPhone::class, $phone) === null) {
            $this->em->persist(new BlockedPhone($phone, $reason));
            $this->em->flush();
        }

        return $this->json(['phone' => $phone, 'formatted' => Phone::format($phone)], 201);
    }

    #[Route('/blocked-phones/{phone}', requirements: ['phone' => '0\d{9}'], methods: ['DELETE'])]
    public function unblock(string $phone): JsonResponse
    {
        $blocked = $this->em->find(BlockedPhone::class, $phone);
        if ($blocked !== null) {
            $this->em->remove($blocked);
            $this->em->flush();
        }

        return new JsonResponse(null, 204);
    }
}
