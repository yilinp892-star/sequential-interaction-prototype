// Shared sound, synthesized with Web Audio (no audio files). Quieter than the studies, for a calm feel.
window.LP = window.LP || {};
LP.audio = (() => {
  let ac = null, master = null, noise = null;
  let rubGain = null, rubBand = null, scratchGain = null, lastRub = 0, lastScratch = 0;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .7; master.connect(ac.destination);
      const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noise = b;
      // continuous rub (paper under the fingertip)
      const s1 = ac.createBufferSource(); s1.buffer = b; s1.loop = true;
      rubBand = ac.createBiquadFilter(); rubBand.type = 'bandpass'; rubBand.Q.value = .9;
      rubGain = ac.createGain(); rubGain.gain.value = 0;
      s1.connect(rubBand).connect(rubGain).connect(master); s1.start();
      // continuous nib scratch (signing)
      const s2 = ac.createBufferSource(); s2.buffer = b; s2.loop = true;
      const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 3200; f2.Q.value = .8;
      scratchGain = ac.createGain(); scratchGain.gain.value = 0;
      s2.connect(f2).connect(scratchGain).connect(master); s2.start(0, .7);
    } catch (e) { ac = null; }
  }

  function tick(freq = 1800, vol = .05, dur = .025) {
    if (!ac) return;
    try {
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur + .01);
    } catch (e) {}
  }
  function burst(type, freq, vol, dur, q = 1) {
    if (!ac) return;
    try {
      const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + .02);
    } catch (e) {}
  }
  const thunk = (vol = .5, freq = 700, dur = .07) => burst('lowpass', freq, vol, dur);
  const slide = (dur = .3, vol = .08) => burst('bandpass', 900, vol, dur, 1.2);
  function bell() {
    if (!ac) return;
    try {
      const t = ac.currentTime;
      [2093, 4186, 6280].forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime([.1, .035, .014][i], t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.8);
        o.connect(g).connect(master); o.start(t); o.stop(t + 1.9);
      });
    } catch (e) {}
  }
  function crackle(n = 6, spread = .25) {
    for (let i = 0; i < n; i++) setTimeout(() => burst('highpass', 2500 + Math.random() * 2500, .04 + Math.random() * .04, .015), Math.random() * spread * 1000);
  }
  function rub(freq, level) {
    if (!ac || !rubGain) return;
    const t = ac.currentTime;
    rubBand.frequency.setTargetAtTime(freq, t, .02);
    rubGain.gain.setTargetAtTime(level, t, .025);
    lastRub = performance.now();
  }
  function scratch(speed) {
    if (!ac || !scratchGain) return;
    scratchGain.gain.setTargetAtTime(Math.min(speed / 10, 1) * .045, ac.currentTime, .02);
    lastScratch = performance.now();
  }
  function quiet() {
    if (!ac) return;
    if (rubGain) rubGain.gain.setTargetAtTime(0, ac.currentTime, .05);
    if (scratchGain) scratchGain.gain.setTargetAtTime(0, ac.currentTime, .04);
  }
  // time running backwards: a breath of noise that swells and stops
  function rewind() {
    if (!ac) return;
    try {
      const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise; f.type = 'bandpass'; f.Q.value = 2;
      f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(2000, t + .22);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .2); g.gain.exponentialRampToValueAtTime(.0001, t + .27);
      s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + .3);
    } catch (e) {}
    setTimeout(() => tick(2600, .02, .02), 210);
  }
  // a wooden drawer sliding
  function drawer(closing) {
    burst('lowpass', closing ? 320 : 420, .1, closing ? 1.1 : .7, 1);
    burst('bandpass', 700, .025, closing ? 1 : .6, 3);
  }
  function update(now) {
    if (!ac) return;
    if (rubGain && now - lastRub > 70) rubGain.gain.setTargetAtTime(0, ac.currentTime, .04);
    if (scratchGain && now - lastScratch > 60) scratchGain.gain.setTargetAtTime(0, ac.currentTime, .04);
  }

  return { init, tick, burst, thunk, slide, bell, crackle, rub, scratch, quiet, rewind, drawer, update };
})();
