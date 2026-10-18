<?php
/* GET /server/statistic — онлайн игроков для счётчика.
   Источник (админка → Сайт → Сервер):
     - slp  : Server List Ping — быстро, но показывает то, что сервер ОБЪЯВЛЯЕТ
              (если сервер накручивает онлайн — увидим накрутку);
     - rcon : команда `list` через RCON — РЕАЛЬНЫЙ онлайн (нужен включённый RCON).
   Ответ: {players, slots, online}. online=false, если сервер недоступен/не настроен.
   Результат кэшируется (привязан к серверу), чтобы не дёргать сервер на каждый запрос. */
require_once __DIR__ . '/../../app/helpers.php';
require_once __DIR__ . '/../../app/mc.php';
require_once __DIR__ . '/../../app/rcon.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($players, $slots, $online) {
    echo json_encode(['players' => (int)$players, 'slots' => (int)$slots, 'online' => (bool)$online]);
    exit;
}

$source = setting('status_source', 'slp');           // 'slp' | 'rcon'
$ttl    = 20;
$cacheFile = __DIR__ . '/../../app/data/mc_status.json';

if ($source === 'rcon') {
    $sig = 'rcon:' . setting('rcon_host') . ':' . setting('rcon_port');
    if (setting('rcon_host') === '') out(0, 0, false);        // не настроено
} else {
    $host = trim(setting('status_host', ''));
    $port = (int)(setting('status_port', '25565') ?: 25565);
    $sig  = 'slp:' . $host . ':' . $port;
    if ($host === '') out(0, 0, false);                       // не настроено
}

/* свежий кэш ровно для этого же сервера */
if (is_file($cacheFile)) {
    $c = json_decode(@file_get_contents($cacheFile), true);
    if (is_array($c) && ($c['sig'] ?? '') === $sig && (time() - (int)($c['ts'] ?? 0) < $ttl)) {
        out($c['players'], $c['slots'], true);
    }
}

$res = null;
if ($source === 'rcon') {
    $r = rcon_run(setting('rcon_host'), setting('rcon_port'), setting('rcon_password'), 'list', 3);
    if ($r['ok'] && preg_match('/(\d+)\D+?(\d+)/', $r['response'], $m)) {
        $res = ['players' => (int)$m[1], 'slots' => (int)$m[2]];
    }
} else {
    $res = mc_status($host, $port, 3);
}

if ($res === null) {
    /* не дозвонились — последнее известное значение ЭТОГО сервера, иначе «оффлайн» */
    $old = is_file($cacheFile) ? json_decode(@file_get_contents($cacheFile), true) : null;
    if (is_array($old) && ($old['sig'] ?? '') === $sig) out($old['players'], $old['slots'], true);
    out(0, 0, false);
}

@file_put_contents($cacheFile, json_encode(['players' => $res['players'], 'slots' => $res['slots'], 'sig' => $sig, 'ts' => time()]));
out($res['players'], $res['slots'], true);
