<?php
/* Куда касса возвращает покупателя после оплаты. */
require_once __DIR__ . '/../app/helpers.php';
$orderId = (int)($_GET['order'] ?? 0);
$order = null;
if ($orderId) {
    $st = db()->prepare('SELECT * FROM orders WHERE id = ?');
    $st->execute([$orderId]);
    $order = $st->fetch();
}
$paid = $order && $order['status'] === 'paid';
?><!doctype html><html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?php echo $paid ? 'Оплата получена' : 'Платёж обрабатывается'; ?> — ReallyWorld</title>
<link rel="stylesheet" href="/css/fonts.min.css">
<?php if (!$paid): ?><meta http-equiv="refresh" content="5"><?php endif; ?>
<style>
 body{font-family:"Mazzard M",Segoe UI,sans-serif;background:#f6f6f6;color:#222;margin:0;
   min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
 .card{background:#fff;border-radius:18px;box-shadow:0 25px 45px rgba(0,0,0,.12);
   max-width:440px;width:100%;padding:38px 32px;text-align:center}
 .ic{width:84px;height:84px;line-height:84px;border-radius:50%;margin:0 auto 20px;font-size:40px}
 .ic.ok{background:#eafaef;color:#1fbf57}.ic.wait{background:#fff4e3;color:#fc9404}
 h1{font-family:"Mazzard H",sans-serif;text-transform:uppercase;font-size:24px;margin:0 0 12px}
 p{color:#555;line-height:1.55;margin:6px 0}b{color:#fc9404}
 .btn{display:inline-block;margin-top:22px;background:#fc9404;color:#fff;text-decoration:none;
   border-bottom:4px solid #d27a00;border-radius:12px;padding:13px 26px;font-weight:bold;text-transform:uppercase}
 small{display:block;margin-top:14px;color:#aaa}
</style></head><body>
<div class="card">
<?php if ($paid): ?>
 <div class="ic ok">✓</div>
 <h1>Оплата получена</h1>
 <p>Привилегия <b><?php echo e($order['privilege']); ?></b> для игрока <b><?php echo e($order['nickname']); ?></b> успешно оплачена.</p>
 <p>Сумма: <b><?php echo e(rtrim(rtrim(number_format($order['amount'],2,'.',''),'0'),'.')); ?> <?php echo e($order['currency']); ?></b> · заказ №<?php echo (int)$order['id']; ?></p>
<?php elseif ($order): ?>
 <div class="ic wait">…</div>
 <h1>Платёж обрабатывается</h1>
 <p>Заказ №<?php echo (int)$order['id']; ?> на привилегию <b><?php echo e($order['privilege']); ?></b>.</p>
 <p>Страница обновится автоматически, как только касса подтвердит оплату.</p>
<?php else: ?>
 <div class="ic wait">?</div>
 <h1>Заказ не найден</h1>
 <p>Проверьте ссылку или вернитесь на сайт.</p>
<?php endif; ?>
 <a class="btn" href="/">На главную</a>
 <small>ReallyWorld</small>
</div>
</body></html>
