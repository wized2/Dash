(function () {
  var KEY = "endroid-theme";

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    var t = theme === "dark" || theme === "light" ? theme : systemTheme();
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(KEY, t);
    } catch (e) {}
    document.querySelectorAll("[data-theme-icon]").forEach(function (el) {
      el.setAttribute("data-lucide", t === "dark" ? "sun" : "moon");
    });
    if (window.lucide && lucide.createIcons) lucide.createIcons();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#141218" : "#fef7ff");
  }

  window.endroidToggleTheme = function () {
    var cur = document.documentElement.getAttribute("data-theme") || systemTheme();
    applyTheme(cur === "dark" ? "light" : "dark");
  };

  window.endroidOpenDrawer = function () {
    var d = document.getElementById("e-drawer");
    if (d) d.classList.add("open");
  };
  window.endroidCloseDrawer = function () {
    var d = document.getElementById("e-drawer");
    if (d) d.classList.remove("open");
  };

  function boot() {
    var saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch (e) {}
    applyTheme(saved || systemTheme());
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
