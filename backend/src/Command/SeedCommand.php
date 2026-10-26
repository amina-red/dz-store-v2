<?php

namespace App\Command;

use App\Entity\Category;
use App\Entity\Product;
use App\Entity\ProductVariant;
use App\Entity\Wilaya;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Fills an empty database: the 58 wilayas, and (unless --no-demo) a small demo catalog.
 * Safe to run again: it only adds what is missing and never changes your edits.
 */
#[AsCommand(name: 'app:seed', description: 'Add the 58 wilayas and a demo catalog to an empty database')]
final class SeedCommand extends Command
{
    /**
     * code => [Arabic name, French name, zone]
     * Zones only set the starting delivery prices; change them in the admin.
     */
    private const WILAYAS = [
        1 => ['أدرار', 'Adrar', 'south'], 2 => ['الشلف', 'Chlef', 'north'], 3 => ['الأغواط', 'Laghouat', 'high'],
        4 => ['أم البواقي', 'Oum El Bouaghi', 'north'], 5 => ['باتنة', 'Batna', 'north'], 6 => ['بجاية', 'Béjaïa', 'north'],
        7 => ['بسكرة', 'Biskra', 'high'], 8 => ['بشار', 'Béchar', 'south'], 9 => ['البليدة', 'Blida', 'north'],
        10 => ['البويرة', 'Bouira', 'north'], 11 => ['تمنراست', 'Tamanrasset', 'far'], 12 => ['تبسة', 'Tébessa', 'north'],
        13 => ['تلمسان', 'Tlemcen', 'north'], 14 => ['تيارت', 'Tiaret', 'north'], 15 => ['تيزي وزو', 'Tizi Ouzou', 'north'],
        16 => ['الجزائر', 'Alger', 'north'], 17 => ['الجلفة', 'Djelfa', 'high'], 18 => ['جيجل', 'Jijel', 'north'],
        19 => ['سطيف', 'Sétif', 'north'], 20 => ['سعيدة', 'Saïda', 'north'], 21 => ['سكيكدة', 'Skikda', 'north'],
        22 => ['سيدي بلعباس', 'Sidi Bel Abbès', 'north'], 23 => ['عنابة', 'Annaba', 'north'], 24 => ['قالمة', 'Guelma', 'north'],
        25 => ['قسنطينة', 'Constantine', 'north'], 26 => ['المدية', 'Médéa', 'north'], 27 => ['مستغانم', 'Mostaganem', 'north'],
        28 => ['المسيلة', "M'Sila", 'high'], 29 => ['معسكر', 'Mascara', 'north'], 30 => ['ورقلة', 'Ouargla', 'south'],
        31 => ['وهران', 'Oran', 'north'], 32 => ['البيض', 'El Bayadh', 'high'], 33 => ['إليزي', 'Illizi', 'far'],
        34 => ['برج بوعريريج', 'Bordj Bou Arréridj', 'north'], 35 => ['بومرداس', 'Boumerdès', 'north'], 36 => ['الطارف', 'El Tarf', 'north'],
        37 => ['تندوف', 'Tindouf', 'far'], 38 => ['تيسمسيلت', 'Tissemsilt', 'north'], 39 => ['الوادي', 'El Oued', 'south'],
        40 => ['خنشلة', 'Khenchela', 'north'], 41 => ['سوق أهراس', 'Souk Ahras', 'north'], 42 => ['تيبازة', 'Tipaza', 'north'],
        43 => ['ميلة', 'Mila', 'north'], 44 => ['عين الدفلى', 'Aïn Defla', 'north'], 45 => ['النعامة', 'Naâma', 'high'],
        46 => ['عين تموشنت', 'Aïn Témouchent', 'north'], 47 => ['غرداية', 'Ghardaïa', 'south'], 48 => ['غليزان', 'Relizane', 'north'],
        49 => ['تيميمون', 'Timimoun', 'south'], 50 => ['برج باجي مختار', 'Bordj Badji Mokhtar', 'far'], 51 => ['أولاد جلال', 'Ouled Djellal', 'high'],
        52 => ['بني عباس', 'Béni Abbès', 'south'], 53 => ['عين صالح', 'In Salah', 'far'], 54 => ['عين قزام', 'In Guezzam', 'far'],
        55 => ['تقرت', 'Touggourt', 'south'], 56 => ['جانت', 'Djanet', 'far'], 57 => ['المغير', "El M'Ghair", 'south'],
        58 => ['المنيعة', 'El Meniaa', 'south'],
    ];

