<?php

namespace App\Controller\Api;

use App\Domain\CartLines;
use App\Domain\DeliveryType;
use App\Domain\OrderNumber;
use App\Domain\Phone;
use App\Entity\Order;
use App\Entity\Wilaya;
use App\Http\ApiException;
use App\Http\Input;
use App\Service\CartQuoter;
use App\Service\OrderPlacer;
use App\Service\Presenter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/orders')]
final class OrderController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CartQuoter $quoter,
        private readonly OrderPlacer $placer,
        private readonly Presenter $presenter,
    ) {
    }

    /** Prices a cart without saving anything. Body: {"items": [...], "wilayaCode": 25, "deliveryType": "home"} */
    #[Route('/quote', methods: ['POST'])]
    public function quote(Request $request): JsonResponse
    {
        $in = Input::fromRequest($request);
        $lines = $this->cartLines($in);

        $wilaya = null;
        $deliveryType = null;
        if ($in->raw('wilayaCode') !== null && $in->raw('deliveryType') !== null) {
            $code = $in->int('wilayaCode', 1, 58);
            $deliveryType = $in->enum('deliveryType', DeliveryType::class);
            $in->throwIfInvalid();
            $wilaya = $this->em->find(Wilaya::class, $code);
        }

        return $this->json($this->quoter->quote($lines, $this->quoter->loadVariants($lines, lock: false), $wilaya, $deliveryType));
    }

    /** Places a cash-on-delivery order. */
    #[Route('', methods: ['POST'])]
    public function place(Request $request): JsonResponse
    {
        $in = Input::fromRequest($request);

        $name = $in->string('customerName', min: 2, max: 80);
        $phone = Phone::normalize($in->string('phone', min: 1, max: 30));
        if ($phone === null && $in->raw('phone') !== null) {
            $in->addError('phone', 'Enter a mobile number starting with 05, 06 or 07.');
        }
        $code = $in->int('wilayaCode', 1, 58);
        $commune = $in->string('commune', min: 2, max: 80);
        $deliveryType = $in->enum('deliveryType', DeliveryType::class);
        $address = $in->string('address', min: $deliveryType === DeliveryType::Home ? 5 : 0, max: 255, required: $deliveryType === DeliveryType::Home);
        $note = $in->text('note', 500);
        $locale = in_array($in->raw('locale'), ['ar', 'fr', 'en'], true) ? $in->raw('locale') : 'ar';
        $lines = $this->cartLines($in);

        $wilaya = $code !== null ? $this->em->find(Wilaya::class, $code) : null;
        if ($code !== null && ($wilaya === null || !$wilaya->isActive())) {
            $in->addError('wilayaCode', 'We do not deliver to this wilaya yet.');
        }

        $in->throwIfInvalid();
        assert($wilaya instanceof Wilaya && $deliveryType instanceof DeliveryType && $phone !== null);

        $order = $this->placer->place(
            $name,
            $phone,
            $wilaya,
            $commune,
            $deliveryType === DeliveryType::Home ? $address : '',
            $deliveryType,
            $note,
            $locale,
            $lines,
        );

        return $this->json([
            'number' => $order->getNumber(),
            'status' => $order->getStatus()->value,
            'subtotal' => $order->getSubtotal(),
            'deliveryFee' => $order->getDeliveryFee(),
            'total' => $order->getTotal(),
        ], 201);
    }

    /** GET /api/orders/track?number=DZ7K3F9Q&phone=0555123456 */
    #[Route('/track', methods: ['GET'])]
    public function track(Request $request, RateLimiterFactoryInterface $orderTrackingLimiter): JsonResponse
    {
        $number = OrderNumber::normalize($request->query->getString('number'));
        $phone = Phone::normalize($request->query->getString('phone'));

        // The argument name "orderTrackingLimiter" picks the "order_tracking" limiter from framework.yaml.
        if (!$orderTrackingLimiter->create($number !== '' ? $number : 'empty')->consume()->isAccepted()) {
            throw new ApiException(429, 'Too many tries. Wait a minute and try again.');
        }

        $order = null;
        if (OrderNumber::isValid($number) && $phone !== null) {
            $order = $this->em->getRepository(Order::class)->findOneBy(['number' => $number, 'phone' => $phone]);
        }

        if (!$order instanceof Order) {
            // Same answer for a wrong number and a wrong phone.
            throw ApiException::notFound('No order found with this number and phone.');
        }

        return $this->json($this->presenter->orderForBuyer($order));
    }

    /** @return array<int, int> */
    private function cartLines(Input $in): array
    {
        try {
            return CartLines::parse($in->raw('items'));
        } catch (\InvalidArgumentException $e) {
            throw ApiException::invalid(['items' => $e->getMessage()], $e->getMessage());
        }
    }
}
