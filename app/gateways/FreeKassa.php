<?php
/* FreeKassa (SCI).
   Форма:   sign = md5("merchant:amount:secret1:currency:order")
   Webhook: sign = md5("merchant:amount:secret2:order")  -> ответ "YES"  */
class FreeKassaGateway extends Gateway {
    public function id(): string    { return 'freekassa'; }
    public function title(): string { return 'Карта · СБП · кошельки (FreeKassa)'; }
    public function enabled(): bool  { return setting('fk_enabled') === '1' && setting('fk_merchant') !== ''; }
    public function icons(): array   { return ['/payment-systems/logo-mir.png','/payment-systems/logo-visa.png','/payment-systems/logo-mastercard.png','/payment-systems/logo-sbp.png','/payment-systems/logo-qiwi.png']; }

    public function createPayment(array $order): string {
        $m       = setting('fk_merchant');
        $secret1 = setting('fk_secret1');
        $amount  = number_format($order['amount'], 2, '.', '');
        $cur     = $order['currency'] ?: 'RUB';
        $oid     = $order['id'];
        $sign    = md5("$m:$amount:$secret1:$cur:$oid");
        $params  = [
            'm'        => $m,
            'oa'       => $amount,
            'currency' => $cur,
            'o'        => $oid,
            's'        => $sign,
            'us_priv'  => $order['privilege'],
            'us_nick'  => $order['nickname'],
        ];
        return 'https://pay.freekassa.ru/?' . http_build_query($params);
    }

    public function handleCallback(): array {
        $m       = $_POST['MERCHANT_ID']       ?? '';
        $amount  = $_POST['AMOUNT']            ?? '';
        $oid     = $_POST['MERCHANT_ORDER_ID'] ?? '';
        $sign    = $_POST['SIGN']             ?? '';
        $secret2 = setting('fk_secret2');
        $expected = md5("$m:$amount:$secret2:$oid");
        if (!hash_equals($expected, strtolower($sign))) {
            throw new Exception('bad sign');
        }
        return [
            'order_id' => (int)$oid,
            'amount'   => (float)$amount,
            'ext_id'   => (string)($_POST['intid'] ?? ''),
            'response' => 'YES',
        ];
    }
}
