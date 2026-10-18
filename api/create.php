<?php
/* POST /api/create.php — создаёт заказ и возвращает ссылку на оплату.
   Привилегия: { privilege, category, nickname, method, promo? }
   Валюта:     { type:'currency', qty, nickname, method, promo? } */
require_once __DIR__ . '/../app/shop.php';
require_once __DIR__ . '/../app/gateways/Gateway.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_err('Только POST', 405);

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

$nickname = trim($in['nickname'] ?? '');
$method   = trim($in['method'] ?? '');

if (!preg_match('/^[A-Za-z0-9_]{3,16}$/', $nickname)) json_err('Неверный игровой ник');

$gw = gateway($method);
if (!$gw || !$gw->enabled()) json_err('Способ оплаты недоступен');

$cart = cart_resolve($in);
if (!$cart['ok']) json_err($cart['error']);

$currency = setting('currency', 'RUB');
$amount   = (float)$cart['amount'];

/* промокод (применяем на сервере, если валиден) */
$promoCode = '';
$promoIn = trim((string)($in['promo'] ?? ''));
if ($promoIn !== '') {
    $chk = promo_check($promoIn);
    if ($chk['ok']) {
        $amount    = promo_apply_amount($amount, $chk['promo']);
        $promoCode = $chk['promo']['code'];
    }
}

$ins = db()->prepare(
    'INSERT INTO orders (privilege_id, privilege, category, nickname, amount, currency, gateway, status, ip, qty, kind, promo, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
);
$ins->execute([
    $cart['privilege_id'], $cart['privilege'], $cart['category'], $nickname,
    $amount, $currency, $gw->id(), 'pending', client_ip(), $cart['qty'], $cart['kind'],
    ($promoCode !== '' ? $promoCode : null), date('Y-m-d H:i:s'),
]);
$orderId = (int)db()->lastInsertId();

$order = ['id' => $orderId, 'amount' => $amount, 'currency' => $currency,
          'privilege' => $cart['privilege'], 'nickname' => $nickname];

try {
    $redirect = $gw->createPayment($order);
} catch (Throwable $e) {
    db()->prepare("UPDATE orders SET status='failed' WHERE id=?")->execute([$orderId]);
    json_err('Не удалось создать платёж: ' . (APP_DEBUG ? $e->getMessage() : 'попробуйте позже'), 502);
}

json_out(['ok' => true, 'order' => $orderId, 'redirect' => $redirect, 'amount' => $amount]);
