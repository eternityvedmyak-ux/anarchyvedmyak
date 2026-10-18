<?php
/* Приём уведомлений от касс: /payment/callback.php?gw=freekassa|robokassa|yoomoney|stripe
   Этот URL вписывается в настройках кассы как "Notification/Result URL". */
require_once __DIR__ . '/../app/gateways/Gateway.php';
require_once __DIR__ . '/../app/rcon.php';

$gwId = $_GET['gw'] ?? '';
$gw = gateway($gwId);
if (!$gw) { http_response_code(404); echo 'unknown gateway'; exit; }

function log_cb($gwId, $text) {
    @file_put_contents(__DIR__ . '/callbacks.log',
        '[' . date('Y-m-d H:i:s') . "] $gwId $text\n", FILE_APPEND);
}

try {
    $res = $gw->handleCallback();
} catch (Throwable $e) {
    log_cb($gwId, 'REJECT ' . $e->getMessage());
    http_response_code(400); echo 'bad sign'; exit;
}

// служебные события (напр. Stripe не-оплата) — просто 200
if (!empty($res['skip'])) { echo $res['response']; exit; }

$orderId = (int)$res['order_id'];
$st = db()->prepare('SELECT * FROM orders WHERE id = ?');
$st->execute([$orderId]);
$order = $st->fetch();

if (!$order) { log_cb($gwId, "order $orderId not found"); http_response_code(404); echo 'no order'; exit; }

// сверка суммы (кроме касс с комиссией/др. валютой)
if (empty($res['skip_amount']) && abs((float)$res['amount'] - (float)$order['amount']) > 0.01) {
    log_cb($gwId, "order $orderId amount mismatch: got {$res['amount']} expected {$order['amount']}");
    http_response_code(400); echo 'amount mismatch'; exit;
}

if ($order['status'] !== 'paid') {
    db()->prepare("UPDATE orders SET status='paid', ext_id=?, paid_at=? WHERE id=?")
        ->execute([$res['ext_id'], date('Y-m-d H:i:s'), $orderId]);
    log_cb($gwId, "order $orderId PAID");
    // засчитать использование промокода
    if (!empty($order['promo'])) {
        db()->prepare('UPDATE promos SET used = used + 1 WHERE code = ?')->execute([$order['promo']]);
    }
    // автоматическая выдача привилегии на сервере (RCON), если настроено
    try { issue_order($order); } catch (Throwable $e) { log_cb($gwId, "rcon error: " . $e->getMessage()); }
}

echo $res['response'];
