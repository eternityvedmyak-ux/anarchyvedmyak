<?php
/* GET /api/methods.php — список включённых способов оплаты для окна покупки. */
require_once __DIR__ . '/../app/gateways/Gateway.php';

$methods = [];
foreach (gateways_enabled() as $g) {
    $methods[] = ['id' => $g->id(), 'title' => $g->title(), 'icons' => $g->icons()];
}
json_out(['ok' => true, 'methods' => $methods, 'currency' => setting('currency', 'RUB')]);
