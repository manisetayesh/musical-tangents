(function () {
  "use strict";

  var BILLBOARD_URL = "https://cdn.jsdelivr.net/gh/mhollingshead/billboard-hot-100@main/recent.json";
  var FALLBACK_DATA = {
    date: "2026-03-14",
    data: [
      { song: "I Just Might", artist: "Bruno Mars", this_week: 1 },
      { song: "Choosin' Texas", artist: "Ella Langley", this_week: 2 },
      { song: "Man I Need", artist: "Olivia Dean", this_week: 3 },
      { song: "Risk It All", artist: "Bruno Mars", this_week: 4 },
      { song: "Ordinary", artist: "Alex Warren", this_week: 5 },
      { song: "Opalite", artist: "Taylor Swift", this_week: 6 },
      { song: "Stateside", artist: "PinkPantheress With Zara Larsson", this_week: 7 },
      { song: "Golden", artist: "HUNTR/X: EJAE, Audrey Nuna & REI AMI", this_week: 8 },
      { song: "The Fate Of Ophelia", artist: "Taylor Swift", this_week: 9 },
      { song: "Back To Friends", artist: "sombr", this_week: 10 },
      { song: "DTMF", artist: "Bad Bunny", this_week: 11 },
      { song: "Folded", artist: "Kehlani", this_week: 12 },
      { song: "So Easy (To Fall In Love)", artist: "Olivia Dean", this_week: 13 },
      { song: "Where Is My Husband!", artist: "RAYE", this_week: 14 },
      { song: "E85", artist: "Don Toliver", this_week: 15 }
    ]
  };

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function escapeHtml(text) {
    if (!text) return "";
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function renderList(container, dateEl, data) {
    if (!container || !data || !data.data) return;
    var items = data.data.slice(0, 15);
    var html = items.map(function (item) {
      var song = escapeHtml(item.song);
      var artist = escapeHtml(item.artist);
      var rank = item.this_week || item.rank || "";
      return "<li><span class=\"rank\">" + rank + "</span><div class=\"track-wrap\"><span class=\"track\">" + song + "</span><span class=\"artist\">" + artist + "</span></div></li>";
    }).join("");
    container.innerHTML = html;
    if (dateEl && data.date) {
      dateEl.textContent = formatDate(data.date);
    }
  }

  function showFallback(container, dateEl) {
    if (!container) return;
    renderList(container, dateEl, FALLBACK_DATA);
  }

  function init() {
    var listEl = document.getElementById("billboard-list");
    var dateEl = document.getElementById("billboard-date");
    if (!listEl) return;

    fetch(BILLBOARD_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
      .then(function (data) {
        renderList(listEl, dateEl, data);
      })
      .catch(function () {
        showFallback(listEl, dateEl);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
