/* ReallyWorld — динамическая витрина магазина.
   Тянет привилегии из /api/privileges.php и строит карточки в #store_items
   тем же дизайном, что и оригинал. Делает рабочими вкладки категорий.
   Если бэкенда нет (статика) — оставляет карточки из HTML как есть. */
(function () {
  "use strict";

  var DATA = [];

  function money(n) {
    n = Number(n) || 0;
    var s = (Math.round(n * 100) % 100 === 0) ? String(Math.round(n))
          : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return s + " ₽";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function cardHTML(p) {
    var img = p.image || "";
    var sale = "";
    if (p.old_price) {
      sale =
        '<div><div class="sale" style="position:absolute;top:10px;right:-106px;background:rgb(252,4,4);color:#fff;font-weight:bold;transform:rotate(45deg);padding:10px 100px;border:2px solid #fff">СКИДКА</div>' +
        '<div class="price_old" style="position:absolute;top:75px;left:25px;font-weight:bold;font-size:12px;background-color:rgb(255,0,0);color:#fff;padding:0 10px;border-radius:5px;text-decoration:line-through">' +
        esc(money(p.old_price)) + '</div></div>';
    }
    var qa = p.qty_enabled ? ' data-qty-enabled="1" data-qty-max="' + (p.qty_max || 0) + '" data-unit-price="' + p.price + '"' : "";
    return '<div class="card" data-id="' + p.id + '"' + qa + ' style="overflow:hidden;background:' +
      'linear-gradient(rgba(0,0,0,0) 35.71%, rgba(0,0,0,0.71) 100%), url(&quot;' + esc(img) +
      '&quot;) center center / cover no-repeat">' +
        '<div class="price">' + esc(money(p.price)) + '</div>' +
        '<div class="name">' + esc(p.name) + '</div>' +
        '<div class="buy"><i class="fas fa-shopping-cart"></i></div>' +
        sale +
      '</div>';
  }

  function activeCategory() {
    var a = document.querySelector(".group-button .button.active span, .group-button .button.active");
    return a ? a.textContent.trim() : "Гриф. Выживание";
  }

  function render() {
    var box = document.getElementById("store_items");
    if (!box) return;
    var cat = activeCategory();
    var items = DATA.filter(function (p) { return p.category === cat; });

    if (!items.length) {
      box.innerHTML = '<p style="grid-column:1/-1;color:#9a9a9a;padding:30px 0">В этой категории пока нет привилегий.</p>';
      return;
    }
    // группировка по разделам с сохранением порядка
    var order = [], groups = {};
    items.forEach(function (p) {
      var s = p.section || "Привилегии";
      if (!groups[s]) { groups[s] = []; order.push(s); }
      groups[s].push(p);
    });
    // h3 и .card — прямые дети #store_items (это CSS Grid; h3 растягивается на все колонки)
    var html = "";
    order.forEach(function (s) {
      html += '<h3>' + esc(s) + '</h3>' + groups[s].map(cardHTML).join("");
    });
    box.innerHTML = html;
  }

  function buildTabs(cats) {
    var box = document.querySelector(".group-button");
    if (!box || !cats.length) return;
    box.innerHTML = cats.map(function (name, i) {
      return '<a href="javascript:void(0)" class="button' + (i === 0 ? ' active' : '') +
        '"><span>' + esc(name) + '</span></a>';
    }).join("");
  }

  function wireTabs() {
    var tabs = document.querySelectorAll(".group-button .button");
    tabs.forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.preventDefault();
        tabs.forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        render();
      });
    });
  }

  function init() {
    fetch("/api/privileges.php", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (d) {
        if (!d || !d.ok || !Array.isArray(d.privileges) || !d.privileges.length) return; // оставляем статичные карточки
        DATA = d.privileges;
        if (Array.isArray(d.categories) && d.categories.length) buildTabs(d.categories);
        wireTabs();
        render();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
