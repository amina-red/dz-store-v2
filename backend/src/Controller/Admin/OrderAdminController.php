<?php

namespace App\Controller\Admin;

use App\Domain\OrderStatus;
use App\Entity\AdminUser;
use App\Entity\Order;
use App\Http\ApiException;
use App\Http\Input;
use App\Service\OrderWorkflow;
use App\Service\Presenter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/admin/orders')]
final class OrderAdminController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly OrderWorkflow $workflow,
        private readonly Presenter $presenter,
    ) {
    }

    /** GET /api/admin/orders?status=new&q=0555&page=1 */
    #[Route('', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $status = OrderStatus::tryFrom($request->query->getString('status'));
        $search = trim($request->query->getString('q'));

        $qb = $this->em->createQueryBuilder()->select('o')->from(Order::class, 'o');

        if ($status !== null) {
            $qb->andWhere('o.status = :status')->setParameter('status', $status);
        }

        if ($search !== '') {
            $digits = preg_replace('/\D+/', '', $search) ?? '';
            $or = $qb->expr()->orX('UPPER(o.number) LIKE :q', 'LOWER(o.customerName) LIKE :qLower');
            $qb->setParameter('q', '%'.strtoupper(addcslashes($search, '%_\\')).'%')
                ->setParameter('qLower', '%'.mb_strtolower(addcslashes($search, '%_\\')).'%');
            if (strlen($digits) >= 3) {
                $or->add('o.phone LIKE :digits');
                $qb->setParameter('digits', '%'.$digits.'%');
            }
            $qb->andWhere($or);
        }

        $total = (int) (clone $qb)->select('COUNT(o.id)')->getQuery()->getSingleScalarResult();

        // "New" orders oldest first (call them in order); everything else newest first.
        $qb->orderBy('o.createdAt', $status === OrderStatus::New ? 'ASC' : 'DESC')
            ->setFirstResult(($page - 1) * self::PER_PAGE)
            ->setMaxResults(self::PER_PAGE);

        /** @var list<Order> $orders */
        $orders = $qb->getQuery()->getResult();
        $refusals = $this->workflow->refusalsByPhone(array_map(static fn (Order $o) => $o->getPhone(), $orders));

        $counts = [];
        foreach ($this->em->createQuery('SELECT o.status AS status, COUNT(o.id) AS n FROM App\Entity\Order o GROUP BY o.status')->getArrayResult() as $row) {
            $key = $row['status'] instanceof OrderStatus ? $row['status']->value : (string) $row['status'];
            $counts[$key] = (int) $row['n'];
        }

        return $this->json([
            'items' => array_map(fn (Order $o) => $this->presenter->orderRow($o, $refusals[$o->getPhone()] ?? 0), $orders),
            'page' => $page,
            'perPage' => self::PER_PAGE,
            'total' => $total,
            'pages' => (int) ceil($total / self::PER_PAGE),
            'countsByStatus' => $counts,
        ]);
    }

    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $order = $this->em->find(Order::class, $id);
        if ($order === null) {
            throw ApiException::notFound('Order not found.');
        }

        return $this->json($this->detail($order));
    }

    /** Body: {"status": "confirmed", "note": "Buyer confirmed, deliver after 5 pm"} */
    #[Route('/{id}/status', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function changeStatus(int $id, Request $request, #[CurrentUser] AdminUser $admin): JsonResponse
    {
        $in = Input::fromRequest($request);
        $to = $in->enum('status', OrderStatus::class);
        $note = $in->text('note', 500);
        $in->throwIfInvalid();
        assert($to instanceof OrderStatus);

        $order = $this->workflow->move($id, $to, $note, $admin->getEmail());

        return $this->json($this->detail($order));
    }

    /** @return array<string, mixed> */
    private function detail(Order $order): array
    {
        $refusals = $this->workflow->refusalsByPhone([$order->getPhone()])[$order->getPhone()] ?? 0;

        return $this->presenter->orderForAdmin($order, $refusals);
    }
}
