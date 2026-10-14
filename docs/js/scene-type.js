// Scene 2 · Type the page (adapted from studies/02-strike-the-keys and studies/03-return-the-carriage).
// Type freely; return the carriage at any time with the lever or a two-finger swipe right. Up to eight lines;
// "Finish the page" ends early. A small page in the corner shows how much is written.
// Backspace rewinds time: tap removes one letter, hold keeps rewinding slowly.
LP.scenes.type = (() => {
  const api = { ox: 0, oy: 60, active: false };
  const root = document.getElementById('sceneType');
  api.el = root;
  const A = LP.audio;
  const q = s => root.querySelector(s);

  // ---------- geometry (scene coordinates, 1000×740) ----------
  const TOP = 30;                 // carriage top
  const C0 = 380;                 // carriage x at the start of a line
  const LINE_X = 180;             // line start inside the carriage
  const CW = 10.8;                // one character step
  const MAX = 23, BELL_AT = 18;   // characters per line; the bell (and the lever) at 18
  const LINE_H = 26;
  const ROWS_N = 8;               // lines on the page
  const REST = -78;               // type bar angle at rest
  const STICK = 8;                // pull this far before the lever's hook lets go
  const GRIP_DX = -51;            // grip centre relative to the carriage
  const TRACK_Y = TOP + 482;

  // one quiet invitation for the whole page; it fades once typing begins
  const INVITE = 'Write something for yourself.';

  const BAR_SVG = `<svg viewBox="0 0 60 200" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="184" r="9" fill="#5a5a5a" stroke="#333" stroke-width="1.5"/><circle cx="30" cy="184" r="3" fill="#cfcfcf"/><rect x="27" y="30" width="6" height="154" fill="#7a7a7a"/><rect x="18" y="10" width="24" height="24" rx="2" fill="#3c3c3c" stroke="#1e1e1e" stroke-width="1.5"/><rect x="23" y="15" width="14" height="14" fill="#6a6a6a"/></svg>`;

  const carriage = q('.carriage'), linesEl = q('.lines'), face = q('.paperFace'), stripes = q('.stripes');
  const lever = q('.lever'), grip = q('.grip'), gripPulse = q('.gripPulse'), track = q('.track');
  const marker = q('.marker'), barsEl = q('.bars'), keysEl = q('.keys'), keyTip = q('.keyTip'), touch = q('.touch');
  const leverTip = q('.leverTip'), gauge = q('.pageGauge'), mini = q('.mini'), finishBtn = q('.finishBtn');

  // the little page in the corner: one mark per line, filling as you write
  const gaugeLines = [];
  for (let i = 0; i < ROWS_N; i++) {
    const m = document.createElement('i');
    m.style.top = (8 + i * 6) + 'px';
    mini.appendChild(m); gaugeLines.push(m);
  }
  function drawGauge() {
    for (let i = 0; i < ROWS_N; i++) {
      const m = gaugeLines[i];
      let len = 0, cls = '';
      if (i < row || (mode === 'out' && finishedRows[i] !== undefined)) { len = (finishedRows[i] || '').length; cls = 'done'; }
      else if (i === row && mode !== 'out') { len = shown; cls = 'now'; }
      m.style.width = (Math.max(cls ? 2 : 34, 34 * len / MAX)).toFixed(1) + 'px';
      m.className = cls;
    }
    finishBtn.classList.toggle('on', api.active && mode === 'type' && (row > 0 || pos > 0));
  }
  finishBtn.addEventListener('click', () => {
    if (!api.active || mode !== 'type' || rw) return;
    for (const h of held.values()) if (!h.dead) return;
    if (pos > 0) finishedRows[row] = Array.from(rowText, c => c || ' ').join('').replace(/\s+$/, '');
    stopDemo();
    pageOut(false);
  });

  // ---------- keyboard mirror ----------
  const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const keyEls = {};
  ROWS.forEach((row, r) => {
    const startX = 500 - (row.length * 46 - 8) / 2;
    [...row].forEach((ch, i) => addKey(ch, startX + i * 46, 560 + r * 46));
  });
  addKey(' ', 385, 696, 'space');
  addKey('BACK', 734, 560, 'back');

  function addKey(ch, x, y, kind) {
    const k = document.createElement('div');
    k.className = 'key' + (kind ? ' ' + kind : '');
    k.style.left = x + 'px'; k.style.top = (y - 8) + 'px';
    const label = kind === 'space' ? '' : kind === 'back' ? '&larr;' : ch;
    k.innerHTML = `<div class="stem"></div><div class="cap">${label}</div>`;
    keysEl.appendChild(k);
    const cap = k.querySelector('.cap');
    const w = kind === 'space' ? 230 : kind === 'back' ? 62 : 38;
    keyEls[ch] = { el: k, cap, depth: 0, target: 0, cx: x + w / 2, cy: y - 8 + 19 };
    if (kind === 'back') {
      k.setAttribute('aria-label', 'Rewind');
      k.addEventListener('pointerdown', e => { e.preventDefault(); startRewind('ptr'); });
      k.addEventListener('pointerup', () => stopRewind('ptr'));
      k.addEventListener('pointerleave', () => stopRewind('ptr'));
    } else {
      k.addEventListener('pointerdown', e => { e.preventDefault(); press(ch, 'ptr'); });
      k.addEventListener('pointerup', () => release('ptr'));
      k.addEventListener('pointerleave', () => release('ptr'));
    }
  }

  // ---------- state ----------
  let paper = 'plain';
  let row, pos, shown, locked, recs, rowText, finishedRows;
  let mode;                       // 'type' | 'pull' | 'out'
  let carX, carV, held, lastStrike, bars;
  let paperY, paperV, tilt, tiltTarget;
  let leverReady, drag, coast, samples, steps, endX, pullPos, pullVel, pullTarget, notch, finishing;
  let rw = null;                  // rewind in progress
  let everTyped, everRewound, everPulled;
  let lastActivity, demo, demoNext, demoShift, demoShiftT, backTipShown;

  function init(data) {
    paper = data.paper || 'plain';
    face.className = 'paperFace ' + paper;
    linesEl.querySelectorAll('.ch').forEach(n => n.remove());
    barsEl.innerHTML = ''; bars = []; addBar();
    finishedRows = [];
    row = 0; newRowState();
    mode = 'type';
    carX = C0; carV = 0; held = new Map(); lastStrike = 0;
    paperY = 0; paperV = 0; tilt = 0; tiltTarget = 0;
    drag = null; coast = null; finishing = false; rw = null;
    everTyped = false; everRewound = false; everPulled = false;
    lastActivity = performance.now(); demo = null; demoNext = performance.now() + 4500;
    demoShift = 0; demoShiftT = 0; backTipShown = 0;
    marker.classList.remove('off');
    keyTip.classList.remove('on'); leverTip.classList.remove('on');
    swipe = null; needGap = false; touches.clear(); touchAvg = null;
    gauge.classList.add('on');
    touch.style.opacity = 0;
    for (const ch in keyEls) { keyEls[ch].depth = 0; keyEls[ch].target = 0; }
  }
  function newRowState() {
    pos = 0; shown = 0; locked = false; recs = []; rowText = [];
    setLeverReady(true);
  }
  function addBar() {
    const b = document.createElement('div');
    b.className = 'bar'; b.innerHTML = BAR_SVG;
    barsEl.appendChild(b);
    const bar = { el: b, ang: REST, target: REST, vel: 0 };
    bars.push(bar);
    return bar;
  }
  const toStage = e => LP.local(e, api);

  // ---------- typing ----------
  function press(ch, src) {
    if (!api.active) return;
    const now = performance.now();
    lastActivity = now;
    if (held.has(src)) return;
    const k = keyEls[ch === ' ' ? ' ' : ch.toUpperCase()];
    if (mode !== 'type' || locked || pos >= MAX || rw) {
      A.thunk(.18, 300, .09); carV -= 1.2;     // locked: a dull knock, nothing prints
      if (k) { k.target = 3; held.set(src, { ch, k, dead: true, t0: now }); }
      if (mode === 'type' && locked) pingLever();
      return;
    }
    everTyped = true; stopDemo();
    if (!recs.length) LP.quiet();               // the question fades once the line begins

    if (ch === ' ') {
      if (k) k.target = 6;
      held.set(src, { ch, k, space: true, t0: now });
      recs.push({ kind: 'space', slot: pos, landed: true });
      rowText[pos] = ' ';
      pos++; advance();
      return;
    }
    const jam = now - lastStrike < 60 && pos > 0;
    lastStrike = now;
    if (k) k.target = 4;

    // the type bar swings up and lands with weight
    let bar = bars[0];
    if (jam) { bar = addBar(); bar.el.style.transform = `rotate(${REST + 14}deg)`; bar.ang = REST + 14; }
    bar.target = jam ? -9 : 0;
    const node = document.createElement('div');
    node.className = 'ch';
    node.textContent = ch;
    const slot = jam ? Math.max(0, pos - 1) : pos;
    node.style.left = (LINE_X - 151 + slot * CW - 0.5) + 'px';
    node.style.top = (250 + row * LINE_H) + 'px';
    node.style.opacity = 0;
    if (jam) node.style.transform = `translate(${(Math.random() - .5) * 6}px, ${(Math.random() - .5) * 5}px) rotate(${(Math.random() - .5) * 16}deg)`;
    linesEl.appendChild(node);
    marker.classList.add('off');
    const rec = { kind: jam ? 'jam' : 'char', slot, node, landed: false };
    recs.push(rec);
    if (!jam) { rowText[slot] = ch; pos++; }
    const h = { ch, k, node, bar, t0: now, landed: false, jam };
    held.set(src, h);
    setTimeout(() => {               // impact after the swing
      h.landed = true; rec.landed = true;
      if (!node.classList.contains('fading')) node.style.opacity = .5;
      A.thunk(jam ? .5 : .36, jam ? 1100 : 750, .07);
      if (jam) A.tick(420, .07, .06);
      else advance();                // the carriage steps on impact
      carV -= .6;                    // the hit jolts the carriage
    }, 95);
  }

  function release(src) {
    const h = held.get(src);
    if (!h) return;
    held.delete(src);
    if (h.k) h.k.target = 0;
    if (h.dead || h.space) { if (!held.size && mode === 'type') marker.classList.remove('off'); return; }
    const holdMs = performance.now() - h.t0;
    // the longer the press, the darker the letter
    const finish = () => {
      const strength = Math.min(1, Math.max(0, (performance.now() - h.t0 - 95) / 380));
      if (!h.node.classList.contains('fading')) {
        h.node.style.opacity = (.5 + .5 * strength).toFixed(2);
        if (strength > .75) h.node.style.textShadow = '0.4px 0 0 currentColor';
      }
      h.bar.target = REST;
      if (h.jam) {
        setTimeout(() => { const i = bars.indexOf(h.bar); if (i > 0) { h.bar.el.remove(); bars.splice(i, 1); } }, 420);
      }
      if (!held.size && mode === 'type') marker.classList.remove('off');
    };
    if (h.landed) finish(); else setTimeout(finish, Math.max(0, 100 - holdMs));
  }

  function advance() {
    shown = Math.min(shown + 1, MAX);
    A.tick(1300 + Math.random() * 150, .035, .02);
    if (shown === BELL_AT) A.bell();
    setLeverReady(true);
    if (shown >= MAX && !locked) { locked = true; A.thunk(.25, 400, .12); }
  }

  // ---------- rewind (Backspace) ----------
  function rewindOnce() {
    if (mode !== 'type') return false;
    for (const h of held.values()) if (h.node) return false;
    const last = recs[recs.length - 1];
    if (!last) { A.thunk(.12, 280, .08); carV += .6; return false; }
    if (!last.landed) return false;
    recs.pop();
    if (last.node) {
      const n = last.node;
      n.classList.add('fading');
      setTimeout(() => n.remove(), 750);
      // the type bar rises a little, as if lifting the ink back off the page
      const b = bars[0]; b.target = -34;
      setTimeout(() => { if (b.target === -34) b.target = REST; }, 150);
    }
    if (last.kind !== 'jam') {
      pos = Math.max(0, pos - 1);
      rowText.length = pos;
      shown = Math.max(0, shown - 1);    // the carriage slides back one step
    }
    if (locked && shown < MAX) locked = false;
    setLeverReady(true);
    A.rewind();
    return true;
  }
  function startRewind(src) {
    if (!api.active || mode !== 'type') return;
    lastActivity = performance.now();
    if (rw) return;
    everRewound = true; keyTip.classList.remove('on'); stopDemo();
    keyEls.BACK.target = 5;
    rewindOnce();
    rw = { src, timer: null };
    const repeat = () => { if (!rw) return; rewindOnce(); rw.timer = setTimeout(repeat, 260); };
    rw.timer = setTimeout(repeat, 520);   // held: time keeps flowing back, slowly
  }
  function stopRewind(src) {
    if (!rw || (src && rw.src !== src)) return;
    clearTimeout(rw.timer); rw = null;
    keyEls.BACK.target = 0;
    if (!held.size && mode === 'type') marker.classList.remove('off');
  }

  // ---------- physical keyboard ----------
  const KEYMAP = k => {
    if (k === ' ') return ' ';
    if (k.length === 1 && /[a-z0-9.,;:'"!?\-]/i.test(k)) return k;
    return null;
  };
  window.addEventListener('keydown', e => {
    if (!api.active) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Backspace') { e.preventDefault(); if (!e.repeat) startRewind('k:' + e.code); return; }
    if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) pingLever(); return; }
    const ch = KEYMAP(e.key);
    if (!ch) return;
    e.preventDefault();
    if (e.repeat) return;
    const vis = ch === ' ' ? ' ' : ch.toUpperCase();
    press(ch, 'k:' + e.code);
    const h = held.get('k:' + e.code);
    if (h && !h.k && keyEls[vis]) { h.k = keyEls[vis]; h.k.target = h.dead ? 3 : 4; }
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'Backspace') stopRewind('k:' + e.code);
    release('k:' + e.code);
  });
  window.addEventListener('blur', () => { if (held) [...held.keys()].forEach(release); stopRewind(); });

  // ---------- the return lever ----------
  // the lever can be pulled at any time while typing (even on an empty line);
  // it only pulses as a reminder once the bell has rung near the end of the line
  function setLeverReady(on) {
    leverReady = on;
    grip.classList.toggle('ready', on);
    track.classList.toggle('on', on);
    gripPulse.classList.toggle('on', on && shown >= BELL_AT && !drag);
    buildTrack();
  }
  function pingLever() {
    if (leverReady) { gripPulse.classList.remove('on'); void gripPulse.offsetWidth; gripPulse.classList.add('on'); A.tick(900, .03, .03); }
    else { A.thunk(.1, 260, .06); }
  }
  const notches = [];
  function buildTrack() {
    track.innerHTML = ''; notches.length = 0;
    if (!leverReady) return;
    const n = mode === 'pull' ? steps : shown;
    const x0 = C0 - n * CW + GRIP_DX, x1 = C0 + GRIP_DX;
    const ns = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); track.appendChild(el); return el; };
    mk('line', { x1: x0, x2: x1, y1: TRACK_Y, y2: TRACK_Y, stroke: '#c9c9c8', 'stroke-width': 7, 'stroke-linecap': 'round' });
    for (let i = 1; i <= n; i++) notches.push(mk('rect', { x: x0 + i * CW - 1, y: TRACK_Y - 6, width: 2, height: 12, rx: 1, fill: '#b9b9b8' }));
    mk('rect', { x: x1 + 5, y: TRACK_Y - 12, width: 5, height: 24, rx: 2, fill: '#7a7a7a' });
  }

  grip.addEventListener('pointerdown', (e) => {
    if (!api.active || mode !== 'type' || !leverReady || rw) return;
    for (const h of held.values()) if (!h.dead) return;
    e.preventDefault();
    stopDemo();
    lastActivity = performance.now();
    const p = toStage(e);
    mode = 'pull';
    steps = shown; endX = C0 - shown * CW;
    pullPos = carX - endX; pullVel = 0; pullTarget = 0; notch = 0; finishing = false;
    drag = { x0: p.x, hooked: false };
    samples = [{ x: p.x, t: performance.now() }];
    grip.classList.add('held');
    gripPulse.classList.remove('on');
    marker.classList.add('off');
    tiltTarget = 8;
    A.tick(700, .08, .05);                     // clicks into the hook
  });
  window.addEventListener('pointermove', (e) => {
    if (!api.active) return;
    lastActivity = performance.now();
    if (!drag) return;
    const p = toStage(e);
    samples.push({ x: p.x, t: performance.now() });
    if (samples.length > 8) samples.shift();
    let raw = p.x - drag.x0;
    if (!drag.hooked) {
      tiltTarget = 8 + Math.max(0, raw) * 1.1;  // tension builds before it gives
      if (raw < STICK) return;
      drag.hooked = true; drag.x0 += STICK; raw -= STICK;
      A.tick(500, .07, .04);
    }
    raw = Math.max(0, Math.min(steps * CW, raw));
    tiltTarget = 14;
    setNotch(Math.floor(raw / CW + 0.0001), true);
  });
  function setNotch(n, sound) {
    n = Math.max(0, Math.min(steps, n));
    if (n !== notch) { if (sound) A.tick(1100 + n * 18, .045, .018); notch = n; }
    pullTarget = notch * CW;
  }
  function pullSpeed() {
    const now = performance.now();
    const recent = samples.filter(s => now - s.t < 90);
    if (recent.length < 2) return 0;
    const a = recent[0], b = recent[recent.length - 1];
    return (b.x - a.x) / Math.max(1, b.t - a.t);
  }
  function endDrag() {
    if (!drag) return;
    const hooked = drag.hooked;
    drag = null;
    grip.classList.remove('held');
    tiltTarget = 0;
    // a full pull returns; on an empty line, any firm pull past the hook is a line feed
    if ((steps > 0 && notch >= steps) || (steps === 0 && hooked)) { finish(); return; }
    const v = pullSpeed();
    if (hooked && v > .45) {
      coast = { v: Math.min(30, v * 17) };       // a firm pull keeps going on its own
      pullPos = Math.max(pullPos, notch * CW);
      return;
    }
    springBack();
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function springBack() {
    if (notch > 0) A.slide(.25 + notch * .01);
    notch = 0; pullTarget = 0;
  }
  function finish() {
    finishing = true;
    everPulled = true;
    notch = steps; pullTarget = steps * CW;
    A.thunk(.55, 240, .18);
    pullVel = 7;                                  // hits the stop and bounces back a little
    paperV += 3;
    finishedRows[row] = Array.from(rowText, c => c || ' ').join('').replace(/\s+$/, '');
    setTimeout(() => {
      if (row < ROWS_N - 1) {
        row++;
        mode = 'type'; finishing = false; carV = 0; carX = C0;
        newRowState();
        marker.classList.remove('off');
        A.tick(2400, .035, .02);
      } else {
        pageOut(true);
      }
    }, 650);
  }

  // the page is done (full, or finished early): the roller turns until the sheet comes free
  function pageOut(full) {
    mode = 'out'; finishing = false; swipe = null;
    setLeverReady(false);
    marker.classList.add('off');
    leverTip.classList.remove('on'); keyTip.classList.remove('on');
    LP.say(full ? 'Your page is full. Take a slow breath.' : 'Your page is ready. Take a slow breath.');
    let i = 0;
    const base = Math.min(paperY, -row * LINE_H);
    const lines = Array.from({ length: ROWS_N }, (_, k) => finishedRows[k] || '');
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();   // no empty lines after the last words
    (function step() {
      i++;
      outTarget = base - i * 46;
      A.tick(1100 + Math.random() * 120, .04, .02);
      if (i < 13) setTimeout(step, 170);
      else setTimeout(() => LP.seq.next('keep', { paper, lines }), 1500);
    })();
  }

  // ---------- two-finger swipe to the right = pulling the lever ----------
  // trackpad: horizontal wheel events; touch screens: two fingers moving right.
  let swipe = null, lastWheel = 0, needGap = false;
  function swipeInput(amount) {
    const now = performance.now();
    if (!swipe) {
      if (!api.active || mode !== 'type' || !leverReady || rw || drag) return;
      for (const h of held.values()) if (!h.dead) return;
      stopDemo();
      mode = 'pull';
      steps = shown; endX = C0 - shown * CW;
      pullPos = carX - endX; pullVel = 0; pullTarget = 0; notch = 0; finishing = false;
      swipe = { acc: 0 };
      gripPulse.classList.remove('on'); marker.classList.add('off'); leverTip.classList.remove('on');
      tiltTarget = 14;
      A.tick(700, .08, .05); A.tick(500, .06, .04);
    }
    lastActivity = now;
    swipe.last = now;
    swipe.acc += amount;
    if (steps === 0) { if (swipe.acc > 24) { swipe = null; needGap = true; tiltTarget = 0; finish(); } return; }
    setNotch(Math.floor(swipe.acc * .9 / CW + 0.0001), true);
    if (notch >= steps) { swipe = null; needGap = true; tiltTarget = 0; finish(); }
  }
  function endSwipe() {
    if (!swipe) return;
    swipe = null; tiltTarget = 0;
    if (notch >= steps * .5) coast = { v: 10 };   // most of the way: it glides home
    else springBack();
  }
  window.addEventListener('wheel', (e) => {
    if (!api.active || mode === 'out') return;
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const dx = e.deltaX * k, dy = e.deltaY * k;
    if (Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    e.preventDefault();                         // keep the browser from going "back"
    const now = performance.now();
    if (needGap) {                              // let the last swipe's momentum die out first
      if (now - lastWheel > 260) needGap = false;
      else { lastWheel = now; return; }
    }
    lastWheel = now;
    if (mode === 'pull' && !swipe) return;      // already being pulled by hand
    swipeInput(Math.abs(dx));
  }, { passive: false });
  const touches = new Map();
  let touchAvg = null;
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { touches.set(e.pointerId, e.clientX); touchAvg = null; } });
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch' || !touches.has(e.pointerId)) return;
    touches.set(e.pointerId, e.clientX);
    if (touches.size !== 2) { touchAvg = null; return; }
    const avg = [...touches.values()].reduce((a, b) => a + b, 0) / 2;
    if (touchAvg !== null && avg > touchAvg) swipeInput((avg - touchAvg) / LP.scale * 1.3);
    touchAvg = avg;
  });
  const touchEnd = e => { if (e.pointerType === 'touch') { touches.delete(e.pointerId); touchAvg = null; if (touches.size < 2) endSwipe(); } };
  window.addEventListener('pointerup', touchEnd);
  window.addEventListener('pointercancel', touchEnd);
  let outTarget = 0;

  // ---------- hints ----------
  function stopDemo() {
    if (demo) { if (demo.key) demo.key.target = 0; demoShiftT = 0; tiltTarget = drag ? tiltTarget : 0; }
    demo = null; touch.style.opacity = 0;
  }
  function runDemo(now) {
    if (!api.active || mode !== 'type' || drag || rw || held.size || swipe) { if (demo) stopDemo(); return; }
    if (!demo) {
      if (now < demoNext || now - lastActivity < 2500) return;
      let kind = null;
      if (!everTyped) kind = 'key';
      else if (leverReady && !everPulled && (pos >= 10 || locked)) kind = 'lever';
      else if (!everRewound && pos >= 4 && backTipShown < 2 && now - lastActivity > 5000) kind = 'back';
      if (!kind) return;
      demo = { kind, t0: now, n: 0 };
      if (kind === 'back') { backTipShown++; keyTip.classList.add('on'); }
      if (kind === 'lever') leverTip.classList.add('on');
      touch.style.opacity = 1;
    }
    const t = now - demo.t0;
    const ease = LP.ease;
    if (demo.kind === 'key') {
      // a fingertip taps a few keys, showing they can be pressed
      const word = 'TODAY';
      const i = Math.floor(t / 700);
      if (i >= word.length) { stopDemo(); demoNext = now + 4200; return; }
      const k = keyEls[word[i]], f = (t % 700) / 700;
      if (demo.key && demo.key !== k) demo.key.target = 0;
      demo.key = k;
      const press = f > .35 && f < .7;
      k.target = press ? 4 : 0;
      touch.style.transform = `translate(${k.cx - 11}px, ${k.cy - 11}px) scale(${press ? .8 : 1})`;
    } else if (demo.kind === 'back') {
      // a fingertip presses and holds the rewind key
      const k = keyEls.BACK; demo.key = k;
      let press = 1;
      if (t < 500) press = 1;
      else if (t < 1900) { press = .8; k.target = 5; }
      else if (t < 2300) { press = 1; k.target = 0; touch.style.opacity = 0; }
      else { stopDemo(); demoNext = now + 6000; setTimeout(() => keyTip.classList.remove('on'), 2500); return; }
      touch.style.transform = `translate(${k.cx - 11}px, ${k.cy - 11}px) scale(${press})`;
    } else if (demo.kind === 'lever') {
      // a fingertip pulls the lever a few notches, then lets the carriage spring back
      let press = 1;
      if (t < 400) { tiltTarget = 0; }
      else if (t < 600) { press = 1 - .2 * ease((t - 400) / 200); tiltTarget = 8; }
      else if (t < 1400) { press = .8; tiltTarget = 14; demoShiftT = Math.floor(4 * ease((t - 600) / 800)) * CW; }
      else if (t < 1800) { press = .8; tiltTarget = 0; touch.style.opacity = 0; demoShiftT = 0; }
      else { stopDemo(); demoNext = now + 3400; setTimeout(() => leverTip.classList.remove('on'), 2500); return; }
      const gx = carX + demoShift + GRIP_DX, gy = TOP + 187 + 27;
      touch.style.transform = `translate(${gx - 11}px, ${gy - 11}px) scale(${press})`;
    }
  }

  // ---------- per-frame ----------
  function update(now) {
    runDemo(now);

    // carriage
    if (mode === 'pull') {
      if (coast) {
        pullPos += coast.v; coast.v *= .955; pullVel = 0;
        const n = Math.min(steps, Math.floor(pullPos / CW));
        if (n !== notch) { notch = n; A.tick(1100 + n * 18, .04, .016); }
        pullTarget = pullPos;
        if (pullPos >= steps * CW) { pullPos = steps * CW; coast = null; finish(); }
        else if (coast.v < .7) { coast = null; springBack(); }
      } else {
        pullVel += (pullTarget - pullPos) * .35; pullVel *= .55; pullPos += pullVel;
      }
      carX = endX + pullPos;
      if (swipe && now - swipe.last > 170) endSwipe();   // the fingers have lifted
      if (!drag && !swipe && !coast && !finishing && Math.abs(pullPos) < .3 && Math.abs(pullVel) < .1) {
        mode = 'type'; carV = 0; carX = endX;   // sprang back: carry on typing this line
        marker.classList.remove('off');
        setTimeout(() => { if (mode === 'type' && leverReady && !drag && shown >= BELL_AT) gripPulse.classList.add('on'); }, 900);
      }
    } else {
      const target = C0 - shown * CW;   // a heavy spring with a small overshoot
      carV += (target - carX) * .16; carV *= .62; carX += carV;
    }
    demoShift += (demoShiftT - demoShift) * .3;
    carriage.style.transform = `translateX(${(carX + demoShift).toFixed(2)}px)`;

    // paper: rolls with the lever, exactly one line per return
    const base = -row * LINE_H;
    let paperTarget = base;
    if (mode === 'pull') paperTarget = finishing ? base - LINE_H : base - LINE_H * (steps > 0 ? Math.max(0, Math.min(1, pullPos / (steps * CW))) : 0);
    else if (mode === 'out') paperTarget = outTarget;
    else if (demoShift > .5) paperTarget = base - LINE_H * .15 * (demoShift / (4 * CW));
    paperV += (paperTarget - paperY) * .25; paperV *= .6; paperY += paperV;
    linesEl.style.transform = `translateY(${paperY.toFixed(2)}px)`;
    stripes.style.backgroundPosition = `0 ${(-paperY * 1.6).toFixed(1)}px`;

    tilt += (tiltTarget - tilt) * .25;
    lever.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
    notches.forEach((n, i) => n.setAttribute('fill', (mode === 'pull' && (i < notch || finishing)) ? '#3a3a3a' : '#b9b9b8'));

    keysEl.classList.toggle('locked', locked || mode !== 'type');
    drawGauge();

    // keys sink slowly and deeper the longer they are held
    for (const ch in keyEls) {
      const k = keyEls[ch];
      let tgt = k.target;
      for (const h of held.values()) if (h.k === k && !h.dead) tgt = Math.min(7, 4 + (now - h.t0) / 160);
      const speed = tgt > k.depth ? .12 : .08;
      k.depth += (tgt - k.depth) * speed;
      k.cap.style.transform = `translateY(${k.depth.toFixed(2)}px)`;
    }
    // letters darken while still held
    for (const h of held.values()) {
      if (h.node && h.landed && !h.node.classList.contains('fading')) {
        const s = Math.min(1, Math.max(0, (now - h.t0 - 95) / 380));
        h.node.style.opacity = (.5 + .5 * s).toFixed(2);
      }
    }
    // type bars swing with an accelerating ease
    for (const b of bars) {
      const up = b.target > b.ang;
      b.vel += (b.target - b.ang) * (up ? .09 : .05);
      b.vel *= up ? .78 : .7;
      b.ang += b.vel;
      if (up && b.ang > b.target) { b.ang = b.target; b.vel = 0; }
      b.el.style.transform = `rotate(${b.ang.toFixed(2)}deg)`;
    }
  }

  api.enter = (data) => {
    init(data || {});
    LP.say(INVITE, 500);
  };
  api.leave = () => { stopRewind(); stopDemo(); };
  api.update = update;
  // test hook
  api._state = () => ({ row, pos, shown, locked, mode, leverReady, rows: finishedRows.slice(), text: rowText.join('') });
  return api;
})();
