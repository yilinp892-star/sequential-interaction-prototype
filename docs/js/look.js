// Appearance: every visual setting of the prototype in one place, plus the floating panel that tunes them.
// DEFAULTS below are the saved defaults ("恢复默认" returns here). The scenes read values with LP.look.get(key)
// and re-render on the 'lp-look' event; plain colors and sizes reach the CSS as custom properties on :root.
window.LP = window.LP || {};
LP.look = (() => {
  // ---------- the settings ----------
  const PAPERS = [['plain', '白纸'], ['lined', '横线纸'], ['grid', '方格纸'], ['translucent', '半透明纸']];
  const TEXTURES = [['none', '无'], ['grain', '颗粒'], ['linen', '亚麻'], ['watercolor', '水彩纸'], ['stain', '旧纸污渍']];

  const c = (key, label, def) => ({ key, label, type: 'color', def });
  const n = (key, label, def, min, max, step, unit) => ({ key, label, type: 'range', def, min, max, step, unit });
  const s = (key, label, def, options) => ({ key, label, type: 'select', def, options });

  const paperGroup = (p, name) => {
    const base = { plain: '#f4f4f4', lined: '#ececec', grid: '#e6e6e6', translucent: '#ffffff' }[p];
    const t = p === 'translucent';
    const items = [c(p + 'Base', '底色', base)];
    if (t) items.push(n('transAlpha', '透明度', 55, 10, 100, 1, '%'));
    if (p === 'lined') items.push(
      c('lineColor', '横线颜色', '#b0b0b0'),
      n('lineW', '横线粗细', 1, .5, 4, .1, 'px'),
      n('lineGap', '横线行距', 26, 14, 44, 1, 'px'),
      c('marginColor', '左边竖线颜色', '#9a9a9a'),
      n('marginX', '左边竖线位置', 19, 0, 80, 1, 'px'));
    if (p === 'grid') items.push(
      c('gridColor', '方格颜色', '#c4c4c4'),
      n('gridSize', '格子大小', 14, 6, 40, 1, 'px'));
    items.push(
      c(p + 'Border', '边框颜色', t ? '#a6a6a6' : '#8a8a8a'),
      n(p + 'BorderW', '边框粗细', t ? 1 : 1.5, 0, 5, .1, 'px'),
      n(p + 'Radius', '圆角', 2, 0, 24, 1, 'px'),
      n(p + 'Shadow', '阴影深浅', t ? 6 : 17, 0, 60, 1, '%'),
      n(p + 'ShadowOff', '阴影偏移', 4, 0, 16, .5, 'px'),
      s(p + 'Texture', '纸张纹理', 'none', TEXTURES),
      n(p + 'TexK', '纹理强度', 40, 0, 100, 1, '%'));
    return { id: 'paper-' + p, title: name, items };
  };

  const GROUPS = [
    { id: 'atmo', title: '一、整体氛围', items: [
      c('bg', '背景颜色', '#e4e4e3'),
      c('guideColor', '引导文字颜色', '#555555'),
      n('guideSize', '引导文字字号', 21, 14, 32, 1, 'px'),
      c('hintColor', '提示小字颜色', '#666666'),
      c('glowColor', '纸面光晕颜色', '#ffffff'),
      n('glowK', '纸面光晕亮度', 100, 0, 250, 5, '%')] },
    { id: 'paper', title: '二、纸张', sub: PAPERS.map(([p, name]) => paperGroup(p, name)) },
    { id: 'machine', title: '三、打字机机身', items: [
      c('bodyColor', '机身主体颜色', '#5e5e5e'),
      c('platenColor', '滚筒颜色', '#3a3a3a'),
      n('stripeK', '滚筒条纹明显程度', 8, 0, 40, 1, '%'),
      c('leverColor', '换行拉杆颜色', '#3a3a3a'),
      c('barColor', '打字杆颜色', '#3c3c3c'),
      c('trackColor', '底部轨道和刻度颜色', '#9a9a9a')] },
    { id: 'keys', title: '四、按键', items: [
      c('keyColor', '按键颜色', '#2e2e2e'),
      c('keyEdge', '按键边缘颜色', '#151515'),
      c('keyLabel', '键帽字母颜色', '#bdbdbd'),
      n('keySize', '按键大小', 38, 28, 46, 1, 'px'),
      n('keyRadius', '按键圆角', 50, 0, 50, 1, '%'),
      n('keyDepth', '按下去的深度', 4, 0, 10, .5, 'px')] },
    { id: 'ink', title: '五、字和墨水', items: [
      c('typeColor', '字的颜色', '#1b1b1b'),
      n('typeSize', '字号', 18, 13, 24, .5, 'px'),
      n('typeTrack', '字间距', 0, -2, 3, .1, 'px'),
      n('typeLead', '行距', 26, 18, 40, 1, 'px'),
      n('inkUneven', '墨水浓淡不均', 0, 0, 100, 1, '%'),
      n('typeSkew', '字的轻微歪斜', 0, 0, 8, .1, '°'),
      c('sigColor', '签名笔迹颜色', '#161616'),
      n('sigWidth', '签名笔迹粗细', 4.2, 1, 10, .1, 'px')] },
    { id: 'keep', title: '六、折信和抽屉', items: [
      c('deskColor', '桌面颜色', '#e4e4e3'),
      c('drawerColor', '抽屉颜色', '#cfcfcf'),
      n('creaseK', '信纸折痕阴影深浅', 12, 0, 60, 1, '%')] }
  ];

  const ALL = [];
  const groupOf = {};
  GROUPS.forEach(g => (g.sub || [g]).forEach(sg => sg.items.forEach(it => {
    ALL.push(it); groupOf[it.key] = g.sub ? `${g.title} · ${sg.title}` : g.title;
  })));
  const DEFAULTS = Object.fromEntries(ALL.map(it => [it.key, it.def]));
  const META = Object.fromEntries(ALL.map(it => [it.key, it]));

  // ---------- presets (partial overrides on the defaults) ----------
  const allPapers = (o) => Object.fromEntries(PAPERS.flatMap(([p]) => Object.entries(o).map(([k, v]) => [p + k, typeof v === 'object' ? v[p] : v])));
  const PRESETS = [
    { id: 'original', name: '原版', values: {} },
    { id: 'morning', name: '清晨', values: {
      bg: '#f3ead8', guideColor: '#6b5a44', hintColor: '#8a7760', glowColor: '#fff4d6', glowK: 110,
      ...allPapers({ Base: { plain: '#ffffff', lined: '#fdfcf8', grid: '#fbfbf6', translucent: '#ffffff' }, Border: '#b9ad98', Shadow: { plain: 12, lined: 12, grid: 12, translucent: 5 } }),
      lineColor: '#a9c1dc', marginColor: '#d9a0a0', gridColor: '#c7d6e6',
      bodyColor: '#6b665f', platenColor: '#3b3835', leverColor: '#3b3835', barColor: '#47423c', trackColor: '#a49c90',
      keyColor: '#34312d', keyEdge: '#1c1a18', keyLabel: '#e6dccb',
      typeColor: '#1f3a6b', sigColor: '#1d3466',
      deskColor: '#efe4cf', drawerColor: '#d8c9ad' } },
    { id: 'night', name: '深夜', values: {
      bg: '#1d1f24', guideColor: '#cfc8b6', hintColor: '#9a9486', glowColor: '#ffd98a', glowK: 150,
      ...allPapers({ Base: { plain: '#f2e2b3', lined: '#efdcab', grid: '#ecd9a8', translucent: '#f6e6bb' }, Border: '#8c7a52', Shadow: { plain: 40, lined: 40, grid: 40, translucent: 20 }, ShadowOff: 6 }),
      transAlpha: 72, lineColor: '#c8b07a', marginColor: '#b98d5a', gridColor: '#cdb57f',
      bodyColor: '#2d3036', platenColor: '#17181b', stripeK: 6, leverColor: '#222428', barColor: '#2a2c31', trackColor: '#5b5f68',
      keyColor: '#1a1b1f', keyEdge: '#08090a', keyLabel: '#d8cfb8',
      typeColor: '#111111', sigColor: '#0e0e0e',
      deskColor: '#262a31', drawerColor: '#3a3f48', creaseK: 30 } },
    { id: 'oldletter', name: '旧信', values: {
      bg: '#b59b7c', guideColor: '#4a3626', hintColor: '#5e4733', glowColor: '#ffe7c2', glowK: 120,
      ...allPapers({ Base: { plain: '#ecdcb8', lined: '#e8d6ae', grid: '#e5d2a8', translucent: '#f1e2c0' }, Border: '#8a6f4c', Radius: 3, Shadow: { plain: 25, lined: 25, grid: 25, translucent: 12 },
        Texture: { plain: 'stain', lined: 'stain', grid: 'linen', translucent: 'grain' }, TexK: { plain: 60, lined: 55, grid: 45, translucent: 35 } }),
      transAlpha: 68, lineColor: '#b69a72', marginColor: '#a0705a', gridColor: '#bfa47c',
      bodyColor: '#5b4a3b', platenColor: '#2f251d', stripeK: 10, leverColor: '#3a2e24', barColor: '#463829', trackColor: '#8f7a62',
      keyColor: '#3a2e24', keyEdge: '#1e1711', keyLabel: '#e2cfaa',
      typeColor: '#4b3a2c', inkUneven: 55, typeSkew: 1.5, sigColor: '#5a4030',
      deskColor: '#a3865f', drawerColor: '#7a5c3e', creaseK: 28 } }
  ];

  // ---------- storage ----------
  const STORE = 'lp-look-v1', UI_STORE = 'lp-look-ui-v1';
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let values = { ...DEFAULTS };
  let activePreset = 'original';
  const saved = read(STORE);
  if (saved && saved.values) {
    for (const k in saved.values) if (k in DEFAULTS && typeof saved.values[k] === typeof DEFAULTS[k]) values[k] = saved.values[k];
    activePreset = saved.preset || null;
  }

  const get = k => values[k];

  // ---------- color helpers ----------
  function rgb(hex) {
    const h = hex.replace('#', '');
    const v = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
  }
  const toHex = a => '#' + a.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  // t > 0 mixes toward white, t < 0 toward black
  const shade = (hex, t) => toHex(rgb(hex).map(x => t >= 0 ? x + (255 - x) * t : x * (1 + t)));
  const rgba = (hex, a) => `rgba(${rgb(hex).join(',')},${a})`;

  // ---------- paper textures: one generated image per kind, stretched over the sheet ----------
  const texCache = {};
  function rand(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function texture(kind) {
    if (!kind || kind === 'none') return null;
    if (texCache[kind]) return texCache[kind];
    const W = 360, H = 486, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), r = rand(kind.length * 977 + 7);
    if (kind === 'grain') {
      const img = g.createImageData(W, H), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = r(), dark = v < .5;
        d[i] = d[i + 1] = d[i + 2] = dark ? 0 : 255;
        d[i + 3] = (dark ? .5 - v : v - .5) * 2 * 120;
      }
      g.putImageData(img, 0, 0);
    } else if (kind === 'linen') {
      for (let i = 0; i < 900; i++) {
        const y = r() * H, a = .03 + r() * .09;
        g.fillStyle = r() < .6 ? `rgba(60,50,40,${a})` : `rgba(255,255,255,${a * 1.5})`;
        g.fillRect(0, y, W, .6 + r() * 1.1);
      }
      for (let i = 0; i < 700; i++) {
        const x = r() * W, a = .025 + r() * .07;
        g.fillStyle = r() < .6 ? `rgba(60,50,40,${a})` : `rgba(255,255,255,${a * 1.5})`;
        g.fillRect(x, 0, .6 + r() * 1, H);
      }
      for (let i = 0; i < 260; i++) {     // slubs: short thick bits in the weave
        g.fillStyle = `rgba(70,60,45,${.06 + r() * .1})`;
        g.fillRect(r() * W, r() * H, 4 + r() * 14, 1 + r());
      }
    } else if (kind === 'watercolor') {
      for (let i = 0; i < 70; i++) {
        const x = r() * W, y = r() * H, rad = 30 + r() * 90, dark = r() < .55;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, dark ? `rgba(80,70,60,${.05 + r() * .08})` : `rgba(255,255,255,${.12 + r() * .15})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      for (let i = 0; i < 2600; i++) {    // the cold-press tooth: small pits with a lit rim
        const x = r() * W, y = r() * H, rad = .6 + r() * 1.8;
        g.fillStyle = `rgba(60,55,50,${.08 + r() * .14})`;
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(255,255,255,${.15 + r() * .2})`;
        g.beginPath(); g.arc(x - .6, y - .6, rad * .7, 0, Math.PI * 2); g.fill();
      }
    } else if (kind === 'stain') {
      const edge = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .65);
      edge.addColorStop(0, 'rgba(140,95,40,0)'); edge.addColorStop(1, 'rgba(120,75,25,.55)');
      g.fillStyle = edge; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {       // soft blotches
        const x = r() * W, y = r() * H, rad = 25 + r() * 70;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, `rgba(150,105,45,${.12 + r() * .16})`); gr.addColorStop(1, 'rgba(150,105,45,0)');
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      for (let i = 0; i < 2; i++) {       // a cup ring or two
        const x = W * (.25 + r() * .5), y = H * (.15 + r() * .7), rad = 34 + r() * 26;
        g.strokeStyle = `rgba(120,75,30,${.28 + r() * .15})`; g.lineWidth = 2 + r() * 3;
        g.beginPath(); g.arc(x, y, rad, r() * 2, r() * 2 + Math.PI * (1.4 + r() * .6)); g.stroke();
        g.strokeStyle = 'rgba(120,75,30,.1)'; g.lineWidth = 7;
        g.beginPath(); g.arc(x, y, rad - 3, 0, Math.PI * 2); g.stroke();
      }
      for (let i = 0; i < 90; i++) {      // foxing spots
        const x = r() * W, y = r() * H, rad = .6 + r() * 2.6;
        g.fillStyle = `rgba(130,80,30,${.2 + r() * .35})`;
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      }
      const img = g.getImageData(0, 0, W, H), d = img.data;   // a little fibre noise
      for (let i = 0; i < d.length; i += 4) { const v = (r() - .5) * 40; d[i + 3] = Math.max(0, Math.min(255, d[i + 3] + v)); if (!d[i]) { d[i] = 120; d[i + 1] = 80; d[i + 2] = 35; } }
      g.putImageData(img, 0, 0);
    }
    // a short blob: URL keeps re-rendered SVG small
    let url;
    try {
      const b64 = cv.toDataURL('image/png').split(',')[1], bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([u8], { type: 'image/png' }));
    } catch (e) { url = cv.toDataURL('image/png'); }
    return (texCache[kind] = url);
  }

  // the settings for one paper type, in one object
  function paper(type) {
    const v = k => values[type + k];
    return {
      base: v('Base'), border: v('Border'), bw: v('BorderW'), r: v('Radius'),
      sh: v('Shadow') / 100, so: v('ShadowOff'), tex: texture(v('Texture')), texK: v('TexK') / 100,
      alpha: type === 'translucent' ? values.transAlpha / 100 : 1
    };
  }

  // ---------- applying ----------
  const root = document.documentElement;
  function applyVars() {
    const V = values, set = (k, val) => root.style.setProperty(k, val);
    set('--bg', V.bg);
    set('--guide', V.guideColor); set('--guide-size', V.guideSize + 'px');
    set('--hint', V.hintColor);
    set('--glow', V.glowColor); set('--glow-k', V.glowK / 100);
    const body = V.bodyColor;
    set('--body', body); set('--body-knob', shade(body, .0994)); set('--body-knob-edge', shade(body, -.2766));
    set('--body-dark', shade(body, -.681)); set('--needle-tip', shade(body, -.5106));
    set('--platen', V.platenColor); set('--platen-hi', shade(V.platenColor, .1624));
    set('--stripe', V.stripeK / 100);
    const lv = V.leverColor;
    set('--lever', lv); set('--lever-grip', shade(lv, -.2759)); set('--lever-grip-edge', shade(lv, -.7069)); set('--lever-line', shade(lv, .2437));
    const bar = V.barColor;
    set('--bar', bar); set('--bar-stem', shade(bar, .318)); set('--bar-pivot', shade(bar, .1538));
    set('--bar-pivot-edge', shade(bar, -.15)); set('--bar-edge', shade(bar, -.5)); set('--bar-face', shade(bar, .2359)); set('--bar-dot', shade(bar, .7538));
    const tr = V.trackColor;
    set('--track', tr); set('--track-tick', shade(tr, -.2078)); set('--track-line', shade(tr, .4653));
    set('--track-notch', shade(tr, .3069)); set('--track-on', shade(tr, -.6234));
    set('--key', V.keyColor); set('--key-edge', V.keyEdge); set('--key-label', V.keyLabel);
    set('--key-ring', shade(V.keyColor, .0574)); set('--key-stem', shade(V.keyColor, .134));
    set('--ks', V.keySize + 'px'); set('--kr', V.keyRadius / 100);
    set('--type-ink', V.typeColor); set('--type-size', V.typeSize + 'px');
    set('--uneven', V.inkUneven / 100); set('--skew', V.typeSkew + 'deg');
    set('--desk', V.deskColor); set('--desk-slot', shade(V.deskColor, -.171));
    const dr = V.drawerColor;
    set('--drawer', dr); set('--drawer-edge', shade(dr, -.333)); set('--drawer-handle', shade(dr, -.4686));
    set('--drawer-in-a', shade(dr, -.816)); set('--drawer-in-b', shade(dr, -.657));
    set('--crease', V.creaseK / 100);
  }

  let pending = false;
  function changed() {
    applyVars();
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; window.dispatchEvent(new CustomEvent('lp-look')); });
  }
  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => write(STORE, { values, preset: activePreset }), 150);
  }

  function set(k, v) {
    if (!(k in DEFAULTS)) return;
    values[k] = v;
    activePreset = null;
    changed(); persist(); markPreset();
  }
  function setAll(v, preset) {
    values = { ...DEFAULTS, ...v };
    activePreset = preset || null;
    changed(); persist(); syncControls(); markPreset();
  }

  applyVars();

  // ---------- the panel ----------
  const ui = Object.assign({ collapsed: false, open: { atmo: true } }, read(UI_STORE) || {});
  const saveUI = () => write(UI_STORE, ui);
  const controls = {};
  const panel = document.createElement('aside');
  panel.id = 'lookPanel';
  panel.setAttribute('aria-label', '外观控制面板');
  const fmt = (v, it) => {
    const d = (String(it.step).split('.')[1] || '').length;
    return (+v).toFixed(d);
  };

  function row(it) {
    const id = 'lk-' + it.key;
    const el = document.createElement('div');
    el.className = 'lk-row lk-' + it.type;
    if (it.type === 'color') {
      el.innerHTML = `<label for="${id}-hex">${it.label}</label>
        <div class="lk-pick"><input type="color" id="${id}" aria-label="${it.label}"><input type="text" id="${id}-hex" class="lk-hex" maxlength="7" spellcheck="false" autocomplete="off"></div>`;
      const pick = el.querySelector('input[type=color]'), hex = el.querySelector('.lk-hex');
      pick.addEventListener('input', () => { hex.value = pick.value; hex.classList.remove('bad'); set(it.key, pick.value); });
      hex.addEventListener('input', () => {
        let v = hex.value.trim(); if (v && v[0] !== '#') v = '#' + v;
        const ok = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
        hex.classList.toggle('bad', !ok);
        if (ok) { const full = toHex(rgb(v)); pick.value = full; set(it.key, full); }
      });
      hex.addEventListener('blur', () => { hex.value = values[it.key]; hex.classList.remove('bad'); });
      hex.addEventListener('keydown', e => { if (e.key === 'Enter') hex.blur(); });
      controls[it.key] = () => { pick.value = values[it.key]; hex.value = values[it.key]; };
    } else if (it.type === 'range') {
      el.innerHTML = `<div class="lk-top"><label for="${id}">${it.label}</label><output for="${id}"></output></div>
        <input type="range" id="${id}" min="${it.min}" max="${it.max}" step="${it.step}">
        <div class="lk-scale"><span>${it.min}${it.unit}</span><span>${it.max}${it.unit}</span></div>`;
      const r = el.querySelector('input'), out = el.querySelector('output');
      r.addEventListener('input', () => { out.textContent = fmt(r.value, it) + ' ' + it.unit; set(it.key, +r.value); });
      controls[it.key] = () => { r.value = values[it.key]; out.textContent = fmt(values[it.key], it) + ' ' + it.unit; };
    } else {
      el.innerHTML = `<label for="${id}">${it.label}</label><select id="${id}">${it.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
      const sel = el.querySelector('select');
      sel.addEventListener('change', () => set(it.key, sel.value));
      controls[it.key] = () => { sel.value = values[it.key]; };
    }
    return el;
  }
  function section(g, nested) {
    const d = document.createElement('details');
    d.className = nested ? 'lk-sub' : 'lk-group';
    d.open = !!ui.open[g.id];
    d.innerHTML = `<summary>${g.title}</summary>`;
    const body = document.createElement('div'); body.className = 'lk-body';
    if (g.sub) g.sub.forEach(sg => body.appendChild(section(sg, true)));
    else g.items.forEach(it => body.appendChild(row(it)));
    d.appendChild(body);
    d.addEventListener('toggle', () => { ui.open[g.id] = d.open; saveUI(); });
    return d;
  }

  panel.innerHTML = `
    <button type="button" class="lk-tab" aria-expanded="true" aria-controls="lkSheet">外观</button>
    <div class="lk-sheet" id="lkSheet">
      <header class="lk-head"><h2>外观</h2><button type="button" class="lk-close" aria-label="收起面板">收起</button></header>
      <div class="lk-presets" role="group" aria-label="一键预设"></div>
      <div class="lk-scroll"></div>
      <footer class="lk-foot">
        <button type="button" class="lk-reset">恢复默认</button>
        <button type="button" class="lk-copy">复制设置</button>
      </footer>
      <div class="lk-toast" role="status" aria-live="polite"></div>
      <textarea class="lk-fallback" readonly hidden aria-label="设置文本"></textarea>
    </div>`;
  const presetsEl = panel.querySelector('.lk-presets');
  PRESETS.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = p.name; b.dataset.id = p.id;
    b.addEventListener('click', () => setAll(p.values, p.id));
    presetsEl.appendChild(b);
  });
  const scroll = panel.querySelector('.lk-scroll');
  GROUPS.forEach(g => scroll.appendChild(section(g)));

  function markPreset() {
    presetsEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === activePreset)));
  }
  function syncControls() { for (const k in controls) controls[k](); }

  const toast = panel.querySelector('.lk-toast');
  let toastT = null;
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2200); }

  panel.querySelector('.lk-reset').addEventListener('click', () => { setAll({}, 'original'); say('已恢复默认值'); });

  function settingsText() {
    const lines = ['外观设置 · A Page for Yourself', ''];
    let last = null;
    for (const it of ALL) {
      if (groupOf[it.key] !== last) { if (last) lines.push(''); last = groupOf[it.key]; lines.push(`【${last}】`); }
      let v = values[it.key];
      if (it.type === 'range') v = fmt(v, it) + ' ' + it.unit;
      if (it.type === 'select') v = `${(it.options.find(o => o[0] === v) || [, v])[1]} (${v})`;
      lines.push(`${it.label} (${it.key}): ${v}`);
    }
    lines.push('', '把这些数值设为原型保存的默认值。保留面板代码以便以后调整。提交并推送改动。');
    return lines.join('\n');
  }
  const fallback = panel.querySelector('.lk-fallback');
  panel.querySelector('.lk-copy').addEventListener('click', () => {
    const text = settingsText();
    const manual = () => { fallback.hidden = false; fallback.value = text; fallback.focus(); fallback.select(); say('无法自动复制，已选中文本，请按 Ctrl/⌘+C'); };
    fallback.hidden = true;
    try {
      navigator.clipboard.writeText(text).then(() => say('已复制所有设置'), manual);
    } catch (e) { manual(); }
  });

  const tab = panel.querySelector('.lk-tab');
  function setCollapsed(v) {
    ui.collapsed = v; saveUI();
    panel.classList.toggle('collapsed', v);
    tab.setAttribute('aria-expanded', String(!v));
    if (LP.refit) LP.refit();
  }
  tab.addEventListener('click', () => setCollapsed(false));
  panel.querySelector('.lk-close').addEventListener('click', () => setCollapsed(true));

  // after a click or drag on a slider, button or picker, hand the keyboard back to the typewriter
  panel.addEventListener('pointerup', () => setTimeout(() => {
    const a = document.activeElement;
    if (a && panel.contains(a) && !isTextField(a)) a.blur();
  }, 0));
  panel.addEventListener('change', e => { if (!isTextField(e.target)) setTimeout(() => e.target.blur(), 0); });

  function isTextField(el) {
    return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'text'));
  }
  // true when a key or pointer event belongs to the panel and should not reach the prototype
  const ownsKey = e => isTextField(e.target) && panel.contains(e.target);
  const owns = e => !!(e.target && e.target.nodeType === 1 && panel.contains(e.target));

  // space the stage keeps clear for the panel: beside it on wide screens, below it on narrow ones
  function reserve() {
    if (ui.collapsed) return { left: 0, bottom: 0 };
    if (window.innerWidth >= 760) return { left: panel.querySelector('.lk-sheet').offsetWidth + 16, bottom: 0 };
    return { left: 0, bottom: panel.querySelector('.lk-sheet').offsetHeight };
  }

  document.body.appendChild(panel);
  panel.classList.toggle('collapsed', !!ui.collapsed);
  tab.setAttribute('aria-expanded', String(!ui.collapsed));
  syncControls(); markPreset();

  return { get, set, paper, shade, rgba, texture, reserve, owns, ownsKey, DEFAULTS, PRESETS, settingsText };
})();
