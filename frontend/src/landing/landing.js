// The opening page (shown once per browser session, never for a private design link): a hero with
// a wardrobe that builds itself, the logo and slogan, "how it works" and the ready-made examples.
// "בואו נעצב" (or a template card) closes it and opens the start screen. Hebrew by default.
import { el } from '../editor/fields.js';
import { applyOps } from '../domain/apply.js';
import { PRESETS, buildPreset } from '../domain/presets.js';
import { createLogo } from '../ui/logo.js';
import { createAssembly } from './assembly.js';
import { elevation } from './elevation.js';

export const LANDING_KEY = 'banai.landing.v1';
// The hero wardrobe: the basic template with warm oak doors, so it stands out on the light page.
const heroDesign = (catalog) => applyOps(buildPreset('basic', catalog), [
  { op: 'set_material', target: 'doors', color: { catalogId: 'natural_oak' }, finish: { catalogId: 'satin' } },
], catalog);

export const LANDING_STRINGS = Object.freeze({
  he: Object.freeze({
    eyebrow: 'מעצב ארונות עם בינה מלאכותית',
    slogan: ['סוף סוף מישהו ש', 'מסדר לך', ' את הארון.'],
    lead: 'מספרים מה צריך, רואים את הארון נבנה בתלת־ממד, ומקבלים תוכנית מסודרת לנגר. בלי סקיצות על מפית.',
    start: 'בואו נעצב',
    how: 'איך זה עובד',
    howTitle: 'שלושה צעדים לארון שלך',
    steps: Object.freeze([
      ['מספרים למעצב', 'בכתב או בקול: "ארון זוגי עם הרבה מגירות". ה־AI מציע, ואתם מאשרים.'],
      ['רואים בתלת־ממד', 'מסובבים, פותחים, משנים מידות וצבעים. כל שינוי מופיע מיד.'],
      ['מקבלים תוכנית לנגר', 'קישור פרטי לעיצוב ומסמך שמסביר לנגר מה רציתם.'],
    ]),
    building: Object.freeze({
      carcass: 'בונה את הגוף…',
      partition: (n) => `${n} מחיצות במקום`,
      shelf: (n) => `מוסיף ${n} מדפים`,
      drawer: (n) => `${n} מגירות`,
      rail: () => 'מוט תלייה',
      door: () => 'דלתות אלון',
    }),
    built: 'הארון מוכן',
    peek: 'הציצו פנימה',
    close: 'סגרו דלתות',
    swatches: 'צבע הדלתות',
    colours: Object.freeze({ natural_oak: 'אלון', walnut: 'אגוז', white: 'לבן', anthracite: 'אנתרציט' }),
    features: Object.freeze(['דלתות הזזה', 'מגירות', 'מוטות תלייה', 'אלון ואגוז', 'ציר שמאל או ימין', 'מידות במילימטר', 'שיחה בקול', 'קישור פרטי', 'מסמך לנגר', 'עברית ואנגלית']),
    examplesTitle: 'או מתחילים מארון מוכן',
    open: 'פתחו',
    replay: 'בנו שוב',
    footnote: 'העיצובים הם הדמיה להמחשה, ואינם שרטוטי ייצור.',
    a11y: 'הצהרת נגישות',
  }),
  en: Object.freeze({
    eyebrow: 'AI wardrobe designer',
    slogan: ['Finally, someone who ', 'sorts out', ' your wardrobe.'],
    lead: 'Say what you need, watch it build in 3D, and get a clear plan for your carpenter. No more sketches on a napkin.',
    start: "Let's design",
    how: 'How it works',
    howTitle: 'Three steps to your wardrobe',
    steps: Object.freeze([
      ['Tell the designer', 'Type or say it: "a double wardrobe with lots of drawers". The AI proposes, you confirm.'],
      ['See it in 3D', 'Turn it, open it, change sizes and colours. Every change shows at once.'],
      ['Get a carpenter plan', 'A private link to the design and a document that explains what you want.'],
    ]),
    building: Object.freeze({
      carcass: 'Building the carcass…',
      partition: (n) => `${n} partitions in place`,
      shelf: (n) => `Adding ${n} shelves`,
      drawer: (n) => `${n} drawers`,
      rail: () => 'Hanging rail',
      door: () => 'Oak doors',
    }),
    built: 'Wardrobe ready',
    peek: 'Peek inside',
    close: 'Close the doors',
    swatches: 'Door colour',
    colours: Object.freeze({ natural_oak: 'Oak', walnut: 'Walnut', white: 'White', anthracite: 'Anthracite' }),
    features: Object.freeze(['Sliding doors', 'Drawers', 'Hanging rails', 'Oak and walnut', 'Left or right hinges', 'Millimetre sizes', 'Voice chat', 'Private link', 'Carpenter document', 'Hebrew and English']),
    examplesTitle: 'Or start from a ready-made wardrobe',
    open: 'Open',
    replay: 'Build it again',
    footnote: 'Designs are illustrative previews and are not manufacturing drawings.',
    a11y: 'Accessibility statement',
  }),
});

