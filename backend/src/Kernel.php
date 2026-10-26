<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    public function boot(): void
    {
        // Every date in the shop (order times, "today" on the dashboard) is Algerian time.
        // Algeria has no daylight saving, so this never shifts.
        date_default_timezone_set('Africa/Algiers');

        parent::boot();
    }
}
