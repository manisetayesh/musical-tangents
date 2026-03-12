/* Slide deck controller: wheel only; respects prefers-reduced-motion */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var deck = document.getElementById('deck');
  var slides = document.querySelectorAll('.slide');
  var total = slides.length;
  var current = 0;
  var animating = false;

  if (reduced) {
    body.classList.add('fallback-mode');
    return;
  }

  body.classList.add('slide-mode');

  function setSlide(idx) {
    if (idx < 0 || idx >= total || animating) return;
    animating = true;
    var prev = slides[current];
    var next = slides[idx];
    prev.classList.remove('active');
    prev.classList.add('slide-out');
    next.classList.add('slide-in');
    next.style.zIndex = '2';

    setTimeout(function () {
      prev.classList.remove('slide-out');
      next.classList.remove('slide-in');
      next.classList.add('active');
      next.style.zIndex = '';
      current = idx;
      animating = false;
    }, (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 650));
  }

  function next() { if (current < total - 1) setSlide(current + 1); }
  function prev() { if (current > 0) setSlide(current - 1); }

  /* Mouse wheel: next on scroll down, prev on scroll up; threshold 30px */
  function onWheel(e) {
    if (animating) return;
    if (e.deltaY > 30) next();
    else if (e.deltaY < -30) prev();
    if (e.deltaY !== 0) e.preventDefault();
  }
  deck.addEventListener('wheel', onWheel, { passive: false });
})();
