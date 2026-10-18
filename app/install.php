<?php
/* ============================================================
   Установщик ReallyWorld.
   Откройте  /app/install.php  в браузере один раз.
   Создаёт таблицы, заливает привилегии и задаёт логин/пароль админа.
   ПОСЛЕ установки удалите этот файл (или он сам предложит).
   ============================================================ */
require_once __DIR__ . '/db.php';

$pdo = db();
$msg = [];
$err = [];

/* INSERT IGNORE / INSERT OR IGNORE в зависимости от драйвера */
$IGNORE = db_is_sqlite() ? 'INSERT OR IGNORE' : 'INSERT IGNORE';

/* 1. Таблицы */
if (db_is_sqlite()) {
    $ddl = [
        "CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1)",
        "CREATE TABLE IF NOT EXISTS privileges (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL DEFAULT 'Гриф. Выживание', section TEXT NOT NULL DEFAULT 'Донат привилегии', name TEXT NOT NULL, price REAL NOT NULL, old_price REAL, image TEXT NOT NULL DEFAULT '', rcon_command TEXT NOT NULL DEFAULT '', qty_enabled INTEGER NOT NULL DEFAULT 0, qty_max INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, UNIQUE(category, name))",
        "CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, privilege_id INTEGER, privilege TEXT NOT NULL, category TEXT NOT NULL DEFAULT '', nickname TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'RUB', gateway TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', ext_id TEXT, ip TEXT, issued INTEGER NOT NULL DEFAULT 0, qty REAL, kind TEXT NOT NULL DEFAULT 'privilege', promo TEXT, created_at TEXT NOT NULL, paid_at TEXT)",
        "CREATE TABLE IF NOT EXISTS promos (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, type TEXT NOT NULL DEFAULT 'percent', value REAL NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, max_uses INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0, expires_at TEXT)",
    ];
    foreach ($ddl as $stmt) { try { $pdo->exec($stmt); } catch (Throwable $e) { $err[] = $e->getMessage(); } }
} else {
    $schema = file_get_contents(__DIR__ . '/../schema.sql');
    foreach (array_filter(array_map('trim', explode(';', $schema))) as $stmt) {
        if (stripos($stmt, 'CREATE TABLE') !== false || stripos($stmt, 'SET ') === 0) {
            try { $pdo->exec($stmt); } catch (Throwable $e) { $err[] = $e->getMessage(); }
        }
    }
}
$msg[] = 'Таблицы созданы/проверены (' . DB_DRIVER . ').';

/* 2. Привилегии (сид) */
$cnt = (int)$pdo->query('SELECT COUNT(*) FROM privileges')->fetchColumn();
if ($cnt === 0) {
    $seed = json_decode(file_get_contents(__DIR__ . '/seed.json'), true) ?: [];
    $ins = $pdo->prepare("$IGNORE INTO privileges (category,name,price,old_price,image,sort) VALUES (?,?,?,?,?,?)");
    $i = 0;
    foreach ($seed as $p) {
        $price = preg_replace('/[^\d.]/', '', str_replace([' ', ','], ['', '.'], $p['price']));
        $old   = $p['old'] ? preg_replace('/[^\d.]/', '', str_replace([' ', ','], ['', '.'], $p['old'])) : null;
        $ins->execute(['Гриф. Выживание', $p['name'], (float)$price, $old ? (float)$old : null, $p['img'], $i++]);
    }
    // разделы (подзаголовки) как в оригинале
    $pdo->exec("UPDATE privileges SET section='Услуги' WHERE name IN ('Разбан','Размут')");
    $pdo->exec("UPDATE privileges SET section='Сундуки с рилликами' WHERE name LIKE '%илликами%'");
    $pdo->exec("UPDATE privileges SET section='Сундуки' WHERE name LIKE '%сундук%' AND section NOT IN ('Сундуки с рилликами','Услуги')");
    $msg[] = "Залито привилегий: " . count($seed) . '.';
} else {
    $msg[] = "Привилегии уже есть ($cnt шт.) — пропущено.";
}