export function landingSeen(storage = globalThis.sessionStorage) {
  try {
    return storage?.getItem(LANDING_KEY) === 'seen';
  } catch {
    return false;
  }
}

function markSeen(storage) {
  try {
    storage?.setItem(LANDING_KEY, 'seen');
  } catch {
    // not remembered: it shows again on reload, which is harmless
  }
}

/**
 * Blueprint-style measurement lines over the hero wardrobe (width along the top, height up the
 * side). They draw themselves once the build lands and track the wardrobe as the camera moves.
 */
function dimensionOverlay() {
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const svg = make('svg', { class: 'landing__dims', 'aria-hidden': 'true' });
  const lines = { w: make('line', { class: 'landing__dim-line' }), h: make('line', { class: 'landing__dim-line' }) };
  const ticks = [0, 1, 2, 3].map(() => make('line', { class: 'landing__dim-tick' }));
  svg.append(lines.w, lines.h, ...ticks);
  const labels = { w: el('span', { className: 'landing__dim-label' }), h: el('span', { className: 'landing__dim-label' }) };
  const element = el('div', { className: 'landing__dims-layer' }, [svg, labels.w, labels.h]);
  let design = null;

  const set = (node, a, b) => {
    node.setAttribute('x1', a.x); node.setAttribute('y1', a.y);
    node.setAttribute('x2', b.x); node.setAttribute('y2', b.y);
  };
  const tick = (node, at, dx, dy) => set(node, { x: at.x - dx, y: at.y - dy }, { x: at.x + dx, y: at.y + dy });

  return {
    element,
    show(next) {
      design = next;
      labels.w.textContent = `W ${next.dimensions.width / 10} cm`;
      labels.h.textContent = `H ${next.dimensions.height / 10} cm`;
      element.classList.add('landing__dims-layer--on');
    },
    hide() {
      element.classList.remove('landing__dims-layer--on');
    },
    place(project) {
      if (!design) return;
      const { width, height } = design.dimensions;
      const gap = 90; // mm in front of / above the wardrobe
      const topLeft = project(0, height + gap);
      const topRight = project(width, height + gap);
      const bottomLeft = project(-gap, 0);
      const upLeft = project(-gap, height);
      set(lines.w, topLeft, topRight);
      set(lines.h, bottomLeft, upLeft);
      tick(ticks[0], topLeft, 0, 7);
      tick(ticks[1], topRight, 0, 7);
      tick(ticks[2], bottomLeft, 7, 0);
      tick(ticks[3], upLeft, 7, 0);
      Object.assign(labels.w.style, { left: `${(topLeft.x + topRight.x) / 2}px`, top: `${(topLeft.y + topRight.y) / 2}px` });
      Object.assign(labels.h.style, { left: `${(bottomLeft.x + upLeft.x) / 2}px`, top: `${(bottomLeft.y + upLeft.y) / 2}px` });
    },
  };
}

