(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;
  var deck = document.getElementById("deck");
  var slides = document.querySelectorAll(".slide");
  var total = slides.length;
  var current = 0;
  var animating = false;

  if (reduced) {
    body.classList.add("fallback-mode");
  } else {
    body.classList.add("slide-mode");
  }

  function setSlide(idx) {
    if (idx < 0 || idx >= total || animating) return;
    animating = true;
    var prev = slides[current];
    var next = slides[idx];
    prev.classList.remove("active");
    prev.classList.add("slide-out");
    next.classList.add("slide-in");
    next.style.zIndex = "2";

    setTimeout(function () {
      prev.classList.remove("slide-out");
      next.classList.remove("slide-in");
      next.classList.add("active");
      next.style.zIndex = "";
      current = idx;
      animating = false;
      updateNavProgress();
    }, reduced ? 150 : 650);
  }

  function next() {
    if (current < total - 1) setSlide(current + 1);
  }
  function prev() {
    if (current > 0) setSlide(current - 1);
  }

  function buildNavProgress() {
    var container = document.getElementById("nav-progress");
    if (!container) return;
    container.innerHTML = "";
    for (var i = 0; i < total; i++) {
      var dot = document.createElement("button");
      dot.className = "nav-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.dataset.index = String(i);
      dot.addEventListener("click", function () {
        var idx = parseInt(this.dataset.index, 10);
        if (reduced && slides[idx]) {
          slides[idx].scrollIntoView({ behavior: "auto" });
          current = idx;
          updateNavProgress();
        } else {
          setSlide(idx);
        }
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

  function onWheel(e) {
    if (animating) return;
    if (e.deltaY > 30) next();
    else if (e.deltaY < -30) prev();
    if (e.deltaY !== 0) e.preventDefault();
  }
  if (deck && !reduced) deck.addEventListener("wheel", onWheel, { passive: false });

  var prevBtn = document.getElementById("nav-prev");
  var nextBtn = document.getElementById("nav-next");
  if (prevBtn) prevBtn.addEventListener("click", function () {
    if (reduced && current > 0 && slides[current - 1]) {
      slides[current - 1].scrollIntoView({ behavior: "auto" });
      current--;
      updateNavProgress();
    } else {
      prev();
    }
  });
  if (nextBtn) nextBtn.addEventListener("click", function () {
    if (reduced && current < total - 1 && slides[current + 1]) {
      slides[current + 1].scrollIntoView({ behavior: "auto" });
      current++;
      updateNavProgress();
    } else {
      next();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  });

  if (reduced) {
    var scrollTimeout;
    window.addEventListener("scroll", function () {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function () {
        var best = 0;
        var bestTop = Infinity;
        for (var i = 0; i < slides.length; i++) {
          var rect = slides[i].getBoundingClientRect();
          if (rect.top >= -100 && rect.top < bestTop) {
            bestTop = rect.top;
            best = i;
          }
        }
        current = best;
        updateNavProgress();
      }, 50);
    }, { passive: true });
  }
})();
