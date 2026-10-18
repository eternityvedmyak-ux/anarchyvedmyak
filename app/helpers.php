<?php
/* Общие хелперы: настройки (key/value в БД), JSON-ответы, базовый URL и пр. */
require_once __DIR__ . '/db.php';

/* ---- Настройки (таблица settings) ---- */
function settings_all() {
    static $cache = null;
    if ($cache === null) {
        $cache = [];
        try {
            foreach (db()->query('SELECT k, v FROM settings') as $r) $cache[$r['k']] = $r['v'];
        } catch (Throwable $e) {
            // БД не настроена — install.php ещё не запускали. Возвращаем пустые настройки,
            // вызовы setting($k, $default) получат свой default и сайт не упадёт.
        }
    }
    return $cache;
}

/** Проверка: настроена ли БД (запущен ли install.php). */
function db_initialized() {
    try { db()->query('SELECT 1 FROM settings LIMIT 1'); return true; }
    catch (Throwable $e) { return false; }
}

/** Для API: если БД не настроена — отдать понятный JSON с подсказкой и выйти. */
function require_db_or_die_json() {
    if (db_initialized()) return;
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'База данных не настроена. Откройте /app/install.php для первой установки.'], JSON_UNESCAPED_UNICODE);
    exit;
}
function setting($key, $default = '') {
    $all = settings_all();
    return array_key_exists($key, $all) ? $all[$key] : $default;
}
function setting_set($key, $val) {
    // REPLACE INTO работает и в MySQL, и в SQLite (upsert по первичному ключу k)
    $st = db()->prepare('REPLACE INTO settings (k, v) VALUES (?, ?)');
    $st->execute([$key, (string)$val]);
}

/* ---- Базовый URL сайта (для колбэков/редиректов) ---- */
function base_url() {
    $override = setting('base_url', '');
    if ($override !== '') return rtrim($override, '/');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
          || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
          || (($_SERVER['SERVER_PORT'] ?? '') == 443);
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return ($https ? 'https://' : 'http://') . $host;
}

/* ---- JSON ---- */
function json_out($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function json_err($msg, $code = 400) { json_out(['ok' => false, 'error' => $msg], $code); }

/* ---- Прочее ---- */
function money_to_number($s) {
    // "4 444 ₽" -> 4444.00
    $n = preg_replace('/[^\d.,]/u', '', (string)$s);
    $n = str_replace(',', '.', $n);
    return round((float)$n, 2);
}
function gen_order_id() {
    return (int)(date('ymdHis') . random_int(10, 99)); // компактный числовой id для касс
}
function client_ip() {
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) { $ip = explode(',', $_SERVER[$k])[0]; return trim($ip); }
    }
    return '0.0.0.0';
}
function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
