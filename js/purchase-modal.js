/* ReallyWorld — purchase modal (privileges + game currency).
   Original Vue handlers are inert in this mirror, so we wire it ourselves.
   Flow: trigger -> nickname -> fetch /api/methods.php -> pick method ->
   /api/create.php -> redirect to the gateway. */
(function () {
  "use strict";

  var CATEGORIES = ["Гриф. Выживание", "Анархия", "СТО"];
  var overlay, root, lastFocus, current = null;
  var CUR = null; // конфигурация игровой валюты

  function h(tag, cls, html) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function buildShell() {
    overlay = h("div", "rw-overlay");
    overlay.innerHTML =
      '<div class="rw-modal" role="dialog" aria-modal="true">' +
        '<div class="rw-modal__media">' +
          '<span class="rw-modal__badge"></span>' +
          '<button class="rw-modal__close" aria-label="Закрыть">&times;</button>' +
          '<div class="rw-modal__name"></div>' +
        '</div>' +
        '<div class="rw-modal__body">' +
          '<div class="rw-modal__pricerow">' +
            '<span class="rw-modal__price"></span>' +
            '<span class="rw-modal__price-old"></span>' +
          '</div>' +
          '<div class="rw-qty" hidden>' +
            '<span class="rw-qty__label">Количество</span>' +
            '<div class="rw-qty__ctrl">' +
              '<button class="rw-qty__btn" type="button" data-d="-1">&minus;</button>' +
              '<input class="rw-qty__inp" type="text" inputmode="numeric" value="1">' +
              '<button class="rw-qty__btn" type="button" data-d="1">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="rw-step rw-step--form">' +
            '<label class="rw-field-label" for="rw-nick">Ваш игровой ник</label>' +
            '<div class="rw-input-wrap"><i class="fas fa-user"></i>' +
              '<input id="rw-nick" class="rw-modal__input" type="text" maxlength="16" ' +
                'placeholder="Введите ник в Minecraft" autocomplete="off"></div>' +
            '<div class="rw-hint"></div>' +
            '<div class="rw-promo">' +
              '<div class="rw-promo__row">' +
                '<input class="rw-promo__input" type="text" placeholder="Промокод" autocomplete="off">' +
                '<button class="rw-promo__btn" type="button">Применить</button>' +
              '</div>' +
              '<div class="rw-promo__msg"></div>' +
            '</div>' +
            '<button class="rw-modal__pay"><i class="fas fa-shopping-cart"></i>Купить</button>' +
            '<p class="rw-modal__note">Совершая покупку, вы соглашаетесь с условиями ' +
              '<a href="/public_offer.pdf" target="_blank">пользовательского соглашения</a> ' +
              'и <a href="/privacy.pdf" target="_blank">политикой обработки персональных данных</a>.</p>' +
          '</div>' +
          '<div class="rw-step rw-step--methods" hidden>' +
            '<div class="rw-step-head"><button class="rw-back" type="button">' +
              '<i class="fas fa-arrow-left"></i></button><span>Способ оплаты</span></div>' +
            '<div class="rw-methods"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    root = overlay.querySelector(".rw-modal");

    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector(".rw-modal__close").addEventListener("click", close);
    overlay.querySelector(".rw-modal__pay").addEventListener("click", onBuy);
    overlay.querySelector(".rw-back").addEventListener("click", function () { showStep("form"); });
    [].forEach.call(overlay.querySelectorAll(".rw-qty__btn"), function (b) {
      b.addEventListener("click", function () { changeQty(parseInt(b.getAttribute("data-d"), 10) || 0); });
    });
    overlay.querySelector(".rw-qty__inp").addEventListener("input", function () {
      var v = parseInt(this.value.replace(/\D/g, ""), 10);
      setQty(isNaN(v) ? current.qtyMin : v, true);
    });
    overlay.querySelector(".rw-qty__inp").addEventListener("blur", function () { setQty(current.qty, false); });
    overlay.querySelector(".rw-promo__btn").addEventListener("click", applyPromo);
    overlay.querySelector(".rw-promo__input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); applyPromo(); }
    });
    overlay.querySelector(".rw-modal__input").addEventListener("input", clearError);
    overlay.querySelector(".rw-modal__input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") onBuy();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
  }

  function clearError() {
    root.classList.remove("is-invalid");
    overlay.querySelector(".rw-hint").textContent = "";
  }
  function showStep(name) {
    overlay.querySelector(".rw-step--form").hidden = name !== "form";
    overlay.querySelector(".rw-step--methods").hidden = name !== "methods";
  }
  function resetBuyBtn() {
    var b = overlay.querySelector(".rw-modal__pay");
    b.disabled = false;
    b.innerHTML = '<i class="fas fa-shopping-cart"></i>' + ((current && current.payLabel) || "Купить");
  }
  function currentNick() { return overlay.querySelector(".rw-modal__input").value.trim(); }
  function money(n) { return (Number(n) || 0).toLocaleString("ru-RU") + " ₽"; }

  // контекст корзины для запросов promo/create
  function cartBody() {
    if (current.kind === "currency") return { type: "currency", qty: current.qty };
    var b = { privilege: current.name, category: current.cat };
    if (current.qtyEnabled) b.qty = current.qty;
    return b;
  }

  function applyPromo() {
    var input = overlay.querySelector(".rw-promo__input");
    var msg = overlay.querySelector(".rw-promo__msg");
    var code = input.value.trim();
    if (!code) {
      current.promo = null; msg.textContent = ""; msg.className = "rw-promo__msg";
      setPrice(current.price, current.priceOld); // восстановить базовую цену
      return;
    }
    var btn = overlay.querySelector(".rw-promo__btn");
    btn.disabled = true; btn.textContent = "…";
    var body = cartBody(); body.code = code;
    fetch("/api/promo.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (d) {
        btn.disabled = false; btn.textContent = "Применить";
        if (d && d.ok) {
          current.promo = d.code;
          setPrice(money(d.final), money(d.base));      // итог + зачёркнутая старая
          msg.textContent = "Промокод применён: " + d.label;
          msg.className = "rw-promo__msg rw-promo__msg--ok";
        } else {
          current.promo = null;
          setPrice(current.price, current.priceOld);
          msg.textContent = (d && d.error) ? d.error : "Не удалось проверить промокод";
          msg.className = "rw-promo__msg rw-promo__msg--err";
        }
      });
  }

  function setPrice(price, old) {
    overlay.querySelector(".rw-modal__price").textContent = price || "";
    var o = overlay.querySelector(".rw-modal__price-old");
    o.textContent = old || "";
    o.style.display = old ? "" : "none";
  }

  /* ---------- количество (кейсы) ---------- */
  function effMax() { return (current && current.qtyMax > 0) ? current.qtyMax : 64; }
  function clampQty(q) {
    q = Math.round(Number(q));
    if (isNaN(q) || q < 1) q = 1;
    if (q > effMax()) q = effMax();
    return q;
  }
  function renderQtyPrice() {
    // базовая цена = цена за штуку × количество; смена количества сбрасывает промокод
    current.price = money(current.unitPrice * current.qty);
    current.priceOld = "";
    current.promo = null;
    var pin = overlay.querySelector(".rw-promo__input"); if (pin) pin.value = "";
    var pmsg = overlay.querySelector(".rw-promo__msg"); if (pmsg) { pmsg.textContent = ""; pmsg.className = "rw-promo__msg"; }
    setPrice(current.price, "");
  }
  function setQty(q, typing) {
    if (!current || !current.qtyEnabled) return;
    current.qty = clampQty(q);
    var inp = overlay.querySelector(".rw-qty__inp");
    if (inp) inp.value = current.qty;
    renderQtyPrice();
  }
  function changeQty(d) { setQty((current.qty || 1) + d, false); }

  function openWith(d) {
    current = d;
    overlay.querySelector(".rw-modal__media").style.backgroundImage =
      "linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.2) 100%)" + (d.img ? ',url("' + d.img + '")' : "");
    overlay.querySelector(".rw-modal__name").textContent = d.name || "Покупка";
    overlay.querySelector(".rw-modal__badge").textContent = d.cat || "";
    setPrice(d.price, d.priceOld);

    // сброс промокода
    current.promo = null;
    var pin = overlay.querySelector(".rw-promo__input");
    if (pin) pin.value = "";
    var pmsg = overlay.querySelector(".rw-promo__msg");
    if (pmsg) { pmsg.textContent = ""; pmsg.className = "rw-promo__msg"; }

    // блок количества (для кейсов)
    var qtyBox = overlay.querySelector(".rw-qty");
    if (d.qtyEnabled) {
      current.qty = clampQty(d.qty || 1);
      overlay.querySelector(".rw-qty__inp").value = current.qty;
      qtyBox.hidden = false;
      renderQtyPrice();              // пересчитать цену = за штуку × количество
    } else {
      qtyBox.hidden = true;
    }

    clearError();
    overlay.querySelector(".rw-modal__input").value = "";
    resetBuyBtn();
    showStep("form");
    lastFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    overlay.classList.add("is-open");
    setTimeout(function () { overlay.querySelector(".rw-modal__input").focus(); }, 260);
  }

  function openCard(card) {
    var img = "";
    var bg = card.style.backgroundImage || getComputedStyle(card).backgroundImage || "";
    var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (m) img = m[1];
    var txt = function (sel) { var el = card.querySelector(sel); return el ? el.textContent.trim() : ""; };
    var cat = "Привилегия";
    var active = document.querySelector(".group-button .button.active") || document.querySelector(".button.active");
    if (active && CATEGORIES.indexOf(active.textContent.trim()) !== -1) cat = active.textContent.trim();
    var qtyEnabled = card.getAttribute("data-qty-enabled") === "1";
    var qtyMax = parseInt(card.getAttribute("data-qty-max"), 10) || 0;
    var unitPrice = parseFloat(card.getAttribute("data-unit-price"));
    openWith({
      kind: "privilege", payLabel: "Купить привилегию",
      name: txt(".name"), price: txt(".price"), priceOld: txt(".price_old"), img: img, cat: cat,
      qtyEnabled: qtyEnabled, qtyMax: qtyMax,
      unitPrice: isNaN(unitPrice) ? 0 : unitPrice, qty: 1
    });
  }

  function openCurrency() {
    if (!CUR) return;
    // берём количество с того, что реально показано на слайдере (источник правды)
    var qEl = document.getElementById("coin_currency");
    var qty = qEl ? parseInt((qEl.textContent || "").replace(/\D/g, ""), 10) : CUR.qty;
    if (!qty || isNaN(qty)) qty = CUR.qty;
    var price = Math.round(qty * CUR.rate);
    openWith({
      kind: "currency", payLabel: "Оплатить", qty: qty,
      name: CUR.name + " ×" + qty,
      price: price.toLocaleString("ru-RU") + " ₽", priceOld: "",
      img: CUR.img, cat: "Игровая валюта"
    });
  }

  function close() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onBuy() {
    var nick = currentNick();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) {
      root.classList.add("is-invalid");
      overlay.querySelector(".rw-hint").textContent =
        nick ? "Ник: 3–16 символов, латиница, цифры и _" : "Введите игровой ник";
      overlay.querySelector(".rw-modal__input").focus();
      return;
    }
    var btn = overlay.querySelector(".rw-modal__pay");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Загрузка…';

    fetch("/api/methods.php", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (data) {
        resetBuyBtn();
        if (!data || !data.ok || !Array.isArray(data.methods) || data.methods.length === 0) renderNoMethods();
        else renderMethods(data.methods);
        showStep("methods");
      });
  }

  function renderNoMethods() {
    overlay.querySelector(".rw-methods").innerHTML =
      '<div class="rw-empty"><i class="fas fa-circle-info"></i>' +
      '<p>Способы оплаты сейчас не подключены.</p>' +
      '<span>Администратор ещё не настроил платёжные системы. Загляните позже.</span></div>';
  }

  function renderMethods(methods) {
    var box = overlay.querySelector(".rw-methods");
    box.innerHTML = "";
    methods.forEach(function (mtd) {
      var icons = (mtd.icons || []).map(function (src) { return '<img src="' + src + '" alt="" loading="lazy">'; }).join("");
      var el = h("button", "rw-method");
      el.type = "button";
      el.innerHTML = '<span class="rw-method__title">' + esc(mtd.title) + '</span>' +
        '<span class="rw-method__icons">' + icons + '</span>' +
        '<i class="fas fa-chevron-right rw-method__arr"></i>';
      el.addEventListener("click", function () { pay(mtd.id, el); });
      box.appendChild(el);
    });
  }

  function pay(method, el) {
    var box = overlay.querySelector(".rw-methods");
    [].forEach.call(box.querySelectorAll(".rw-method"), function (b) { b.disabled = true; });
    if (el) el.classList.add("is-loading");

    var body = cartBody();
    body.nickname = currentNick();
    body.method = method;
    if (current.promo) body.promo = current.promo;

    fetch("/api/create.php", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (data) {
        if (data && data.ok && data.redirect) {
          window.location.href = data.redirect;
        } else {
          [].forEach.call(box.querySelectorAll(".rw-method"), function (b) { b.disabled = false; });
          if (el) el.classList.remove("is-loading");
          box.insertAdjacentHTML("afterbegin",
            '<div class="rw-payerr">' + esc(data && data.error ? data.error : "Не удалось создать платёж. Попробуйте позже.") + '</div>');
        }
      });
  }

  /* ---------- слайдер игровой валюты ---------- */
  function initCurrency(site) {
    var bar = document.getElementById("coin_bar");
    var section = document.getElementById("store_coin");
    if (!bar) return;
    if (!site || site.cur_enabled !== "1") { if (section) section.style.display = "none"; return; }

    CUR = {
      name: site.cur_name || "Валюта",
      suffix: site.cur_suffix || "",
      min: Math.max(1, parseFloat(site.cur_min) || 1),
      max: Math.max(2, parseFloat(site.cur_max) || 1000),
      step: Math.max(1, parseFloat(site.cur_step) || 1),
      rate: parseFloat(site.cur_rate) || 1,
      img: site.cur_image || "/images/coin_shop.webp",
      qty: 0
    };
    // стартовое количество — ближе к минимуму
    CUR.qty = clampQty(CUR.min + (CUR.max - CUR.min) * 0.1);

    var fill = document.getElementById("coin_bar_fill");
    var rub  = document.getElementById("coin_rub");
    var cnt  = document.getElementById("coin_currency");
    // подпись максимума: второй <span> в заголовке блока
    var maxLabel = document.querySelector(".select_coins p span:nth-of-type(2)");
    if (maxLabel) maxLabel.textContent = CUR.max;
    bar.style.cursor = "pointer";

    function render() {
      var frac = (CUR.qty - CUR.min) / (CUR.max - CUR.min);
      if (fill) fill.style.width = (Math.max(0, Math.min(1, frac)) * 100) + "%";
      if (cnt) cnt.textContent = CUR.qty;
      if (rub) rub.textContent = Math.round(CUR.qty * CUR.rate).toLocaleString("ru-RU");
    }
    function clampQty(v) {
      v = Math.round(v / CUR.step) * CUR.step;
      if (v < CUR.min) v = CUR.min;
      if (v > CUR.max) v = CUR.max;
      return v;
    }
    function fromX(clientX) {
      var r = bar.getBoundingClientRect();
      var frac = (clientX - r.left) / r.width;
      CUR.qty = clampQty(CUR.min + frac * (CUR.max - CUR.min));
      render();
    }

    var dragging = false;
    bar.addEventListener("mousedown", function (e) { dragging = true; fromX(e.clientX); e.preventDefault(); });
    document.addEventListener("mousemove", function (e) { if (dragging) fromX(e.clientX); });
    document.addEventListener("mouseup", function () { dragging = false; });
    bar.addEventListener("touchstart", function (e) { if (e.touches[0]) { fromX(e.touches[0].clientX); } }, { passive: true });
    bar.addEventListener("touchmove", function (e) { if (e.touches[0]) { fromX(e.touches[0].clientX); } }, { passive: true });

    // кнопка «Приобрести …»
    var btn = document.querySelector(".to_pay_coin a, #store_coin .to_pay_coin .button");
    if (btn) btn.addEventListener("click", function (e) { e.preventDefault(); openCurrency(); });

    render();
  }

  function init() {
    if (document.querySelector(".rw-overlay")) return;
    buildShell();
    // клик по карточке привилегии
    document.addEventListener("click", function (e) {
      var card = e.target.closest && e.target.closest(".card");
      if (card && card.querySelector(".name")) { e.preventDefault(); openCard(card); }
    });
    // конфигурация валюты
    fetch("/api/site.php", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (d) { if (d && d.ok && d.site) initCurrency(d.site); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
