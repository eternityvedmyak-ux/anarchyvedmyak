<?php
/* GET /api/privileges.php — активные привилегии для витрины магазина. */
require_once __DIR__ . '/../app/helpers.php';
require_db_or_die_json();

$rows = db()->query('SELECT id, category, section, name, price, old_price, image, qty_enabled, qty_max
                     FROM privileges WHERE active = 1 ORDER BY category, sort, id')->fetchAll();
$out = [];
foreach ($rows as $r) {
    $out[] = [
        'id'         => (int)$r['id'],
        'category'   => $r['category'],
        'section'    => $r['section'],
        'name'       => $r['name'],
        'price'      => (float)$r['price'],
        'old_price'  => $r['old_price'] !== null ? (float)$r['old_price'] : null,
        'image'      => $r['image'],
        'qty_enabled'=> (int)$r['qty_enabled'],
        'qty_max'    => (int)$r['qty_max'],
    ];
}
$cats = db()->query('SELECT name FROM categories WHERE active = 1 ORDER BY sort, id')->fetchAll(PDO::FETCH_COLUMN);

json_out(['ok' => true, 'categories' => $cats, 'privileges' => $out, 'currency' => setting('currency', 'RUB')]);
