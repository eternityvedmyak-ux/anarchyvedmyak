<?php
/* PDO-подключение к MySQL (singleton). */
require_once __DIR__ . '/config.php';

if (APP_DEBUG) { error_reporting(E_ALL); ini_set('display_errors', '1'); }
else { error_reporting(0); ini_set('display_errors', '0'); }

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            if (DB_DRIVER === 'sqlite') {
                $dir = dirname(DB_SQLITE_PATH);
                if (!is_dir($dir)) @mkdir($dir, 0775, true);
                $pdo = new PDO('sqlite:' . DB_SQLITE_PATH, null, null, $opts);
                $pdo->exec('PRAGMA journal_mode = WAL');
                $pdo->exec('PRAGMA foreign_keys = ON');
            } else {
                $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
                $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
            }
            db_migrate($pdo);
        } catch (PDOException $e) {
            http_response_code(500);
            die('DB connection error: ' . (APP_DEBUG ? $e->getMessage() : 'see server logs'));
        }
    }
    return $pdo;
}

/** true, если работаем на SQLite */
function db_is_sqlite() { return DB_DRIVER === 'sqlite'; }

/** Идемпотентно добавляет недостающие колонки к уже существующим таблицам.
 *  Безопасно вызывать на каждом запросе: если таблицы ещё нет (свежая установка),
 *  ничего не делает — install.php создаст её сразу с нужными колонками. */
function db_migrate(PDO $pdo) {
    $columns = function ($table) use ($pdo) {
        try {
            if (DB_DRIVER === 'sqlite') {
                $names = [];
                foreach ($pdo->query("PRAGMA table_info(" . $table . ")") as $r) $names[] = $r['name'];
                return $names;
            }
            $st = $pdo->prepare("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
            $st->execute([$table]);
            return $st->fetchAll(PDO::FETCH_COLUMN);
        } catch (Throwable $e) { return []; }
    };
    $want = [
        'privileges' => [
            'qty_enabled' => 'INTEGER NOT NULL DEFAULT 0',
            'qty_max'     => 'INTEGER NOT NULL DEFAULT 0',
        ],
    ];
    foreach ($want as $table => $defs) {
        $have = $columns($table);
        if (!$have) continue; // таблицы нет — пропускаем
        foreach ($defs as $col => $type) {
            if (!in_array($col, $have, true)) {
                try { $pdo->exec("ALTER TABLE " . $table . " ADD COLUMN " . $col . " " . $type); } catch (Throwable $e) {}
            }
        }
    }
}
