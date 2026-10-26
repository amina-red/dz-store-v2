<?php

namespace App\Command;

use App\Entity\AdminUser;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 *   php bin/console app:create-admin owner@shop.dz
 *   php bin/console app:create-admin --from-env      (uses ADMIN_EMAIL and ADMIN_PASSWORD; skips if the admin exists)
 */
#[AsCommand(name: 'app:create-admin', description: 'Create an admin account, or change its password')]
final class CreateAdminCommand extends Command
{
    private const MIN_PASSWORD = 10;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::OPTIONAL, 'Admin email')
            ->addOption('from-env', null, InputOption::VALUE_NONE, 'Read ADMIN_EMAIL and ADMIN_PASSWORD from the environment');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $fromEnv = (bool) $input->getOption('from-env');

        $email = $fromEnv ? (string) ($_SERVER['ADMIN_EMAIL'] ?? $_ENV['ADMIN_EMAIL'] ?? '') : (string) $input->getArgument('email');
        $email = mb_strtolower(trim($email));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $io->error($fromEnv ? 'Set ADMIN_EMAIL to a valid email.' : 'Give a valid email: app:create-admin you@example.com');

            return Command::FAILURE;
        }

        $admin = $this->em->getRepository(AdminUser::class)->findOneBy(['email' => $email]);
        if ($fromEnv && $admin !== null) {
            $io->writeln(sprintf('Admin %s already exists.', $email));

            return Command::SUCCESS;
        }

        $password = $fromEnv
            ? (string) ($_SERVER['ADMIN_PASSWORD'] ?? $_ENV['ADMIN_PASSWORD'] ?? '')
            : (string) $io->askHidden('Password (at least '.self::MIN_PASSWORD.' characters)');

        if (mb_strlen($password) < self::MIN_PASSWORD) {
            $io->error(sprintf('The password needs at least %d characters.', self::MIN_PASSWORD));

            return Command::FAILURE;
        }

        $admin ??= new AdminUser($email);
        $admin->setPassword($this->hasher->hashPassword($admin, $password));
        $this->em->persist($admin);
        $this->em->flush();

        $io->success(sprintf('Admin %s is ready. Sign in at /admin.', $email));

        return Command::SUCCESS;
    }
}
