/* measure.js — one way to type and show measurements across the calculators.
 *
 * Mark a box with data-measure and it reads any of these:
 *   data-measure="length"  inches by default:  5 | 5.5 | .5 | 5 1/2 | 5-1/2 | 11/16 | 5½
 *                          feet and inches:    1' | 1'5 1/2" | 1' 5-1/2 | 2 ft | 2'-6"
 *                          feet-inches-16ths:  7-5-8  (= 7' 5 8/16")    feet-inches: 7-5
 *   data-measure="pitch"   rise per 12:        4 | 4.5 | 4 1/2 | 4½ | 4/12 | 4:12
 *   data-measure="number"  a plain number:     4 | 4.5 | 4 1/2 | 9/16 | 4½
 *
 * Each box gets an "= …" note showing what was read, and turns red when it can't be
 * read. Phones get the number pad plus a row of keys for ' " / space and -
 * (?keys=inline for chunky keys under the box, ?keys=off for the normal keyboard). Results can be shown in the style the user typed: inches (49 13/16"),
 * feet and inches (4' 1 13/16"), or feet-inches-sixteenths (4-1-13).
 */
(function () {
  'use strict';

  const UNICODE_FRACTIONS = {
    '½': '1/2', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8',
    '⅝': '5/8', '⅞': '7/8', '⅓': '1/3', '⅔': '2/3',
  };

  // Smart quotes, prime marks, phone dashes and ½-style fractions to plain text
  function normalize(raw) {
    return String(raw)
      .replace(/[‘’′´`]/g, "'")
      .replace(/[“”″]|''/g, '"')
      .replace(/[‐-―−]/g, '-')
      .replace(/(\d)?([¼-¾⅓⅔⅛-⅞])/g, (_, d, f) => (d ? d + ' ' : '') + UNICODE_FRACTIONS[f])
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // A plain number: 5 | 5.5 | .5 | 5. | 11/16 | 5 1/2 | 5-1/2. NaN if unreadable.
  function parseNumber(raw) {
    const s = normalize(raw);
    let m = s.match(/^(\d+(?:\.\d*)?|\.\d+)$/);
    if (m) return parseFloat(m[1]);
    m = s.match(/^(?:(\d+)(?:\s+|-))?(\d+)\/(\d+)$/);
    if (m) {
      const den = parseInt(m[3], 10);
      if (den === 0) return NaN;
      return (m[1] ? parseInt(m[1], 10) : 0) + parseInt(m[2], 10) / den;
    }
    return NaN;
  }

  // A length, in inches. NaN if unreadable.
  function parseLength(raw) {
    let s = normalize(raw);
    if (!s) return NaN;
    s = s.replace(/\s*(in|inch|inches)\.?$/i, '"').replace(/\s*(ft|feet|foot)\.?/i, "'");
    const bare = s.replace(/"$/, '').trim();

    let m = bare.match(/^(\d+)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);          // 7-5-8
    if (m) return parseFloat(m[1]) * 12 + parseFloat(m[2]) + parseFloat(m[3]) / 16;
    m = bare.match(/^(\d+)-(\d+(?:\.\d+)?)$/);                               // 7-5
    if (m) return parseFloat(m[1]) * 12 + parseFloat(m[2]);
    m = bare.match(/^(\d+)-(\d+ \d+\/\d+)$/);                                // 7-5 1/2
    if (m) { const inch = parseNumber(m[2]); return isNaN(inch) ? NaN : parseFloat(m[1]) * 12 + inch; }

    let feet = 0;
    const fi = s.indexOf("'");
    if (fi >= 0) {                                                           // 1'5 1/2"
      const fpart = s.slice(0, fi).trim();
      if (!/^\d+(\.\d+)?$/.test(fpart)) return NaN;
      feet = parseFloat(fpart);
      s = s.slice(fi + 1).trim().replace(/^-/, '');
      if (!s.replace('"', '').trim()) return feet * 12;
    }
    const rest = s.replace(/"$/, '').trim();
    // A fraction written after the inch mark belongs to the inches: 5" 4/5, 12' 5"1/2
    const split = rest.match(/^(\d+(?:\.\d+)?)\s*"\s*(\d+\s*\/\s*\d+)$/);
    if (split) {
      const frac = parseNumber(split[2]);
      return frac < 1 ? feet * 12 + parseFloat(split[1]) + frac : NaN;
    }
    const inches = parseNumber(rest);
    return isNaN(inches) ? NaN : feet * 12 + inches;
  }

  // Rise per 12. Accepts 4, 4 1/2, 4.5, 4/12, 4:12. NaN if unreadable.
  function parsePitch(raw) {
    let s = normalize(raw);
    const m = s.match(/^(.+?)\s*[:/]\s*12$/);
    if (m) s = m[1];
    return parseNumber(s);
  }

  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  // Inches to text. mode: 'floor' (cut lengths: never long) or 'round'.
  // style: 'in' = 49 13/16"   'ftin' = 4' 1 13/16"   'dash' = 4-1-13
  function fmtLength(inches, mode, style) {
    if (!isFinite(inches)) return '—';
    mode = mode || 'floor'; style = style || 'ftin';
    const sx = mode === 'floor' ? Math.floor(inches * 16 + 1e-6) : Math.round(inches * 16);
    const neg = sx < 0 ? '-' : '', t = Math.abs(sx);
    if (style === 'dash') {
      const ft = Math.floor(t / 192), rem = t - ft * 192;
      return `${neg}${ft}-${Math.floor(rem / 16)}-${rem % 16}`;
    }
    const inchPart = v => {
      const wi = Math.floor(v / 16), n = v % 16;
      if (!n) return `${wi}"`;
      const g = gcd(n, 16), frac = `${n / g}/${16 / g}`;
      return wi ? `${wi} ${frac}"` : `${frac}"`;
    };
    if (style === 'in') return neg + inchPart(t);
    const ft = Math.floor(t / 192);
    return neg + (ft ? `${ft}' ` : '') + inchPart(t - ft * 192);
  }

  // A number as a mixed fraction when it's a 16th, else up to 3 decimals: 4 1/2, 7.333
  function fmtNumber(v) {
    if (!isFinite(v)) return '—';
    const sx = Math.round(v * 16);
    if (Math.abs(v * 16 - sx) > 1e-9) return String(+v.toFixed(3));
    const wi = Math.floor(sx / 16), n = sx - wi * 16;
    if (!n) return String(wi);
    const g = gcd(n, 16), frac = `${n / g}/${16 / g}`;
    return wi ? `${wi} ${frac}` : frac;
  }

  // Which style did the user type a length in?
  function styleOf(raw) {
    const s = normalize(raw);
    if (/'|\b(ft|feet|foot)\b/i.test(s)) return 'ftin';
    if (/^\d+-\d+(\.\d+)?(-\d+(\.\d+)?)?"?$/.test(s)) return 'dash';
    return 'in';
  }

  const PARSERS = { length: parseLength, pitch: parsePitch, number: parseNumber };

  // Value of a box (an element or its id). Blank gives `blank` (default NaN).
  function read(elOrId, blank) {
    const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return blank === undefined ? NaN : blank;
    const v = el.value.trim();
    if (!v) return blank === undefined ? NaN : blank;
    return (PARSERS[el.dataset.measure] || parseNumber)(v);
  }

  // Each box sits in a small wrapper (with its unit label, if any). The "= …" note
  // hangs just under the box in space reserved for it, so it never moves anything.
  function fieldFor(el) {
    if (el.parentElement && el.parentElement.classList.contains('m-field')) return el.parentElement;
    const f = document.createElement('span');
    f.className = 'm-field';
    el.insertAdjacentElement('beforebegin', f);
    const unit = el.nextElementSibling;
    f.appendChild(el);
    if (unit && unit.tagName === 'SPAN' && !unit.className) f.appendChild(unit);
    return f;
  }
  function echoFor(el) {
    const f = fieldFor(el);
    let e = f.querySelector(':scope > .m-echo');
    if (!e) {
      e = document.createElement('span');
      e.className = 'm-echo';
      f.appendChild(e);
    }
    return e;
  }

  // Update one box's note and red state. While typing (live), something half
  // written like "5 1/" just clears the note; it only turns red once you leave the box.
  function check(el, live) {
    const v = el.value.trim();
    const n = v ? read(el) : NaN;
    let bad = !!v && isNaN(n);
    if (bad && live) { el.classList.remove('m-bad'); const e = echoFor(el); e.classList.remove('m-bad'); e.textContent = ''; return; }
    el.classList.toggle('m-bad', bad);
    const echo = echoFor(el);
    echo.classList.toggle('m-bad', bad);
    if (!v) { echo.textContent = ''; return; }
    if (bad) { echo.textContent = "can't read that"; return; }
    const kind = el.dataset.measure;
    if (kind !== 'length' && fmtNumber(n) === normalize(v)) { echo.textContent = ''; return; }
    echo.textContent = '= ' + (kind === 'pitch' ? `${fmtNumber(n)}:12` : kind === 'number' ? fmtNumber(n) : fmtLength(n, 'round', 'ftin'));
  }

  // First visible box that can't be read (for an error message), or null
  function firstBad(root) {
    for (const el of (root || document).querySelectorAll('input[data-measure]')) {
      if (el.offsetParent !== null && el.value.trim() && isNaN(read(el))) return el;
    }
    return null;
  }

  // Wire up every box under root (call again after adding boxes)
  function init(root) {
    (root || document).querySelectorAll('input[data-measure]').forEach(el => {
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocapitalize', 'off');
      el.setAttribute('spellcheck', 'false');
      if (KEY_STYLE !== 'off') el.setAttribute('inputmode', 'decimal');   // number pad + key row
      check(el);
    });
  }

  document.addEventListener('input', e => {
    if (e.target && e.target.matches && e.target.matches('input[data-measure]')) check(e.target, true);
  });
  document.addEventListener('focusout', e => {
    if (e.target && e.target.matches && e.target.matches('input[data-measure]')) check(e.target);
  });

  // ── Key row: the phone shows its number pad, and this row under the box adds
  // the keys the number pad lacks: foot ('), inch ("), slash, space and hyphen.
  const KEYS = [
    { label: '′', text: "'", kinds: ['length'], title: 'feet' },
    { label: '″', text: '"', kinds: ['length'], title: 'inches' },
    { label: '/', text: '/', kinds: ['length', 'pitch', 'number'], title: 'fraction' },
    { label: 'space', text: ' ', kinds: ['length', 'pitch', 'number'], title: 'space', wide: true },
    { label: '-', text: '-', kinds: ['length'], title: 'hyphen' },
  ];
  let bar = null, target = null, valueAtFocus = '', usedBar = false;
  // Default: the phone's number pad with phone-style keys floating just above it
  // (they drop in under the box if the keyboard's position isn't reported).
  // ?keys=inline: chunky keys under the box.  ?keys=off: the normal keyboard.
  // Computers with a real keyboard get nothing extra.
  const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const KEY_PARAM = new URLSearchParams(location.search).get('keys') || document.documentElement.dataset.measureKeys || (touch ? 'float' : 'off');
  let KEY_STYLE = KEY_PARAM === 'float' ? 'float' : KEY_PARAM === 'inline' ? 'inline' : 'off';
  let focusedAt = 0;

  function insert(text) {
    const el = target;
    if (!el) return;
    const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
    el.value = el.value.slice(0, a) + text + el.value.slice(b);
    el.setSelectionRange(a + text.length, a + text.length);
    usedBar = true;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }

  function makeBar() {
    bar = document.createElement('div');
    bar.className = 'm-bar m-' + KEY_STYLE;
    bar.hidden = true;
    for (const k of KEYS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = k.label;
      btn.title = k.title;
      btn.dataset.kinds = k.kinds.join(' ');
      if (k.wide) btn.className = 'm-wide';
      // Keep focus (and the keyboard) in the box: act on touchend / mousedown, not click
      btn.addEventListener('touchend', e => { e.preventDefault(); insert(k.text); }, { passive: false });
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => insert(k.text));
      bar.appendChild(btn);
    }
    document.body.appendChild(bar);
    if (KEY_STYLE === 'float' && window.visualViewport) {
      visualViewport.addEventListener('resize', placeBar);
      visualViewport.addEventListener('scroll', placeBar);
    }
  }

  // The row sits in the page on its own line right under the box (after its
  // "= …" note), so it never covers the next box
  function placeBar() {
    if (!target || !bar) return;
    if (KEY_STYLE === 'inline') {
      const f = fieldFor(target);
      f.insertAdjacentElement('afterend', bar);
      f.parentElement.classList.add('m-wrap');
      return;
    }
    // Float: pin to the bottom of the visible area, which is just above the keyboard.
    // Some in-app viewers never report the keyboard; then the row would hide behind
    // it, so switch to the in-page row instead.
    const vv = window.visualViewport;
    const layoutH = document.documentElement.clientHeight;
    if (touch && Date.now() - focusedAt > 600 && (!vv || vv.height > layoutH * 0.85)) {
      KEY_STYLE = 'inline';
      bar.className = 'm-bar m-inline';
      bar.removeAttribute('style');
      return placeBar();
    }
    const h = bar.offsetHeight;
    const top = vv ? vv.offsetTop + vv.height - h : window.innerHeight - h;
    bar.style.top = top + 'px';
    bar.style.left = (vv ? vv.offsetLeft : 0) + 'px';
    bar.style.width = (vv ? vv.width : window.innerWidth) + 'px';
    // Don't let the row sit on top of the box being typed in
    const r = target.getBoundingClientRect(), visTop = vv ? vv.height - h : window.innerHeight - h;
    if (r.bottom > visTop - 8) window.scrollBy(0, r.bottom - visTop + 16);
  }

  document.addEventListener('focusin', e => {
    const el = e.target;
    if (KEY_STYLE === 'off' || !(el && el.matches && el.matches('input[data-measure]'))) return;
    if (!bar) makeBar();
    target = el; valueAtFocus = el.value; usedBar = false; focusedAt = Date.now();
    const kind = el.dataset.measure;
    for (const btn of bar.children) btn.hidden = !btn.dataset.kinds.split(' ').includes(kind);
    bar.hidden = false;
    placeBar();
    // The keyboard slides up after focus: settle the floating row once it's there
    if (KEY_STYLE === 'float') [120, 350, 700].forEach(t => setTimeout(placeBar, t));
  });
  document.addEventListener('focusout', e => {
    if (e.target !== target) return;
    const el = target;
    target = null;
    if (bar) bar.hidden = true;
    // Typing through the key row doesn't count as a change to the browser: tell it
    if (usedBar && el.value !== valueAtFocus) el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  const css = document.createElement('style');
  css.textContent = `
input[data-measure].m-bad { border-color: #c0392b !important; outline: 1px solid #c0392b; }
.m-field { position: relative; display: inline-flex; align-items: center; gap: 0.3rem; }
.m-echo { position: absolute; left: 2px; top: calc(100% + 2px); font-size: 0.72rem; line-height: 1;
  opacity: 0.7; white-space: nowrap; pointer-events: none; }
.m-echo.m-bad { color: #c0392b; opacity: 1; }
/* Room under each row of boxes for its note, always there so nothing shifts */
.input-row:has(.m-field) { margin-bottom: 1.15rem; }
.calc-group:has(.m-field) { margin-bottom: 1.6rem; }
.m-bar[hidden], .m-bar button[hidden] { display: none !important; }
.m-bar button { touch-action: manipulation; cursor: pointer; line-height: 1; margin: 0; }
/* Inline: the site's chunky buttons, on their own line under the box */
.m-wrap { flex-wrap: wrap; }
.m-bar.m-inline { display: flex; flex: 0 0 100%; gap: 12px; margin: 0.5rem 0 0.6rem; }
.m-inline button { min-width: 50px; height: 44px; padding: 0 0.8rem; font-family: inherit; font-size: 1.35rem;
  font-weight: bold; background: var(--backgroundColour, #ddd); color: var(--navColour, #000);
  border: solid 2px var(--navColour, #000); border-radius: 5px; filter: drop-shadow(3px 3px var(--navColour, #000)); }
.m-inline button.m-wide { min-width: 78px; font-size: 1rem; }
.m-inline button:active { filter: drop-shadow(1px 1px var(--navColour, #000)); transform: translate(2px, 2px); }
/* Float: looks like the iPhone's own keys, pinned just above the keyboard */
.m-bar.m-float { position: fixed; z-index: 2147483000; display: flex; justify-content: center; gap: 6px;
  padding: 6px 4px 8px; box-sizing: border-box; background: #d1d4da; border-top: 1px solid #b4b7bd; }
.m-float button { flex: 1 1 0; max-width: 66px; height: 44px; border: none; border-radius: 6px; background: #fff;
  color: #000; font: 400 24px -apple-system, system-ui, sans-serif; box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3); }
.m-float button.m-wide { flex-grow: 2; max-width: 130px; font-size: 16px; }
.m-float button:active { background: #aeb3be; }
@media (prefers-color-scheme: dark) {
  .m-bar.m-float { background: #2c2c2e; border-top-color: #1c1c1e; }
  .m-float button { background: #6c6c70; color: #fff; box-shadow: 0 1px 0 rgba(0, 0, 0, 0.6); }
  .m-float button:active { background: #4a4a4e; }
}`;
  document.head.appendChild(css);

  window.Measure = { parseLength, parsePitch, parseNumber, fmtLength, fmtNumber, styleOf, read, check, init, firstBad, normalize };
})();
