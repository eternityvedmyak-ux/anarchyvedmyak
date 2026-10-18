<?php
/* ============================================================
   Админ-панель ReallyWorld.
   Лежит в секретной папке (см. ADMIN_DIR в app/config.php).
   Нигде на фронте не упоминается. Вход: логин + пароль (+ опц. IP).
   ============================================================ */
require_once __DIR__ . '/../app/gateways/Gateway.php';
require_once __DIR__ . '/../app/rcon.php';

function cat_names() {
    return db()->query('SELECT name FROM categories ORDER BY sort, id')->fetchAll(PDO::FETCH_COLUMN);
}
session_name('rw_admin');
session_start();

/* ---- опциональный IP-allowlist ---- */
function ip_allowed(): bool {
    $list = trim(setting('admin_ips', ''));
    if ($list === '') return true;
    $ips = array_filter(array_map('trim', preg_split('/[\s,]+/', $list)));
    return in_array(client_ip(), $ips, true);
}

/* ---- выход ---- */
if (isset($_GET['logout'])) { session_destroy(); header('Location: ?'); exit; }

/* ---- авторизация ---- */
$authed = !empty($_SESSION['admin']) && ip_allowed();
$loginErr = '';
if (!$authed && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do_login'])) {
    if (!ip_allowed()) {
        $loginErr = 'Доступ с вашего IP запрещён (' . e(client_ip()) . ').';
    } else {
        $login = trim($_POST['login'] ?? '');
        $pass  = (string)($_POST['pass'] ?? '');
        $okLogin = hash_equals(setting('admin_login'), $login);
        $okPass  = password_verify($pass, setting('admin_pass_hash'));
        if ($okLogin && $okPass) {
            session_regenerate_id(true);
            $_SESSION['admin'] = $login;
            $_SESSION['csrf']  = bin2hex(random_bytes(16));
            header('Location: ?'); exit;
        }
        $loginErr = 'Неверный логин или пароль.';
    }
}

