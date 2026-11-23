// ============================================================
// ¡CAMALEÓN! — NEW LOOK (the 7 ideas of the "UNO Fiesta New Look" mock-up,
// brought to ¡CAMALEÓN! with its own rainforest colours, 2026-11-23)
//
// Loaded BEFORE app.js. app.js asks these helpers for the card faces when they exist:
//   lookIconHTML(value)          — drawn centre picture (skip, reverse, wild pictures) or ''
//   lookCornerHTML(value, pos)   — small corner label / picture
//   lookWildCenterHTML(value)    — four-colour leaf + "+4" / "+2" or a picture
// Later steps add the table ring, seats, title screen and movement below.
// ============================================================

// ---- 1. Card pictures ----------------------------------------------------
// Every picture is drawn in the card's colour (currentColor) with a dark outline,
// so the same drawing works on all four colours and on the white leaf.
const LOOK_OUT = '#0c1f19';
const _S = `stroke="${LOOK_OUT}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const LOOK_ICONS = {
  // ⊘ Salto: a ring with a bar through it
  skip: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="34" fill="none" stroke="${LOOK_OUT}" stroke-width="22"/><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="12"/><path d="M27 73 L73 27" stroke="${LOOK_OUT}" stroke-width="22" stroke-linecap="round"/><path d="M27 73 L73 27" stroke="currentColor" stroke-width="12" stroke-linecap="round"/></svg>`,
  // ⇄ Reversa: two arrows pointing opposite ways
  reverse: `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-45 50 50)"><path d="M14 28 H56 V14 L84 33 L56 52 V38 H14 Z" fill="currentColor" ${_S}/><path d="M86 62 H44 V48 L16 67 L44 86 V72 H86 Z" fill="currentColor" ${_S}/></g></svg>`,
  // ⚡ Comodín Voltea Todos: a lightning bolt (every Power Card flips)
  wildFlip: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M58 6 L22 56 H46 L38 94 L78 40 H54 Z" fill="#c6f432" ${_S}/></svg>`,
  // 🎯 Comodín Diana: a target
  wildTarget2: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38" fill="#E0322B" ${_S}/><circle cx="50" cy="50" r="25" fill="#fff" ${_S}/><circle cx="50" cy="50" r="11" fill="#E0322B" ${_S}/></svg>`
};
// a wild picture keeps its own colours; skip/reverse take the card's colour
const LOOK_WILD_PICS = ['wildFlip', 'wildTarget2'];

function lookIconHTML(value) {
  const svg = LOOK_ICONS[value];
  return svg ? `<span class="card-icon">${svg}</span>` : '';
}

function lookCornerHTML(value, pos) {
  const svg = LOOK_ICONS[value];
  if (svg) return `<span class="card-label ${pos} has-icon">${svg}</span>`;
  return `<span class="card-label ${pos}">${symbolOf(value)}</span>`;
}

function lookWildCenterHTML(value) {
  // the leaf keeps its four colours even after a colour was named (the ring shows that)
  const sub = value === 'wildTarget2' ? `<span class="wild-sub">+2</span>` : '';
  const inner = LOOK_WILD_PICS.includes(value) ? lookIconHTML(value) + sub
    : `<span class="card-label center">${symbolOf(value)}</span>`;
  return inner;
}

