<?php
/* ЮMoney (Quickpay, кошелёк).
   Форма не подписывается. Webhook (HTTP-уведомление):
   sha1_hash = sha1("type&op_id&amount&currency&datetime&sender&codepro&secret&label") */
class YooMoneyGateway extends Gateway {
    public function id(): string    { return 'yoomoney'; }
    public function title(): string { return 'ЮMoney (кошелёк, карта)'; }
    public function enabled(): bool  { return setting('ym_enabled') === '1' && setting('ym_receiver') !== ''; }
    public function icons(): array   { return ['/payment-systems/logo-iomoney.png','/payment-systems/logo-visa.png','/payment-systems/logo-mastercard.png']; }

    public function createPayment(array $order): string {
        $params = [
            'receiver'      => setting('ym_receiver'),
            'quickpay-form' => 'shop',
            'targets'       => 'Привилегия ' . $order['privilege'] . ' (' . $order['nickname'] . ')',
            'paymentType'   => 'AC',                     // AC=карта, PC=кошелёк ЮMoney
            'sum'           => number_format($order['amount'], 2, '.', ''),
            'label'         => (string)$order['id'],
            'successURL'    => $this->successUrl((int)$order['id']),
        ];
        return 'https://yoomoney.ru/quickpay/confirm?' . http_build_query($params);
    }

    public function handleCallback(): array {
        $secret = setting('ym_secret');
        $f = function ($k) { return (string)($_POST[$k] ?? ''); };
        $str = $f('notification_type') . '&' . $f('operation_id') . '&' . $f('amount') . '&'
             . $f('currency') . '&' . $f('datetime') . '&' . $f('sender') . '&'
             . $f('codepro') . '&' . $secret . '&' . $f('label');
        if (!hash_equals(sha1($str), strtolower($f('sha1_hash')))) {
            throw new Exception('bad sign');
        }
        return [
            'order_id'     => (int)$f('label'),
            'amount'       => (float)$f('amount'),  // сумма за вычетом комиссии ЮMoney
            'ext_id'       => $f('operation_id'),
            'response'     => '',                   // ЮMoney достаточно HTTP 200
            'skip_amount'  => true,                 // не сверять сумму (есть комиссия)
        ];
    }
}
