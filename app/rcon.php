<?php
/* Минимальный клиент Source RCON (протокол Minecraft/Valve).
   rcon_run($host,$port,$pass,$cmd) => ['ok'=>bool,'response'=>string,'error'=>string] */

function rcon_run($host, $port, $password, $command, $timeout = 5) {
    $TYPE_AUTH = 3; $TYPE_EXEC = 2; $TYPE_AUTH_RESP = 2;
    $errno = 0; $errstr = '';
    $fp = @fsockopen($host, (int)$port, $errno, $errstr, $timeout);
    if (!$fp) return ['ok' => false, 'response' => '', 'error' => "connect: $errstr ($errno)"];
    stream_set_timeout($fp, $timeout);

    $send = function ($id, $type, $body) use ($fp) {
        $data = pack('VV', $id, $type) . $body . "\x00\x00";
        $packet = pack('V', strlen($data)) . $data;
        fwrite($fp, $packet);
    };
    $read = function () use ($fp) {
        $lenRaw = fread($fp, 4);
        if (strlen($lenRaw) < 4) return null;
        $len = unpack('V', $lenRaw)[1];
        $data = '';
        while (strlen($data) < $len) {
            $chunk = fread($fp, $len - strlen($data));
            if ($chunk === '' || $chunk === false) break;
            $data .= $chunk;
        }
        $id   = unpack('V', substr($data, 0, 4))[1];
        $type = unpack('V', substr($data, 4, 4))[1];
        $body = substr($data, 8, -2);
        return ['id' => $id, 'type' => $type, 'body' => $body];
    };

    // аутентификация
    $send(1, $TYPE_AUTH, (string)$password);
    $resp = $read();
    // некоторые серверы шлют пустой EXEC-ответ перед AUTH_RESPONSE
    if ($resp && $resp['type'] !== $TYPE_AUTH_RESP) $resp = $read();
    if (!$resp || $resp['id'] === -1) { fclose($fp); return ['ok' => false, 'response' => '', 'error' => 'auth failed']; }

    // команда
    $send(2, $TYPE_EXEC, (string)$command);
    $out = $read();
    fclose($fp);
    return ['ok' => true, 'response' => $out['body'] ?? '', 'error' => ''];
}

/* Выдать товар по оплаченному заказу (если включён RCON).
   Поддерживает несколько команд — по одной на строку.
   Для привилегии команды берутся из карточки; для валюты — из настройки cur_rcon. */
function issue_order(array $order) {
    if (setting('rcon_enabled') !== '1') return;

    $num = function ($v) { return rtrim(rtrim(number_format((float)$v, 2, '.', ''), '0'), '.'); };

    if (($order['kind'] ?? 'privilege') === 'currency') {
        $raw    = (string)setting('cur_rcon', '');
        $amount = $order['qty'];                       // для валюты {amount} = количество
    } else {
        $st = db()->prepare('SELECT rcon_command, qty_enabled FROM privileges WHERE id = ?');
        $st->execute([$order['privilege_id']]);
        $row = $st->fetch();
        $raw = (string)($row['rcon_command'] ?? '');
        // для кейсов (qty_enabled) {amount} = количество, иначе {amount} = цена
        $amount = (!empty($row['qty_enabled']) && !empty($order['qty'])) ? $order['qty'] : $order['amount'];
    }

    // несколько команд: по одной на строку
    $lines = array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $raw)), 'strlen');
    if (!$lines) return;

    $qty = ($order['qty'] === null || $order['qty'] === '') ? 1 : $order['qty'];
    $repl = [
        '{nick}'   => $order['nickname'],
        '{player}' => $order['nickname'],
        '{user}'   => $order['nickname'],
        '{priv}'   => $order['privilege'],
        '{amount}' => $num($amount),
        '{qty}'    => $num($qty),
        '{price}'  => $num($order['amount']),
        '{order}'  => $order['id'],
    ];

    $allOk = true;
    foreach ($lines as $line) {
        $cmd = strtr($line, $repl);
        $r = rcon_run(setting('rcon_host'), setting('rcon_port'), setting('rcon_password'), $cmd);
        if (!$r['ok']) $allOk = false;
        @file_put_contents(__DIR__ . '/../payment/callbacks.log',
            '[' . date('Y-m-d H:i:s') . '] RCON order ' . $order['id'] . ' "' . $cmd . '" => ' .
            ($r['ok'] ? 'OK ' . $r['response'] : 'ERR ' . $r['error']) . "\n", FILE_APPEND);
    }
    if ($allOk) db()->prepare('UPDATE orders SET issued=1 WHERE id=?')->execute([$order['id']]);
}
