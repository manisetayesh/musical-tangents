(function () {
  "use strict";

  var cache = null;

  function loadJson(url) {
    if (typeof d3 !== "undefined" && d3.json) {
      return d3.json(url);
    }
    return fetch(url).then(function (r) {
      return r.json();
    });
  }

  function loadGlossary() {
    if (cache) {
      return Promise.resolve(cache);
    }
    return loadJson("data/glossary.json")
      .then(function (d) {
        cache = d;
        return d;
      })
      .catch(function () {
        cache = { genres: {} };
        return cache;
      });
  }

  function escapeHtml(s) {
    if (s == null) {
      return "";
    }
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function glossaryGenreDef(genre) {
    if (!cache || !cache.genres) {
      return "";
    }
    return cache.genres[genre] || "";
  }

  function scanTooltipIcons(node) {
    if (node && window.Iconify && typeof window.Iconify.scan === "function") {
      window.Iconify.scan(node);
    }
  }

  window.loadGlossary = loadGlossary;
  window.glossaryGenreDef = glossaryGenreDef;
  window.glossaryEscapeHtml = escapeHtml;
  window.glossaryScanTooltipIcons = scanTooltipIcons;
})();
