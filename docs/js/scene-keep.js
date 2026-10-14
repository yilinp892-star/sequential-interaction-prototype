// Scene 3 · Sign, fold and keep (adapted from studies/04-sign-and-seal; the envelope becomes a desk drawer).
// Sign on the line (too short and the ink fades), the page folds itself,
// carry it into the open drawer (dropped short, it peels back), and the drawer slides shut.
LP.scenes.keep = (() => {
  const api = { ox: 50, oy: 90, active: false };
  const root = document.getElementById('sceneKeep');
  api.el = root;
  const A = LP.audio;
  const q = s => root.querySelector(s);

  const SIGN_Y = 278, SIGN_X0 = 91;                 // signature line inside the letter
  const HOME = { x: 320, y: 18 };
  const DESK_Y = 500, DR_X = 260, DEPTH = 150;      // drawer opening and how far it pulls out
  const MOUTH = { x: 450, y: DESK_Y + DEPTH / 2 };  // centre of the open drawer
  const CEN = { x: 129.1, y: 262.5 };               // centre of the folded letter (letter-local, at its carried scale)
  const LIE = { x: MOUTH.x - CEN.x, y: MOUTH.y - CEN.y };
  const SIGN_MIN = 110;

  const letter = q('.letter');
  const topHalf = q('.topHalf'), topFront = q('.topFront'), topBack = q('.topBack'), botFront = q('.botFront');
  const inkCv = q('.ink'), demoCv = q('.demoInk');
  const ink = inkCv.getContext('2d'); ink.scale(2, 2);
  const dink = demoCv.getContext('2d'); dink.scale(2, 2);
  const signZone = q('.signZone'), grabZone = q('.grabZone');
  const drawerIn = q('.drawer-in'), drawerContent = q('.drawer-content'), drawerFront = q('.drawer-front');
  const touch = q('.touch');

  let rows = [], paper = 'plain';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // the page as typed: the chosen paper, the user's lines, a signature line
  function letterSVG(id, dot) {
    const text = rows.map((t, i) => `<text x="40" y="${42 + i * 20}" font-family="'Courier Prime','Courier New',monospace" font-size="9.6" fill="#1f1f1f" style="white-space:pre">${esc(t)}</text>`).join('');
    return LP.paper.inner(paper, id) + `<g>${text}</g>` +
      `<line x1="70" y1="214" x2="166" y2="214" stroke="#3a3a3a" stroke-width="1.5"/>` +
      (dot ? `<circle cx="70" cy="214" r="3" fill="#2a2a2a"/>` : '');
  }

  const toStage = e => LP.local(e, api);

  // ---------- state ----------
  let phase, sig, pen, penTarget, drawing, foldAt, foldAngle, lx, ly, ltx, lty, drag, liftY;
  let userActed, demo, demoNext, lastActivity, insertT, insertFrom, restT, lsc, open, openT, inDrawer, saidShort;

  function init() {
    if (letter.parentNode !== root) root.insertBefore(letter, touch);
    topFront.innerHTML = letterSVG('kt', true);
    botFront.innerHTML = letterSVG('kb', false);
    ink.clearRect(0, 0, 260, 338); dink.clearRect(0, 0, 260, 338);
    inkCv.style.transition = ''; inkCv.style.opacity = 1; demoCv.style.opacity = 1;
    phase = 'sign'; sig = 0; pen = null; penTarget = null; drawing = false; foldAt = 0;
    foldAngle = 0; lx = HOME.x; ly = HOME.y; ltx = lx; lty = ly; drag = null; liftY = 0; lsc = 1;
    open = 0; openT = 0; inDrawer = false; saidShort = false;
    letter.classList.remove('dragging'); letter.style.zIndex = ''; letter.style.filter = '';
    signZone.style.display = ''; grabZone.style.display = 'none';
    userActed = { sign: false, drag: false };
    demo = null; demoNext = performance.now() + 3000; lastActivity = performance.now();
    touch.style.opacity = 0;
  }

  // ---------- 1. sign ----------
  function letterLocal(p) { return { x: p.x - lx, y: p.y - (ly + liftY) }; }
  signZone.addEventListener('pointerdown', (e) => {
    if (!api.active || phase !== 'sign') return;
    e.preventDefault();
    userActed.sign = true; stopDemo();
    const p = letterLocal(toStage(e));
    drawing = true; foldAt = 0; inkCv.style.transition = ''; inkCv.style.opacity = 1;
    pen = { x: p.x, y: p.y }; penTarget = { x: p.x, y: p.y };
    spreadDot(p.x, p.y);                     // the ink spreads where the nib lands
    A.burst('lowpass', 900, .05, .04);
  });
  function spreadDot(x, y) {
    let r = 0;
    (function grow() {
      r += .5;
      ink.fillStyle = 'rgba(25,25,25,.35)';
      ink.beginPath(); ink.arc(x, y, r, 0, Math.PI * 2); ink.fill();
      if (r < 3.2) requestAnimationFrame(grow);
    })();
  }

  window.addEventListener('pointermove', (e) => {
    if (!api.active) return;
    lastActivity = performance.now();
    const p = toStage(e);
    if (drawing) { const q2 = letterLocal(p); penTarget = { x: q2.x, y: q2.y }; }
    if (drag) {
      if (!drag.peeled) {
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) < 7) return;   // it clings for a moment before it lets go
        drag.peeled = true; A.crackle(4, .12);
      }
      ltx = p.x - drag.ox; lty = p.y - drag.oy;
    }
  });
  window.addEventListener('pointerup', () => {
    if (drawing) {
      drawing = false;
      foldAt = performance.now() + 900;               // wait a moment for another stroke
    }
    if (drag) endDrag();
  });

  function drawInk() {
    if (!drawing || !pen) return;
    const before = { x: pen.x, y: pen.y };
    pen.x += (penTarget.x - pen.x) * .3;               // the nib drags a little behind the hand
    pen.y += (penTarget.y - pen.y) * .3;
    const d = Math.hypot(pen.x - before.x, pen.y - before.y);
    A.scratch(d);
    if (d < .25) {
      // resting: ink pools and spreads
      ink.fillStyle = 'rgba(25,25,25,.05)';
      ink.beginPath(); ink.arc(pen.x, pen.y, 2 + Math.random() * 3.5, 0, Math.PI * 2); ink.fill();
      return;
    }
    sig += d;
    if (d > 6 && Math.random() < .35) return;           // fast strokes skip and break
    const w = Math.max(.7, Math.min(4.2, 4.6 - d * .55));
    ink.strokeStyle = 'rgba(22,22,22,.92)'; ink.lineWidth = w; ink.lineCap = 'round'; ink.lineJoin = 'round';
    ink.beginPath(); ink.moveTo(before.x, before.y); ink.lineTo(pen.x, pen.y); ink.stroke();
  }

  function checkSignature(now) {
    if (phase !== 'sign' || drawing || !foldAt || now < foldAt) return;
    foldAt = 0;
    if (sig >= SIGN_MIN) fold();
    else {
      // too short: it fades away
      inkCv.style.transition = 'opacity .9s ease'; inkCv.style.opacity = 0;
      if (!saidShort) { saidShort = true; LP.say('A little more. Take your time.'); }
      setTimeout(() => { if (phase === 'sign' && !drawing) { ink.clearRect(0, 0, 260, 338); sig = 0; inkCv.style.transition = ''; inkCv.style.opacity = 1; } }, 950);
    }
  }

  // ---------- 2. fold ----------
  function fold() {
    phase = 'folding';
    signZone.style.display = 'none';
    LP.quiet();
    A.burst('bandpass', 1800, .1, .3, .6); A.crackle(5, .3);
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / 900);
      foldAngle = 180 * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      if (k < 1) requestAnimationFrame(step);
      else {
        phase = 'carry'; grabZone.style.display = 'block';
        A.burst('lowpass', 600, .16, .08);
        lastActivity = performance.now();
        // the drawer slides open, waiting
        setTimeout(() => { openT = .75; A.drawer(false); LP.say('Put it away, somewhere safe.'); }, 500);
      }
    })(t0);
  }

  // ---------- 3. carry it into the drawer ----------
  grabZone.addEventListener('pointerdown', (e) => {
    if (!api.active || phase !== 'carry') return;
    e.preventDefault();
    userActed.drag = true; stopDemo();
    const p = toStage(e);
    drag = { sx: p.x, sy: p.y, ox: p.x - lx, oy: p.y - ly, peeled: false };
    ltx = lx; lty = ly;
    letter.classList.add('dragging');
  });
  function mouthDist() { return Math.hypot(lx + CEN.x - MOUTH.x, ly + CEN.y - MOUTH.y); }
  function endDrag() {
    const near = mouthDist() < 90 && open > .5;
    drag = null;
    letter.classList.remove('dragging');
    if (near) insert();
    else { phase = 'peelback'; A.burst('highpass', 1800, .035, .2); }
  }
  function insert() {
    phase = 'inserting';
    grabZone.style.display = 'none';
    letter.style.zIndex = 5;
    insertT = performance.now(); insertFrom = { x: lx, y: ly };
    openT = 1;
    A.crackle(4, .35); A.slide(.4, .05);
  }

  // ---------- idle demonstrations ----------
  function stopDemo() { demo = null; touch.style.opacity = 0; dink.clearRect(0, 0, 260, 338); demoCv.style.opacity = 1; }
  function runDemo(now) {
    const want = !api.active ? null
      : phase === 'sign' && !userActed.sign && !drawing ? 'sign'
      : phase === 'carry' && !userActed.drag && !drag && open > .6 ? 'drag' : null;
    if (!want) { if (demo) stopDemo(); return; }
    if (!demo) {
      if (now < demoNext || now - lastActivity < 1400) return;
      demo = { kind: want, t0: now, last: null };
      touch.style.opacity = 1;
    }
    const t = now - demo.t0;
    const ease = LP.ease;
    if (demo.kind === 'sign') {
      // a fingertip writes a faint scribble along the line, which then fades
      const k = Math.min(1, t / 1800);
      const x = SIGN_X0 + 6 + k * 105;
      const y = SIGN_Y - 9 + Math.sin(k * Math.PI * 7) * 7 * (1 - k * .4);
      if (t < 1800) {
        if (demo.last) {
          dink.strokeStyle = 'rgba(80,80,80,.35)'; dink.lineWidth = 1.6; dink.lineCap = 'round';
          dink.beginPath(); dink.moveTo(demo.last.x, demo.last.y); dink.lineTo(x, y); dink.stroke();
        }
        demo.last = { x, y };
        touch.style.transform = `translate(${lx + x - 11}px, ${ly + liftY + y - 11}px)`;
      } else if (t < 2700) {
        touch.style.opacity = 0;
        demoCv.style.opacity = (1 - (t - 1800) / 900).toFixed(2);
      } else { dink.clearRect(0, 0, 260, 338); demoCv.style.opacity = 1; demo = null; demoNext = now + 3200; }
    } else if (demo.kind === 'drag') {
      // a fingertip pulls the folded page toward the drawer, and it clings back
      let dy = 0, press = 1;
      if (t < 400) {}
      else if (t < 600) press = .82;
      else if (t < 1400) { press = .82; dy = 80 * ease((t - 600) / 800); }
      else if (t < 1900) { press = .82; dy = 80; touch.style.opacity = 0; }
      else { demo = null; demoNext = now + 3400; ltx = HOME.x; lty = HOME.y; return; }
      lty = HOME.y + (t < 1400 ? dy * .7 : 0); ltx = HOME.x;
      touch.style.transform = `translate(${HOME.x + 125 - 11}px, ${HOME.y + 240 + dy - 11}px) scale(${press})`;
    }
  }

  // ---------- per-frame ----------
  function update(now) {
    drawInk();
    checkSignature(now);
    runDemo(now);

    // the page
    if (phase === 'carry') {
      if (drag && drag.peeled) {
        let tx = ltx, ty = lty;
        const d = mouthDist();
        if (d < 170) { const m = Math.pow(1 - d / 170, 2) * .8; tx += (LIE.x - tx) * m; ty += (LIE.y - ty) * m; }
        lx += (tx - lx) * .12; ly += (ty - ly) * .12;   // heavier than the cursor, as if slightly stuck
      } else if (!drag) {
        lx += (ltx - lx) * .08; ly += (lty - ly) * .08;
      }
      liftY += (-6 - liftY) * .1;                       // a folded page sits lifted, ready to carry
    } else if (phase === 'peelback') {
      lx += (HOME.x - lx) * .05; ly += (HOME.y - ly) * .05;  // peels slowly back
      if (Math.hypot(HOME.x - lx, HOME.y - ly) < .6) { lx = HOME.x; ly = HOME.y; ltx = lx; lty = ly; phase = 'carry'; }
    } else if (phase === 'inserting') {
      const k = Math.min(1, (now - insertT) / 900);
      const e = k < .35 ? k * .6 : .21 + (k - .35) / .65 * .79;   // catches at the lip, then settles in
      lx = insertFrom.x + (LIE.x - insertFrom.x) * e;
      ly = insertFrom.y + (LIE.y - insertFrom.y) * e;
      liftY += (0 - liftY) * .2;
      if (k >= 1) {
        inDrawer = true;
        drawerContent.appendChild(letter);              // now it travels with the drawer
        phase = 'resting'; restT = now;
        A.thunk(.16, 400, .1);
      }
    } else if (phase === 'resting') {
      if (now - restT > 1100) { phase = 'closing'; openT = 0; A.drawer(true); }
    } else if (phase === 'closing') {
      if (open < .012) {
        open = 0; phase = 'done';
        A.thunk(.38, 170, .22);                         // the drawer meets the desk
        setTimeout(() => LP.say('Your page is kept.'), 900);
        setTimeout(() => LP.showNewPage(), 4200);
      }
    }

    // the drawer opens wider as the page comes near; closes slowly
    let target = openT;
    if (phase === 'carry' && drag && openT > 0) target = .75 + .25 * Math.max(0, 1 - mouthDist() / 300);
    open += (target - open) * (phase === 'closing' ? .028 : .06);
    const h = open * DEPTH;
    drawerIn.style.height = h.toFixed(2) + 'px';
    drawerContent.style.top = (h - DEPTH).toFixed(2) + 'px';
    drawerFront.style.top = (DESK_Y + h).toFixed(2) + 'px';

    const sTarget = (phase === 'sign' || phase === 'folding') ? 1 : .82;   // the folded page shrinks a little
    lsc += (sTarget - lsc) * .12;
    const ox = inDrawer ? DR_X : 0, oy = inDrawer ? DESK_Y + h - DEPTH : 0;
    const rot = drag && drag.peeled ? ((ltx - lx) * .02).toFixed(2) : 0;
    letter.style.transform = `translate(${(lx - ox).toFixed(2)}px, ${(ly + liftY - oy).toFixed(2)}px) rotate(${rot}deg) scale(${lsc.toFixed(3)})`;
    letter.style.filter = inDrawer ? 'brightness(.9)' : phase === 'carry' || phase === 'peelback' || phase === 'inserting' ? `drop-shadow(0 ${drag ? 10 : 4}px ${drag ? 12 : 6}px rgba(0,0,0,.18))` : '';

    // fold
    topHalf.style.transform = `perspective(900px) rotateX(${-foldAngle}deg)`;
    const back = foldAngle > 90;
    topFront.style.display = back ? 'none' : '';
    topBack.style.display = back ? 'block' : 'none';
  }

  api.enter = (data) => {
    rows = (data && data.lines) || [];
    paper = (data && data.paper) || 'plain';
    init();
    LP.say('Sign it, slowly. From you, to you.', 500);
  };
  api.leave = () => { stopDemo(); A.quiet(); };
  api.update = update;
  api._state = () => ({ phase, open });
  return api;
})();
