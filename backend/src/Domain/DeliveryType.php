<?php

namespace App\Domain;

enum DeliveryType: string
{
    /** Delivered to the buyer's address. */
    case Home = 'home';

    /** The buyer picks the parcel up at the delivery company's office (stop desk). */
    case Desk = 'desk';
}
