/* ReallyWorld — применение настроек сайта из админки (/api/site.php) к странице.
   Меняет только то, что задано в админке; пустые значения не трогают разметку.
   Работает поверх статичного HTML — как shop.js. */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }
  function darken(hex, p) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return hex;
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = 1 - (p || 0.18);
    return "#" + [r, g, b].map(function (x) {
      return ("0" + Math.max(0, Math.round(x * f)).toString(16)).slice(-2);
    }).join("");
  }

  function apply(s) {
    // --- заголовок вкладки ---
    if (s.site_title) document.title = s.site_title;

    // --- логотип (текст) ---
    document.querySelectorAll(".logo_text").forEach(function (box) {
      var sp = box.querySelectorAll("span");
      if (sp[0] && s.logo_word1) sp[0].textContent = s.logo_word1;
      if (sp[1] && s.logo_word2) sp[1].textContent = s.logo_word2;
    });
    // --- логотип (картинка) ---
    if (s.logo_image) {
      document.querySelectorAll(".logotype .pic").forEach(function (pic) {
        pic.style.backgroundImage = 'url("' + s.logo_image + '")';
        pic.style.backgroundSize = "contain";
        pic.style.backgroundRepeat = "no-repeat";
        pic.style.backgroundPosition = "center";
      });
    }

    // --- герой ---
    var h1 = document.querySelector("#head_top h1");
    if (h1 && (s.hero_title1 || s.hero_title2)) {
      h1.innerHTML = esc(s.hero_title1) + (s.hero_title2 ? "<br>" + esc(s.hero_title2) : "");
    }
    var h5 = document.querySelector("#head_top h5");
    if (h5 && s.hero_subtitle) h5.innerHTML = nl2br(s.hero_subtitle);
    var pic = document.querySelector(".pic_text");
    if (pic && s.hero_title1) pic.textContent = s.hero_title1;

    // --- IP сервера ---
    if (s.server_ip) {
      document.querySelectorAll("[data-clipboard-text]").forEach(function (el) {
        el.setAttribute("data-clipboard-text", s.server_ip);
        var sp = el.querySelector("span");
        if (sp) sp.textContent = s.server_ip; else if (!el.children.length) el.textContent = s.server_ip;
      });
    }

    // --- соц-ссылки: если ссылка не задана в админке — блок прячем ---
    function setSocial(cls, url) {
      var wraps = [];
      document.querySelectorAll(".social .social-icon." + cls).forEach(function (el) { wraps.push(el); });
      document.querySelectorAll("#social a").forEach(function (a) { if (a.querySelector("." + cls)) wraps.push(a); });
      wraps.forEach(function (el) {
        if (url) {
          el.style.display = "";
          var a = el.tagName === "A" ? el : el.querySelector("a");
          if (a) a.href = url;
        } else {
          el.style.display = "none"; // соцсеть не указана — убираем иконку
        }
      });
    }
    setSocial("social-vk", s.soc_vk);
    setSocial("social-forum", s.soc_forum);
    setSocial("social-yt", s.soc_youtube);
    setSocial("social-discord", s.soc_discord);
    setSocial("social-telegram", s.soc_telegram);

    // --- подвал ---
    if (s.footer_copyright) {
      var cp = document.querySelector(".copyright .copy");
      if (cp) cp.textContent = "© " + new Date().getFullYear() + " " + s.footer_copyright;
    }
    if (s.footer_company || s.footer_inn || s.footer_ogrnip || s.footer_email) {
      var legal = document.querySelector(".copyright p:not(.copy)");
      if (legal) {
        var parts = [];
        if (s.footer_company) parts.push(esc(s.footer_company));
        if (s.footer_inn) parts.push("ИНН: " + esc(s.footer_inn));
        if (s.footer_ogrnip) parts.push("ОГРНИП: " + esc(s.footer_ogrnip));
        var html = parts.join("<br>");
        if (s.footer_email) html += "<br><br>" + esc(s.footer_email);
        legal.innerHTML = html;
      }
    }

    // --- фавикон (логотип в браузере) ---
    if (s.favicon) {
      var fav = document.querySelector("link[rel~='icon']");
      if (!fav) { fav = document.createElement("link"); fav.rel = "icon"; document.head.appendChild(fav); }
      fav.removeAttribute("type"); fav.href = s.favicon;
    }

    // --- ссылки документов (оферта / приватность / mojang) ---
    function relink(oldHref, url) {
      if (!url) return;
      document.querySelectorAll('a[href="' + oldHref + '"]').forEach(function (a) { a.setAttribute("href", url); });
    }
    relink("/public_offer.pdf", s.link_offer);
    relink("/privacy.pdf", s.link_privacy);
    relink("/mojang.pdf", s.link_mojang);

    // --- шрифт (подгружаем Google Font при необходимости) ---
    if (s.font_family) {
      var gf = document.createElement("link");
      gf.rel = "stylesheet";
      gf.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(s.font_family) +
                ":wght@300;400;500;700;800;900&display=swap";
      document.head.appendChild(gf);
    }

    // --- тема (цвета, фон, шрифт) одним блоком CSS ---
    var css = "";
    if (s.color_primary && /^#[0-9a-f]{6}$/i.test(s.color_primary)) {
      var c = s.color_primary, d = darken(c);
      css += ".button-orange,.price,.progress-bar,#progress,.copyip,.rw-modal__price,.rw-modal__pay,.rw-method.is-loading{background-color:" + c + " !important}" +
             ".button-orange,.rw-modal__pay{border-bottom-color:" + d + " !important}" +
             ".rw-modal__input:focus,.rw-method:hover{border-color:" + c + " !important}";
    }
    if (s.bg_color)   css += "body{background-color:" + s.bg_color + " !important}";
    if (s.text_color) css += "body{color:" + s.text_color + " !important}";
    if (s.hero_bg)    css += '#head:before{background-image:url("' + s.hero_bg + '") !important;background-size:cover !important;background-position:center !important;background-repeat:no-repeat !important}';
    if (s.font_family) {
      css += "body,h1,h2,h3,h4,h5,h6,p,span,a,li,label,button,input,textarea,select," +
             ".button,.price,.name,.logo_text,.rw-modal{font-family:'" + s.font_family + "',sans-serif !important}";
    }
    if (css) {
      var st = document.getElementById("rw-theme") || document.createElement("style");
      st.id = "rw-theme"; st.textContent = css;
      if (!st.parentNode) document.head.appendChild(st);
    }
  }

  function init() {
    fetch("/api/site.php", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (d) { if (d && d.ok && d.site) apply(d.site); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
