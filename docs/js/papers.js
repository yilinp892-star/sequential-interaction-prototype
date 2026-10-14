// The four papers (from studies/01-feed-the-paper), drawn in a 200×260 box.
window.LP = window.LP || {};
LP.paper = (() => {
  const TYPES = ['plain', 'lined', 'grid', 'translucent'];
  const RULES = [44, 64, 84, 104, 124, 144, 164, 184, 204, 224];

  // `id` keeps the grid pattern id unique when several sheets are on the page
  function inner(type, id = 'p') {
    switch (type) {
      case 'lined':
        return `<rect x="14" y="16" width="172" height="232" fill="#bdbdbd" rx="2"/><rect x="10" y="10" width="172" height="232" fill="#ececec" stroke="#8a8a8a" stroke-width="1.5" rx="2"/><g stroke="#b0b0b0" stroke-width="1">${RULES.map(y => `<line x1="22" y1="${y}" x2="170" y2="${y}"/>`).join('')}</g><line x1="36" y1="10" x2="36" y2="242" stroke="#9a9a9a" stroke-width="1"/>`;
      case 'grid':
        return `<defs><pattern id="g-${id}" width="14" height="14" patternUnits="userSpaceOnUse" x="10" y="10"><path d="M14 0H0V14" fill="none" stroke="#c4c4c4" stroke-width="0.8"/></pattern></defs><rect x="14" y="16" width="172" height="232" fill="#bdbdbd" rx="2"/><rect x="10" y="10" width="172" height="232" fill="#e6e6e6" rx="2"/><rect x="10" y="10" width="172" height="232" fill="url(#g-${id})" stroke="#8a8a8a" stroke-width="1.5" rx="2"/>`;
      case 'translucent':
        return `<rect x="14" y="16" width="172" height="232" fill="#d6d6d6" opacity="0.5" rx="2"/><rect x="10" y="10" width="172" height="232" fill="#ffffff" fill-opacity="0.55" stroke="#a6a6a6" stroke-width="1" rx="2"/><path d="M10 10 L182 10 L182 40 Q120 30 10 46 Z" fill="#ffffff" fill-opacity="0.5"/>`;
      default:
        return `<rect x="14" y="16" width="172" height="232" fill="#bdbdbd" rx="2"/><rect x="10" y="10" width="172" height="232" fill="#f4f4f4" stroke="#8a8a8a" stroke-width="1.5" rx="2"/>`;
    }
  }
  function sheetSVG(type, id) {
    return `<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">${inner(type, id)}</svg>`;
  }
  return { TYPES, inner, sheetSVG };
})();
