<?php

namespace App\Controller\Admin;

use App\Http\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin')]
final class UploadController extends AbstractController
{
    private const MAX_BYTES = 5 * 1024 * 1024;

    /** Allowed types, decided from the file's content, not from its name. */
    private const TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function __construct(private readonly string $uploadDir)
    {
    }

    /** multipart/form-data with a "file" field. Returns {"url": "/uploads/products/<random>.webp"} */
    #[Route('/uploads', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile || !$file->isValid()) {
            throw ApiException::invalid(['file' => 'Choose a photo to upload.']);
        }

        if ($file->getSize() > self::MAX_BYTES) {
            throw ApiException::invalid(['file' => 'The photo must be 5 MB or smaller.']);
        }

        $extension = self::TYPES[$file->getMimeType() ?? ''] ?? null;
        if ($extension === null || @getimagesize($file->getPathname()) === false) {
            throw ApiException::invalid(['file' => 'Only JPEG, PNG and WebP photos.']);
        }

        if (!is_dir($this->uploadDir) && !mkdir($this->uploadDir, 0775, true) && !is_dir($this->uploadDir)) {
            throw new \RuntimeException('Cannot create the upload folder.');
        }

        // A random name: nobody can overwrite another photo or guess file names.
        $name = bin2hex(random_bytes(16)).'.'.$extension;
        $file->move($this->uploadDir, $name);

        return $this->json(['url' => '/uploads/products/'.$name], 201);
    }
}
