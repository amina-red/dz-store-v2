<?php

namespace App\Controller\Admin;

use App\Entity\Category;
use App\Entity\Product;
use App\Http\ApiException;
use App\Http\Input;
use App\Service\Presenter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/api/admin/categories')]
final class CategoryAdminController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly Presenter $presenter,
        private readonly SluggerInterface $slugger,
    ) {
    }

    #[Route('', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $rows = $this->em->createQuery(
            'SELECT c AS category, COUNT(p.id) AS productCount FROM App\Entity\Category c
             LEFT JOIN App\Entity\Product p WITH p.category = c
             GROUP BY c.id ORDER BY c.position ASC, c.id ASC'
        )->getResult();

        return $this->json(array_map(
            fn (array $row) => $this->presenter->category($row['category'], (int) $row['productCount']),
            $rows,
        ));
    }

    /** Body: {"name": {"ar": "نساء", "fr": "Femmes", "en": "Women"}, "position": 1} */
    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $in = Input::fromRequest($request);
        $names = $in->translations('name', 120);
        $position = $in->int('position', 0, 1000, required: false) ?? 0;
        $in->throwIfInvalid();

        $category = new Category($this->uniqueSlug($names), $names['ar'], $names['fr'], $names['en'], $position);
        $this->em->persist($category);
        $this->em->flush();

        return $this->json($this->presenter->category($category, 0), 201);
    }

    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $category = $this->find($id);
        $in = Input::fromRequest($request);
        $names = $in->translations('name', 120);
        $position = $in->int('position', 0, 1000, required: false) ?? $category->getPosition();
        $in->throwIfInvalid();

        $category->rename($names['ar'], $names['fr'], $names['en']);
        $category->setPosition($position);
        $this->em->flush();

        return $this->json($this->presenter->category($category));
    }

    #[Route('/{id}', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $category = $this->find($id);
        $used = $this->em->getRepository(Product::class)->count(['category' => $category]);
        if ($used > 0) {
            throw new ApiException(409, sprintf('Move or delete its %d products first.', $used));
        }

        $this->em->remove($category);
        $this->em->flush();

        return new JsonResponse(null, 204);
    }

    /** @param array{ar: string, fr: string, en: string} $names */
    private function uniqueSlug(array $names): string
    {
        $source = $names['fr'] !== '' ? $names['fr'] : ($names['en'] !== '' ? $names['en'] : $names['ar']);
        $base = $this->slugger->slug($source)->lower()->toString() ?: 'category';
        $slug = $base;
        for ($n = 2; $this->em->getRepository(Category::class)->findOneBy(['slug' => $slug]) !== null; ++$n) {
            $slug = $base.'-'.$n;
        }

        return $slug;
    }

    private function find(int $id): Category
    {
        $category = $this->em->find(Category::class, $id);
        if ($category === null) {
            throw ApiException::notFound('Category not found.');
        }

        return $category;
    }
}
