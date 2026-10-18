<?php
/* Robokassa.
   Форма:   SignatureValue = md5("login:OutSum:InvId:Password1")
   ResultURL: md5("OutSum:InvId:Password2") -> ответ "OK{InvId}"  */
class RobokassaGateway extends Gateway {
    public function id(): string    { return 'robokassa'; }
    public function title(): string { return 'Банковская карта (Robokassa)'; }
    public function enabled(): bool  { return setting('rk_enabled') === '1' && setting('rk_login') !== ''; }
    public function icons(): array   { return ['/payment-systems/logo-visa.png','/payment-systems/logo-mastercard.png','/payment-systems/logo-mir.png']; }

    public function createPayment(array $order): string {
        $login = setting('rk_login');
        $pass1 = setting('rk_pass1');
        $sum   = number_format($order['amount'], 2, '.', '');
        $inv   = $order['id'];
        $desc  = 'Привилегия ' . $order['privilege'] . ' для ' . $order['nickname'];
        $sign  = md5("$login:$sum:$inv:$pass1");
        $params = [
            'MerchantLogin' => $login,
            'OutSum'        => $sum,
            'InvId'         => $inv,
            'Description'   => $desc,
            'SignatureValue'=> $sign,
            'Culture'       => 'ru',
            'Encoding'      => 'utf-8',
        ];
        if (setting('rk_test') === '1') $params['IsTest'] = 1;
        return 'https://auth.robokassa.ru/Merchant/Index.aspx?' . http_build_query($params);
    }

    public function handleCallback(): array {
        $sum   = $_REQUEST['OutSum']         ?? '';
        $inv   = $_REQUEST['InvId']          ?? '';
        $sign  = $_REQUEST['SignatureValue'] ?? '';
        $pass2 = setting('rk_pass2');
        $expected = md5("$sum:$inv:$pass2");
        if (!hash_equals(strtolower($expected), strtolower($sign))) {
            throw new Exception('bad sign');
        }
        return [
            'order_id' => (int)$inv,
            'amount'   => (float)$sum,
            'ext_id'   => (string)$inv,
            'response' => 'OK' . (int)$inv,
        ];
    }
}
