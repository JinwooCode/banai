// BanAI logo: a "B" built like a wardrobe (with an AI sparkle) plus a bold wordmark.
// Built as inline SVG so it needs no image file and scales crisply (CSP: no external assets).
const SVG_NS = 'http://www.w3.org/2000/svg';
let instance = 0;

function svg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, String(value)));
  node.append(...children);
  return node;
}

/**
 * The mark: a "B" drawn as a wardrobe seen from the front. The stem is the side panel, the two
 * bowls are a small upper cabinet and a larger lower one, each with a shelf and a pull, and the AI
 * sparkle sits on the corner. Parts carry classes so the landing page can animate them.
 */
export function createLogoMark({ size = 36 } = {}) {
  instance += 1;
  const gradientId = `logo-grad-${instance}`;
  const cream = '#fff8f2';
  const ink = '#7d3010';
  const mark = svg('svg', { viewBox: '0 0 40 40', width: size, height: size, role: 'img', 'aria-label': 'BanAI', class: 'logo__mark' }, [
    svg('defs', {}, [
      svg('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 1, y2: 1 }, [
        svg('stop', { offset: '0%', 'stop-color': '#ee8a54' }),
        svg('stop', { offset: '55%', 'stop-color': '#b4532a' }),
        svg('stop', { offset: '100%', 'stop-color': '#7a2e0e' }),
      ]),
    ]),
    svg('rect', { x: 1, y: 1, width: 38, height: 38, rx: 11, fill: `url(#${gradientId})`, class: 'logo__tile' }),
    svg('g', { class: 'logo__b' }, [
      svg('rect', { x: 9, y: 8, width: 5, height: 25, rx: 1.6, fill: cream, class: 'logo__stem' }),
      svg('rect', { x: 11.5, y: 8, width: 15.5, height: 11.4, rx: 5.2, fill: cream, class: 'logo__bowl logo__bowl--top' }),
      svg('rect', { x: 11.5, y: 20.6, width: 18.5, height: 12.4, rx: 5.8, fill: cream, class: 'logo__bowl logo__bowl--bottom' }),
    ]),
    // Shelves and pulls: the "wardrobe" read of the B.
    svg('rect', { x: 15, y: 13.1, width: 8.5, height: 1.3, rx: 0.65, fill: ink, opacity: 0.55, class: 'logo__shelf' }),
    svg('rect', { x: 15, y: 26.2, width: 11, height: 1.3, rx: 0.65, fill: ink, opacity: 0.55, class: 'logo__shelf' }),
    svg('circle', { cx: 23.6, cy: 16.6, r: 1, fill: ink, class: 'logo__pull' }),
    svg('circle', { cx: 26.2, cy: 29.6, r: 1, fill: ink, class: 'logo__pull' }),
    // AI sparkle, overlapping the top-right corner
    svg('path', { d: 'M33 1.5l1.7 4.3 4.3 1.7-4.3 1.7L33 13.5l-1.7-4.3-4.3-1.7 4.3-1.7z', fill: '#ffe1cf', stroke: '#b4532a', 'stroke-width': 1, 'stroke-linejoin': 'round', class: 'logo__spark' }),
  ]);
  return mark;
}

/** Mark + wordmark. `tagline` is optional secondary text next to the wordmark. */
export function createLogo({ size = 36, tagline = '' } = {}) {
  const word = document.createElement('span');
  word.className = 'logo__word';
  const ban = document.createTextNode('Ban');
  const ai = document.createElement('span');
  ai.className = 'logo__ai';
  ai.textContent = 'AI';
  word.append(ban, ai);
  const root = document.createElement('span');
  root.className = 'logo';
  root.append(createLogoMark({ size }), word);
  if (tagline) {
    const note = document.createElement('span');
    note.className = 'logo__tagline';
    note.textContent = tagline;
    root.append(note);
  }
  return root;
}
