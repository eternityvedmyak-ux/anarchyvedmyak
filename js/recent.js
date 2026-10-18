/* ReallyWorld — блок «Последние покупки» (внизу сайта).
   Берёт последние оплаченные покупки из /api/recent.php (ник замазан). */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function styles(s) {
    s = s || {};
    var bg = s.bg || "#16181d", card = s.card || "#1d2027",
        text = s.text || "#ffffff", muted = s.muted || "#8b919c";
    var st = document.getElementById("rw-recent-css") || document.createElement("style");
    st.id = "rw-recent-css";
    st.textContent =
      ".rw-recent{background:" + bg + ";padding:34px 16px;}" +
      ".rw-recent__wrap{max-width:1180px;margin:0 auto;}" +
      ".rw-recent__wrap h3{color:" + text + ";font-family:'Mazzard H','Mazzard M',sans-serif;font-weight:bold;" +
        "text-transform:uppercase;font-size:20px;margin:0 0 18px;letter-spacing:.02em;}" +
      ".rw-recent__row{display:flex;gap:14px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin;}" +
      ".rw-recent__card{flex:0 0 150px;background:" + card + ";border-radius:16px;padding:16px 12px 14px;text-align:center;}" +
      ".rw-recent__img{width:84px;height:84px;margin:0 auto 12px;border-radius:14px;background-size:cover;" +
        "background-position:center;background-repeat:no-repeat;background-color:rgba(0,0,0,.15);}" +
      ".rw-recent__nick{color:" + text + ";font-weight:bold;font-size:15px;margin-bottom:6px;" +
        "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
      ".rw-recent__item{color:" + muted + ";font-size:11px;font-weight:bold;text-transform:uppercase;" +
        "line-height:1.3;letter-spacing:.02em;}" +
      ".rw-recent__row::-webkit-scrollbar{height:6px;}" +
      ".rw-recent__row::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:6px;}";
    if (!st.parentNode) document.head.appendChild(st);
  }

  function card(p) {
    return '<div class="rw-recent__card">' +
      '<div class="rw-recent__img" style="background-image:url(\'' + esc(p.image) + '\')"></div>' +
      '<div class="rw-recent__nick">' + esc(p.nick) + '</div>' +
      '<div class="rw-recent__item">' + esc(p.item) + '</div>' +
    '</div>';
  }

  function render(list, style) {
    styles(style);
    var sec = document.createElement("section");
    sec.className = "rw-recent";
    sec.innerHTML = '<div class="rw-recent__wrap"><h3>Последние покупки</h3>' +
      '<div class="rw-recent__row">' + list.map(card).join("") + '</div></div>';
    // вставляем перед блоком соцсетей (внизу), иначе перед футером
    var social = document.getElementById("social");
    var footer = document.querySelector("footer");
    if (social && social.parentNode) social.parentNode.insertBefore(sec, social);
    else if (footer && footer.parentNode) footer.parentNode.insertBefore(sec, footer);
    else document.body.appendChild(sec);
  }

  function init() {
    fetch("/api/recent.php", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (d) {
        if (d && d.ok && d.enabled !== false && Array.isArray(d.purchases) && d.purchases.length) {
          render(d.purchases, d.style);
        }
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