// ---- 2. Table: direction ring around the piles ----------------------------
// Called from renderStatus() in app.js on every render. Keeps one SVG ring inside
// .pile-area; the dashes march clockwise (direction 1) or the other way (-1).
let _lookDir = null;
function lookDirectionHTML(direction) {
  const area = document.querySelector('#screen-game .pile-area');
  if (area) {
    let ring = area.querySelector('.dir-ring');
    if (!ring) {
      ring = document.createElement('div');
      ring.className = 'dir-ring';
      ring.setAttribute('aria-hidden', 'true');
      ring.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="48" ry="46" vector-effect="non-scaling-stroke"/></svg>
        <span class="dir-arrow dir-arrow-r"></span><span class="dir-arrow dir-arrow-l"></span>`;
      area.prepend(ring);
    }
    const ccw = direction !== 1;
    ring.classList.toggle('ccw', ccw);
    // a quick flash when a Reverse changes the direction
    if (_lookDir !== null && _lookDir !== direction) {
      ring.classList.remove('flip'); void ring.offsetWidth; ring.classList.add('flip');
    }
    _lookDir = direction;
  }
  return '';
}

// ---- 4. Seats: words used on the players around the table -----------------
addStrings({
  'seat.turn':  ['SU TURNO', 'THEIR TURN'],
  'seat.card':  ['{n} carta', '{n} card'],
  'seat.cards': ['{n} cartas', '{n} cards']
});

// ---- 5. Title screen ---------------------------------------------------------
addStrings({ 'land.howLink': ['Cómo jugar', 'How to play'] });
// four real cards fanned above the name: a flex number, a skip, a wild and a flex reverse
document.addEventListener('DOMContentLoaded', () => {
  const fan = document.querySelector('.title-fan');
  if (!fan || typeof cardHTML !== 'function') return;
  fan.innerHTML = [
    { c: 'red', c2: 'blue', v: '5', flex: true },
    { c: 'yellow', v: 'skip' },
    { c: 'wild', v: 'wildFlip' },
    { c: 'green', c2: 'yellow', v: 'reverse', flex: true }
  ].map(card => cardHTML(card)).join('');
});

// ---- 7. Movement -------------------------------------------------------------
// Uses FX (fx.js) for the effect layer and the calm-mode setting.
const _lookMotion = () => typeof FX === 'undefined' || FX.motion();
const _lookMid = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Deal: when a round has just started (only the start line in the log), card backs fly
// from the deck to each player one round at a time, and my cards flip face up.
function lookDealIn(state) {
  if (!_lookMotion() || document.hidden) return;
  if ((state.log || []).length > 1) return;           // joined a game already under way
  const deck = document.querySelector('#draw-pile-area .card-back-cham')?.getBoundingClientRect();
  const mine = [...document.querySelectorAll('#player-hand .card[data-index]')];
  if (!deck || !mine.length) return;
  const seats = [...document.querySelectorAll('#opponents-row .opponent')];
  const layer = FX.layer();
  const STEP = 120;                                     // ms between cards
  mine.forEach(el => { el.style.visibility = 'hidden'; });
  const fly = (to, delay, done) => {
    const el = document.createElement('div');
    el.className = 'fx-fly lk-deal';
    el.innerHTML = backHTML();
    layer.appendChild(el);
    const a = _lookMid(deck), b = _lookMid(to);
    const s = Math.max(.3, Math.min(1.2, to.height / 90));
    const at = (p, sc, r) => `translate(${p.x - 30}px, ${p.y - 45}px) scale(${sc}) rotate(${r}deg)`;
    const anim = el.animate([{ transform: at(a, 1, 0) }, { transform: at(b, s, (Math.random() * 16 - 8)) }],
      { duration: 360, delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    anim.onfinish = () => { el.remove(); done?.(); };
  };
  const rounds = mine.length;
  for (let i = 0; i < rounds; i++) {
    // opponents first in each round, then me — like dealing round the table
    seats.forEach((seat, k) => fly(seat.getBoundingClientRect(), (i * (seats.length + 1) + k) * STEP));
    const card = mine[i];
    fly(card.getBoundingClientRect(), (i * (seats.length + 1) + seats.length) * STEP, () => {
      if (!card.isConnected) return;
      card.style.visibility = '';
      // flip face up
      card.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 180, easing: 'ease-out' });
      if (typeof FX !== 'undefined') FX.play('draw');
    });
  }
  // safety: never leave a card hidden (re-render, tab switch…)
  setTimeout(() => mine.forEach(el => { el.style.visibility = ''; }), rounds * (seats.length + 1) * STEP + 900);
}

// ¡ÚLTIMA!: a big word over the table and a burst of confetti in the card colours + lime
function lookUnoBurst(rect) {
  if (typeof FX === 'undefined') return;
  const layer = FX.layer();
  const c = rect ? _lookMid(rect) : { x: innerWidth / 2, y: innerHeight * .4 };
  const word = document.createElement('div');
  word.className = 'lk-uno-burst';
  word.textContent = t('fx.uno');
  word.style.left = c.x + 'px';
  word.style.top = c.y + 'px';
  layer.appendChild(word);
  if (!_lookMotion()) {
    word.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1200 }).onfinish = () => word.remove();
    return;
  }
  word.animate([
    { transform: 'translate(-50%,-50%) scale(0) rotate(-20deg)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(1.25) rotate(4deg)', offset: .3 },
    { transform: 'translate(-50%,-50%) scale(1) rotate(-4deg)', offset: .6 },
    { transform: 'translate(-50%,-60%) scale(1.05) rotate(-4deg)', opacity: 0 }
  ], { duration: 1300, easing: 'ease-out' }).onfinish = () => word.remove();
  const colors = ['#E0322B', '#F4B814', '#1FA251', '#1F63E0', '#c6f432', '#2dd4bf'];
  for (let i = 0; i < 36; i++) {
    const bit = document.createElement('span');
    bit.className = 'lk-confetti';
    bit.style.left = c.x + 'px';
    bit.style.top = c.y + 'px';
    bit.style.background = colors[i % colors.length];
    layer.appendChild(bit);
    const ang = Math.random() * Math.PI * 2, d = 80 + Math.random() * 160;
    bit.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d + 110}px)) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], { duration: 1000 + Math.random() * 500, easing: 'cubic-bezier(.1,.7,.4,1)' }).onfinish = () => bit.remove();
  }
}
