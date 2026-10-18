<?php
/* Куда касса возвращает покупателя при отмене/неуспешной оплате. */
require_once __DIR__ . '/../app/helpers.php';
$orderId = (int)($_GET['order'] ?? 0);
if ($orderId) {
    // помечаем отменённым, если ещё не оплачен
    db()->prepare("UPDATE orders SET status='canceled' WHERE id=? AND status='pending'")->execute([$orderId]);
}
?><!doctype html><html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Оплата не завершена — ReallyWorld</title>
<link rel="stylesheet" href="/css/fonts.min.css">
<style>
 body{font-family:"Mazzard M",Segoe UI,sans-serif;background:#f6f6f6;color:#222;margin:0;
   min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
 .card{background:#fff;border-radius:18px;box-shadow:0 25px 45px rgba(0,0,0,.12);
   max-width:440px;width:100%;padding:38px 32px;text-align:center}
 .ic{width:84px;height:84px;line-height:84px;border-radius:50%;margin:0 auto 20px;font-size:40px;background:#fdecec;color:#e02424}
 h1{font-family:"Mazzard H",sans-serif;text-transform:uppercase;font-size:24px;margin:0 0 12px}
 p{color:#555;line-height:1.55}
 .btn{display:inline-block;margin-top:22px;background:#fc9404;color:#fff;text-decoration:none;
   border-bottom:4px solid #d27a00;border-radius:12px;padding:13px 26px;font-weight:bold;text-transform:uppercase}
</style></head><body>
<div class="card">
 <div class="ic">✕</div>
 <h1>Оплата не завершена</h1>
 <p>Платёж был отменён или не прошёл. Средства не списаны. Вы можете попробовать ещё раз.</p>
 <a class="btn" href="/">Вернуться на сайт</a>
</div>
</body></html>
