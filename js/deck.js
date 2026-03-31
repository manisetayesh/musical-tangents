(function () {
  var body = document.body;
  var main = document.getElementById("main");
  var sections = document.querySelectorAll(".section");
  var total = sections.length;
  var current = 0;

  function scrollToSection(idx) {
    if (idx < 0 || idx >= total) return;
    var target = sections[idx];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      current = idx;
      updateNavProgress();
    }
  }

  function next() {
    if (current < total - 1) scrollToSection(current + 1);
  }

  function prev() {
    if (current > 0) scrollToSection(current - 1);
  }

  function buildNavProgress() {
    var container = document.getElementById("nav-progress");
    if (!container) return;
    container.innerHTML = "";
    for (var i = 0; i < total; i++) {
      var dot = document.createElement("button");
      dot.className = "nav-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to section " + (i + 1));
      dot.dataset.index = String(i);
      dot.addEventListener("click", function () {
        var idx = parseInt(this.dataset.index, 10);
        scrollToSection(idx);
      });
      container.appendChild(dot);
    }
  }
  buildNavProgress();

  function updateNavProgress() {
    var dots = document.querySelectorAll(".nav-dot");
    dots.forEach(function (dot, i) {
      dot.classList.toggle("active", i === current);
    });
  }

  function updateCurrentFromScroll() {
    var vh = window.innerHeight * 0.5;
    var best = 0;
    for (var i = sections.length - 1; i >= 0; i--) {
      var rect = sections[i].getBoundingClientRect();
      if (rect.top <= vh) {
        best = i;
        break;
      }
    }
    if (best !== current) {
      current = best;
      updateNavProgress();
    }
  }

  var scrollTimeout;
  window.addEventListener("scroll", function () {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateCurrentFromScroll, 50);
  }, { passive: true });

  var prevBtn = document.getElementById("nav-prev");
  var nextBtn = document.getElementById("nav-next");
  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);

  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")) {
      return;
    }
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  });

  updateCurrentFromScroll();
})();
