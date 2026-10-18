<?php
/* Базовый класс кассы + реестр. */
require_once __DIR__ . '/../helpers.php';

abstract class Gateway {
    abstract public function id(): string;           // 'freekassa'
    abstract public function title(): string;        // подпись в окне выбора
    abstract public function enabled(): bool;         // включена в настройках
    abstract public function icons(): array;          // массив путей к логотипам
    /** Создаёт платёж, возвращает URL для редиректа покупателя. */
    abstract public function createPayment(array $order): string;
    /** Обрабатывает webhook кассы. Возвращает массив:
     *  ['order_id'=>int, 'amount'=>float, 'ext_id'=>string, 'response'=>string]
     *  Бросает Exception при неверной подписи. */
    abstract public function handleCallback(): array;

    protected function successUrl(int $orderId): string {
        return base_url() . '/payment/success.php?order=' . $orderId;
    }
    protected function failUrl(int $orderId): string {
        return base_url() . '/payment/fail.php?order=' . $orderId;
    }
    protected function callbackUrl(): string {
        return base_url() . '/payment/callback.php?gw=' . $this->id();
    }
}

/* ---- Реестр касс ---- */
function gateways_all(): array {
    static $list = null;
    if ($list === null) {
        require_once __DIR__ . '/FreeKassa.php';
        require_once __DIR__ . '/Robokassa.php';
        require_once __DIR__ . '/YooMoney.php';
        require_once __DIR__ . '/Stripe.php';
        $list = [
            'freekassa' => new FreeKassaGateway(),
            'robokassa' => new RobokassaGateway(),
            'yoomoney'  => new YooMoneyGateway(),
            'stripe'    => new StripeGateway(),
        ];
    }
    return $list;
}
function gateway(string $id): ?Gateway {
    $all = gateways_all();
    return $all[$id] ?? null;
}
function gateways_enabled(): array {
    return array_filter(gateways_all(), fn($g) => $g->enabled());
}