    /** Starting prices in DA per zone: [home, stop desk or null]. These are examples, not a carrier's real prices. */
    private const ZONE_FEES = [
        'north' => [600, 400],
        'high' => [800, 500],
        'south' => [1000, 700],
        'far' => [1500, null],
    ];

    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('no-demo', null, InputOption::VALUE_NONE, 'Only add the wilayas, no demo products');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $added = 0;
        foreach (self::WILAYAS as $code => [$ar, $fr, $zone]) {
            if ($this->em->find(Wilaya::class, $code) === null) {
                [$home, $desk] = self::ZONE_FEES[$zone];
                $this->em->persist(new Wilaya($code, $ar, $fr, $home, $desk));
                ++$added;
            }
        }
        $this->em->flush();
        $io->writeln(sprintf('Wilayas: %d added, %d already there.', $added, count(self::WILAYAS) - $added));

        if ($input->getOption('no-demo')) {
            return Command::SUCCESS;
        }

        if ($this->em->getRepository(Product::class)->count([]) > 0) {
            $io->writeln('Demo catalog: skipped, the shop already has products.');

            return Command::SUCCESS;
        }

        $this->seedDemoCatalog();
        $io->success('Demo catalog added: 6 categories, 8 products. Replace them with your real products in the admin.');

        return Command::SUCCESS;
    }

    private function seedDemoCatalog(): void
    {
        $categories = [];
        foreach ([
            ['women', 'نساء', 'Femmes', 'Women'],
            ['men', 'رجال', 'Hommes', 'Men'],
            ['kids', 'أطفال', 'Enfants', 'Kids'],
            ['shoes', 'أحذية', 'Chaussures', 'Shoes'],
            ['bags', 'حقائب', 'Sacs', 'Bags'],
            ['beauty', 'تجميل', 'Beauté', 'Beauty'],
        ] as $position => [$slug, $ar, $fr, $en]) {
            $categories[$slug] = new Category($slug, $ar, $fr, $en, $position);
            $this->em->persist($categories[$slug]);
        }

        // [slug, category, ar, fr, en, base price, sale price, colors, sizes, stock per variant]
        $products = [
            ['abaya-en-lin', 'women', 'عباية كتان', 'Abaya en lin', 'Linen abaya', 4900, null, ['Beige', 'Vert olive', 'Noir'], ['S', 'M', 'L', 'XL'], 4],
            ['sac-en-cuir', 'bags', 'حقيبة جلدية', 'Sac en cuir', 'Leather handbag', 3500, 3150, ['Vert', 'Camel'], [''], 6],
            ['baskets-enfant', 'kids', 'حذاء رياضي للأطفال', 'Baskets enfant', 'Kids sneakers', 2800, null, ['Blanc', 'Rose', 'Bleu'], ['28', '30', '32', '34'], 3],
            ['veste-en-jean', 'men', 'سترة جينز رجالية', 'Veste en jean homme', "Men's denim jacket", 5200, null, ['Bleu'], ['M', 'L', 'XL', 'XXL'], 0],
            ['foulard-en-soie', 'women', 'وشاح حرير', 'Foulard en soie', 'Silk scarf', 1600, null, ['Bordeaux', 'Bleu nuit', 'Moutarde'], [''], 10],
            ['coffret-argan', 'beauty', 'طقم زيت الأرغان', "Coffret huile d'argan", 'Argan oil set', 2200, 1980, [''], [''], 15],
            ['gilet-en-laine', 'women', 'كنزة صوف', 'Gilet en laine', 'Wool cardigan', 3900, null, ['Gris', 'Crème'], ['S', 'M', 'L'], 2],
            ['bottines-cuir', 'shoes', 'حذاء جلدي نصف ساق', 'Bottines en cuir', 'Leather ankle boots', 6900, null, ['Noir', 'Marron'], ['37', '38', '39', '40'], 2],
        ];

        foreach ($products as [$slug, $cat, $ar, $fr, $en, $base, $sale, $colors, $sizes, $stock]) {
            $product = new Product($slug, $categories[$cat], $base);
            $product->setNames(['ar' => $ar, 'fr' => $fr, 'en' => $en]);
            $product->setDescriptions([
                'ar' => 'منتج تجريبي. استبدله بمنتجاتك من لوحة التحكم.',
                'fr' => 'Produit de démonstration. Remplacez-le par vos produits depuis l\'admin.',
                'en' => 'Demo product. Replace it with your own products in the admin.',
            ]);
            $product->setPrices($base, $sale);

            foreach ($colors as $color) {
                foreach ($sizes as $size) {
                    new ProductVariant($product, $color, $size, $stock);
                }
            }
            $this->em->persist($product);
        }

        $this->em->flush();
    }
}