/* 3. Дефолтные настройки */
function ensure($pdo, $k, $v) {
    $ign = db_is_sqlite() ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
    $pdo->prepare("$ign INTO settings (k,v) VALUES (?,?)")->execute([$k, $v]);
}
$defaults = [
    'base_url' => '', 'currency' => 'RUB', 'admin_ips' => '',
    'fk_enabled' => '0', 'fk_merchant' => '', 'fk_secret1' => '', 'fk_secret2' => '',
    'rk_enabled' => '0', 'rk_login' => '', 'rk_pass1' => '', 'rk_pass2' => '', 'rk_test' => '1',
    'ym_enabled' => '0', 'ym_receiver' => '', 'ym_secret' => '',
    'stripe_enabled' => '0', 'stripe_secret' => '', 'stripe_webhook' => '', 'stripe_currency' => 'usd', 'stripe_rate' => '90',
    'rcon_enabled' => '0', 'rcon_host' => '', 'rcon_port' => '25575', 'rcon_password' => '',
    // внешний вид сайта
    'site_title' => 'ReallyWorld — Магазин привилегий',
    'logo_word1' => 'really', 'logo_word2' => 'world', 'logo_image' => '',
    'server_ip' => 'mc.reallyworld.ru',
    'status_host' => '', 'status_port' => '25565', 'status_source' => 'slp',
    // игровая валюта (риллики)
    'cur_enabled' => '1', 'cur_name' => 'Риллики', 'cur_suffix' => 'R',
    'cur_min' => '100', 'cur_max' => '6000', 'cur_step' => '100', 'cur_rate' => '1',
    'cur_image' => '', 'cur_rcon' => '',
    'hero_title1' => 'ReallyWorld', 'hero_title2' => 'Начало новой эры',
    'hero_subtitle' => "Открой для себя огромные миры\nполные веселья и миллионов друзей",
    'soc_vk' => '//vk.com/reallyworlds', 'soc_forum' => '//f.reallyworld.ru',
    'soc_youtube' => '//www.youtube.com/channel/UCb5oqCZ4AfmfXbgHsfei0tQ',
    'soc_discord' => '//discord.gg/reallyworld', 'soc_telegram' => '',
    'color_primary' => '#fc9404', 'bg_color' => '#f6f6f6', 'text_color' => '', 'font_family' => '',
    'favicon' => '/images/server-icon.svg', 'hero_bg' => '',
    'link_offer' => '/public_offer.pdf', 'link_privacy' => '/privacy.pdf', 'link_mojang' => '/mojang.pdf',
    'recent_enabled' => '1', 'recent_count' => '12', 'recent_bg' => '#16181d',
    'recent_card' => '#1d2027', 'recent_text' => '#ffffff', 'recent_muted' => '#8b919c',
    'footer_company' => 'ИП Кондратьев Михаил Сергеевич', 'footer_inn' => '780446233080',
    'footer_ogrnip' => '321784700352257', 'footer_email' => 'admin@reallyworld.me (ПН-ПТ 10:00-18:00 МСК)',
    'footer_copyright' => 'ReallyWorld Все права защищены.',
];
foreach ($defaults as $k => $v) ensure($pdo, $k, $v);
$msg[] = 'Базовые настройки записаны.';

/* 3b. Категории по умолчанию */
$catSeed = ['Гриф. Выживание' => 1, 'Анархия' => 2, 'СТО' => 3];
$ci = $pdo->prepare("$IGNORE INTO categories (name, sort) VALUES (?, ?)");
foreach ($catSeed as $n => $s) $ci->execute([$n, $s]);
$msg[] = 'Категории по умолчанию добавлены.';

/* 4. Логин/пароль админа */
$hasAdmin = (string)($pdo->query("SELECT v FROM settings WHERE k='admin_pass_hash'")->fetchColumn() ?: '') !== '';
$done = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $login = trim($_POST['login']); $pass = (string)$_POST['pass'];
    if (strlen($login) < 3 || strlen($pass) < 6) {
        $err[] = 'Логин ≥ 3 символов, пароль ≥ 6 символов.';
    } else {
        $pdo->prepare('REPLACE INTO settings (k,v) VALUES (?,?)')->execute(['admin_login', $login]);
        $pdo->prepare('REPLACE INTO settings (k,v) VALUES (?,?)')->execute(['admin_pass_hash', password_hash($pass, PASSWORD_DEFAULT)]);
        $done = true; $hasAdmin = true;
        $msg[] = 'Администратор сохранён.';
    }
}
?><!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Установка ReallyWorld</title>
<style>
 body{font-family:Segoe UI,Roboto,sans-serif;background:#f6f6f6;color:#222;max-width:640px;margin:40px auto;padding:0 16px}
 .box{background:#fff;border-radius:14px;padding:22px 26px;box-shadow:0 10px 30px rgba(0,0,0,.08);margin-bottom:18px}
 h1{font-size:22px} h2{font-size:16px;margin-top:0}
 .ok{color:#1f9d4d} .bad{color:#e02424}
 label{display:block;font-weight:bold;margin:12px 0 6px}
 input{width:100%;box-sizing:border-box;padding:11px 13px;border:2px solid #ececec;border-radius:10px;font-size:15px}
 button{margin-top:16px;background:#fc9404;color:#fff;border:none;border-bottom:4px solid #d27a00;border-radius:10px;padding:12px 18px;font-weight:bold;font-size:15px;cursor:pointer;text-transform:uppercase}
 code{background:#f0f0f0;padding:2px 6px;border-radius:5px}
 ul{line-height:1.7}
</style></head><body>
<h1>Установка ReallyWorld</h1>
<div class="box"><h2>Журнал</h2>
 <ul><?php foreach ($msg as $m) echo '<li class="ok">✔ ' . htmlspecialchars($m) . '</li>'; ?>
     <?php foreach ($err as $m) echo '<li class="bad">✘ ' . htmlspecialchars($m) . '</li>'; ?></ul>
</div>

<?php if (!$hasAdmin): ?>
<div class="box"><h2>Создайте администратора</h2>
 <form method="post">
  <label>Логин</label><input name="login" autocomplete="off" required>
  <label>Пароль</label><input name="pass" type="password" autocomplete="new-password" required>
  <button type="submit">Сохранить</button>
 </form>
</div>
<?php else: ?>
<div class="box"><h2>Готово 🎉</h2>
 <p>Дальше:</p>
 <ul>
  <li>Войдите в админку: <code><?php echo htmlspecialchars(ADMIN_DIR); ?>/</code> (логин и пароль, что задали).</li>
  <li>В админке во вкладке «Кассы» включите нужные платёжки и впишите ключи.</li>
  <li><b>Удалите файл <code>app/install.php</code></b> — он больше не нужен.</li>
 </ul>
</div>
<?php endif; ?>
</body></html>
