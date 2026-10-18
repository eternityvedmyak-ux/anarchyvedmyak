<?php
/* POST /api/promo.php — проверка промокода и расчёт скидки для окна покупки.
   Тело: { code, type?, privilege?, category?, qty? } — то же, что у create.php, плюс code. */
require_once __DIR__ . '/../app/shop.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_err('Только POST', 405);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$chk = promo_check($in['code'] ?? '');
if (!$chk['ok']) json_out(['ok' => false, 'error' => $chk['error']]);

$cart = cart_resolve($in);
if (!$cart['ok']) json_err($cart['error']);

$promo = $chk['promo'];
$base  = (float)$cart['amount'];
$final = promo_apply_amount($base, $promo);
$discount = round($base - $final, 2);

$label = $promo['type'] === 'fixed'
    ? ('−' . rtrim(rtrim(number_format((float)$promo['value'], 2, '.', ''), '0'), '.') . ' ₽')
    : ('−' . rtrim(rtrim(number_format((float)$promo['value'], 2, '.', ''), '0'), '.') . '%');

json_out([
    'ok'       => true,
    'code'     => mb_strtoupper(trim((string)($in['code'] ?? ''))),
    'base'     => $base,
    'final'    => $final,
    'discount' => $discount,
    'label'    => $label,
]);
