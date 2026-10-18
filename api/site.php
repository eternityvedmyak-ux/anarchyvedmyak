<?php
/* GET /api/site.php — настройки внешнего вида сайта (для js/site.js). */
require_once __DIR__ . '/../app/helpers.php';
require_db_or_die_json();

$keys = [
    'site_title', 'logo_word1', 'logo_word2', 'logo_image', 'server_ip',
    'hero_title1', 'hero_title2', 'hero_subtitle',
    'soc_vk', 'soc_forum', 'soc_youtube', 'soc_discord', 'soc_telegram',
    'color_primary', 'bg_color', 'text_color', 'font_family', 'favicon', 'hero_bg',
    'link_offer', 'link_privacy', 'link_mojang',
    'cur_enabled', 'cur_name', 'cur_suffix', 'cur_min', 'cur_max', 'cur_step', 'cur_rate', 'cur_image',
    'footer_company', 'footer_inn', 'footer_ogrnip', 'footer_email', 'footer_copyright',
];
$out = [];
foreach ($keys as $k) $out[$k] = setting($k, '');
json_out(['ok' => true, 'site' => $out]);
