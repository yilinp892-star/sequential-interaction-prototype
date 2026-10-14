// Scene 1 · Feel and feed the paper (adapted from studies/01-feed-the-paper).
// Rub the four sheets to feel them; a rubbed sheet curls its corner; carry it to the roller.
// Ends by handing the chosen paper type to the typing scene.
LP.scenes.feed = (() => {
  const api = { ox: 50, oy: 110, active: false };
  const root = document.getElementById('sceneFeed');
  api.el = root;
  const A = LP.audio;

  const SLOT_Y = 464, SLOT_CX = 450;
  const P = { ox: 8, oy: 8, w: 137.6, h: 185.6 }; // paper area inside a 160×208 sheet box
  const ALIGN_X = SLOT_CX - P.ox - P.w / 2;
  const ALIGN_Y = SLOT_Y - P.oy - P.h + 4;

  // How each paper answers a rub: friction, spring back, how much it is dragged along.
  const FEEL = {
    plain:       { fric: .945, k: .013, pull: .15 },
    lined:       { fric: .80, k: .06,  pull: .035 },
    grid:        { fric: .70, k: .10,  pull: 0 },
    translucent: { fric: .88, k: .03,  pull: .15 }
  };
  const RUB_SOUND = { plain: [5200, .035], lined: [3400, .05], grid: [1500, .07], translucent: [2600, .09] };

  const clip = root.querySelector('.clip');
  const roller = root.querySelector('.roller');
  const stripes = root.querySelector('.stripes');
  const slotGlow = root.querySelector('.slotGlow');
  const ghost = root.querySelector('.ghost');
  const touch = root.querySelector('.touch');

  const toStage = e => LP.local(e, api);
  const tick = (f, v, d) => A.tick(f, v, d);
  function rubSound(type, speed) {
    const [f, v] = RUB_SOUND[type];
    let level = Math.min(speed / 26, 1) * v;
    if (type === 'translucent') level *= 0.3 + Math.random() * 1.4;
    A.rub(f, level);
  }

  const TYPES = LP.paper.TYPES;
  const CENTERS = [165, 355, 545, 735];
  let sheets = [];
  let active = null;      // sheet under the pointer
  let fed = false;
  let last = null;
  let saidReady = false, saidCarry = false;

  function makeSheet(type, i) {
    const el = document.createElement('div');
    el.className = 'sheet';
    el.innerHTML = LP.paper.sheetSVG(type, 'f' + i) + '<canvas width="320" height="416"></canvas><div class="curl"></div><div class="corner"></div>';
    root.insertBefore(el, clip);
    const cv = el.querySelector('canvas');
    const ctx = cv.getContext('2d'); ctx.scale(2, 2);
    const s = {
      type, el, ctx,
      homeX: CENTERS[i] - P.ox - P.w / 2, homeY: 56,
      x: 0, y: 0, ox: 0, oy: 0, ovx: 0, ovy: 0,
      rot: 0, sc: 1, lift: 0, hover: false,
      rub: 0, ready: false, mode: 'idle',
      catchX: 0, catchY: 0, lastLine: null,
      trails: [], grab: { x: 0, y: 0 }, tx: 0, ty: 0, prevX: 0, opacity: 1
    };
    s.x = s.homeX; s.y = s.homeY;
    s.cornerEl = el.querySelector('.corner');
    // over a curled corner the hand changes to "grab"; elsewhere it invites rubbing
    el.addEventListener('pointermove', (e) => {
      if (active || !api.active) return;
      const p = toStage(e);
      const ly = p.y - (s.y + s.oy - s.lift);
      const atCorner = s.ready && ly > P.oy + P.h - 34;
      el.style.cursor = atCorner ? 'grab' : 'pointer';
      s.cornerEl.classList.toggle('beckon', s.ready && !atCorner);
    });
    el.addEventListener('pointerenter', () => { s.hover = true; });
    el.addEventListener('pointerleave', () => { s.hover = false; s.cornerEl.classList.remove('beckon'); });
    el.addEventListener('pointerdown', (e) => onDown(e, s));
    return s;
  }

  function init() {
    sheets.forEach(s => s.el.remove());
    sheets = TYPES.map(makeSheet);
    active = null; fed = false;
    roller.style.opacity = .5;
    slotGlow.style.opacity = 0; slotGlow.classList.remove('pulse');
    ghost.style.opacity = 0;
    stripes.style.backgroundPosition = '0 0';
    userTouched = false; demo = null; touch.style.opacity = 0; demoNext = performance.now() + 3200; demoIdx = 0;
    pickup = null; hasDragged = false; pickupNext = 0; lastActivity = performance.now();
    saidReady = false; saidCarry = false;
  }

  function onDown(e, s) {
    if (!api.active || fed || s.mode === 'feed' || s.mode === 'return' || s.mode === 'glide') return;
    e.preventDefault();
    userTouched = true; demo = null; touch.style.opacity = 0;
    active = s;
    last = toStage(e);
    const lx = last.x - (s.x + s.ox), ly = last.y - (s.y + s.oy - s.lift);
    s.el.style.transformOrigin = `${lx}px ${ly}px`;
    s.mode = 'rub';
    s.lastLine = null;
    sheets.forEach(o => o.el.style.zIndex = o === s ? 5 : 1);
    // a rubbed sheet can be picked up straight from its curled lower edge
    if (s.ready && ly > P.oy + P.h - 34) startDrag(s, lx, ly);
  }

  function startDrag(s, lx, ly) {
    hasDragged = true;
    if (pickup) { pickup.s.demoPull = 0; pickup = null; touch.style.opacity = 0; }
    s.mode = 'drag';
    s.el.classList.add('dragging');
    s.grab = { x: Math.max(P.ox + 20, Math.min(P.ox + P.w - 20, lx)), y: Math.max(P.oy + 12, Math.min(P.oy + P.h - 12, ly)) };
    s.x += s.ox; s.y += s.oy - s.lift; s.ox = s.oy = s.ovx = s.ovy = 0; s.lift = 0;
    s.tx = s.x; s.ty = s.y; s.vx = s.vy = 0;
    s.el.style.transformOrigin = '80px 104px';
    tick(1200, .04, .04);
    if (!saidCarry) { saidCarry = true; LP.say('Bring it to the roller, and let it go.'); }
  }

  window.addEventListener('pointermove', (e) => {
    if (!api.active) return;
    lastActivity = performance.now();
    if (!active) return;
    const s = active;
    const p = toStage(e);
    const dx = p.x - last.x, dy = p.y - last.y;
    const speed = Math.hypot(dx, dy);
    last = p;

    if (s.mode === 'rub') {
      const lx = p.x - (s.x + s.ox), ly = p.y - (s.y + s.oy - s.lift);
      const inside = lx > P.ox && lx < P.ox + P.w && ly > P.oy && ly < P.oy + P.h;
      const f = FEEL[s.type];

      if (inside) {
        s.rub += speed;
        if (s.type === 'plain' || s.type === 'translucent' || s.type === 'lined') {
          s.ovx += dx * f.pull; s.ovy += dy * f.pull;
        }
        if (s.type === 'lined') {
          const line = Math.floor((ly - 35.2) / 16);
          if (s.lastLine !== null && line !== s.lastLine && ly > 30) {
            s.ovy += Math.sign(dy || 1) * 1.4;
            tick(2600, .035, .015);
          }
          s.lastLine = line;
        }
        if (s.type === 'grid') {
          s.catchX += dx; s.catchY += dy;
          const STEP = 11.2;
          while (Math.abs(s.catchX) > STEP) {
            const d = Math.sign(s.catchX);
            s.ox += d * 2.6; s.catchX -= d * STEP;
            s.rot += (Math.random() - .5) * 1.4;
            tick(900, .06, .03);
            s.trails.push({ kind: 'dot', x: lx, y: ly, t: performance.now() });
          }
          while (Math.abs(s.catchY) > STEP) {
            const d = Math.sign(s.catchY);
            s.oy += d * 2.6; s.catchY -= d * STEP;
            tick(900, .06, .03);
            s.trails.push({ kind: 'dot', x: lx, y: ly, t: performance.now() });
          }
        }
        // trail marks left by the cursor
        const now = performance.now();
        if (s.type === 'plain') s.trails.push({ kind: 'streak', x: lx, y: ly, t: now });
        if (s.type === 'translucent' && speed > 1) {
          const nx = -dy / (speed || 1), ny = dx / (speed || 1);
          const j = (Math.random() - .5) * 9;
          s.trails.push({ kind: 'crinkle', x: lx + nx * j, y: ly + ny * j, t: now });
        }
        rubSound(s.type, speed);
        s.ox = Math.max(-18, Math.min(18, s.ox));
        s.oy = Math.max(-18, Math.min(18, s.oy));
        if (!s.ready && s.rub > 240) {
          s.ready = true; s.el.classList.add('ready');
          s.cornerEl.style.cssText = '';
          ghost.style.opacity = .55;
          slotGlow.classList.add('pulse');
          roller.style.opacity = .75;
          if (!saidReady) { saidReady = true; LP.say('This one is ready. Lift it by its curled corner.'); }
        }
      }
      // pulling a rubbed sheet off its edge picks it up
      if (s.ready && (ly > P.oy + P.h + 6 || ly < P.oy - 14 || lx < P.ox - 14 || lx > P.ox + P.w + 14)) {
        startDrag(s, lx, ly > P.oy + P.h ? P.oy + P.h - 12 : ly);
      }
    }

    if (s.mode === 'drag') {
      s.tx = p.x - s.grab.x; s.ty = p.y - s.grab.y;
    }
  });

  function endPointer() {
    if (!active) return;
    const s = active; active = null;
    A.quiet();
    if (s.mode === 'rub') { s.mode = 'idle'; s.catchX = s.catchY = 0; }
    else if (s.mode === 'drag') {
      s.el.classList.remove('dragging');
      if (slotDist(s) < 110) { feed(s); return; }
      // a released sheet keeps its momentum: a toss toward the roller glides in
      s.gvx = s.vx * 1.6; s.gvy = s.vy * 1.6;
      const px = s.x + s.gvx * 9, py = s.y + s.gvy * 9;
      const pd = Math.hypot(px + P.ox + P.w / 2 - SLOT_CX, py + P.oy + P.h - SLOT_Y);
      if (s.gvy > 2 && pd < 170) s.mode = 'glide';
      else { s.mode = 'return'; tick(700, .03, .05); }
    }
  }
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);

  function slotDist(s) {
    const bx = s.x + P.ox + P.w / 2, by = s.y + P.oy + P.h;
    return Math.hypot(bx - SLOT_CX, by - SLOT_Y);
  }

  // ---------- feeding ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function tween(s, toY, ms) {
    return new Promise(res => {
      const fromY = s.y, t0 = performance.now();
      (function step(now) {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3);
        s.y = fromY + (toY - fromY) * e;
        if (k < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }

  async function feed(s) {
    if (fed) return;
    s.mode = 'feed';
    fed = true;
    s.el.classList.add('fed');
    LP.quiet();
    // snap into the guides
    const sx = s.x, sy = s.y, sr = s.rot, t0 = performance.now();
    await new Promise(res => {
      (function step(now) {
        const k = Math.min(1, (now - t0) / 200);
        const e = 1 - Math.pow(1 - k, 3);
        s.x = sx + (ALIGN_X - sx) * e; s.y = sy + (ALIGN_Y - sy) * e; s.rot = sr * (1 - e);
        if (k < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
    tick(1500, .05, .03);
    clip.appendChild(s.el);
    ghost.style.opacity = 0;
    slotGlow.classList.remove('pulse');
    slotGlow.style.opacity = .35;
    roller.style.opacity = 1;
    // the roller takes the paper in, notch by notch
    const finalY = SLOT_Y - 36 - P.oy;
    const steps = 10, start = s.y;
    for (let i = 1; i <= steps; i++) {
      await tween(s, start + (finalY - start) * (i / steps), 85);
      stripes.style.backgroundPosition = `0 ${i * 4}px`;
      tick(1100 + Math.random() * 120, .045, .02);
      await wait(55);
    }
    await wait(120);
    tick(500, .08, .09);           // soft click, paper sits straight
    slotGlow.style.opacity = 0;
    sheets.forEach(o => { if (o !== s) o.opacity = 0; });
    // on to the typewriter, carrying the chosen paper
    setTimeout(() => LP.seq.next('type', { paper: s.type }), 1600);
  }

  // ---------- idle demonstration: a soft fingertip rubs a sheet until the user tries ----------
  let userTouched = false, demo = null, demoNext = 0, demoIdx = 0;
  function runDemo(now) {
    if (userTouched || fed || !api.active) { if (demo) { demo = null; touch.style.opacity = 0; } return; }
    if (!demo) {
      if (now < demoNext) return;
      demo = { s: sheets[demoIdx % sheets.length], t0: now, lastX: null, acc: 0 };
      demoIdx++;
      touch.style.opacity = 1;
    }
    const s = demo.s;
    const t = (now - demo.t0) / 1900;
    if (t >= 1) { demo = null; touch.style.opacity = 0; demoNext = now + 3200; return; }
    const lx = P.ox + P.w / 2 + Math.sin(t * Math.PI * 4) * 40;
    const ly = P.oy + P.h * .42 + Math.sin(t * Math.PI * 2) * 6;
    const px = s.x + s.ox + lx, py = s.y + s.oy - s.lift + ly;
    touch.style.transform = `translate(${px - 11}px, ${py - 11}px)`;
    if (demo.lastX !== null) {
      const dx = px - demo.lastX;
      const f = FEEL[s.type];
      if (s.type !== 'grid') { s.ovx += dx * f.pull * .3; s.ox = Math.max(-9, Math.min(9, s.ox)); }
      else {
        demo.acc += dx;
        if (Math.abs(demo.acc) > 11.2) { s.ox += Math.sign(demo.acc) * 2.2; demo.acc = 0; s.trails.push({ kind: 'dot', x: lx, y: ly, t: now }); }
      }
      if (s.type === 'lined' && Math.random() < .15) s.ovy += (Math.random() - .5) * 1.2;
      if (s.type === 'plain') s.trails.push({ kind: 'streak', x: lx, y: ly, t: now });
      if (s.type === 'translucent') s.trails.push({ kind: 'crinkle', x: lx, y: ly + (Math.random() - .5) * 8, t: now });
    }
    demo.lastX = px;
  }

  // ---------- pickup demonstration: once a sheet is ready, the fingertip shows where to grab ----------
  let hasDragged = false, pickup = null, pickupNext = 0, lastActivity = performance.now();
  function runPickupDemo(now) {
    if (hasDragged || fed || active || !api.active) {
      if (pickup) { pickup.s.demoPull = 0; pickup = null; touch.style.opacity = 0; }
      return;
    }
    if (!pickup) {
      const s = sheets.find(o => o.ready && o.mode === 'idle');
      if (!s || now < pickupNext || now - lastActivity < 1600) return;
      pickup = { s, t0: now };
      touch.style.opacity = 1;
    }
    const s = pickup.s;
    const t = now - pickup.t0;
    const ease = LP.ease;
    let fy = 0, press = 1, pull = 0;
    if (t < 450) { press = 1; }
    else if (t < 650) { press = 1 - .2 * ease((t - 450) / 200); }
    else if (t < 1350) { const e = ease((t - 650) / 700); press = .8; fy = 44 * e; pull = 34 * e; }
    else if (t < 1750) { const e = ease((t - 1350) / 400); press = .8; fy = 44; pull = 34 * (1 - e); touch.style.opacity = 0; }
    else { s.demoPull = 0; pickup = null; touch.style.opacity = 0; pickupNext = now + 3200; return; }
    s.demoPull = pull;
    const px = s.x + s.ox + P.ox + P.w - 11, py = s.y + s.oy - s.lift + P.oy + P.h - 9 + fy;
    touch.style.transform = `translate(${px - 11}px, ${py - 11}px) scale(${press})`;
  }

  // ---------- per-frame ----------
  function update(now) {
    runDemo(now);
    runPickupDemo(now);
    // the corner curls up a little more with every rub, showing how close the sheet is to being picked up
    for (const s of sheets) {
      if (s.ready || !s.cornerEl) continue;
      const pr = Math.min(1, s.rub / 240);
      const size = 4 + 18 * pr;
      s.cornerEl.style.opacity = pr > 0 ? (.35 + .65 * pr).toFixed(2) : 0;
      s.cornerEl.style.width = s.cornerEl.style.height = size + 'px';
      s.cornerEl.style.left = (146 - size) + 'px'; s.cornerEl.style.top = (194 - size) + 'px';
    }

    let glow = 0;
    for (const s of sheets) {
      const f = FEEL[s.type];
      if (s.mode === 'idle' || s.mode === 'rub') {
        s.ovx += -s.ox * f.k; s.ovy += -s.oy * f.k;
        s.ovx *= f.fric; s.ovy *= f.fric;
        s.ox += s.ovx; s.oy += s.ovy;
        if (s.type === 'grid' && s.mode === 'idle') { s.ox *= .86; s.oy *= .86; }
        s.rot *= .9;
        const targetLift = s.ready ? 6 : (s.hover && !active ? 3 : 0);
        s.lift += (targetLift - s.lift) * .15;
        const targetSc = s.mode === 'rub' ? .985 : 1;
        s.sc += (targetSc - s.sc) * .3;
      } else if (s.mode === 'drag') {
        let tx = s.tx, ty = s.ty;
        const d = slotDist(s);
        if (d < 150) {
          const m = Math.pow(1 - d / 150, 2) * .7;
          tx += (ALIGN_X - tx) * m; ty += (ALIGN_Y - ty) * m;
        }
        s.prevX = s.x; const prevY = s.y;
        s.x += (tx - s.x) * .2; s.y += (ty - s.y) * .2;
        const vx = s.x - s.prevX;
        s.vx = vx; s.vy = s.y - prevY;
        const targetRot = d < 60 ? 0 : Math.max(-9, Math.min(9, vx * .5));
        s.rot += (targetRot - s.rot) * .15;
        s.sc += (1.02 - s.sc) * .2;
        glow = Math.max(glow, Math.max(0, 1 - d / 360));
      } else if (s.mode === 'glide') {
        s.x += s.gvx; s.y += s.gvy; s.gvx *= .9; s.gvy *= .9;
        const d = slotDist(s);
        if (d < 150) { const m = (1 - d / 150) * .18; s.x += (ALIGN_X - s.x) * m; s.y += (ALIGN_Y - s.y) * m; }
        s.rot *= .9;
        glow = Math.max(glow, Math.max(0, 1 - d / 360));
        slotGlow.classList.remove('pulse');
        slotGlow.style.opacity = (.15 + glow * .7).toFixed(3);
        if (d < 26) feed(s);
        else if (Math.hypot(s.gvx, s.gvy) < .25 && d > 60) { s.mode = 'return'; s.gvx = s.gvy = 0; }
      } else if (s.mode === 'return') {
        if (s.gvx || s.gvy) { s.x += s.gvx; s.y += s.gvy; s.gvx *= .86; s.gvy *= .86; if (Math.hypot(s.gvx, s.gvy) < .1) s.gvx = s.gvy = 0; }
        s.x += (s.homeX - s.x) * .1; s.y += (s.homeY - s.y) * .1;
        s.rot *= .88; s.sc += (1 - s.sc) * .2;
        if (Math.abs(s.x - s.homeX) < .5 && Math.abs(s.y - s.homeY) < .5) {
          s.x = s.homeX; s.y = s.homeY; s.mode = 'idle';
        }
      }
      if (s.mode === 'drag') {
        slotGlow.classList.remove('pulse');
        slotGlow.style.opacity = (.15 + glow * .7).toFixed(3);
        roller.style.opacity = (.75 + glow * .25).toFixed(3);
      }

      const shadow = s.mode === 'drag' ? 14 : s.lift * 1.6;
      const dp = s.demoPull || 0;
      s.el.style.transform = `translate(${s.x + s.ox}px, ${s.y + s.oy - s.lift + dp}px) rotate(${s.rot + dp * .08}deg) scale(${s.sc})`;
      s.el.style.filter = `drop-shadow(0 ${shadow * .6}px ${shadow}px rgba(0,0,0,${0.08 + shadow * .008}))`;
      if (s.opacity === 0) { s.el.style.transition = 'opacity .8s ease'; s.el.style.opacity = 0; s.el.style.pointerEvents = 'none'; }

      drawTrails(s, now);
    }
    if (!sheets.some(s => s.mode === 'drag') && !fed && sheets.some(s => s.ready)) {
      slotGlow.classList.add('pulse'); slotGlow.style.opacity = '';
    }
  }

  function drawTrails(s, now) {
    const c = s.ctx;
    if (!s.trails.length) { if (s._drawn) { c.clearRect(0, 0, 160, 208); s._drawn = false; } return; }
    c.clearRect(0, 0, 160, 208);
    c.save();
    c.beginPath(); c.rect(P.ox, P.oy, P.w, P.h); c.clip();
    const life = { streak: 500, dot: 700, crinkle: 900 };
    s.trails = s.trails.filter(t => now - t.t < life[t.kind]);
    let prev = null;
    for (const t of s.trails) {
      const a = 1 - (now - t.t) / life[t.kind];
      if (t.kind === 'streak') {
        if (prev && prev.kind === 'streak' && t.t - prev.t < 80) {
          c.strokeStyle = `rgba(255,255,255,${.9 * a})`; c.lineWidth = 9; c.lineCap = 'round';
          c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(t.x, t.y); c.stroke();
          c.strokeStyle = `rgba(0,0,0,${.05 * a})`; c.lineWidth = 1;
          c.beginPath(); c.moveTo(prev.x, prev.y + 5); c.lineTo(t.x, t.y + 5); c.stroke();
        }
      } else if (t.kind === 'dot') {
        c.fillStyle = `rgba(60,60,60,${.45 * a})`;
        c.beginPath(); c.arc(t.x, t.y, 1.8, 0, Math.PI * 2); c.fill();
      } else if (t.kind === 'crinkle') {
        if (prev && prev.kind === 'crinkle' && t.t - prev.t < 80) {
          c.strokeStyle = `rgba(80,80,80,${.35 * a})`; c.lineWidth = .8;
          c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(t.x, t.y); c.stroke();
          c.strokeStyle = `rgba(255,255,255,${.8 * a})`; c.lineWidth = .8;
          c.beginPath(); c.moveTo(prev.x + 1, prev.y + 1); c.lineTo(t.x + 1, t.y + 1); c.stroke();
        }
      }
      prev = t;
    }
    c.restore();
    s._drawn = true;
  }

  api.enter = () => {
    init();
    LP.say('Choose a page for today. Touch each one, and feel it.', 600);
  };
  api.leave = () => { A.quiet(); };
  api.update = update;
  // test hook: the sheets, for automated checks
  api._sheets = () => sheets;
  return api;
})();
