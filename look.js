// ============================================================
// UNO TEAMS — NEW LOOK (the 7 ideas of the "UNO Fiesta New Look" mock-up, used as
// UNO TEAMS's own look, 2026-11-23)
//
// Loaded BEFORE app.js. app.js asks these helpers for the card faces when they exist:
//   lookIconHTML(value)          — drawn centre picture (skip, reverse, team wilds) or ''
//   lookCornerHTML(value, pos)   — small corner label / picture
//   lookWildCenterHTML(value)    — four-colour diamond + a picture
//   lookPassHTML()               — the 🔁 passing symbol (arrow over a card)
// Then the table ring, seats, title screen and movement below.
// ============================================================

// ---- 1. Card pictures ----------------------------------------------------
// Every picture is drawn in the card's colour (currentColor) with a dark outline,
// so the same drawing works on all four colours and on the white diamond.
const LOOK_OUT = '#1b0d14';
const _S = `stroke="${LOOK_OUT}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const LOOK_ICONS = {
  // ⊘ Salto: a ring with a bar through it
  skip: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="34" fill="none" stroke="${LOOK_OUT}" stroke-width="22"/><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" stroke-width="12"/><path d="M27 73 L73 27" stroke="${LOOK_OUT}" stroke-width="22" stroke-linecap="round"/><path d="M27 73 L73 27" stroke="currentColor" stroke-width="12" stroke-linecap="round"/></svg>`,
  // ⇄ Reversa: two arrows pointing opposite ways
  reverse: `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-45 50 50)"><path d="M14 28 H56 V14 L84 33 L56 52 V38 H14 Z" fill="currentColor" ${_S}/><path d="M86 62 H44 V48 L16 67 L44 86 V72 H86 Z" fill="currentColor" ${_S}/></g></svg>`,
  // 🤝 Juego en Equipo: two team-mates, the turn (a gold arrow) jumping from one to the other
  teamPlay: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M22 40 Q50 6 78 40" fill="none" stroke="${LOOK_OUT}" stroke-width="13" stroke-linecap="round"/>
    <path d="M22 40 Q50 6 78 40" fill="none" stroke="#ffd54a" stroke-width="6" stroke-linecap="round"/>
    <path d="M66 36 L82 44 L84 26 Z" fill="#ffd54a" ${_S} stroke-width="4"/>
    <circle cx="26" cy="56" r="11" fill="#fbf6ef" ${_S}/><path d="M9 92 Q10 70 26 70 Q42 70 43 92 Z" fill="#fbf6ef" ${_S}/>
    <circle cx="74" cy="56" r="11" fill="#ff4f9a" ${_S}/><path d="M57 92 Q58 70 74 70 Q90 70 91 92 Z" fill="#ff4f9a" ${_S}/></svg>`,
  // ✌️ Equipo Roba Cuatro: two cards, +2 for a player and +2 for their partner
  team4: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="8" y="22" width="44" height="62" rx="8" fill="#2c6ae0" ${_S} transform="rotate(-12 30 53)"/>
    <rect x="48" y="16" width="44" height="62" rx="8" fill="#e8343b" ${_S} transform="rotate(10 70 47)"/>
    <text x="30" y="62" text-anchor="middle" transform="rotate(-12 30 53)" font-family="Lilita One, Arial Black, sans-serif" font-size="25" fill="#fff" stroke="${LOOK_OUT}" stroke-width="4" paint-order="stroke">+2</text>
    <text x="70" y="56" text-anchor="middle" transform="rotate(10 70 47)" font-family="Lilita One, Arial Black, sans-serif" font-size="25" fill="#fff" stroke="${LOOK_OUT}" stroke-width="4" paint-order="stroke">+2</text></svg>`
};
// the 🔁 passing symbol: an arrow going up over a card (as on the real cards)
const LOOK_PASS = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L31 14 H24 V20 H16 V14 H9 Z" fill="#fff" stroke="${LOOK_OUT}" stroke-width="2.5" stroke-linejoin="round"/><rect x="11" y="22" width="18" height="15" rx="3" fill="#fff" stroke="${LOOK_OUT}" stroke-width="2.5" transform="rotate(-10 20 29)"/></svg>`;

