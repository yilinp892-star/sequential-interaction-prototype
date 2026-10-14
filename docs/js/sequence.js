// The sequence controller: one linear path, each scene unlocking the next.
// feed (choose + feed paper) → type (type, rewind, return × 8) → keep (sign, fold, drawer) → begin a new page.
(() => {
  const S = LP.scenes;
  const newPage = document.getElementById('newPage');
  let current = null;

  function show(name, data) {
    const next = S[name];
    const prev = current;
    current = next;
    if (prev) {
      prev.active = false;
      prev.el.style.opacity = 0;
      prev.el.style.transform = 'translateY(-16px)';
      setTimeout(() => { if (current !== prev) { prev.el.classList.remove('shown'); if (prev.leave) prev.leave(); } }, 1500);
    }
    setTimeout(() => {
      next.enter(data || {});
      next.el.style.transition = 'none';
      next.el.style.transform = 'translateY(16px)';
      next.el.style.opacity = 0;
      next.el.classList.add('shown');
      void next.el.offsetWidth;
      next.el.style.transition = '';
      next.el.style.transform = 'translateY(0)';
      next.el.style.opacity = 1;
      // input opens once the scene has settled
      setTimeout(() => { if (current === next) { next.el.style.transform = 'none'; next.active = true; } }, 1500);
    }, prev ? 1300 : 250);
  }

  LP.seq = { next: show, current: () => current };

  LP.showNewPage = () => {
    newPage.hidden = false;
    requestAnimationFrame(() => newPage.classList.add('on'));
  };
  newPage.addEventListener('click', () => {
    newPage.classList.remove('on');
    setTimeout(() => { newPage.hidden = true; }, 1000);
    LP.quiet();
    show('feed');
  });

  // sound can only start after the first touch or key
  window.addEventListener('pointerdown', () => LP.audio.init(), true);
  window.addEventListener('keydown', () => LP.audio.init(), true);

  function loop() {
    const now = performance.now();
    LP.audio.update(now);
    for (const k in S) if (S[k].el.classList.contains('shown')) S[k].update(now);
    requestAnimationFrame(loop);
  }

  show('feed');
  requestAnimationFrame(loop);
})();
