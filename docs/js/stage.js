// Stage scaling, pointer coordinates and the quiet guiding line.
window.LP = window.LP || {};
LP.W = 1000; LP.H = 800;
LP.scenes = LP.scenes || {};
(() => {
  const frame = document.getElementById('frame');
  const stage = document.getElementById('stage');
  const guide = document.getElementById('guide');

  LP.scale = 1;
  function fit() {
    const s = Math.min(1, (window.innerWidth - 24) / LP.W, (window.innerHeight - 24) / LP.H);
    LP.scale = Math.max(.2, s);
    stage.style.transform = `scale(${LP.scale})`;
    frame.style.width = (LP.W * LP.scale) + 'px';
    frame.style.height = (LP.H * LP.scale) + 'px';
  }
  window.addEventListener('resize', fit); fit();

  // pointer position in stage coordinates, and in a scene's own coordinates
  LP.toStage = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) / LP.scale, y: (e.clientY - r.top) / LP.scale };
  };
  LP.local = (e, scene) => {
    const p = LP.toStage(e);
    return { x: p.x - scene.ox, y: p.y - scene.oy };
  };

  // one line of soft guidance at the top; changes cross-fade slowly
  let current = '', timer = null;
  LP.say = (text, delay = 0) => {
    clearTimeout(timer);
    if (text === current && guide.classList.contains('on')) return;
    current = text;
    const wait = guide.classList.contains('on') ? 1100 : 0;
    guide.classList.remove('on');
    timer = setTimeout(() => { guide.textContent = text; guide.classList.add('on'); }, wait + delay);
  };
  LP.quiet = () => { clearTimeout(timer); current = ''; guide.classList.remove('on'); };

  LP.ease = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
})();
