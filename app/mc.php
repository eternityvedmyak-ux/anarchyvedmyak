<?php
/* Опрос статуса Minecraft-сервера по протоколу Server List Ping (1.7+).
   mc_status($host,$port) => ['players'=>int,'slots'=>int] или null при ошибке. */

function mc_varint_encode($value) {
    $out = '';
    $value &= 0xFFFFFFFF;
    do {
        $temp = $value & 0x7F;
        $value = ($value >> 7) & 0x01FFFFFF;   // логический сдвиг
        if ($value != 0) $temp |= 0x80;
        $out .= chr($temp);
    } while ($value != 0);
    return $out;
}

function mc_varint_read_fp($fp) {
    $value = 0; $pos = 0;
    while (true) {
        $r = fread($fp, 1);
        if ($r === '' || $r === false) return null;
        $byte = ord($r);
        $value |= ($byte & 0x7F) << (7 * $pos);
        if (($byte & 0x80) == 0) break;
        if (++$pos > 5) return null;
    }
    return $value;
}

function mc_varint_read_str($data, &$off) {
    $value = 0; $pos = 0;
    while (true) {
        if ($off >= strlen($data)) return null;
        $byte = ord($data[$off++]);
        $value |= ($byte & 0x7F) << (7 * $pos);
        if (($byte & 0x80) == 0) break;
        if (++$pos > 5) return null;
    }
    return $value;
}

function mc_status($host, $port = 25565, $timeout = 3) {
    $host = (string)$host; $port = (int)$port ?: 25565;
    $errno = 0; $errstr = '';
    $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);
    if (!$fp) return null;
    stream_set_timeout($fp, $timeout);

    // Handshake: id=0, protocol=47, address, port, next state=1 (status)
    $hs = "\x00" . mc_varint_encode(47) . mc_varint_encode(strlen($host)) . $host
        . pack('n', $port) . mc_varint_encode(1);
    fwrite($fp, mc_varint_encode(strlen($hs)) . $hs);
    // Status request: id=0
    fwrite($fp, mc_varint_encode(1) . "\x00");

    $len = mc_varint_read_fp($fp);
    if (!$len || $len < 2 || $len > 700000) { fclose($fp); return null; }

    $data = '';
    $deadline = microtime(true) + $timeout;
    while (strlen($data) < $len && microtime(true) < $deadline) {
        $chunk = fread($fp, $len - strlen($data));
        if ($chunk === '' || $chunk === false) break;
        $data .= $chunk;
    }
    fclose($fp);
    if (strlen($data) < 2) return null;

    $off = 0;
    mc_varint_read_str($data, $off);              // packet id (ожидаем 0)
    $jlen = mc_varint_read_str($data, $off);
    if ($jlen === null) return null;
    $json = substr($data, $off, $jlen);
    $info = json_decode($json, true);
    if (!is_array($info) || !isset($info['players'])) return null;

    return [
        'players' => (int)($info['players']['online'] ?? 0),
        'slots'   => (int)($info['players']['max'] ?? 0),
    ];
}