/**
 * The slogan as words that rise in one by one; the pun ("מסדר לך") gets a moving gradient and a
 * hand-drawn underline. A prefix glued to the pun (Hebrew "ש") stays in the same word.
 */
function sloganNodes([before, pun, after]) {
  const NS = 'http://www.w3.org/2000/svg';
  const swoosh = document.createElementNS(NS, 'svg');
  swoosh.setAttribute('viewBox', '0 0 200 24');
  swoosh.setAttribute('preserveAspectRatio', 'none');
  swoosh.setAttribute('class', 'landing__swoosh');
  swoosh.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M4 16 C 46 4, 120 2, 196 13 M30 21 C 80 14, 140 13, 176 18');
  path.setAttribute('pathLength', '1');
  swoosh.append(path);

  const leading = before.split(' ');
  const glued = leading.pop(); // '' when the text before the pun ends with a space
  const words = leading.filter(Boolean).map((text) => el('span', { className: 'landing__word', text }));
  words.push(el('span', { className: 'landing__word' }, [
    document.createTextNode(glued),
    el('span', { className: 'landing__mark' }, [el('span', { className: 'landing__mark-text', text: pun }), swoosh]),
  ]));
  after.trim().split(' ').forEach((text) => words.push(el('span', { className: 'landing__word', text })));
  return words.flatMap((word, i) => {
    word.style.setProperty('--i', String(i));
    return i < words.length - 1 ? [word, document.createTextNode(' ')] : [word];
  });
}

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Mount the landing page. `onStart(presetId | null)` runs after it closes: null from the main
 * button, a template id from a card.
 */