/* ---- экран входа ---- */
if (!$authed) {
    ?><!doctype html><html lang="ru"><head><meta charset="utf-8">
    <meta name="robots" content="noindex,nofollow"><title>Вход</title>
    <style>
     body{font-family:Segoe UI,sans-serif;background:#12151c;color:#eee;display:flex;
       min-height:100vh;align-items:center;justify-content:center;margin:0}
     form{background:#1c2029;padding:30px;border-radius:14px;width:300px;box-shadow:0 20px 50px rgba(0,0,0,.5)}
     h1{font-size:18px;margin:0 0 18px;text-align:center}
     input{width:100%;box-sizing:border-box;padding:11px;margin-top:10px;border:1px solid #333;
       border-radius:9px;background:#0f1217;color:#fff}
     button{width:100%;margin-top:16px;padding:12px;border:none;border-radius:9px;background:#fc9404;
       color:#fff;font-weight:bold;cursor:pointer}
     .err{color:#ff6b6b;font-size:13px;margin-top:12px;text-align:center}
    </style></head><body>
    <form method="post"><h1>ReallyWorld · панель</h1>
     <input name="login" placeholder="Логин" autocomplete="username" autofocus>
     <input name="pass" type="password" placeholder="Пароль" autocomplete="current-password">
     <button name="do_login" value="1">Войти</button>
     <?php if ($loginErr) echo '<div class="err">' . $loginErr . '</div>'; ?>
    </form></body></html><?php
    exit;
}

/* ---- защита форм (CSRF) ---- */
function csrf() { return $_SESSION['csrf'] ?? ''; }
function check_csrf() {
    if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'] ?? '')) { http_response_code(419); exit('CSRF'); }
}
$tab    = $_GET['tab'] ?? 'orders';
$notice = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);
function flash_redirect($tab, $msg) { $_SESSION['flash'] = $msg; header('Location: ?tab=' . urlencode($tab)); exit; }

/* конфигурация полей касс */
$GW = [
    'FreeKassa' => ['id'=>'freekassa','fields'=>[
        'fk_enabled'=>['Включить','check'],'fk_merchant'=>['ID магазина','text'],
        'fk_secret1'=>['Секретное слово 1 (форма)','text'],'fk_secret2'=>['Секретное слово 2 (уведомления)','text']]],
    'Robokassa' => ['id'=>'robokassa','fields'=>[
        'rk_enabled'=>['Включить','check'],'rk_login'=>['MerchantLogin','text'],
        'rk_pass1'=>['Пароль #1','text'],'rk_pass2'=>['Пароль #2','text'],'rk_test'=>['Тестовый режим','check']]],
    'ЮMoney' => ['id'=>'yoomoney','fields'=>[
        'ym_enabled'=>['Включить','check'],'ym_receiver'=>['Номер кошелька','text'],
        'ym_secret'=>['Секрет HTTP-уведомлений','text']]],
    'Stripe (зарубежные карты)' => ['id'=>'stripe','fields'=>[
        'stripe_enabled'=>['Включить','check'],'stripe_secret'=>['Secret key (sk_live_…)','text'],
        'stripe_webhook'=>['Webhook secret (whsec_…)','text'],'stripe_currency'=>['Валюта (usd/eur)','text'],
        'stripe_rate'=>['Курс: рублей за 1 единицу валюты','text']]],
];

/* ---- сохранения ---- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();
    if (isset($_POST['save_gateways'])) {
        foreach ($GW as $g) foreach ($g['fields'] as $k => $f) {
            $val = $f[1] === 'check' ? (isset($_POST[$k]) ? '1' : '0') : trim($_POST[$k] ?? '');
            setting_set($k, $val);
        }
        flash_redirect('gateways', 'Настройки касс сохранены.');
    }
    if (isset($_POST['save_general'])) {
        setting_set('base_url', rtrim(trim($_POST['base_url'] ?? ''), '/'));
        setting_set('currency', trim($_POST['currency'] ?? 'RUB'));
        setting_set('admin_ips', trim($_POST['admin_ips'] ?? ''));
        if (!empty($_POST['new_pass']) && strlen($_POST['new_pass']) >= 6) {
            setting_set('admin_pass_hash', password_hash($_POST['new_pass'], PASSWORD_DEFAULT));
            flash_redirect('general', 'Сохранено. Пароль обновлён.');
        }
        flash_redirect('general', 'Общие настройки сохранены.');
    }
    if (isset($_POST['priv_save'])) {
        $id       = (int)($_POST['id'] ?? 0);
        $name     = trim($_POST['name'] ?? '');
        $cats = cat_names();
        $category = in_array($_POST['category'] ?? '', $cats, true) ? $_POST['category'] : ($cats[0] ?? 'Гриф. Выживание');
        $section  = trim($_POST['section'] ?? '') ?: 'Донат привилегии';
        $price    = (float)($_POST['price'] ?? 0);
        $old      = ($_POST['old_price'] ?? '') === '' ? null : (float)$_POST['old_price'];
        $rcon     = trim($_POST['rcon_command'] ?? '');
        $active   = isset($_POST['active']) ? 1 : 0;
        $qtyEn    = isset($_POST['qty_enabled']) ? 1 : 0;
        $qtyMax   = max(0, (int)($_POST['qty_max'] ?? 0));
        $image    = trim($_POST['image_url'] ?? '');

        if ($name === '') flash_redirect('prices', 'Ошибка: укажите название.');

        // загрузка файла фото (приоритетнее URL)
        if (!empty($_FILES['image_file']['tmp_name']) && is_uploaded_file($_FILES['image_file']['tmp_name'])) {
            $up = priv_upload_image($_FILES['image_file']);
            if ($up['ok']) $image = $up['path'];
            else flash_redirect('prices', 'Ошибка загрузки фото: ' . $up['error']);
        }

        // проверка на дубль (category, name) — чтобы не падать в UNIQUE
        $dup = db()->prepare('SELECT id FROM privileges WHERE category=? AND name=? AND id<>?');
        $dup->execute([$category, $name, $id]);
        if ($dup->fetchColumn()) {
            flash_redirect('prices', 'Ошибка: товар «' . $name . '» уже есть в категории «' . $category . '». Измените название или категорию.');
        }

        try {
            if ($id > 0) {
                // при изменении: если фото не задано — оставить старое
                if ($image === '') { $st = db()->prepare('SELECT image FROM privileges WHERE id=?'); $st->execute([$id]); $image = (string)$st->fetchColumn(); }
                db()->prepare('UPDATE privileges SET category=?,section=?,name=?,price=?,old_price=?,image=?,rcon_command=?,qty_enabled=?,qty_max=?,active=? WHERE id=?')
                    ->execute([$category, $section, $name, $price, $old, $image, $rcon, $qtyEn, $qtyMax, $active, $id]);
                flash_redirect('prices', 'Привилегия обновлена.');
            } else {
                $sort = (int)db()->query('SELECT COALESCE(MAX(sort),0)+1 FROM privileges')->fetchColumn();
                db()->prepare('INSERT INTO privileges (category,section,name,price,old_price,image,rcon_command,qty_enabled,qty_max,sort,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([$category, $section, $name, $price, $old, $image, $rcon, $qtyEn, $qtyMax, $sort, $active]);
                flash_redirect('prices', 'Привилегия добавлена.');
            }
        } catch (Throwable $ex) {
            flash_redirect('prices', 'Не удалось сохранить: ' . $ex->getMessage());
        }
    }
    if (isset($_POST['priv_delete'])) {
        db()->prepare('DELETE FROM privileges WHERE id=?')->execute([(int)$_POST['id']]);
        flash_redirect('prices', 'Привилегия удалена.');
    }
    if (isset($_POST['priv_del_one'])) {
        db()->prepare('DELETE FROM privileges WHERE id=?')->execute([(int)$_POST['priv_del_one']]);
        flash_redirect('prices', 'Привилегия удалена.');
    }
    if (isset($_POST['priv_delete_bulk'])) {
        $ids = array_values(array_filter(array_map('intval', (array)($_POST['sel'] ?? []))));
        if ($ids) {
            $in = implode(',', array_fill(0, count($ids), '?'));
            db()->prepare("DELETE FROM privileges WHERE id IN ($in)")->execute($ids);
            flash_redirect('prices', 'Удалено привилегий: ' . count($ids) . '.');
        }
        flash_redirect('prices', 'Ничего не выбрано.');
    }
    if (isset($_POST['cat_save'])) {
        $cid    = (int)($_POST['cat_id'] ?? 0);
        $cname  = trim($_POST['cat_name'] ?? '');
        $csort  = (int)($_POST['cat_sort'] ?? 0);
        $cact   = isset($_POST['cat_active']) ? 1 : 0;
        if ($cname === '') flash_redirect('cats', 'Ошибка: укажите название категории.');
        $dup = db()->prepare('SELECT id FROM categories WHERE name = ? AND id <> ?');
        $dup->execute([$cname, $cid]);
        if ($dup->fetch()) flash_redirect('cats', 'Категория с таким названием уже есть.');
        if ($cid > 0) {
            $st = db()->prepare('SELECT name FROM categories WHERE id = ?'); $st->execute([$cid]);
            $oldName = (string)$st->fetchColumn();
            db()->prepare('UPDATE categories SET name=?, sort=?, active=? WHERE id=?')->execute([$cname, $csort, $cact, $cid]);
            if ($oldName !== '' && $oldName !== $cname) // переименование → обновить привязку у привилегий
                db()->prepare('UPDATE privileges SET category=? WHERE category=?')->execute([$cname, $oldName]);
            flash_redirect('cats', 'Категория обновлена.');
        } else {
            db()->prepare('INSERT INTO categories (name, sort, active) VALUES (?,?,?)')->execute([$cname, $csort, $cact]);
            flash_redirect('cats', 'Категория добавлена.');
        }
    }
    if (isset($_POST['cat_delete'])) {
        $cid = (int)($_POST['cat_id'] ?? 0);
        $st = db()->prepare('SELECT name FROM categories WHERE id = ?'); $st->execute([$cid]);
        $cn = (string)$st->fetchColumn();
        $u = db()->prepare('SELECT COUNT(*) FROM privileges WHERE category = ?'); $u->execute([$cn]);
        if ((int)$u->fetchColumn() > 0)
            flash_redirect('cats', 'Нельзя удалить: в категории есть привилегии. Сначала перенесите или удалите их.');
        db()->prepare('DELETE FROM categories WHERE id=?')->execute([$cid]);
        flash_redirect('cats', 'Категория удалена.');
    }
    if (isset($_POST['promo_save'])) {
        $pid    = (int)($_POST['promo_id'] ?? 0);
        $code   = mb_strtoupper(trim($_POST['code'] ?? ''));
        $ptype  = ($_POST['ptype'] ?? 'percent') === 'fixed' ? 'fixed' : 'percent';
        $pval   = (float)($_POST['pvalue'] ?? 0);
        $pmax   = (int)($_POST['max_uses'] ?? 0);
        $pact   = isset($_POST['promo_active']) ? 1 : 0;
        $pexp   = trim($_POST['expires_at'] ?? '') ?: null;
        if ($code === '') flash_redirect('promo', 'Ошибка: укажите код.');
        if ($ptype === 'percent' && $pval > 100) $pval = 100;
        $dup = db()->prepare('SELECT id FROM promos WHERE UPPER(code)=? AND id<>?');
        $dup->execute([$code, $pid]);
        if ($dup->fetch()) flash_redirect('promo', 'Такой промокод уже существует.');
        if ($pid > 0) {
            db()->prepare('UPDATE promos SET code=?, type=?, value=?, max_uses=?, active=?, expires_at=? WHERE id=?')
                ->execute([$code, $ptype, $pval, $pmax, $pact, $pexp, $pid]);
            flash_redirect('promo', 'Промокод обновлён.');
        } else {
            db()->prepare('INSERT INTO promos (code,type,value,max_uses,active,expires_at) VALUES (?,?,?,?,?,?)')
                ->execute([$code, $ptype, $pval, $pmax, $pact, $pexp]);
            flash_redirect('promo', 'Промокод добавлен.');
        }
    }
    if (isset($_POST['promo_delete'])) {
        db()->prepare('DELETE FROM promos WHERE id=?')->execute([(int)$_POST['promo_id']]);
        flash_redirect('promo', 'Промокод удалён.');
    }
    if (isset($_POST['order_test'])) {
        $nicks = ['Steve_2014','TripleKill','CyberCobra','wuk','MrCreeper','xX_Notch_Xx','Dimon228','SkyWarsPro'];
        $nick  = $nicks[array_rand($nicks)];
        $rnd = db_is_sqlite() ? 'RANDOM()' : 'RAND()';
        $pr = db()->query("SELECT * FROM privileges WHERE active=1 ORDER BY $rnd LIMIT 1")->fetch();
        if ($pr) {
            db()->prepare("INSERT INTO orders (privilege,privilege_id,kind,nickname,amount,currency,gateway,status,created_at)
                           VALUES (?,?,?,?,?,?,?,'paid',?)")
                ->execute([$pr['name'], $pr['id'], 'privilege', $nick, $pr['price'], setting('currency','RUB'), 'freekassa', date('Y-m-d H:i:s')]);
        }
        flash_redirect('orders', 'Тестовый заказ добавлен.');
    }
    if (isset($_POST['order_delete'])) {
        db()->prepare('DELETE FROM orders WHERE id=?')->execute([(int)$_POST['order_id']]);
        flash_redirect('orders', 'Заказ удалён.');
    }
    if (isset($_POST['save_rcon'])) {
        setting_set('rcon_enabled', isset($_POST['rcon_enabled']) ? '1' : '0');
        setting_set('rcon_host', trim($_POST['rcon_host'] ?? ''));
        setting_set('rcon_port', trim($_POST['rcon_port'] ?? '25575'));
        if (($_POST['rcon_password'] ?? '') !== '') setting_set('rcon_password', $_POST['rcon_password']);
        flash_redirect('general', 'Настройки RCON сохранены.');
    }
    if (isset($_POST['rcon_test'])) {
        $host = trim($_POST['rcon_host'] ?? '');
        $port = trim($_POST['rcon_port'] ?? '25575');
        $pass = ($_POST['rcon_password'] ?? '') !== '' ? $_POST['rcon_password'] : setting('rcon_password');
        if ($host === '') {
            $r = ['ok' => false, 'error' => 'укажите хост сервера'];
        } else {
            $r = rcon_run($host, $port, $pass, 'list');
        }
        $msg = $r['ok'] ? ('Соединение установлено. Ответ сервера: ' . mb_substr($r['response'], 0, 120))
                        : ('Ошибка: ' . $r['error']);
        if (!empty($_POST['ajax'])) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['ok' => $r['ok'], 'message' => $msg], JSON_UNESCAPED_UNICODE);
            exit;
        }
        flash_redirect('general', 'RCON — ' . $msg);
    }
    if (isset($_POST['save_site'])) {
        $fields = ['site_title','logo_word1','logo_word2','server_ip','status_host','status_port','status_source','hero_title1','hero_title2','hero_subtitle',
                   'soc_vk','soc_forum','soc_youtube','soc_discord','soc_telegram',
                   'color_primary','bg_color','text_color','font_family',
                   'link_offer','link_privacy','link_mojang',
                   'recent_count','recent_bg','recent_card','recent_text','recent_muted',
                   'footer_company','footer_inn','footer_ogrnip','footer_email','footer_copyright'];
        foreach ($fields as $f) setting_set($f, trim($_POST[$f] ?? ''));
        setting_set('recent_enabled', isset($_POST['recent_enabled']) ? '1' : '0');
        // картинки: файл важнее ссылки (logo / favicon / hero_bg)
        foreach (['logo_image'=>'logo_file', 'favicon'=>'favicon_file', 'hero_bg'=>'herobg_file'] as $key => $file) {
            if (!empty($_FILES[$file]['tmp_name']) && is_uploaded_file($_FILES[$file]['tmp_name'])) {
                $up = priv_upload_image($_FILES[$file]);
                if ($up['ok']) setting_set($key, $up['path']);
                else flash_redirect('site', 'Ошибка загрузки картинки: ' . $up['error']);
            } elseif (isset($_POST[$key])) {
                setting_set($key, trim($_POST[$key]));
            }
        }
        flash_redirect('site', 'Настройки сайта сохранены.');
    }
    if (isset($_POST['save_cur'])) {
        setting_set('cur_enabled', isset($_POST['cur_enabled']) ? '1' : '0');
        foreach (['cur_name','cur_suffix','cur_min','cur_max','cur_step','cur_rate','cur_rcon'] as $f) {
            setting_set($f, trim($_POST[$f] ?? ''));
        }
        if (!empty($_FILES['cur_file']['tmp_name']) && is_uploaded_file($_FILES['cur_file']['tmp_name'])) {
            $up = priv_upload_image($_FILES['cur_file']);
            if ($up['ok']) setting_set('cur_image', $up['path']);
            else flash_redirect('cur', 'Ошибка загрузки картинки: ' . $up['error']);
        } elseif (isset($_POST['cur_image'])) {
            setting_set('cur_image', trim($_POST['cur_image']));
        }
        flash_redirect('cur', 'Настройки валюты сохранены.');
    }
}

/* загрузка картинки привилегии */
function priv_upload_image(array $f) {
    if ($f['error'] !== UPLOAD_ERR_OK) return ['ok' => false, 'error' => 'код ' . $f['error']];
    if ($f['size'] > 4 * 1024 * 1024) return ['ok' => false, 'error' => 'файл больше 4 МБ'];
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $allow = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
    if (!isset($allow[$ext])) return ['ok' => false, 'error' => 'разрешены jpg, png, webp, gif'];
    $info = @getimagesize($f['tmp_name']);
    if ($info === false) return ['ok' => false, 'error' => 'это не изображение'];
    $dir = __DIR__ . '/../images/privileges/uploads';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    $base = preg_replace('/[^a-z0-9_-]+/i', '-', pathinfo($f['name'], PATHINFO_FILENAME));
    $fname = substr($base, 0, 40) . '-' . substr(bin2hex(random_bytes(4)), 0, 8) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $fname)) return ['ok' => false, 'error' => 'не удалось сохранить'];
    return ['ok' => true, 'path' => '/images/privileges/uploads/' . $fname];
}

/* данные для шаблона */
$stats = db()->query("SELECT
    COUNT(*) AS total,
    SUM(status='paid') AS paid,
    SUM(status='pending') AS pending,
    COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS revenue
  FROM orders")->fetch();
$enabledCount = count(gateways_enabled());

function badge($s){ $m=['paid'=>'#1fbf57','pending'=>'#fc9404','failed'=>'#e02424','canceled'=>'#888'];
  return '<span style="background:'.($m[$s]??'#888').';color:#fff;padding:2px 9px;border-radius:20px;font-size:12px">'.$s.'</span>'; }
?><!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>ReallyWorld · админ</title>
<style>
 *{box-sizing:border-box}body{font-family:Segoe UI,Roboto,sans-serif;margin:0;background:#0f1217;color:#e8e8e8}
 header{background:#171b22;padding:14px 22px;display:flex;align-items:center;gap:18px;border-bottom:1px solid #262b34}
 header b{color:#fc9404}
 nav a{color:#cfd2d8;text-decoration:none;margin-right:16px;font-size:14px;padding:6px 0;border-bottom:2px solid transparent}
 nav a.act{color:#fc9404;border-color:#fc9404}
 .sp{margin-left:auto}.sp a{color:#9aa0aa;font-size:13px}
 main{max-width:1000px;margin:24px auto;padding:0 18px}
 .card{background:#171b22;border:1px solid #262b34;border-radius:12px;padding:20px;margin-bottom:18px}
 h2{margin:0 0 14px;font-size:16px}
 .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
 .kpi{background:#1c2029;border-radius:10px;padding:14px}.kpi b{display:block;font-size:22px;color:#fff}
 .kpi span{color:#8b919c;font-size:12px}
 table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:9px 8px;border-bottom:1px solid #232831;text-align:left}
 th{color:#8b919c;font-weight:600}
 label{display:block;font-size:13px;color:#aeb3bd;margin:12px 0 5px}
 input[type=text],input[type=password],input[type=number],select{width:100%;padding:9px 11px;background:#0f1217;
   border:1px solid #2b313b;border-radius:8px;color:#fff}
 .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
 .chk{display:flex;align-items:center;gap:8px;margin-top:14px}.chk input{width:18px;height:18px}
 button{background:#fc9404;border:none;color:#fff;font-weight:bold;padding:11px 20px;border-radius:9px;cursor:pointer;margin-top:16px}
 .cburl{font-size:12px;color:#7fd3ff;word-break:break-all;background:#0f1217;padding:8px 10px;border-radius:7px;margin-top:8px;border:1px solid #243}
 .notice{background:#13351f;border:1px solid #1f7a40;color:#7be3a3;padding:10px 14px;border-radius:9px;margin-bottom:16px}
 .muted{color:#8b91f9c}.small{font-size:12px;color:#8b91a0}
 fieldset{border:1px solid #262b34;border-radius:10px;margin:0 0 16px;padding:14px 16px}
 legend{color:#fc9404;font-weight:bold;padding:0 6px}
</style></head><body>
<header><b>ReallyWorld</b> · панель
 <nav>
  <a class="<?php echo $tab==='orders'?'act':''; ?>" href="?tab=orders">Заказы</a>
  <a class="<?php echo $tab==='gateways'?'act':''; ?>" href="?tab=gateways">Кассы</a>
  <a class="<?php echo $tab==='prices'?'act':''; ?>" href="?tab=prices">Привилегии</a>
  <a class="<?php echo $tab==='cats'?'act':''; ?>" href="?tab=cats">Категории</a>
  <a class="<?php echo $tab==='cur'?'act':''; ?>" href="?tab=cur">Валюта</a>
  <a class="<?php echo $tab==='promo'?'act':''; ?>" href="?tab=promo">Промокоды</a>
  <a class="<?php echo $tab==='site'?'act':''; ?>" href="?tab=site">Сайт</a>
  <a class="<?php echo $tab==='general'?'act':''; ?>" href="?tab=general">Настройки</a>
 </nav>
 <span class="sp">вы: <?php echo e($_SESSION['admin']); ?> · <a href="?logout">выйти</a></span>
</header>
<main>
<?php if ($notice): ?><div class="notice"><?php echo e($notice); ?></div><?php endif; ?>

<?php if ($tab === 'orders'): ?>
 <div class="grid">
  <div class="kpi"><b><?php echo (int)$stats['total']; ?></b><span>всего заказов</span></div>
  <div class="kpi"><b><?php echo (int)$stats['paid']; ?></b><span>оплачено</span></div>
  <div class="kpi"><b><?php echo (int)$stats['pending']; ?></b><span>в ожидании</span></div>
  <div class="kpi"><b><?php echo number_format((float)$stats['revenue'],0,'.',' '); ?> ₽</b><span>выручка</span></div>
 </div>
 <div class="card" style="margin-top:18px">
  <div style="display:flex;align-items:center;gap:12px"><h2 style="margin:0">Заказы</h2>
   <form method="post" style="margin-left:auto">
    <input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
    <button name="order_test" value="1" style="margin-top:0;background:#2b313b">➕ Тестовый заказ</button>
   </form>
  </div>
  <?php $q = trim($_GET['q'] ?? ''); ?>
  <form method="get" style="margin:14px 0;display:flex;gap:8px">
   <input type="hidden" name="tab" value="orders">
   <input type="text" name="q" value="<?php echo e($q); ?>" placeholder="Поиск: ник, товар, № заказа, касса, статус, промокод"
     style="flex:1;padding:9px 12px;background:#0f1217;border:1px solid #2b313b;border-radius:8px;color:#fff">
   <button style="margin-top:0">Найти</button>
   <?php if ($q !== ''): ?><a href="?tab=orders" style="align-self:center;color:#9aa0aa;font-size:13px">сброс</a><?php endif; ?>
  </form>
  <table><tr><th>№</th><th>Дата</th><th>Товар</th><th>Ник</th><th>Промо</th><th>Сумма</th><th>Касса</th><th>Статус</th><th></th></tr>
  <?php
   if ($q !== '') {
     $like = '%' . $q . '%';
     $cond = 'nickname LIKE ? OR privilege LIKE ? OR gateway LIKE ? OR status LIKE ? OR promo LIKE ?';
     $params = [$like, $like, $like, $like, $like];
     if (ctype_digit($q)) { $cond .= ' OR id = ?'; $params[] = (int)$q; }
     $st = db()->prepare("SELECT * FROM orders WHERE $cond ORDER BY id DESC LIMIT 300");
     $st->execute($params);
     $rows = $st->fetchAll();
   } else {
     $rows = db()->query('SELECT * FROM orders ORDER BY id DESC LIMIT 100')->fetchAll();
   }
   if (!$rows) echo '<tr><td colspan="9" class="small">' . ($q !== '' ? 'Ничего не найдено.' : 'Заказов пока нет.') . '</td></tr>';
   foreach ($rows as $o) {
     $del = '<form method="post" style="display:inline" onsubmit="return confirm(\'Удалить заказ?\')"><input type="hidden" name="csrf" value="'.csrf().'"><input type="hidden" name="order_id" value="'.(int)$o['id'].'"><button name="order_delete" value="1" style="background:none;color:#e0556b;padding:0;margin:0;font-size:13px">удал.</button></form>';
     echo '<tr><td>'.(int)$o['id'].'</td><td class="small">'.e($o['created_at']).'</td><td>'.e($o['privilege']).'</td><td>'.e($o['nickname']).'</td><td class="small">'.e($o['promo'] ?: '—').'</td><td>'.e(number_format($o['amount'],2,'.','')).' '.e($o['currency']).'</td><td>'.e($o['gateway']).'</td><td>'.badge($o['status']).'</td><td>'.$del.'</td></tr>';
   }
  ?></table>
 </div>

<?php elseif ($tab === 'gateways'): ?>
 <div class="card">
  <h2>Платёжные системы <span class="small">(включено: <?php echo $enabledCount; ?>)</span></h2>
  <p class="small">Скопируйте «URL уведомлений» в личный кабинет каждой кассы. Для приёма уведомлений сайт должен быть доступен по белому домену/IP (на localhost кассы достучаться не смогут).</p>
  <form method="post">
   <input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
   <?php foreach ($GW as $title => $g): ?>
    <fieldset><legend><?php echo e($title); ?></legend>
     <?php foreach ($g['fields'] as $k => $f):
        if ($f[1] === 'check'): ?>
        <div class="chk"><input type="checkbox" id="<?php echo $k; ?>" name="<?php echo $k; ?>" <?php echo setting($k)==='1'?'checked':''; ?>><label for="<?php echo $k; ?>" style="margin:0"><?php echo e($f[0]); ?></label></div>
       <?php else: ?>
        <label><?php echo e($f[0]); ?></label>
        <input type="text" name="<?php echo $k; ?>" value="<?php echo e(setting($k)); ?>" autocomplete="off">
       <?php endif; endforeach; ?>
     <div class="cburl">URL уведомлений: <?php echo e(base_url()); ?>/payment/callback.php?gw=<?php echo $g['id']; ?></div>
    </fieldset>
   <?php endforeach; ?>
   <button name="save_gateways" value="1">Сохранить кассы</button>
  </form>
 </div>

<?php elseif ($tab === 'prices'):
   $editId = (int)($_GET['edit'] ?? 0); $ed = null;
   if ($editId) { $s = db()->prepare('SELECT * FROM privileges WHERE id=?'); $s->execute([$editId]); $ed = $s->fetch(); }
   $val = function ($k, $d = '') use ($ed) { return $ed ? e($ed[$k]) : $d; };
?>
 <div class="card"><h2><?php echo $ed ? 'Изменить привилегию' : 'Добавить привилегию'; ?></h2>
  <form method="post" enctype="multipart/form-data">
   <input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
   <input type="hidden" name="id" value="<?php echo $ed ? (int)$ed['id'] : 0; ?>">
   <div class="row">
    <div><label>Название</label><input type="text" name="name" value="<?php echo $val('name'); ?>" required></div>
    <div><label>Категория (вкладка)</label><select name="category">
      <?php foreach (cat_names() as $c) echo '<option'.(($ed&&$ed['category']===$c)?' selected':'').'>'.e($c).'</option>'; ?>
    </select></div>
   </div>
   <div class="row">
    <div><label>Цена, ₽ <span class="small">(за 1 шт., если включено количество)</span></label><input type="number" step="0.01" min="0" name="price" value="<?php echo $val('price'); ?>" required></div>
    <div><label>Старая цена, ₽ <span class="small">(скидка; пусто = без скидки)</span></label>
      <input type="number" step="0.01" min="0" name="old_price" value="<?php echo $val('old_price'); ?>"></div>
   </div>
   <div class="chk"><input type="checkbox" id="qe" name="qty_enabled" <?php echo ($ed && $ed['qty_enabled']) ? 'checked' : ''; ?>><label for="qe" style="margin:0">Можно покупать несколько штук (кейсы) — покупатель выбирает количество</label></div>
   <label>Максимум за раз <span class="small">(0 = без ограничения, по умолчанию 64)</span></label>
   <input type="number" step="1" min="0" name="qty_max" value="<?php echo $ed ? (int)$ed['qty_max'] : 0; ?>">
   <label>Раздел <span class="small">(подзаголовок в магазине, напр. «Донат привилегии»)</span></label>
   <input type="text" name="section" value="<?php echo $val('section', 'Донат привилегии'); ?>">
   <label>Команды выдачи (RCON) <span class="small">— по одной на строку; плейсхолдеры: {nick}, {priv}, {amount}, {qty}, {price}. При покупке нескольких {amount} = количество (напр. <code>cases give {nick} kits {amount}</code>)</span></label>
   <textarea name="rcon_command" rows="3" placeholder="lp user {nick} parent addtemp {priv} 30d&#10;say {nick} купил {priv}" style="width:100%;box-sizing:border-box;padding:9px 11px;background:#0f1217;border:1px solid #2b313b;border-radius:8px;color:#fff;font-family:inherit"><?php echo $val('rcon_command'); ?></textarea>
   <div class="row">
    <div><label>Фото — загрузить файл</label><input type="file" name="image_file" accept="image/*"></div>
    <div><label>…или ссылка на фото</label><input type="text" name="image_url" value="<?php echo $val('image'); ?>" placeholder="/images/privileges/...png"></div>
   </div>
   <?php if ($ed && $ed['image']): ?><img src="<?php echo e($ed['image']); ?>" alt="" style="height:74px;border-radius:8px;margin-top:12px;border:1px solid #2b313b"><?php endif; ?>
   <div class="chk"><input type="checkbox" id="pa" name="active" <?php echo (!$ed || $ed['active']) ? 'checked' : ''; ?>><label for="pa" style="margin:0">Активна (показывать в магазине)</label></div>
   <button name="priv_save" value="1"><?php echo $ed ? 'Сохранить изменения' : 'Добавить привилегию'; ?></button>
   <?php if ($ed): ?><a href="?tab=prices" style="margin-left:12px;color:#9aa0aa;font-size:13px">отмена</a><?php endif; ?>
  </form>
  <?php if ($ed): ?>
   <form method="post" onsubmit="return confirm('Удалить эту привилегию безвозвратно?')" style="margin-top:14px;border-top:1px solid #262b34;padding-top:14px">
    <input type="hidden" name="csrf" value="<?php echo csrf(); ?>"><input type="hidden" name="id" value="<?php echo (int)$ed['id']; ?>">
    <button name="priv_delete" value="1" style="background:#3a1f24;border:1px solid #7a2230;border-bottom:1px solid #7a2230;color:#ff8a99">🗑 Удалить привилегию</button>
   </form>
  <?php endif; ?>
 </div>

 <div class="card"><h2>Все привилегии</h2>
  <form method="post">
  <input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
  <table><tr><th><input type="checkbox" id="selAllPriv" title="Выбрать все"></th><th></th><th>Название / раздел</th><th>Катег.</th><th>Цена</th><th>Скидка</th><th>RCON</th><th>Акт.</th><th></th></tr>
  <?php
   $rows = db()->query('SELECT * FROM privileges ORDER BY category, sort, id')->fetchAll();
   if (!$rows) echo '<tr><td colspan="9" class="small">Привилегий нет. Добавьте первую выше.</td></tr>';
   foreach ($rows as $p): ?>
   <tr>
    <td><input type="checkbox" class="privSel" name="sel[]" value="<?php echo (int)$p['id']; ?>"></td>
    <td><?php if ($p['image']) echo '<img src="'.e($p['image']).'" alt="" style="height:36px;width:36px;object-fit:cover;border-radius:6px">'; ?></td>
    <td><?php echo e($p['name']); ?><?php if (!empty($p['qty_enabled'])) echo ' <span style="background:#1f3a2a;color:#54d98c;font-size:10px;padding:1px 6px;border-radius:5px;vertical-align:middle">×кол-во'.($p['qty_max']>0?' до '.(int)$p['qty_max']:'').'</span>'; ?><div class="small"><?php echo e($p['section']); ?></div></td>
    <td class="small"><?php echo e($p['category']); ?></td>
    <td><?php echo e(rtrim(rtrim(number_format($p['price'],2,'.',''),'0'),'.')); ?> ₽</td>
    <td class="small"><?php echo $p['old_price'] ? e(rtrim(rtrim(number_format($p['old_price'],2,'.',''),'0'),'.')).' ₽' : '—'; ?></td>
    <td class="small" style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="<?php echo e($p['rcon_command']); ?>"><?php echo $p['rcon_command'] ? e($p['rcon_command']) : '<span style="color:#5a6068">—</span>'; ?></td>
    <td><?php echo $p['active'] ? '<span style="color:#1fbf57">✓</span>' : '<span style="color:#5a6068">✕</span>'; ?></td>
    <td style="white-space:nowrap">
     <a href="?tab=prices&edit=<?php echo (int)$p['id']; ?>" style="color:#fc9404">изм.</a>
     <button name="priv_del_one" value="<?php echo (int)$p['id']; ?>" onclick="return confirm('Удалить эту привилегию?')" style="background:none;color:#e0556b;padding:0;margin:0 0 0 10px;font-size:13px">удал.</button>
    </td>
   </tr>
  <?php endforeach; ?>
  </table>
  <?php if ($rows): ?>
   <button name="priv_delete_bulk" value="1" onclick="if(!document.querySelectorAll('.privSel:checked').length){alert('Отметьте товары галочками');return false;}return confirm('Удалить выбранные привилегии?')" style="background:#3a1f24;border:1px solid #7a2230;border-bottom:1px solid #7a2230;color:#ff8a99;margin-top:14px">🗑 Удалить выбранные</button>
  <?php endif; ?>
  </form>
 </div>
 <script>
  (function(){ var a=document.getElementById('selAllPriv'); if(a) a.addEventListener('change',function(){
    document.querySelectorAll('.privSel').forEach(function(c){ c.checked=a.checked; }); }); })();
 </script>

<?php elseif ($tab === 'cats'):
   $editId = (int)($_GET['edit'] ?? 0); $ec = null;
   if ($editId) { $s = db()->prepare('SELECT * FROM categories WHERE id=?'); $s->execute([$editId]); $ec = $s->fetch(); }
?>
 <div class="card"><h2><?php echo $ec ? 'Изменить категорию' : 'Добавить категорию'; ?></h2>
  <form method="post"><input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
   <input type="hidden" name="cat_id" value="<?php echo $ec ? (int)$ec['id'] : 0; ?>">
   <div class="row">
    <div><label>Название <span class="small">(вкладка в магазине)</span></label>
      <input type="text" name="cat_name" value="<?php echo $ec ? e($ec['name']) : ''; ?>" required></div>
    <div><label>Порядок <span class="small">(меньше = левее)</span></label>
      <input type="number" name="cat_sort" value="<?php echo $ec ? (int)$ec['sort'] : 0; ?>"></div>
   </div>
   <div class="chk"><input type="checkbox" id="ca" name="cat_active" <?php echo (!$ec || $ec['active']) ? 'checked' : ''; ?>><label for="ca" style="margin:0">Активна (показывать вкладку в магазине)</label></div>
   <button name="cat_save" value="1"><?php echo $ec ? 'Сохранить' : 'Добавить категорию'; ?></button>
   <?php if ($ec): ?><a href="?tab=cats" style="margin-left:12px;color:#9aa0aa;font-size:13px">отмена</a><?php endif; ?>
  </form>
 </div>
 <div class="card"><h2>Категории</h2>
  <table><tr><th>Название</th><th>Порядок</th><th>Привилегий</th><th>Активна</th><th></th></tr>
  <?php foreach (db()->query('SELECT c.*, (SELECT COUNT(*) FROM privileges p WHERE p.category=c.name) AS cnt FROM categories c ORDER BY sort, id') as $c): ?>
   <tr>
    <td><?php echo e($c['name']); ?></td>
    <td><?php echo (int)$c['sort']; ?></td>
    <td class="small"><?php echo (int)$c['cnt']; ?></td>
    <td><?php echo $c['active'] ? '<span style="color:#1fbf57">✓</span>' : '<span style="color:#5a6068">✕</span>'; ?></td>
    <td style="white-space:nowrap">
     <a href="?tab=cats&edit=<?php echo (int)$c['id']; ?>" style="color:#fc9404">изм.</a>
     <form method="post" style="display:inline" onsubmit="return confirm('Удалить категорию?')">
      <input type="hidden" name="csrf" value="<?php echo csrf(); ?>"><input type="hidden" name="cat_id" value="<?php echo (int)$c['id']; ?>">
      <button name="cat_delete" value="1" style="background:none;color:#e0556b;padding:0;margin:0 0 0 10px;font-size:13px">удал.</button>
     </form>
    </td>
   </tr>
  <?php endforeach; ?>
  </table>
  <p class="small">Категорию с привилегиями удалить нельзя — сначала перенесите или удалите её привилегии.</p>
 </div>

<?php elseif ($tab === 'promo'):
   $editId = (int)($_GET['edit'] ?? 0); $ep = null;
   if ($editId) { $s = db()->prepare('SELECT * FROM promos WHERE id=?'); $s->execute([$editId]); $ep = $s->fetch(); }
   $pv = function ($k, $d = '') use ($ep) { return $ep ? e($ep[$k]) : $d; };
   $fmt = function ($pr) { $s = rtrim(rtrim(number_format((float)$pr['value'], 2, '.', ''), '0'), '.'); return $pr['type'] === 'fixed' ? ($s . ' ₽') : ($s . '%'); };
?>
 <div class="card"><h2><?php echo $ep ? 'Изменить промокод' : 'Добавить промокод'; ?></h2>
  <form method="post"><input type="hidden" name="csrf" value="<?php echo csrf(); ?>"><input type="hidden" name="promo_id" value="<?php echo $ep ? (int)$ep['id'] : 0; ?>">
   <div class="row">
    <div><label>Код</label><input type="text" name="code" value="<?php echo $pv('code'); ?>" required autocomplete="off" style="text-transform:uppercase"></div>
    <div><label>Тип скидки</label><select name="ptype">
      <option value="percent"<?php echo (!$ep || $ep['type'] === 'percent') ? ' selected' : ''; ?>>Процент (%)</option>
      <option value="fixed"<?php echo ($ep && $ep['type'] === 'fixed') ? ' selected' : ''; ?>>Фикс. сумма (₽)</option>
    </select></div>
   </div>
   <div class="row">
    <div><label>Значение <span class="small">(% или ₽)</span></label><input type="number" step="0.01" min="0" name="pvalue" value="<?php echo $ep ? e($ep['value']) : ''; ?>" required></div>
    <div><label>Лимит использований <span class="small">(0 = без лимита)</span></label><input type="number" min="0" name="max_uses" value="<?php echo $ep ? (int)$ep['max_uses'] : 0; ?>"></div>
   </div>
   <label>Действует до <span class="small">(пусто = бессрочно)</span></label>
   <input type="date" name="expires_at" value="<?php echo $pv('expires_at'); ?>">
   <div class="chk"><input type="checkbox" id="pa" name="promo_active" <?php echo (!$ep || $ep['active']) ? 'checked' : ''; ?>><label for="pa" style="margin:0">Активен</label></div>
   <button name="promo_save" value="1"><?php echo $ep ? 'Сохранить' : 'Добавить'; ?></button>
   <?php if ($ep): ?><a href="?tab=promo" style="margin-left:12px;color:#9aa0aa;font-size:13px">отмена</a><?php endif; ?>
  </form>
  <?php if ($ep): ?>
   <form method="post" onsubmit="return confirm('Удалить промокод?')" style="margin-top:14px;border-top:1px solid #262b34;padding-top:14px">
    <input type="hidden" name="csrf" value="<?php echo csrf(); ?>"><input type="hidden" name="promo_id" value="<?php echo (int)$ep['id']; ?>">
    <button name="promo_delete" value="1" style="background:#3a1f24;border:1px solid #7a2230;border-bottom:1px solid #7a2230;color:#ff8a99">🗑 Удалить промокод</button>
   </form>
  <?php endif; ?>
 </div>
 <div class="card"><h2>Все промокоды</h2>
  <table><tr><th>Код</th><th>Скидка</th><th>Исп./лимит</th><th>До</th><th>Акт.</th><th></th></tr>
  <?php
   $rows = db()->query('SELECT * FROM promos ORDER BY id DESC')->fetchAll();
   if (!$rows) echo '<tr><td colspan="6" class="small">Промокодов нет. Добавьте первый выше.</td></tr>';
   foreach ($rows as $pr): ?>
   <tr>
    <td><b><?php echo e($pr['code']); ?></b></td>
    <td><?php echo $fmt($pr); ?></td>
    <td class="small"><?php echo (int)$pr['used'] . ' / ' . ((int)$pr['max_uses'] ?: '∞'); ?></td>
    <td class="small"><?php echo $pr['expires_at'] ? e($pr['expires_at']) : '—'; ?></td>
    <td><?php echo $pr['active'] ? '<span style="color:#1fbf57">✓</span>' : '<span style="color:#5a6068">✕</span>'; ?></td>
    <td><a href="?tab=promo&edit=<?php echo (int)$pr['id']; ?>" style="color:#fc9404">изм.</a></td>
   </tr>
  <?php endforeach; ?>
  </table>
 </div>

<?php elseif ($tab === 'cur'): $sv = function ($k, $d = '') { $v = setting($k); return e($v !== '' ? $v : $d); };
   $ta = 'width:100%;box-sizing:border-box;padding:9px 11px;background:#0f1217;border:1px solid #2b313b;border-radius:8px;color:#fff;font-family:inherit'; ?>
 <div class="card"><h2>Игровая валюта</h2>
  <p class="small">Блок «Покупка игровой валюты» на главной (слайдер). После сохранения обновите сайт (Ctrl+F5).</p>
  <form method="post" enctype="multipart/form-data"><input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
   <div class="chk"><input type="checkbox" id="ce" name="cur_enabled" <?php echo setting('cur_enabled','1')==='1'?'checked':''; ?>><label for="ce" style="margin:0">Показывать блок покупки валюты</label></div>
   <div class="row">
    <div><label>Название валюты</label><input type="text" name="cur_name" value="<?php echo $sv('cur_name','Риллики'); ?>"></div>
    <div><label>Суффикс <span class="small">(в «Получаете», напр. R)</span></label><input type="text" name="cur_suffix" value="<?php echo $sv('cur_suffix','R'); ?>"></div>
   </div>
   <div class="row">
    <div><label>Минимум</label><input type="number" name="cur_min" value="<?php echo $sv('cur_min','100'); ?>"></div>
    <div><label>Максимум</label><input type="number" name="cur_max" value="<?php echo $sv('cur_max','6000'); ?>"></div>
   </div>
   <div class="row">
    <div><label>Шаг</label><input type="number" name="cur_step" value="<?php echo $sv('cur_step','100'); ?>"></div>
    <div><label>Цена за 1 единицу, ₽ <span class="small">(итог = кол-во × цена)</span></label><input type="number" step="0.01" name="cur_rate" value="<?php echo $sv('cur_rate','1'); ?>"></div>
   </div>
   <div class="row">
    <div><label>Картинка — файл</label><input type="file" name="cur_file" accept="image/*"></div>
    <div><label>…или ссылка</label><input type="text" name="cur_image" value="<?php echo $sv('cur_image'); ?>" placeholder="/images/coin_shop.webp"></div>
   </div>
   <?php if (setting('cur_image')): ?><img src="<?php echo e(setting('cur_image')); ?>" alt="" style="height:54px;margin-top:8px;border-radius:8px"><?php endif; ?>
   <label>Команды выдачи (RCON) <span class="small">— по одной на строку; {nick} — ник, {amount} — количество</span></label>
   <textarea name="cur_rcon" rows="3" placeholder="eco give {nick} {amount}&#10;say {nick} купил {amount}" style="<?php echo $ta; ?>"><?php echo $sv('cur_rcon'); ?></textarea>
   <button name="save_cur" value="1">Сохранить</button>
  </form>
 </div>

<?php elseif ($tab === 'site'): $sv = function ($k, $d = '') { $v = setting($k); return e($v !== '' ? $v : $d); }; ?>
 <div class="card"><h2>Внешний вид сайта</h2>
  <p class="small">Применяется к сайту на лету. После сохранения обновите страницы магазина (Ctrl+F5).</p>
  <form method="post" enctype="multipart/form-data"><input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
   <fieldset><legend>Основное</legend>
    <label>Заголовок вкладки браузера (title)</label>
    <input type="text" name="site_title" value="<?php echo $sv('site_title'); ?>">
    <div class="row">
     <div><label>Логотип — слово 1</label><input type="text" name="logo_word1" value="<?php echo $sv('logo_word1'); ?>"></div>
     <div><label>Логотип — слово 2</label><input type="text" name="logo_word2" value="<?php echo $sv('logo_word2'); ?>"></div>
    </div>
    <div class="row">
     <div><label>Логотип — картинка</label><input type="file" name="logo_file" accept="image/*"></div>
     <div><label>…или ссылка на картинку</label><input type="text" name="logo_image" value="<?php echo $sv('logo_image'); ?>"></div>
    </div>
    <?php if (setting('logo_image')): ?><img src="<?php echo e(setting('logo_image')); ?>" alt="" style="height:48px;margin-top:10px;border-radius:6px;background:#fff;padding:4px"><?php endif; ?>
    <label>Акцентный цвет <span class="small">(кнопки, ценники, прогресс-бар)</span></label>
    <input type="color" name="color_primary" value="<?php echo $sv('color_primary', '#fc9404'); ?>" style="width:64px;height:40px;padding:2px;background:#0f1217;border:1px solid #2b313b;border-radius:8px">
   </fieldset>

   <fieldset><legend>Дизайн</legend>
    <div class="row">
     <div><label>Фон страницы</label>
      <input type="color" name="bg_color" value="<?php echo $sv('bg_color', '#f6f6f6'); ?>" style="width:64px;height:40px;padding:2px;background:#0f1217;border:1px solid #2b313b;border-radius:8px"></div>
     <div><label>Цвет текста <span class="small">(hex или пусто = по умолчанию)</span></label>
      <input type="text" name="text_color" value="<?php echo $sv('text_color'); ?>" placeholder="напр. #222222"></div>
    </div>
    <label>Шрифт</label>
    <select name="font_family">
     <option value="">Mazzard (оригинал)</option>
     <?php foreach (['Roboto','Montserrat','Open Sans','Inter','Oswald','Rubik','PT Sans','Nunito','Jost','Manrope'] as $f)
        echo '<option'.(setting('font_family')===$f?' selected':'').'>'.e($f).'</option>'; ?>
    </select>
    <div class="row">
     <div><label>Фон главного экрана — файл</label><input type="file" name="herobg_file" accept="image/*"></div>
     <div><label>…или ссылка</label><input type="text" name="hero_bg" value="<?php echo $sv('hero_bg'); ?>" placeholder="/images/bg1.webp"></div>
    </div>
    <?php if (setting('hero_bg')): ?><img src="<?php echo e(setting('hero_bg')); ?>" alt="" style="height:54px;margin-top:8px;border-radius:6px"><?php endif; ?>
    <div class="row">
     <div><label>Фавикон (лого в браузере) — файл</label><input type="file" name="favicon_file" accept="image/*"></div>
     <div><label>…или ссылка</label><input type="text" name="favicon" value="<?php echo $sv('favicon'); ?>"></div>
    </div>
   </fieldset>

   <fieldset><legend>Сервер</legend>
    <label>IP сервера <span class="small">(кнопка «копировать IP»)</span></label>
    <input type="text" name="server_ip" value="<?php echo $sv('server_ip'); ?>">
    <label>Источник онлайна</label>
    <select name="status_source">
     <option value="slp"<?php echo setting('status_source','slp')==='slp'?' selected':''; ?>>SLP — пинг статуса (быстро; показывает, что сервер объявляет)</option>
     <option value="rcon"<?php echo setting('status_source')==='rcon'?' selected':''; ?>>RCON — реальный онлайн (нужен включённый RCON в «Настройках»)</option>
    </select>
    <div class="row">
     <div><label>Хост для опроса онлайна <span class="small">(для SLP; IP/домен MC-сервера)</span></label>
      <input type="text" name="status_host" value="<?php echo $sv('status_host'); ?>" placeholder="напр. mc.example.ru"></div>
     <div><label>Порт</label><input type="text" name="status_port" value="<?php echo $sv('status_port', '25565'); ?>"></div>
    </div>
    <p class="small">Если сервер «накручивает» онлайн — SLP покажет накрутку. Для настоящего онлайна выбери <b>RCON</b> и настрой RCON во вкладке «Настройки».</p>
   </fieldset>

   <fieldset><legend>Главный экран</legend>
    <div class="row">
     <div><label>Заголовок — строка 1</label><input type="text" name="hero_title1" value="<?php echo $sv('hero_title1'); ?>"></div>
     <div><label>Заголовок — строка 2</label><input type="text" name="hero_title2" value="<?php echo $sv('hero_title2'); ?>"></div>
    </div>
    <label>Подзаголовок <span class="small">(перенос строки = новая строка)</span></label>
    <textarea name="hero_subtitle" rows="2" style="width:100%;box-sizing:border-box;padding:9px 11px;background:#0f1217;border:1px solid #2b313b;border-radius:8px;color:#fff;font-family:inherit"><?php echo $sv('hero_subtitle'); ?></textarea>
   </fieldset>

   <fieldset><legend>Соцсети (ссылки)</legend>
    <div class="row">
     <div><label>ВКонтакте</label><input type="text" name="soc_vk" value="<?php echo $sv('soc_vk'); ?>"></div>
     <div><label>Discord</label><input type="text" name="soc_discord" value="<?php echo $sv('soc_discord'); ?>"></div>
    </div>
    <div class="row">
     <div><label>YouTube</label><input type="text" name="soc_youtube" value="<?php echo $sv('soc_youtube'); ?>"></div>
     <div><label>Форум</label><input type="text" name="soc_forum" value="<?php echo $sv('soc_forum'); ?>"></div>
    </div>
    <label>Telegram <span class="small">(необязательно)</span></label>
    <input type="text" name="soc_telegram" value="<?php echo $sv('soc_telegram'); ?>">
   </fieldset>

   <fieldset><legend>Блок «Последние покупки»</legend>
    <?php $clr = 'width:64px;height:40px;padding:2px;background:#0f1217;border:1px solid #2b313b;border-radius:8px'; ?>
    <div class="chk"><input type="checkbox" id="re2" name="recent_enabled" <?php echo setting('recent_enabled','1')==='1'?'checked':''; ?>><label for="re2" style="margin:0">Показывать блок внизу сайта</label></div>
    <div class="row">
     <div><label>Сколько показывать</label><input type="number" name="recent_count" value="<?php echo $sv('recent_count','12'); ?>"></div>
     <div><label>Фон блока</label><input type="color" name="recent_bg" value="<?php echo $sv('recent_bg','#16181d'); ?>" style="<?php echo $clr; ?>"></div>
    </div>
    <div class="row">
     <div><label>Фон карточек</label><input type="color" name="recent_card" value="<?php echo $sv('recent_card','#1d2027'); ?>" style="<?php echo $clr; ?>"></div>
     <div><label>Цвет текста / ника</label><input type="color" name="recent_text" value="<?php echo $sv('recent_text','#ffffff'); ?>" style="<?php echo $clr; ?>"></div>
    </div>
    <label>Цвет подписи товара</label>
    <input type="color" name="recent_muted" value="<?php echo $sv('recent_muted','#8b919c'); ?>" style="<?php echo $clr; ?>">
   </fieldset>

   <fieldset><legend>Документы (ссылки)</legend>
    <label>Договор оферты</label><input type="text" name="link_offer" value="<?php echo $sv('link_offer'); ?>">
    <label>Политика обработки персональных данных</label><input type="text" name="link_privacy" value="<?php echo $sv('link_privacy'); ?>">
    <label>Политика Mojang</label><input type="text" name="link_mojang" value="<?php echo $sv('link_mojang'); ?>">
   </fieldset>

   <fieldset><legend>Подвал</legend>
    <label>Копирайт <span class="small">(год добавится автоматически)</span></label>
    <input type="text" name="footer_copyright" value="<?php echo $sv('footer_copyright'); ?>">
    <div class="row">
     <div><label>Компания / ИП</label><input type="text" name="footer_company" value="<?php echo $sv('footer_company'); ?>"></div>
     <div><label>ИНН</label><input type="text" name="footer_inn" value="<?php echo $sv('footer_inn'); ?>"></div>
    </div>
    <div class="row">
     <div><label>ОГРНИП</label><input type="text" name="footer_ogrnip" value="<?php echo $sv('footer_ogrnip'); ?>"></div>
     <div><label>E-mail / контакты</label><input type="text" name="footer_email" value="<?php echo $sv('footer_email'); ?>"></div>
    </div>
   </fieldset>

   <button name="save_site" value="1">Сохранить</button>
  </form>
 </div>

<?php else: /* general */ ?>
 <div class="card"><h2>Общие настройки</h2>
  <form method="post"><input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
   <div class="row">
    <div><label>Базовый URL сайта (для колбэков)</label>
     <input type="text" name="base_url" value="<?php echo e(setting('base_url')); ?>" placeholder="https://reallyworld.ru"></div>
    <div><label>Валюта</label><input type="text" name="currency" value="<?php echo e(setting('currency','RUB')); ?>"></div>
   </div>
   <label>Разрешённые IP админки (через запятую; пусто = любой)</label>
   <input type="text" name="admin_ips" value="<?php echo e(setting('admin_ips')); ?>" placeholder="напр. 1.2.3.4, 5.6.7.8">
   <p class="small">Ваш текущий IP: <?php echo e(client_ip()); ?></p>
   <label>Новый пароль (оставьте пустым, чтобы не менять)</label>
   <input type="password" name="new_pass" autocomplete="new-password">
   <button name="save_general" value="1">Сохранить</button>
  </form>
 </div>

 <div class="card"><h2>Сервер Minecraft (RCON)</h2>
  <p class="small">Если включено — после успешной оплаты команда выдачи из карточки привилегии
   автоматически выполняется на сервере. Включите RCON в <code>server.properties</code>
   (<code>enable-rcon=true</code>, <code>rcon.port</code>, <code>rcon.password</code>).</p>
  <form method="post"><input type="hidden" name="csrf" value="<?php echo csrf(); ?>">
   <div class="chk"><input type="checkbox" id="re" name="rcon_enabled" <?php echo setting('rcon_enabled')==='1'?'checked':''; ?>><label for="re" style="margin:0">Включить авто-выдачу через RCON</label></div>
   <div class="row">
    <div><label>Хост</label><input type="text" name="rcon_host" value="<?php echo e(setting('rcon_host')); ?>" placeholder="127.0.0.1"></div>
    <div><label>Порт</label><input type="text" name="rcon_port" value="<?php echo e(setting('rcon_port','25575')); ?>"></div>
   </div>
   <label>Пароль RCON <span class="small">(оставьте пустым, чтобы не менять)</span></label>
   <input type="password" name="rcon_password" autocomplete="new-password" placeholder="<?php echo setting('rcon_password')?'••••••••':''; ?>">
   <div><button name="save_rcon" value="1">Сохранить RCON</button>
    <button type="submit" name="rcon_test" value="1" id="rconTestBtn" style="background:#2b313b;margin-left:10px">Проверить соединение</button></div>
   <div id="rconResult" class="small" style="margin-top:12px"></div>
  </form>
 </div>
<?php endif; ?>
</main>
<script>
(function () {
  var btn = document.getElementById('rconTestBtn');
  if (!btn) return;
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    var form = btn.closest('form');
    var res = document.getElementById('rconResult');
    res.style.color = '#9aa0aa';
    res.textContent = 'Проверяю соединение…';
    var fd = new FormData(form);
    fd.append('ajax', '1');
    fd.append('rcon_test', '1');
    fetch(location.pathname + '?tab=general', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (d) {
        if (!d) { res.style.color = '#e0556b'; res.textContent = 'Не удалось выполнить запрос.'; return; }
        res.style.color = d.ok ? '#1fbf57' : '#e0556b';
        res.textContent = (d.ok ? '✓ ' : '✕ ') + d.message;
      });
  });
})();
</script>
</body></html>
