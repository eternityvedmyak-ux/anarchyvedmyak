<?php
/* GET /api/recent.php — последние оплаченные покупки (ник замазан) для блока на сайте. */
require_once __DIR__ . '/../app/helpers.php';
require_db_or_die_json();

header('Content-Type: application/json; charset=utf-8');

function mask_nick($n) {
    $n = (string)$n;
    $len = mb_strlen($n);
    if ($len <= 1) return '***';
    if ($len <= 3) return mb_substr($n, 0, 1) . '***';
    $pre = max(2, (int)ceil($len * 0.4));
    $suf = max(1, (int)floor($len * 0.25));
    if ($pre + $suf >= $len) { $pre = $len - 2; $suf = 1; }
    return mb_substr($n, 0, $pre) . '***' . mb_substr($n, -$suf);
}

$style = [
    'bg'    => setting('recent_bg', '#16181d'),
    'card'  => setting('recent_card', '#1d2027'),
    'text'  => setting('recent_text', '#ffffff'),
    'muted' => setting('recent_muted', '#8b919c'),
];

if (setting('recent_enabled', '1') !== '1') {
    json_out(['ok' => true, 'enabled' => false, 'purchases' => [], 'style' => $style]);
}

$limit = (int)setting('recent_count', '12');
if ($limit < 1) $limit = 1;
if ($limit > 50) $limit = 50;
$rows = db()->query(
    "SELECT o.privilege, o.nickname, o.kind, o.privilege_id, p.image AS priv_image
     FROM orders o LEFT JOIN privileges p ON p.id = o.privilege_id
     WHERE o.status = 'paid'
     ORDER BY o.id DESC LIMIT $limit"
)->fetchAll();

$curImg = setting('cur_image', '') ?: '/images/coin_shop.webp';

$out = [];
foreach ($rows as $r) {
    $img = ($r['kind'] === 'currency') ? $curImg : ($r['priv_image'] ?: '/images/chest.png');
    $out[] = [
        'nick'  => mask_nick($r['nickname']),
        'item'  => $r['privilege'],
        'image' => $img,
    ];
}
json_out(['ok' => true, 'enabled' => true, 'purchases' => $out, 'style' => $style]);
