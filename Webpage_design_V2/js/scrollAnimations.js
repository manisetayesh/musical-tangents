(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    return;
  }

  var duration = 350;
  var slides = document.querySelectorAll(".slide");

  function animateIn(el, delay) {
    if (!el || el.classList.contains("brutalist-animated")) return;
    el.classList.add("brutalist-animated");
    el.style.opacity = "0";
    el.style.transform = "translateY(20%)";
    el.style.transition = "opacity " + duration + "ms cubic-bezier(0.16, 1, 0.3, 1), transform " + duration + "ms cubic-bezier(0.16, 1, 0.3, 1)";

    setTimeout(function () {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, delay || 0);
  }

  var observerOptions = {
    root: null,
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.1
  };

  var slideObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var slide = entry.target;
      var idx = parseInt(slide.getAttribute("data-slide-index"), 10);

      if (idx === 0) {
        var heroEls = slide.querySelectorAll(".hero-label, .hero-title, .hero-sub, .hero-visual");
        heroEls.forEach(function (el, i) {
          animateIn(el, i * 80);
        });
      } else if (idx === 1 || idx === 2) {
        var cards = slide.querySelectorAll(".viz-card, .formula-block");
        cards.forEach(function (card, i) {
          animateIn(card, i * 100);
        });
      } else if (idx === 3) {
        var panels = slide.querySelectorAll(".path-panel");
        panels.forEach(function (panel, i) {
          animateIn(panel, i * 120);
        });
      }
    });
  }, observerOptions);

  slides.forEach(function (slide) {
    slideObserver.observe(slide);
  });
})();