function lookIconHTML(value) {
  const svg = LOOK_ICONS[value];
  return svg ? `<span class="card-icon">${svg}</span>` : '';
}

function lookCornerHTML(value, pos) {
  // wild: a tiny four-colour square instead of a letter
  if (value === 'wild') return `<span class="card-label ${pos} has-icon"><span class="corner-quad"></span></span>`;
  // team wilds: a small label is clearer in the corner than a tiny picture
  if (value === 'teamPlay') return `<span class="card-label ${pos} corner-team">🤝</span>`;
  if (value === 'team4') return `<span class="card-label ${pos}">+4</span>`;
  const svg = LOOK_ICONS[value];
  if (svg) return `<span class="card-label ${pos} has-icon">${svg}</span>`;
  return `<span class="card-label ${pos}">${symbolOf(value)}</span>`;
}

function lookWildCenterHTML(value) {
  // the diamond keeps its four colours even after a colour was picked (the ring shows that)
  if (value === 'wild') return `<span class="wild-diamond"></span>`;
  return `<span class="wild-diamond"></span>${lookIconHTML(value)}`;
}

function lookPassHTML() { return LOOK_PASS; }

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
  'seat.turn':    ['SU TURNO', 'THEIR TURN'],
  'seat.picking': ['ELIGIENDO', 'PICKING'],
  'seat.passing': ['PASANDO', 'PASSING'],
  'seat.card':    ['{n} carta', '{n} card'],
  'seat.cards':   ['{n} cartas', '{n} cards']
});

// ---- 5. Title screen ---------------------------------------------------------
addStrings({ 'land.howLink': ['Cómo jugar', 'How to play'] });
// four real cards fanned behind the logo: a number with the 🔁 symbol, a Team Play,
// a Team Draw Four and a skip
document.addEventListener('DOMContentLoaded', () => {
  const fan = document.querySelector('.title-fan');
  if (!fan || typeof cardHTML !== 'function') return;
  fan.innerHTML = [
    { c: 'red', v: '5', pass: true },
    { c: 'wild', v: 'teamPlay' },
    { c: 'wild', v: 'team4' },
    { c: 'blue', v: 'skip' }
  ].map(card => cardHTML(card)).join('');
});

// ---- 7. Movement -------------------------------------------------------------
// Uses FX (fx.js) for the effect layer and the calm-mode setting.
const _lookMotion = () => typeof FX === 'undefined' || FX.motion();
const _lookMid = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// Deal: when a round has just started (nothing in the log yet but the start), card backs
// fly from the deck to each player one round at a time, and my cards flip face up.
function lookDealIn(state) {
  if (!_lookMotion() || document.hidden) return;
  if ((state.log || []).length > 1) return;           // joined a game already under way
  const deck = document.querySelector('#draw-pile-area .card-back')?.getBoundingClientRect();
  const mine = [...document.querySelectorAll('#player-hand .card[data-index]')];
  if (!deck || !mine.length) return;
  const seats = [...document.querySelectorAll('#opponents-row .opponent')];
  const layer = FX.layer();
  const back = '<div class="card-back fly-back"><span class="back-uno">UNO</span><span class="back-party">TEAMS</span></div>';
  const STEP = 120;                                     // ms between cards
  mine.forEach(el => { el.style.visibility = 'hidden'; });
  const fly = (to, delay, done) => {
    const el = document.createElement('div');
    el.className = 'fx-fly lk-deal';
    el.innerHTML = back;
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
    // the other players first in each round, then me — like dealing round the table
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

// ¡UNO!: a big word over the table and a burst of confetti in the four card colours
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
  const colors = ['#e8343b', '#f5ac1d', '#22a454', '#2c6ae0', '#ff4f9a', '#ffd54a'];
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
