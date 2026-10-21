// The four papers (from studies/01-feed-the-paper), drawn in a 200×260 box.
// Colors, rules, borders, shadows and texture come from LP.look (see look.js). Sizes there are in
// typewriter-sheet pixels (the 310px-wide page in the typing scene); the small drawing scales them.
window.LP = window.LP || {};
LP.paper = (() => {
  const TYPES = ['plain', 'lined', 'grid', 'translucent'];
  const L = LP.look;
  const X = 10, Y = 10, W = 172, H = 232;

  // `id` keeps pattern and clip ids unique when several sheets are on the page
  function inner(type, id = 'p') {
    const p = L.paper(type);
    const rx = p.r;
    let out = `<rect x="${X + p.so}" y="${Y + p.so * 1.5}" width="${W}" height="${H}" fill="#000" fill-opacity="${p.sh}" rx="${rx}"/>`;
    out += `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="${p.base}" fill-opacity="${p.alpha}" rx="${rx}"/>`;
    if (type === 'lined') {
      const gap = L.get('lineGap') * 20 / 26, lw = L.get('lineW');
      let rules = '';
      for (let y = Y + L.get('lineGap') * 34 / 26; y < Y + H - 6; y += gap) rules += `<line x1="22" y1="${y.toFixed(2)}" x2="170" y2="${y.toFixed(2)}"/>`;
      const mx = X + L.get('marginX') * 26 / 19;
      out += `<g stroke="${L.get('lineColor')}" stroke-width="${lw}">${rules}</g><line x1="${mx}" y1="${Y}" x2="${mx}" y2="${Y + H}" stroke="${L.get('marginColor')}" stroke-width="1"/>`;
    } else if (type === 'grid') {
      const g = L.get('gridSize');
      out += `<defs><pattern id="g-${id}" width="${g}" height="${g}" patternUnits="userSpaceOnUse" x="${X}" y="${Y}"><path d="M${g} 0H0V${g}" fill="none" stroke="${L.get('gridColor')}" stroke-width="0.8"/></pattern></defs><rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="url(#g-${id})" rx="${rx}"/>`;
    } else if (type === 'translucent') {
      out += `<path d="M10 10 L182 10 L182 40 Q120 30 10 46 Z" fill="#ffffff" fill-opacity="0.5"/>`;
    }
    if (p.tex && p.texK > 0) {
      out += `<clipPath id="c-${id}"><rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="${rx}"/></clipPath><image href="${p.tex}" x="${X}" y="${Y}" width="${W}" height="${H}" preserveAspectRatio="none" opacity="${p.texK}" clip-path="url(#c-${id})"/>`;
    }
    if (p.bw > 0) out += `<rect x="${X}" y="${Y}" width="${W}" height="${H}" fill="none" stroke="${p.border}" stroke-width="${p.bw}" rx="${rx}"/>`;
    return out;
  }
  function sheetSVG(type, id) {
    return `<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">${inner(type, id)}</svg>`;
  }

  // the full-size sheet in the typewriter, styled with CSS backgrounds
  function styleFace(el, type) {
    const p = L.paper(type);
    const base = p.alpha < 1 ? L.rgba(p.base, p.alpha) : p.base;
    let img = 'none', size = '', rep = '';
    if (type === 'lined') {
      const gap = L.get('lineGap'), lw = L.get('lineW'), lc = L.get('lineColor'), m = L.get('marginX'), mc = L.get('marginColor');
      const at = Math.max(0, gap - 11);
      img = `linear-gradient(${base}, ${base}), ` +
        `linear-gradient(to right, transparent ${m}px, ${mc} ${m}px, ${mc} ${m + 1}px, transparent ${m + 1}px), ` +
        `repeating-linear-gradient(to bottom, transparent 0, transparent ${at}px, ${lc} ${at}px, ${lc} ${at + lw}px, transparent ${at + lw}px, transparent ${gap}px)`;
      size = '100% 36px, auto, auto'; rep = 'no-repeat, repeat, repeat';
    } else if (type === 'grid') {
      const g = L.get('gridSize'), gc = L.get('gridColor');
      img = `repeating-linear-gradient(to right, ${gc} 0, ${gc} 1px, transparent 1px, transparent ${g}px), ` +
        `repeating-linear-gradient(to bottom, ${gc} 0, ${gc} 1px, transparent 1px, transparent ${g}px)`;
    } else if (type === 'translucent') {
      img = 'linear-gradient(172deg, rgba(255,255,255,.65), rgba(255,255,255,0) 35%)';
    }
    Object.assign(el.style, {
      backgroundColor: base, backgroundImage: img, backgroundSize: size, backgroundRepeat: rep,
      border: p.bw > 0 ? `${p.bw}px solid ${p.border}` : 'none',
      borderRadius: p.r + 'px',
      boxShadow: `${(p.so * .75).toFixed(2)}px ${p.so}px 0 rgba(0,0,0,${(p.sh * .6).toFixed(3)})`
    });
    el.style.setProperty('--tex', p.tex ? `url("${p.tex}")` : 'none');
    el.style.setProperty('--tex-k', p.tex ? p.texK : 0);
  }

  return { TYPES, inner, sheetSVG, styleFace };
})();
