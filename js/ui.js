(function(w) {
  "use strict";
  var A = w.Akkous;
  if (!A) return;

  function updateThemeToggle(theme) {
    var btn = A.$("#theme-toggle");
    if (!btn) return;
    var isDark = theme === "dark";
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("title", isDark ? "Light mode" : "Dark mode");
    var moon = btn.querySelector("[data-icon='moon']");
    var sun = btn.querySelector("[data-icon='sun']");
    if (moon) moon.hidden = isDark;
    if (sun) sun.hidden = !isDark;
  }

  A.initTheme = function() {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeToggle(theme);
  };

  A.toggleTheme = function() {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    updateThemeToggle(next);
  };

  A.initMobileNav = function() {
    var header = A.$(".site-header");
    var toggle = A.$("#nav-menu-toggle");
    var panel = A.$("#nav-panel");
    if (!toggle || !panel || !header) return;

    function isDesktop() {
      return window.matchMedia("(min-width: 768px)").matches;
    }

    function syncPanelAria() {
      if (isDesktop()) {
        panel.setAttribute("aria-hidden", "false");
        toggle.setAttribute("aria-expanded", "false");
        header.classList.remove("site-header--menu-open");
      } else {
        var open = header.classList.contains("site-header--menu-open");
        panel.setAttribute("aria-hidden", open ? "false" : "true");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    }

    function setOpen(open) {
      header.classList.toggle("site-header--menu-open", open);
      syncPanelAria();
    }

    syncPanelAria();

    toggle.addEventListener("click", function() {
      if (isDesktop()) return;
      var open = !header.classList.contains("site-header--menu-open");
      setOpen(open);
    });

    A.$$(".nav__link", panel).forEach(function(link) {
      link.addEventListener("click", function() {
        if (!isDesktop()) setOpen(false);
      });
    });

    window.addEventListener("resize", function() {
      if (isDesktop()) {
        header.classList.remove("site-header--menu-open");
      }
      syncPanelAria();
    });
  };

  A.initBackToTop = function() {
    var btn = A.$("#back-to-top");
    if (!btn) return;

    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      btn.classList.toggle("is-visible", y > 400);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", function() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  A.initPwaInstall = function() {
    var deferredPrompt = null;
    var banner = null;
    var installBtn = null;
    var closeBtn = null;
    var DISMISS_KEY = "pwaInstallDismissedAt";
    var DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

    function canShowBanner() {
      if (window.matchMedia && !window.matchMedia("(display-mode: browser)").matches) return false;
      if (window.navigator.standalone) return false;
      var dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (!dismissedAt) return true;
      return Date.now() - dismissedAt > DISMISS_TTL_MS;
    }

    function ensureBanner() {
      if (banner) return;
      banner = document.createElement("aside");
      banner.className = "pwa-install-banner";
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-live", "polite");
      banner.setAttribute("aria-label", "Install app");
      banner.hidden = true;
      banner.setAttribute("aria-hidden", "true");
      banner.innerHTML =
        '<p class="pwa-install-banner__text">Install Akkous for faster access and offline support.</p>' +
        '<div class="pwa-install-banner__actions">' +
        '<button type="button" class="pwa-install-banner__btn pwa-install-banner__btn--primary" id="pwa-install-action">Install</button>' +
        '<button type="button" class="pwa-install-banner__btn" id="pwa-install-close">Later</button>' +
        "</div>";
      document.body.appendChild(banner);
      installBtn = banner.querySelector("#pwa-install-action");
      closeBtn = banner.querySelector("#pwa-install-close");
      closeBtn.addEventListener("click", function() {
        banner.hidden = true;
        banner.setAttribute("aria-hidden", "true");
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      });
      installBtn.addEventListener("click", function() {
        if (!deferredPrompt) return;
        banner.hidden = true;
        banner.setAttribute("aria-hidden", "true");
        var promptEvent = deferredPrompt;
        deferredPrompt = null;
        promptEvent.prompt();
        promptEvent.userChoice.finally(function() {});
      });
    }

    window.addEventListener("beforeinstallprompt", function(e) {
      e.preventDefault();
      deferredPrompt = e;
      if (!canShowBanner()) return;
      ensureBanner();
      banner.hidden = false;
      banner.setAttribute("aria-hidden", "false");
    });

    window.addEventListener("appinstalled", function() {
      if (banner) {
        banner.hidden = true;
        banner.setAttribute("aria-hidden", "true");
      }
      localStorage.removeItem(DISMISS_KEY);
    });
  };

  A.registerServiceWorker = function() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(function(reg) { A.log("SW registered", reg.scope); })
        .catch(function(err) { A.log("SW registration failed", err); });
    }
  };

  /* Scroll reveal via IntersectionObserver — one-shot, GPU-only animations */
  A.initReveal = function() {
    if (!("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("v2-reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    var els = document.querySelectorAll(".v2-reveal, .v2-reveal-left, .v2-reveal-scale");
    Array.prototype.forEach.call(els, function(el) { observer.observe(el); });
  };
})(window);
