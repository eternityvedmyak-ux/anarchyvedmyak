<?php
/* Stripe (Checkout) — зарубежные карты Visa/Mastercard и др.
   Создание сессии через REST API, webhook с подписью HMAC-SHA256.
   Ключи и валюту задаёт владелец в админке (нужно юрлицо/Stripe-аккаунт). */
class StripeGateway extends Gateway {
    public function id(): string    { return 'stripe'; }
    public function title(): string { return 'Зарубежная карта (Stripe)'; }
    public function enabled(): bool  { return setting('stripe_enabled') === '1' && setting('stripe_secret') !== ''; }
    public function icons(): array   { return ['/payment-systems/logo-visa.png','/payment-systems/logo-mastercard.png']; }

    public function createPayment(array $order): string {
        $secret   = setting('stripe_secret');
        $currency = strtolower(setting('stripe_currency') ?: 'usd');
        $rate     = (float)(setting('stripe_rate') ?: 90);   // рублей за 1 единицу валюты
        if ($rate <= 0) $rate = 90;
        $unit = (int) round(($order['amount'] / $rate) * 100); // в минимальных единицах
        if ($unit < 1) $unit = 1;

        $fields = [
            'mode'                 => 'payment',
            'success_url'          => $this->successUrl((int)$order['id']),
            'cancel_url'           => $this->failUrl((int)$order['id']),
            'client_reference_id'  => (string)$order['id'],
            'metadata[order_id]'   => (string)$order['id'],
            'line_items[0][quantity]'                              => 1,
            'line_items[0][price_data][currency]'                  => $currency,
            'line_items[0][price_data][unit_amount]'               => $unit,
            'line_items[0][price_data][product_data][name]'        => 'Привилегия ' . $order['privilege'],
            'line_items[0][price_data][product_data][description]' => 'Игрок: ' . $order['nickname'],
        ];

        $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($fields),
            CURLOPT_USERPWD        => $secret . ':',
            CURLOPT_TIMEOUT        => 25,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode($resp, true);
        if ($code !== 200 || empty($data['url'])) {
            throw new Exception('Stripe: ' . ($data['error']['message'] ?? 'ошибка создания сессии'));
        }
        return $data['url'];
    }

    public function handleCallback(): array {
        $secret  = setting('stripe_webhook');
        $payload = file_get_contents('php://input');
        $header  = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
        $t = ''; $v1 = '';
        foreach (explode(',', $header) as $part) {
            $kv = explode('=', $part, 2);
            if (count($kv) === 2) { if ($kv[0] === 't') $t = $kv[1]; if ($kv[0] === 'v1') $v1 = $kv[1]; }
        }
        $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
        if (!$t || !hash_equals($expected, $v1)) {
            throw new Exception('bad sign');
        }
        $event = json_decode($payload, true);
        if (($event['type'] ?? '') !== 'checkout.session.completed') {
            // другие события просто подтверждаем
            return ['order_id' => 0, 'amount' => 0, 'ext_id' => '', 'response' => '', 'skip' => true];
        }
        $obj = $event['data']['object'] ?? [];
        return [
            'order_id'    => (int)($obj['client_reference_id'] ?? ($obj['metadata']['order_id'] ?? 0)),
            'amount'      => (float)(($obj['amount_total'] ?? 0) / 100),
            'ext_id'      => (string)($obj['payment_intent'] ?? $obj['id'] ?? ''),
            'response'    => '',
            'skip_amount' => true,
        ];
    }
}