export function mountLanding({ catalog, getLanguage = () => 'he', onStart, storage = globalThis.sessionStorage }) {
  const language = getLanguage();
  const s = LANDING_STRINGS[language] ?? LANDING_STRINGS.he;
  let assembly = null;

  let closing = false;
  const close = (presetId) => {
    if (closing) return;
    closing = true;
    markSeen(storage);
    observer?.disconnect();
    const done = () => {
      assembly?.dispose();
      root.remove();
      behind.forEach((node) => { node.inert = false; });
      document.body.classList.remove('has-landing');
      onStart(presetId);
    };
    if (reducedMotion()) {
      done();
      return;
    }
    // The way in: the wardrobe's stage grows from where it stands to fill the screen while the
    // rest of the page fades, then the whole layer dissolves into the start screen.
    // The stage scales in place (the live canvas never moves, so it keeps rendering).
    const visual = root.querySelector('.landing__visual');
    const box = visual.getBoundingClientRect();
    const grow = Math.max(window.innerWidth / box.width, window.innerHeight / box.height) * 1.08;
    const dx = window.innerWidth / 2 - (box.left + box.width / 2);
    const dy = window.innerHeight / 2 - (box.top + box.height / 2);
    root.classList.add('landing--zooming');
    visual.style.setProperty('--fly', `translate(${dx}px, ${dy}px) scale(${grow})`);
    setTimeout(() => root.classList.add('landing--leaving'), 620);
    setTimeout(done, 1000);
  };

  const cta = (text, onClick, className, testId) => {
    const node = el('button', { className: `btn ${className}`, text, attrs: { type: 'button' } });
    node.dataset.testid = testId;
    node.addEventListener('click', onClick);
    return node;
  };

  // Hero
  const stage = el('div', { className: 'landing__stage' });
  const chips = el('ol', { className: 'landing__chips', attrs: { 'aria-hidden': 'true' } });
  const dims = dimensionOverlay();
  const replay = cta(s.replay, () => {
    chips.replaceChildren();
    dims.hide();
    assembly?.replay();
    peek.textContent = s.peek;
    peek.setAttribute('aria-pressed', 'false');
  }, 'btn--ghost', 'landing-replay');
  const peek = cta(s.peek, () => {
    const open = !assembly?.doorsOpen();
    assembly?.setDoorsOpen(open);
    peek.textContent = open ? s.close : s.peek;
    peek.setAttribute('aria-pressed', String(open));
  }, 'btn--tonal', 'landing-peek');
  peek.setAttribute('aria-pressed', 'false');
  // Door colour swatches: recolour the hero wardrobe live (catalog colours only).
  const swatches = el('div', { className: 'landing__swatches', attrs: { role: 'group', 'aria-label': s.swatches } },
    Object.entries(s.colours).map(([id, name], i) => {
      const hex = catalog.colors.find((colour) => colour.id === id)?.hex ?? '#cccccc';
      const swatch = el('button', { className: 'landing__swatch', attrs: { type: 'button', 'aria-label': name, title: name, 'aria-pressed': String(i === 0) } });
      swatch.style.setProperty('--swatch', hex);
      swatch.dataset.testid = `landing-swatch-${id}`;
      swatch.addEventListener('click', () => {
        assembly?.setDoorColour(hex);
        swatches.querySelectorAll('button').forEach((node) => node.setAttribute('aria-pressed', String(node === swatch)));
      });
      return swatch;
    }));
  const controls = el('div', { className: 'landing__controls' }, [swatches, peek, replay]);
  const glow = el('div', { className: 'landing__glow', attrs: { 'aria-hidden': 'true' } });
  const hero = el('section', { className: 'landing__hero' }, [
    glow,
    el('div', { className: 'landing__copy' }, [
      el('p', { className: 'landing__eyebrow', text: s.eyebrow }),
      // The words are styled pieces; the label keeps the sentence whole for screen readers.
      el('h1', { className: 'landing__slogan', attrs: { id: 'landing-title', 'aria-label': s.slogan.join('') } }, sloganNodes(s.slogan)),
      el('p', { className: 'landing__lead', text: s.lead }),
      el('div', { className: 'landing__ctas' }, [
        cta(s.start, () => close(null), 'btn--primary landing__start', 'landing-start'),
        cta(s.how, () => how.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }), 'btn--tonal', 'landing-how'),
      ]),
    ]),
    el('div', { className: 'landing__visual' }, [el('div', { className: 'landing__blueprint', attrs: { 'aria-hidden': 'true' } }), stage, dims.element, chips, controls]),
  ]);

  // A band of what the designer can do, scrolling sideways (duplicated for a seamless loop).
  const band = el('div', { className: 'landing__band', attrs: { 'aria-hidden': 'true' } }, [
    el('div', { className: 'landing__band-track' }, [...s.features, ...s.features].map((text) => el('span', { className: 'landing__band-item', text }))),
  ]);

  // How it works
  const how = el('section', { className: 'landing__section landing__how', attrs: { 'aria-labelledby': 'landing-how-title' } }, [
    el('h2', { className: 'landing__h2', text: s.howTitle, attrs: { id: 'landing-how-title' } }),
    el('ol', { className: 'landing__steps' }, s.steps.map(([title, body], i) => el('li', { className: 'landing__step reveal' }, [
      el('span', { className: 'landing__num', text: String(i + 1), attrs: { 'aria-hidden': 'true' } }),
      el('h3', { className: 'landing__step-title', text: title }),
      el('p', { className: 'landing__step-text', text: body }),
    ]))),
  ]);

  // Ready-made examples, each drawn from its own design.
  const cards = PRESETS.map((preset) => {
    const open = cta(s.open, () => close(preset.id), 'btn--tonal', `landing-preset-${preset.id}`);
    open.setAttribute('aria-label', `${s.open}: ${preset.title[language] ?? preset.title.he}`);
    return el('li', { className: 'landing__card reveal' }, [
      el('div', { className: 'landing__drawing' }, [elevation(buildPreset(preset.id, catalog), catalog)]),
      el('h3', { className: 'landing__card-title', text: preset.title[language] ?? preset.title.he }),
      el('p', { className: 'landing__card-size', text: `${preset.size} ${language === 'en' ? 'cm' : 'ס"מ'}`, attrs: { dir: 'ltr' } }),
      open,
    ]);
  });
  const examples = el('section', { className: 'landing__section', attrs: { 'aria-labelledby': 'landing-examples-title' } }, [
    el('h2', { className: 'landing__h2', text: s.examplesTitle, attrs: { id: 'landing-examples-title' } }),
    el('ul', { className: 'landing__cards' }, cards),
  ]);

  const footer = el('div', { className: 'landing__footer' }, [
    el('p', { text: s.footnote }),
    el('a', { text: s.a11y, attrs: { href: '/accessibility.html', lang: 'he' } }),
  ]);

  const bar = el('div', { className: 'landing__bar' }, [
    createLogo({ size: 40 }),
    cta(s.start, () => close(null), 'btn--primary', 'landing-start-bar'),
  ]);

  const root = el('div', { className: 'landing', attrs: { lang: language, dir: language === 'he' ? 'rtl' : 'ltr', role: 'region', 'aria-labelledby': 'landing-title' } }, [
    bar, hero, band, how, examples, footer,
  ]);
  root.dataset.testid = 'landing';
  // The app behind stays out of reach (mouse, keyboard, screen readers) until the page closes.
  const behind = [...document.body.children];
  behind.forEach((node) => { node.inert = true; });
  document.body.append(root);
  document.body.classList.add('has-landing');

  // Sections fade up as they scroll into view.
  const observer = 'IntersectionObserver' in globalThis
    ? new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('reveal--in');
    }), { root, threshold: 0.2 })
    : null;
  root.querySelectorAll('.reveal').forEach((node, i) => {
    node.style.setProperty('--reveal-delay', `${(i % 3) * 90}ms`);
    if (observer) observer.observe(node);
    else node.classList.add('reveal--in');
  });

  const design = heroDesign(catalog);
  const counts = {
    partition: design.partitions.length,
    shelf: design.compartments.reduce((n, c) => n + c.shelves.length, 0),
    drawer: design.compartments.reduce((n, c) => n + c.drawers.length, 0),
  };
  const say = (text, done = false) => {
    const chip = el('li', { className: `landing__chip${done ? ' landing__chip--done' : ''}`, text });
    chips.append(chip);
    while (chips.children.length > 4) chips.firstElementChild.remove();
  };
  try {
    assembly = createAssembly(stage, design, catalog, {
      reducedMotion: reducedMotion(),
      onPhase: (kind) => {
        const line = s.building[kind];
        if (typeof line === 'string') say(line);
        else if (line && (counts[kind] ?? 1) > 0) say(line(counts[kind]));
      },
      onBuilt: () => {
        say(s.built, true);
        dims.show(design);
      },
      onFrame: (project) => dims.place(project),
    });
    // The whole hero steers the wardrobe, measured around the wardrobe's own centre.
    hero.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return; // touch scrolls the page instead
      const area = hero.getBoundingClientRect();
      glow.style.setProperty('--mx', `${event.clientX - area.left}px`);
      glow.style.setProperty('--my', `${event.clientY - area.top}px`);
      glow.classList.add('landing__glow--on');
      const box = stage.getBoundingClientRect();
      const x = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const y = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
      assembly.setPointer(x, y);
    });
    hero.addEventListener('pointerleave', () => {
      assembly.releasePointer();
      glow.classList.remove('landing__glow--on');
    });
  } catch {
    stage.classList.add('landing__stage--static'); // no WebGL: the copy and the cards still work
    controls.hidden = true;
  }
  root.querySelector('[data-testid="landing-start"]').focus({ preventScroll: true });

  return { element: root, close: () => close(null) };
}
