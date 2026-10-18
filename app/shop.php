<?php
/* Общая логика: что покупают (cart) и промокоды. Используется create.php и promo.php. */
require_once __DIR__ . '/helpers.php';

/* Разбирает запрос покупки и возвращает авторитетную позицию (цена считается тут, не на фронте).
   Вернёт: ['ok'=>bool,'error'=>..., 'kind','amount','privilege','privilege_id','category','qty'] */
function cart_resolve($in) {
    $type = ($in['type'] ?? '') === 'currency' ? 'currency' : 'privilege';

    if ($type === 'currency') {
        if (setting('cur_enabled', '1') !== '1') return ['ok' => false, 'error' => 'Покупка валюты отключена'];
        $min  = (float)setting('cur_min', '100');
        $max  = (float)setting('cur_max', '6000');
        $step = (float)setting('cur_step', '1') ?: 1;
        $rate = (float)setting('cur_rate', '1') ?: 1;
        $qty  = (float)($in['qty'] ?? 0);
        $qty  = round($qty / $step) * $step;
        if ($qty < $min) $qty = $min;
        if ($qty > $max) $qty = $max;
        if ($qty <= 0) return ['ok' => false, 'error' => 'Неверное количество'];
        $name = setting('cur_name', 'Валюта') . ' ×' . rtrim(rtrim(number_format($qty, 2, '.', ''), '0'), '.');
        return ['ok' => true, 'kind' => 'currency', 'amount' => round($qty * $rate, 2),
                'privilege' => $name, 'privilege_id' => null, 'category' => '', 'qty' => $qty];
    }

    $privName = trim($in['privilege'] ?? '');
    $category = trim($in['category'] ?? '');
    if ($privName === '') return ['ok' => false, 'error' => 'Не указана привилегия'];
    $st = db()->prepare('SELECT * FROM privileges WHERE name = ? AND active = 1 ORDER BY (category = ?) DESC LIMIT 1');
    $st->execute([$privName, $category]);
    $priv = $st->fetch();
    if (!$priv) return ['ok' => false, 'error' => 'Привилегия не найдена'];

    // покупка нескольких штук (кейсы): количество выбирает покупатель, цена = за штуку × количество
    if (!empty($priv['qty_enabled'])) {
        $max = (int)$priv['qty_max'] > 0 ? (int)$priv['qty_max'] : 64;
        $qty = (int)round((float)($in['qty'] ?? 1));
        if ($qty < 1) $qty = 1;
        if ($qty > $max) $qty = $max;
        $name = $priv['name'] . ' ×' . $qty;
        return ['ok' => true, 'kind' => 'privilege', 'amount' => round((float)$priv['price'] * $qty, 2),
                'privilege' => $name, 'privilege_id' => (int)$priv['id'], 'category' => $priv['category'], 'qty' => $qty];
    }

    return ['ok' => true, 'kind' => 'privilege', 'amount' => (float)$priv['price'],
            'privilege' => $priv['name'], 'privilege_id' => (int)$priv['id'], 'category' => $priv['category'], 'qty' => null];
}

/* Проверка промокода. Вернёт ['ok'=>true,'promo'=>row] или ['ok'=>false,'error'=>...] */
function promo_check($code) {
    $code = mb_strtoupper(trim((string)$code));
    if ($code === '') return ['ok' => false, 'error' => 'Введите промокод'];
    $st = db()->prepare('SELECT * FROM promos WHERE UPPER(code) = ?');
    $st->execute([$code]);
    $p = $st->fetch();
    if (!$p) return ['ok' => false, 'error' => 'Такого промокода не существует'];
    if ((int)$p['active'] !== 1) return ['ok' => false, 'error' => 'Промокод неактивен'];
    if (!empty($p['expires_at']) && $p['expires_at'] < date('Y-m-d')) return ['ok' => false, 'error' => 'Срок промокода истёк'];
    if ((int)$p['max_uses'] > 0 && (int)$p['used'] >= (int)$p['max_uses']) return ['ok' => false, 'error' => 'Промокод исчерпан'];
    return ['ok' => true, 'promo' => $p];
}

/* Применяет промокод к сумме. Вернёт итоговую цену (>=0). */
function promo_apply_amount($base, $promo) {
    $base = (float)$base;
    $d = ($promo['type'] === 'fixed') ? (float)$promo['value'] : $base * (float)$promo['value'] / 100;
    if ($d < 0) $d = 0;
    if ($d > $base) $d = $base;
    return round($base - $d, 2);
}
