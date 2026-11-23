// ============================================================
// EXTRAS — everything on top of the basic game (UNO TEAMS)
//
// Loaded after app.js; it uses app.js globals (roomState, localUid, db, FX, t…).
// app.js calls into here through a few hooks, all guarded with `typeof`:
//   afterGameRender(state, firstDraw) — end of every renderGame()
//   seatFaceHTML(state, player)       — inside renderOpponents()
//   renderLobbyExtras(state, isHost)  — inside renderLobby()
//   afterWinnerRender(state)          — end of renderWinner()
//   onFxEvents(events, prev, cur)     — fx.js, after it played the engine's events
// Match stats are counted by the rules engine itself (state.stats), so nothing here
// has to count moves.
// ============================================================

const isTutorial = () => typeof LOCAL_GAME !== 'undefined' && LOCAL_GAME;

// ============================================================
// Faces on every seat
// ============================================================

addStrings({
  'mood.happy': ['Tranquilo', 'Relaxed'], 'mood.thinking': ['Pensando', 'Thinking'],
  'mood.caught': ['¡Pillado!', 'Caught!'], 'mood.smug': ['Satisfecho', 'Smug'], 'mood.oops': ['Ups', 'Oops'],
  'mood.annoyed': ['Molesto', 'Annoyed'], 'mood.cocky': ['Casi gana', 'Almost there'], 'mood.worried': ['Preocupado', 'Worried']
});

const FACE_INK = '#1b1030';
const FACE_PARTS = {
  happy:    `<circle cx="14" cy="17" r="2.2"/><circle cx="26" cy="17" r="2.2"/><path d="M14 25q6 5 12 0" fill="none" stroke="${FACE_INK}" stroke-width="2.2" stroke-linecap="round"/>`,
  thinking: `<circle cx="15" cy="15" r="2.2"/><circle cx="27" cy="15" r="2.2"/><path d="M11 11l6-1.5M23 9.5l6 1.5" stroke="${FACE_INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M17 26h6" stroke="${FACE_INK}" stroke-width="2.2" stroke-linecap="round"/>`,
  caught:   `<circle cx="14" cy="16" r="3.6" fill="#fff"/><circle cx="26" cy="16" r="3.6" fill="#fff"/><circle cx="14" cy="16" r="1.5"/><circle cx="26" cy="16" r="1.5"/><ellipse cx="20" cy="27" rx="3.2" ry="4"/><circle cx="9" cy="23" r="2.4" fill="#ff6b6b" opacity=".6"/><circle cx="31" cy="23" r="2.4" fill="#ff6b6b" opacity=".6"/>`,
  smug:     `<path d="M11 17h6M23 17h6" stroke="${FACE_INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M13 24q8 5 14-2" fill="none" stroke="${FACE_INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M22 12l7-2" stroke="${FACE_INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  oops:     `<circle cx="14" cy="17" r="2.2"/><circle cx="26" cy="17" r="2.2"/><path d="M10 11l6 2M30 11l-6 2" stroke="${FACE_INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M14 27q3-3 6 0t6 0" fill="none" stroke="${FACE_INK}" stroke-width="2" stroke-linecap="round"/>`,
  annoyed:  `<path d="M10 13l7 2.5M30 13l-7 2.5" stroke="${FACE_INK}" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="18" r="2"/><circle cx="26" cy="18" r="2"/><path d="M14 28q6-4 12 0" fill="none" stroke="${FACE_INK}" stroke-width="2.2" stroke-linecap="round"/>`,
  cocky:    `<circle cx="14" cy="17" r="2.2"/><path d="M23 17h6" stroke="${FACE_INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M11 11l6-1M23 10l6 2" stroke="${FACE_INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M12 23q8 7 16 0z" fill="#fff" stroke="${FACE_INK}" stroke-width="1.8" stroke-linejoin="round"/>`,
  worried:  `<path d="M10 14l6-2M30 14l-6-2" stroke="${FACE_INK}" stroke-width="1.8" stroke-linecap="round"/><circle cx="14" cy="18" r="2.2"/><circle cx="26" cy="18" r="2.2"/><path d="M14 28q6-5 12 0" fill="none" stroke="${FACE_INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M33 9c1.6 2.4 2.4 3.8 2.4 5a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.6 2.4-5z" fill="#7fd3ff"/>`
};
function faceHue(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}
function faceSVG(mood, name, size = 34) {
  return `<svg class="seat-face face-${mood}" viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill="hsl(${faceHue(name)} 60% 66%)" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
    <circle cx="13" cy="10" r="4" fill="#fff" opacity=".25"/>
    <g fill="${FACE_INK}">${FACE_PARTS[mood] || FACE_PARTS.happy}</g>
  </svg>`;
}
function seatMood(state, p) {
  const m = FX.moodOf(p.id);
  if (m) return m;
  if (p.cardCount > 0 && p.cardCount <= 2) return 'cocky';
  if (p.cardCount >= 12) return 'worried';
  if (whoActs(state) === p.id) return 'thinking';
  return 'happy';
}
function seatFaceHTML(state, p) {
  const mood = seatMood(state, p);
  return `<span class="seat-face-wrap" title="${esc(t('mood.' + mood))}">${faceSVG(mood, p.name)}</span>`;
}

// ============================================================
// "Tu turno" moment + optional timer · 2-cards alert · hand badges
// ============================================================

addStrings({
  'turn.yours': ['¡Tu turno!', 'Your turn!'], 'turn.yoursSub': ['Elige una carta o roba', 'Pick a card or draw'],
  'turn.decide': ['🔁 ¡Pasa cartas!', '🔁 Pass cards!'], 'turn.decideSub': ['Elige qué le das a tu compañero', 'Pick what goes to your partner'],
  'danger.other': ['¡{name} está a 2 cartas!', '{name} is 2 cards away!'], 'danger.otherSub': ['¡Que no se escape!', "Don't let them get away!"],
  'danger.me': ['¡Te quedan 2 cartas!', 'You have 2 cards left!'], 'danger.meSub': ['No olvides gritar ¡UNO!', "Don't forget to shout UNO"],
  'timer.label': ['Tiempo por turno', 'Time per turn'], 'timer.off': ['Sin límite', 'No limit'], 'timer.s': ['{n} s', '{n} s'],
  'timer.desc': ['Si se acaba: robas 1 y pasas. Si tenías que pasar cartas, se eligen por ti.',
                 'When time runs out you draw 1 and pass. If you had to pass cards, they are picked for you.'],
  'badge.ok': ['Jugable', 'Playable'], 'badge.no': ['No se puede', "Can't play"],
  'match.label': ['Duración', 'Length'], 'match.round': ['Una ronda', 'One round'], 'match.match': ['Partida a 500', 'Match to 500'],
  'match.roundDesc': ['Gana el primer equipo que se quede sin cartas.', 'The first team to run out of cards wins.'],
  'match.matchDesc': ['Varias rondas: el equipo que gana una ronda suma las cartas de los otros equipos. Gana el primero en llegar a 500 puntos.', "Several rounds: the team that wins a round scores the other teams' cards. First team to 500 points wins."]
});

let _wasMyTurn = null, _countSeen = {}, _myMaxCards = 0;
const myTurnNow = s => whoActs(s) === localUid;

function afterGameRender(state, firstDraw) {
  const myTurn = myTurnNow(state);
  if (!firstDraw && myTurn && _wasMyTurn === false) {
    const deciding = !!state.phase;   // it's a card pass, not a turn
    FX.enqueue(async () => {
      if (!myTurnNow(roomState)) return;
      FX.play('turn');
      FX.buzz([30, 50, 30]);
      const hand = document.getElementById('player-hand');
      hand?.classList.add('hand-lift');
      setTimeout(() => hand?.classList.remove('hand-lift'), 900);
      {
        await FX.banner(t(deciding ? 'turn.decide' : 'turn.yours'), t(deciding ? 'turn.decideSub' : 'turn.yoursSub'), 'turn', 850);
      }
    });
  }
  _wasMyTurn = myTurn;
  for (const p of state.players) {
    const before = _countSeen[p.id];
    if (!firstDraw && state.status === 'playing' && before !== undefined && before > 2 && p.cardCount === 2) {
      const me = p.id === localUid, name = p.name;
      FX.enqueue(async () => {
        if (roomState?.status !== 'playing') return;   // the round ended meanwhile: no banner over the results
        FX.play('danger');
        if (!me) FX.buzz([40, 60, 40]);
        await FX.banner(me ? t('danger.me') : t('danger.other', { name }), me ? t('danger.meSub') : t('danger.otherSub'), 'danger', 1100);
      });
    }
    _countSeen[p.id] = p.cardCount;
  }
  _myMaxCards = Math.max(_myMaxCards, (state.hands?.[localUid] || []).length);
  renderMyFace(state);
  markHandBadges(state);
  fitHand();
  // new look (look.js): cards are dealt out one by one when a round starts
  if (firstDraw && typeof lookDealIn === 'function') lookDealIn(state);
  updateTurnTimer(state);
  updateMenuDot(state);
  if (isTutorial()) { if (typeof tutorialRender === 'function') tutorialRender(state); return; }
  listenThrows();
}
function resetGameExtras() {
  _wasMyTurn = null; _countSeen = {}; _myMaxCards = 0; _moments = {};
  _timer = { key: null, start: 0, fired: false };
}
function renderMyFace(state) {
  const label = document.getElementById('hand-label');
  if (!label) return;
  let el = document.getElementById('my-face');
  if (!el) {
    el = document.createElement('span');
    el.id = 'my-face';
    el.className = 'my-face';
    label.before(el);
  }
  const me = state.players.find(p => p.id === localUid);
  if (me) el.innerHTML = seatFaceHTML(state, me);
}
// Playable / not playable cards in my hand, on my turn
function markHandBadges(state) {
  // New look (step 3): no more ✓ / ✕ badges — on my turn the cards I can play rise
  // and glow (.can-play), the rest go dim (.cant-play).
  const myTurn = isMyTurn(state);
  const legal = new Set(Engine.legalPlays(state, localUid));
  document.querySelectorAll('#player-hand .card[data-index]').forEach(el => {
    el.querySelector('.hand-badge')?.remove();
    el.classList.remove('cant-play', 'can-play');
    if (!myTurn) return;
    el.classList.add(legal.has(+el.dataset.index) ? 'can-play' : 'cant-play');
  });
}

// The whole hand fits on screen in a slight fan
function fitHand() {
  const hand = document.getElementById('player-hand');
  const cards = [...(hand?.querySelectorAll('.card[data-index]') || [])];
  if (!hand || !cards.length) return;
  hand.classList.add('fitted');
  const n = cards.length, w = cards[0].offsetWidth || 60;
  // new look: a rounder fan (up to 5° between cards, less when the hand is big)
  const fan = n > 1 ? Math.min(5, 30 / n) : 0;
  // the outer cards lean out of the row: keep room for that so they stay on screen
  const lean = Math.sin(fan * (n - 1) / 2 * Math.PI / 180) * (cards[0].offsetHeight || 90) * 0.7;
  const avail = hand.clientWidth - 8 - 2 * lean;
  const overlap = n > 1 ? Math.min(w * 0.72, Math.max(0, (n * w - avail) / (n - 1) + 2)) : 0;
  const k = Math.min(2.6, 60 / (n * n));
  hand.style.setProperty('--overlap', overlap + 'px');
  hand.style.setProperty('--fan', fan + 'deg');
  cards.forEach((el, i) => {
    const off = i - (n - 1) / 2;
    el.style.setProperty('--i', i);
    el.style.setProperty('--n', n);
    el.style.setProperty('--lift', (off * off * k).toFixed(1) + 'px');
  });
}
window.addEventListener('resize', () => { if (roomState?.status === 'playing') fitHand(); });

// ---- Timer ----
// Every device times the wait from the moment it saw it start (nothing extra is saved).
// Only the player who has to act does something when it runs out (a 'timeout' move:
// the engine does the default — draw & pass, accept, or pick a colour). Bots never wait.
const TURN_TIMER_OPTIONS = [0, 30, 60];
let _timer = { key: null, start: 0, fired: false };
let _timerTick = null;

function timerPhase(state) {
  if (state.status !== 'playing' || !state.turnTimer) return null;
  const actorId = whoActs(state);
  if (!actorId || isBot(actorId)) return null;
  const key = `${actorId}|${state.phase?.k || 'turn'}|${(state.discard || []).length}|${state.drawn ? 1 : 0}`;
  return { actorId, key };
}
function updateTurnTimer(state) {
  let bar = document.getElementById('turn-timer');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'turn-timer';
    bar.className = 'turn-timer hidden';
    bar.innerHTML = '<span class="tt-fill"></span><b class="tt-secs"></b>';
    document.getElementById('game-status')?.after(bar);
  }
  const ph = timerPhase(state);
  const key = ph?.key || null;
  if (key !== _timer.key) _timer = { key, start: Date.now(), fired: false };
  bar.classList.toggle('hidden', !ph);
  if (ph && !_timerTick) _timerTick = setInterval(timerTick, 250);
  if (!ph && _timerTick) { clearInterval(_timerTick); _timerTick = null; }
  if (ph) timerTick();
}
function timerTick() {
  const state = roomState;
  const bar = document.getElementById('turn-timer');
  const ph = state && timerPhase(state);
  if (!ph || !bar) { clearInterval(_timerTick); _timerTick = null; return; }
  const total = state.turnTimer * 1000;
  const left = total - (Date.now() - _timer.start);
  const secs = Math.max(0, Math.ceil(left / 1000));
  bar.querySelector('.tt-fill').style.transform = `scaleX(${Math.max(0, Math.min(1, left / total))})`;
  bar.querySelector('.tt-secs').textContent = secs + ' s';
  bar.classList.toggle('low', left < 10000);
  const meActing = ph.actorId === localUid;
  bar.classList.toggle('mine', meActing);
  if (meActing && secs <= 5 && secs > 0 && bar.dataset.tick !== `${_timer.key}|${secs}`) {
    bar.dataset.tick = `${_timer.key}|${secs}`;
    FX.play('tick');
  }
  if (!meActing || left > 0 || _timer.fired) return;
  _timer.fired = true;
  closeColorDialog();
  document.getElementById('draw-confirm-modal')?.classList.add('hidden');
  sendMove({ t: 'timeout', seq: state.seq });
}
async function handleSetTurnTimer(sec) {
  if (!roomState || roomState.status !== 'lobby' || roomState.hostId !== localUid) return;
  if (!TURN_TIMER_OPTIONS.includes(sec)) return;
  await db.collection('rooms').doc(currentRoomId).update({ turnTimer: sec, lastActivity: firebase.firestore.FieldValue.serverTimestamp() });
}
async function handleSetMatchMode(mode) {
  if (!roomState || roomState.status !== 'lobby' || roomState.hostId !== localUid) return;
  if (!['round', 'match'].includes(mode)) return;
  await db.collection('rooms').doc(currentRoomId).update({ matchMode: mode, lastActivity: firebase.firestore.FieldValue.serverTimestamp() });
}

// One-button in-game warning (uses the confirm window) — never the browser's alert()
async function showNotice(icon, title, msg) {
  const cancel = document.getElementById('draw-confirm-cancel');
  cancel.classList.add('hidden');
  await showDrawConfirm('yellow', icon, title, msg, t('notice.ok'));
  cancel.classList.remove('hidden');
}

// ============================================================
// Hold a card (or hover it on a computer) to see it big with its rule
// ============================================================

addStrings({
  'zoom.number': ['Carta de número: juégala si coincide en color o número.', 'Number card: play it if it matches the colour or number.'],
  'zoom.pass':   ['🔁 Símbolo de pase: al jugarla, tú y tu compañero os pasáis una carta.', '🔁 Passing symbol: when you play it, you and your partner pass each other a card.'],
  'zoom.draw2':  ['Roba Dos: el siguiente roba 2 y pierde su turno.', 'Draw Two: the next player draws 2 and loses their turn.'],
  'zoom.skip':   ['Salto: el siguiente pierde su turno.', 'Skip: the next player loses their turn.'],
  'zoom.reverse':['Reversa: cambia el sentido (si solo quedan 2 jugadores, vuelves a jugar).', 'Reverse: changes direction (with only 2 players left you play again).'],
  'zoom.wild':   ['Comodín: va sobre cualquier carta y eliges el color.', 'Wild: goes on anything and you pick the colour.'],
  'zoom.teamPlay':['Comodín Juego en Equipo: eliges color y el turno salta a tu compañero. Si no puede jugar, robas tú 2.', "Wild Team Play: pick a colour and the turn jumps to your partner. If they can't play, you draw 2."],
  'zoom.team4':  ['Comodín Equipo Roba Cuatro: el siguiente roba 2 y pierde su turno, y su compañero roba 2. Eliges color.', 'Wild Team Draw Four: the next player draws 2 and loses their turn, and their partner draws 2. You pick the colour.'],
  'zoom.points': ['Vale {n} puntos', 'Worth {n} points']
});
function zoomText(card) {
  let rule = esc(t('zoom.' + (isNumber(card.v) ? 'number' : card.v)));
  if (card.pass) rule += '<br>' + esc(t('zoom.pass'));
  return `${rule} <small>${esc(t('zoom.points', { n: Engine.cardPoints(card) }))}</small>`;
}
let _zoomEl = null, _zoomTimer = null, _zoomSwallowClick = false;
function showZoom(cardEl) {
  const state = roomState;
  const card = (state?.hands?.[localUid] || []).find(c => c.id === +cardEl.dataset.id);
  if (!card) return;
  hideZoom();
  _zoomEl = document.createElement('div');
  _zoomEl.className = 'card-zoom';
  _zoomEl.innerHTML = `<div class="zoom-card">${cardHTML(card)}</div><p>${zoomText(card)}</p>`;
  document.body.appendChild(_zoomEl);
  const r = cardEl.getBoundingClientRect(), zr = _zoomEl.getBoundingClientRect();
  _zoomEl.style.left = Math.max(8, Math.min(innerWidth - zr.width - 8, r.left + r.width / 2 - zr.width / 2)) + 'px';
  _zoomEl.style.top  = (r.top - zr.height - 12 > 8 ? r.top - zr.height - 12 : Math.min(innerHeight - zr.height - 8, r.bottom + 12)) + 'px';
  FX.play('select');
}
function hideZoom() { clearTimeout(_zoomTimer); _zoomEl?.remove(); _zoomEl = null; }
(function setupZoom() {
  const isCard = e => e.target.closest?.('#player-hand .card[data-id]');
  let sx = 0, sy = 0, clicked = null;
  document.addEventListener('pointerdown', e => {
    const el = isCard(e);
    if (!el || e.pointerType === 'mouse') return;
    sx = e.clientX; sy = e.clientY;
    clearTimeout(_zoomTimer);
    _zoomTimer = setTimeout(() => { showZoom(el); _zoomSwallowClick = true; FX.buzz(15); }, 450);
  });
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) clearTimeout(_zoomTimer);
  });
  ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, e => {
    if (e.pointerType !== 'mouse') { clearTimeout(_zoomTimer); if (_zoomEl) setTimeout(hideZoom, 80); }
  }));
  document.addEventListener('click', e => {
    const el = isCard(e);
    if (_zoomSwallowClick && el) { e.stopPropagation(); e.preventDefault(); }
    else if (el) { hideZoom(); clicked = el.dataset.id; }
    _zoomSwallowClick = false;
  }, true);
  document.addEventListener('contextmenu', e => { if (isCard(e)) e.preventDefault(); });
  document.addEventListener('mouseover', e => {
    const el = isCard(e);
    if (!el || el.dataset.id === clicked) return;
    clearTimeout(_zoomTimer);
    _zoomTimer = setTimeout(() => {
      const now = document.querySelector(`#player-hand .card[data-id="${el.dataset.id}"]`);
      if (now?.matches(':hover') && el.dataset.id !== clicked) showZoom(now);
    }, 700);
  });
  document.addEventListener('mouseout', e => {
    const el = isCard(e);
    if (el && !e.relatedTarget?.closest?.(`#player-hand .card[data-id="${el.dataset.id}"]`)) { hideZoom(); clicked = null; }
  });
})();

// ============================================================
// Settings menu in the game's top bar (+ rules window)
// ============================================================

addStrings({
  'menu.game': ['Partida', 'Game'], 'menu.end': ['Votar para terminar la partida', 'Vote to end the game'],
  'menu.sound': ['Sonido', 'Sound'], 'menu.music': ['Música de fondo', 'Background music'],
  'menu.sfx': ['Efectos de sonido', 'Sound effects'], 'menu.volume': ['Volumen', 'Volume'],
  'menu.notif': ['Avisos cuando es tu turno', 'Alerts when it is your turn'],
  'menu.shared': ['Música compartida', 'Shared music'], 'menu.screen': ['Pantalla', 'Display'],
  'menu.vibrate': ['Vibración', 'Vibration'], 'menu.calm': ['Modo calma (menos movimiento)', 'Calm mode (less motion)'],
  'menu.colorblind': ['Símbolos para daltónicos', 'Colour-blind symbols'], 'menu.lang': ['Idioma', 'Language'],
  'menu.title': ['Ajustes', 'Settings']
});
function toggleGameMenu(e) {
  e?.stopPropagation();
  const menu = document.getElementById('game-menu');
  const open = menu.classList.contains('hidden');
  menu.classList.toggle('hidden', !open);
  document.getElementById('menu-btn')?.setAttribute('aria-expanded', String(open));
  if (open) syncMenu();
}
function closeGameMenu() {
  document.getElementById('game-menu')?.classList.add('hidden');
  document.getElementById('menu-btn')?.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', e => {
  const menu = document.getElementById('game-menu');
  if (!menu || menu.classList.contains('hidden')) return;
  const row = e.target.closest('.menu-row');
  if (row && menu.contains(row)) {
    if (!e.target.closest('button, input')) { row.querySelector('button')?.click(); return; }
    if (e.target.closest('#spotify-btn, #lastfm-btn, #end-game-btn')) closeGameMenu();
    return;
  }
  if (!menu.contains(e.target) && !e.target.closest('#menu-btn')) closeGameMenu();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeGameMenu(); hideZoom(); closeRules(); } });
function toggleFxPref(key) {
  FX.setPref(key, !FX.prefs[key]);
  if (key === 'sfx' && FX.prefs.sfx) FX.play('pop');
  if (key === 'vibrate' && FX.prefs.vibrate) FX.buzz(40);
  syncMenu();
}
function setFxVolume(v) {
  FX.setPref('vol', Math.max(0, Math.min(1, v / 100)));
  clearTimeout(setFxVolume._t);
  setFxVolume._t = setTimeout(() => FX.play('pop'), 120);
}
function syncMenu() {
  for (const key of ['sfx', 'vibrate', 'calm', 'colorblind']) {
    document.getElementById(`${key}-toggle-btn`)?.setAttribute('aria-pressed', String(!!FX.prefs[key]));
  }
  const vol = document.getElementById('sfx-volume');
  if (vol) { vol.value = Math.round(FX.prefs.vol * 100); vol.disabled = !FX.prefs.sfx; }
  if (!navigator.vibrate) document.getElementById('vibrate-toggle-btn')?.closest('.menu-row')?.classList.add('hidden');
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('selected', b.dataset.lang === LANG));
}
function updateMenuDot(state) {
  const votes = state.endVotes || [];
  document.getElementById('menu-dot')?.classList.toggle('hidden', !(votes.length && !votes.includes(localUid)));
}
function openRules()  { document.getElementById('rules-modal')?.classList.remove('hidden'); }
function closeRules() { document.getElementById('rules-modal')?.classList.add('hidden'); }
function rulesBackdropClick(e) { if (e.target.id === 'rules-modal') closeRules(); }
document.addEventListener('langchange', () => {
  syncMenu();
  updateStatsLink();
  const s = roomState;
  if (!s) return;
  if (s.status === 'lobby') renderLobby(s);
  else if (s.status === 'playing') renderGame(s);
  else if (s.status === 'ended') renderWinner(s);
});

// ============================================================
/// Match awards + room score · winner celebration · my stats and badges (this device)
// ============================================================

addStrings({
  'win.series': ['Marcador de la sala', 'Room score'], 'win.awards': ['Premios de la ronda', 'Round awards'],
  'win.newBadge': ['¡Nueva insignia!', 'New badge!'],
  'aw.teamer': ['Buen compañero', 'Team player'], 'aw.teamerWhy': ['cedió el turno {n} veces', 'handed over the turn {n} times'],
  'aw.double': ['Doble golpe', 'Double hit'], 'aw.doubleWhy': ['jugó {n} Equipo Roba Cuatro', 'played {n} Team Draw Fours'],
  'aw.generous': ['Generoso', 'Generous'], 'aw.generousWhy': ['pasó {n} cartas a su compañero', 'passed {n} cards to their partner'],
  'aw.guardian': ['Ángel de la guarda', 'Guardian angel'], 'aw.guardianWhy': ['gritó ¡UNO! por su compañero {n} veces', 'shouted UNO for their partner {n} times'],
  'aw.punisher': ['Castigador', 'Punisher'], 'aw.punisherWhy': ['hizo robar {n} cartas', 'made others draw {n} cards'],
  'aw.collector': ['Coleccionista', 'Card collector'], 'aw.collectorWhy': ['tuvo que robar {n} cartas', 'had to draw {n} cards'],
  'aw.hunter': ['Cazador', 'Hunter'], 'aw.hunterWhy': ['pilló {n} veces a alguien sin gritar', 'caught someone not shouting {n} times'],
  'aw.gate': ['Portero', 'Gatekeeper'], 'aw.gateWhy': ['hizo perder {n} turnos', 'made others lose {n} turns'],
  'stats.open': ['Tus estadísticas e insignias', 'Your stats and badges'], 'stats.title': ['Tus estadísticas', 'Your stats'],
  'stats.games': ['Rondas', 'Rounds'], 'stats.wins': ['Victorias', 'Wins'], 'stats.rate': ['% victorias', 'Win rate'],
  'stats.streak': ['Mejor racha', 'Best streak'], 'stats.teamPlays': ['Turnos cedidos', 'Turns handed over'],
  'stats.gave': ['Cartas pasadas', 'Cards passed'], 'stats.taken': ['Cartas de castigo', 'Penalty cards'], 'stats.catches': ['Pillados', 'Catches'],
  'stats.badges': ['Insignias', 'Badges'], 'stats.local': ['Se guardan en este dispositivo.', 'Saved on this device.'],
  'stats.close': ['Cerrar', 'Close'], 'stats.none': ['Juega una partida para empezar.', 'Play a game to get started.'],
  'b.first': ['Primera victoria', 'First win'], 'b.firstWhy': ['Gana una ronda con tu equipo', 'Win a round with your team'],
  'b.assist': ['Pase perfecto', 'Perfect pass'], 'b.assistWhy': ['Tu compañero juega tras tu Juego en Equipo', 'Your partner plays after your Team Play'],
  'b.double': ['Doble golpe', 'Double hit'], 'b.doubleWhy': ['Juega un Comodín Equipo Roba Cuatro', 'Play a Wild Team Draw Four'],
  'b.guardian': ['Ángel de la guarda', 'Guardian angel'], 'b.guardianWhy': ['Grita ¡UNO! por tu compañero', 'Shout UNO for your partner'],
  'b.tagBack': ['¡Vuelve!', 'Tag, you\'re in!'], 'b.tagBackWhy': ['Devuelve al juego a tu compañero', 'Bring your partner back into the game'],
  'b.firstOut': ['Abre camino', 'Trailblazer'], 'b.firstOutWhy': ['Quédate sin cartas en una ronda que gana tu equipo', 'Go out in a round your team wins'],
  'b.untouched': ['Intocable', 'Untouchable'], 'b.untouchedWhy': ['Gana sin robar ni una carta de castigo', 'Win without drawing a single penalty card'],
  'b.comeback': ['Remontada', 'Comeback'], 'b.comebackWhy': ['Gana después de tener 12 cartas o más', 'Win after holding 12 or more cards'],
  'b.hunter': ['Cazador', 'Hunter'], 'b.hunterWhy': ['Pilla a alguien que no gritó ¡UNO!', 'Catch someone who didn\'t shout UNO'],
  'b.champion': ['Campeón', 'Champion'], 'b.championWhy': ['Gana una partida a 500', 'Win a match to 500'],
  'b.streak': ['Racha de 3', 'Hat trick'], 'b.streakWhy': ['Gana 3 rondas seguidas', 'Win 3 rounds in a row'],
  'b.veteran': ['Veterano', 'Veteran'], 'b.veteranWhy': ['Juega 10 rondas', 'Play 10 rounds'],
  'b.legend': ['Leyenda', 'Legend'], 'b.legendWhy': ['Gana 10 rondas', 'Win 10 rounds']
});

// The engine counts the stats itself; this only remembers moments for badges:
// I brought my partner back in, I went out
let _moments = {};
function onFxEvents(evs) {
  for (const e of evs) {
    if (e.t === 'give' && e.why === 'tag' && e.from === localUid) _moments.tagBack = true;
    if (e.t === 'out' && e.pid === localUid) _moments.wentOut = true;
  }
}

// Room score: the host adds the win once per round (gameNo/roundNo + seriesDone)
let _seriesSavedFor = null;
function saveSeriesOnEnd(state) {
  if (state.hostId !== localUid || !state.winnerName || state.seriesDone || !currentRoomId) return;
  const gameKey = `${currentRoomId}|${state.gameNo || 0}|${state.roundNo || 0}`;
  if (_seriesSavedFor === gameKey) return;
  _seriesSavedFor = gameKey;
  db.collection('rooms').doc(currentRoomId)
    .update(new firebase.firestore.FieldPath('series', state.winnerName), firebase.firestore.FieldValue.increment(1), 'seriesDone', true)
    .catch(() => {});
}
const AWARDS = [
  { id: 'teamer',    icon: '🤝', stat: 'teamPlays',  min: 2 },
  { id: 'double',    icon: '✌️', stat: 'team4s',     min: 1 },
  { id: 'generous',  icon: '🎁', stat: 'gave',       min: 4 },
  { id: 'guardian',  icon: '😇', stat: 'mateShouts', min: 1 },
  { id: 'punisher',  icon: '💥', stat: 'dealt',      min: 6 },
  { id: 'collector', icon: '🃏', stat: 'taken',      min: 6 },
  { id: 'gate',      icon: '⊘',  stat: 'skips',      min: 3 },
  { id: 'hunter',    icon: '📣', stat: 'catches',    min: 1 }
];
function matchAwards(state) {
  const stats = state.stats || {};
  const out = [];
  for (const a of AWARDS) {
    let best = null, bestN = a.min - 1, tie = false;
    for (const p of state.players) {
      const n = stats[p.id]?.[a.stat] || 0;
      if (n > bestN) { best = p; bestN = n; tie = false; } else if (n === bestN && best) tie = true;
    }
    if (best && !tie) out.push({ ...a, name: best.name, n: bestN });
  }
  return out;
}

const MY_STATS_KEY = 'unoteamsMyStats';
const BADGES = [
  { id: 'first',     icon: '🏆', test: c => c.won },
  { id: 'assist',    icon: '🤝', test: c => (c.ms.teamPlayHit || 0) >= 1 },
  { id: 'double',    icon: '✌️', test: c => (c.ms.team4s || 0) >= 1 },
  { id: 'guardian',  icon: '😇', test: c => (c.ms.mateShouts || 0) >= 1 },
  { id: 'tagBack',   icon: '🙌', test: c => c.moments.tagBack },
  { id: 'firstOut',  icon: '🏃', test: c => c.won && c.moments.wentOut },
  { id: 'untouched', icon: '🛡️', test: c => c.won && !(c.ms.taken || 0) },
  { id: 'comeback',  icon: '🚀', test: c => c.won && c.maxCards >= 12 },
  { id: 'hunter',    icon: '📣', test: c => (c.ms.catches || 0) >= 1 },
  { id: 'champion',  icon: '👑', test: c => c.champion },
  { id: 'streak',    icon: '🔥', test: c => c.s.streak >= 3 },
  { id: 'veteran',   icon: '🎖️', test: c => c.s.games >= 10 },
  { id: 'legend',    icon: '💫', test: c => c.s.wins >= 10 }
];
function loadMyStats() {
  const base = { games: 0, wins: 0, streak: 0, best: 0, teamPlays: 0, gave: 0, taken: 0, catches: 0, badges: {}, recorded: [] };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(MY_STATS_KEY) || '{}')); } catch (_) { return base; }
}
function saveMyStats(s) { try { localStorage.setItem(MY_STATS_KEY, JSON.stringify(s)); } catch (_) {} }
function recordMyGame(state, gameKey) {
  if (!state.players?.some(p => p.id === localUid)) return [];
  const s = loadMyStats();
  if (s.recorded.includes(gameKey)) return [];
  s.recorded = [...s.recorded, gameKey].slice(-40);
  const won = (state.winnerIds || []).includes(localUid);
  const ms = state.stats?.[localUid] || {};
  s.games++;
  if (won) { s.wins++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
  s.teamPlays += ms.teamPlays || 0; s.gave += ms.gave || 0; s.taken += ms.taken || 0; s.catches += ms.catches || 0;
  const mine = state.players.find(p => p.id === localUid)?.team;
  const ctx = { s, won, ms, maxCards: _myMaxCards, moments: _moments, champion: !!mine && state.matchWinner === mine };
  const fresh = BADGES.filter(b => !s.badges[b.id] && b.test(ctx));
  for (const b of fresh) s.badges[b.id] = new Date().toISOString().slice(0, 10);
  saveMyStats(s);
  return fresh;
}

function confetti(ms = 3500, count = 170) {
  if (!FX.motion()) return;
  const cv = document.createElement('canvas');
  cv.className = 'fx-confetti';
  cv.width = innerWidth * devicePixelRatio;
  cv.height = innerHeight * devicePixelRatio;
  FX.layer().appendChild(cv);
  const g = cv.getContext('2d');
  g.scale(devicePixelRatio, devicePixelRatio);
  // confetti in the four card colours + the fiesta gold and pink
  const cols = Object.values(CARD_HEX).concat('#ffffff', '#ffd54a', '#ff4f9a');
  const bits = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6,
    vx: (Math.random() - .5) * 2.4, vy: 2 + Math.random() * 3.2, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
    w: 7 + Math.random() * 5, h: 10 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)]
  }));
  const t0 = performance.now();
  (function frame(now) {
    const age = now - t0;
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalAlpha = Math.max(0, Math.min(1, (ms - age) / 600));
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.r += b.vr; b.vy += .03;
      g.save(); g.translate(b.x, b.y); g.rotate(b.r);
      g.fillStyle = b.c; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2)));
      g.restore();
    }
    if (age < ms) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

let _celebrated = null;
function afterWinnerRender(state) {
  if (isTutorial()) {
    if (_celebrated !== 'tutorial') { _celebrated = 'tutorial'; FX.play('win'); confetti(4200, 200); tutorialOutro(); }
    return;
  }
  saveSeriesOnEnd(state);
  const standings = document.getElementById('winner-standings');
  let extra = document.getElementById('winner-extra');
  if (!extra) {
    extra = document.createElement('div');
    extra.id = 'winner-extra';
    extra.className = 'winner-extra';
    standings.after(extra);
  }
  const awards = matchAwards(state);
  const series = Object.entries(state.series || {}).sort((a, b) => b[1] - a[1]);
  const total = series.reduce((n, [, w]) => n + w, 0);
  extra.innerHTML =
    (awards.length ? `<div class="win-sec"><div class="mode-label">${t('win.awards')}</div><div class="award-list">${awards.map(a =>
      `<div class="award"><span class="award-icon">${a.icon}</span><span class="award-text"><b>${t('aw.' + a.id)}</b><span class="award-who">${esc(a.name)}</span><span class="award-why">${t('aw.' + a.id + 'Why', { n: a.n })}</span></span></div>`).join('')}</div></div>` : '') +
    (total >= 2 ? `<div class="win-sec"><div class="mode-label">${t('win.series')}</div><div class="series">${series.map(([name, w]) =>
      `<span class="series-item ${name === state.winnerName ? 'lead' : ''}">${esc(name)} <b>${w}</b></span>`).join('')}</div></div>` : '');
  const gameKey = `${currentRoomId}|${state.gameNo || 0}|${state.roundNo || 0}|${state.winner}`;
  if (_celebrated === gameKey) return;
  _celebrated = gameKey;
  const won = (state.winnerIds || []).includes(localUid);
  FX.play(won ? 'win' : 'lose');
  if (won) FX.buzz([60, 40, 60, 40, 160]);
  confetti(won ? 4200 : 2600, won ? 200 : 90);
  setTimeout(() => {
    const fresh = recordMyGame(roomState || state, gameKey);
    fresh.forEach((b, i) => setTimeout(() => badgeToast(b), 600 + i * 3900));   // one at a time
    updateStatsLink();
  }, 1200);
}
function badgeToast(b) {
  const el = document.createElement('div');
  el.className = 'badge-toast';
  el.innerHTML = `<span class="bt-icon">${b.icon}</span><span><small>${t('win.newBadge')}</small><b>${t('b.' + b.id)}</b><span>${t('b.' + b.id + 'Why')}</span></span>`;
  document.body.appendChild(el);
  FX.play('truth');
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3700);
}
function openMyStats() {
  const s = loadMyStats();
  const rate = s.games ? Math.round(100 * s.wins / s.games) + '%' : '—';
  const tile = (k, v) => `<div class="st-tile"><b>${v}</b><span>${t('stats.' + k)}</span></div>`;
  let modal = document.getElementById('stats-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.className = 'spotify-modal';
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="spotify-modal-card stats-card">
    <h3 class="spotify-modal-title">🏅 ${t('stats.title')}</h3>
    ${s.games ? '' : `<p class="spotify-modal-desc">${t('stats.none')}</p>`}
    <div class="st-grid">${tile('games', s.games)}${tile('wins', s.wins)}${tile('rate', rate)}${tile('streak', s.best)}
      ${tile('teamPlays', s.teamPlays)}${tile('gave', s.gave)}${tile('taken', s.taken)}${tile('catches', s.catches)}</div>
    <div class="mode-label" style="align-self:flex-start">${t('stats.badges')} · ${Object.keys(s.badges).length}/${BADGES.length}</div>
    <div class="badge-grid">${BADGES.map(b => `<div class="badge ${s.badges[b.id] ? 'got' : 'locked'}">
      <span class="badge-icon">${b.icon}</span><b>${t('b.' + b.id)}</b><span>${t('b.' + b.id + 'Why')}</span></div>`).join('')}</div>
    <p class="spotify-modal-desc">${t('stats.local')}</p>
    <div class="spotify-modal-btns"><button class="btn btn-primary btn-sm" onclick="document.getElementById('stats-modal').classList.add('hidden')">${t('stats.close')}</button></div>
  </div>`;
  modal.classList.remove('hidden');
}
function updateStatsLink() {
  const el = document.getElementById('stats-link-count');
  if (!el) return;
  const s = loadMyStats();
  el.textContent = s.games ? ` · ${s.wins}/${s.games}` : '';
}

// ============================================================
// Reconnect grace countdown
// ============================================================
addStrings({ 'rc.turn': ['Reconectando… {s} s', 'Reconnecting… {s} s'] });
setInterval(() => {
  const state = roomState;
  if (!state || state.status !== 'playing' || isTutorial()) return;
  document.querySelectorAll('.rc-badge').forEach(b => {
    const left = Math.max(0, Math.ceil((RECONNECT_TURN_GRACE - (Date.now() - +b.dataset.since)) / 1000));
    b.textContent = b.dataset.turn === '1' ? t('rc.turn', { s: left }) : t('rc.label');
  });
  checkReconnectGrace(state);
}, 1000);

// ============================================================
// Throw reactions at players (Realtime Database rooms/<code>/reactions)
// ============================================================

addStrings({ 'throw.title': ['Lanzar a {name}', 'Throw at {name}'] });
const THROWABLES = ['🍅', '🎉', '🌙', '👏', '💐', '🤡'];
let _throwPicker = null, _lastThrow = 0, _reactRef = null, _reactRoom = null;
function openThrowPicker(seatEl) {
  closeThrowPicker();
  const pid = seatEl.dataset.uid;
  const p = roomState?.players.find(x => x.id === pid);
  if (!p) return;
  _throwPicker = document.createElement('div');
  _throwPicker.className = 'throw-picker';
  _throwPicker.innerHTML = `<div class="tp-title">${esc(t('throw.title', { name: p.name }))}</div>
    <div class="tp-row">${THROWABLES.map(e => `<button type="button" class="tp-btn" data-emoji="${e}">${e}</button>`).join('')}</div>`;
  document.body.appendChild(_throwPicker);
  const r = seatEl.getBoundingClientRect(), pr = _throwPicker.getBoundingClientRect();
  _throwPicker.style.left = Math.max(8, Math.min(innerWidth - pr.width - 8, r.left + r.width / 2 - pr.width / 2)) + 'px';
  _throwPicker.style.top  = (r.bottom + 8) + 'px';
  _throwPicker.addEventListener('click', e => {
    const b = e.target.closest('.tp-btn');
    if (!b) return;
    sendThrow(pid, b.dataset.emoji);
    closeThrowPicker();
  });
}
function closeThrowPicker() { _throwPicker?.remove(); _throwPicker = null; }
document.addEventListener('click', e => {
  if (_throwPicker && !_throwPicker.contains(e.target)) { closeThrowPicker(); if (!e.target.closest('.opponent')) return; }
  const seat = e.target.closest('#opponents-row .opponent');
  if (!seat || roomState?.status !== 'playing' || isTutorial()) return;
  openThrowPicker(seat);
});
function sendThrow(to, emoji) {
  if (!currentRoomId || Date.now() - _lastThrow < 1200) return;
  _lastThrow = Date.now();
  const ref = rtdb.ref(`rooms/${currentRoomId}/reactions`).push();
  ref.set({ from: localUid, to, emoji, t: firebase.database.ServerValue.TIMESTAMP })
    .then(() => setTimeout(() => ref.remove().catch(() => {}), 8000))
    .catch(err => console.warn('[throw]', err));
}
let _serverOffset = 0;
try { rtdb.ref('.info/serverTimeOffset').on('value', s => { _serverOffset = s.val() || 0; }); } catch (_) {}
function listenThrows() {
  if (_reactRoom === currentRoomId) return;
  _reactRef?.off();
  _reactRef = null;
  _reactRoom = currentRoomId;
  if (!currentRoomId) return;
  _reactRef = rtdb.ref(`rooms/${currentRoomId}/reactions`).limitToLast(5);
  _reactRef.on('child_added', snap => {
    const r = snap.val();
    if (!r || Date.now() + _serverOffset - (r.t || 0) > 6000) return;
    showThrow(r.from, r.to, r.emoji);
  });
}
function seatOfThrow(pid) {
  if (pid === localUid) return document.getElementById('player-hand')?.getBoundingClientRect();
  return document.querySelector(`.opponent[data-uid="${CSS.escape(pid)}"]`)?.getBoundingClientRect();
}
function showThrow(from, to, emoji) {
  if (document.hidden || !THROWABLES.includes(emoji)) return;
  const a = seatOfThrow(from) || { left: innerWidth / 2, top: innerHeight, width: 0, height: 0 };
  const b = seatOfThrow(to);
  if (!b) return;
  const el = document.createElement('div');
  el.className = 'fx-icon fx-throw';
  el.textContent = emoji;
  FX.layer().appendChild(el);
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2, bx = b.left + b.width / 2, by = b.top + b.height / 2;
  const land = () => {
    el.remove();
    const splat = emoji === '🍅' ? ['#e53935', '#ff6b6b', '#8b0000'] : emoji === '💐' ? ['#ff8fc7', '#ffd54a', '#7dffb0'] : ['#ffffff', '#ffd54a', '#a78bfa'];
    FX.burst(b, splat, 12, 50);
    FX.popIcon(b, emoji, 1.8);
    FX.play('pop');
    if (to === localUid) FX.buzz(30);
    FX.shake(to === localUid ? document.getElementById('player-hand') : document.querySelector(`.opponent[data-uid="${CSS.escape(to)}"]`));
  };
  if (!FX.motion()) { land(); return; }
  const mx = (ax + bx) / 2, my = Math.min(ay, by) - 90;
  el.animate([
    { transform: `translate(${ax}px, ${ay}px) translate(-50%,-50%) rotate(0) scale(.8)` },
    { transform: `translate(${mx}px, ${my}px) translate(-50%,-50%) rotate(360deg) scale(1.3)`, offset: .5 },
    { transform: `translate(${bx}px, ${by}px) translate(-50%,-50%) rotate(720deg) scale(1)` }
  ], { duration: 650, easing: 'ease-in-out' }).onfinish = land;
}

// ============================================================
// "Jugar contra bots" · bot level picked by the host
// ============================================================

addStrings({
  'land.bots': ['Jugar contra bots', 'Play against bots'], 'land.defaultName': ['Jugador', 'Player'],
  'bots.level': ['Nivel de los bots', 'Bot level'],
  'bots.easy': ['Fácil', 'Easy'], 'bots.normal': ['Normal', 'Normal'], 'bots.hard': ['Difícil', 'Hard'],
  'bots.easyDesc': ['Juegan cualquier carta, tardan en gritar ¡UNO! y casi nunca te pillan.', 'They play any card, are slow to shout UNO and rarely catch you.'],
  'bots.normalDesc': ['Juegan con cabeza y a veces te pillan.', 'They play sensibly and sometimes catch you.'],
  'bots.hardDesc': ['Gritan al momento, ayudan a su compañero y te pillan casi siempre.', 'They shout straight away, help their partner and almost always catch you.'],
  'err.generic': ['Algo salió mal. Intenta de nuevo.', 'Something went wrong. Try again.']
});
const waitFor = (test, ms = 8000) => new Promise(res => {
  const t0 = Date.now();
  (function check() { if (test()) return res(true); if (Date.now() - t0 > ms) return res(false); setTimeout(check, 120); })();
});
let _quickBusy = false;
async function handleQuickBots() {
  if (_quickBusy) return;
  const input = document.getElementById('player-name');
  if (!input.value.trim()) input.value = t('land.defaultName');
  _quickBusy = true;
  try {
    await handleCreate();
    if (!currentRoomId) return;
    await waitFor(() => roomState?.players?.length >= 1);
    // me and a bot partner (team A) against two bots (team B) — makeBot fills half teams first
    await mutateRoom(cur => {
      const bots = [];
      for (let i = 0; i < 3; i++) bots.push(makeBot([...cur.players, ...bots]));
      return { players: [...cur.players, ...bots] };
    });
    await waitFor(() => roomState?.players?.length >= 4);
    await handleStart();
  } catch (e) {
    console.error('quick bots failed', e);
    showLandingError(t('err.generic'));
  } finally { _quickBusy = false; }
}
async function handleSetBotLevel(level) {
  if (!roomState || roomState.status !== 'lobby' || roomState.hostId !== localUid || !BOT_LEVELS[level]) return;
  await db.collection('rooms').doc(currentRoomId).update({ botLevel: level, lastActivity: firebase.firestore.FieldValue.serverTimestamp() });
}

// ============================================================
// Invite link, QR code, WhatsApp
// ============================================================

addStrings({
  'inv.title': ['Invita a tus amigos', 'Invite your friends'], 'inv.copy': ['Copiar enlace', 'Copy link'],
  'inv.copied': ['¡Copiado!', 'Copied!'], 'inv.whatsapp': ['WhatsApp', 'WhatsApp'], 'inv.share': ['Compartir', 'Share'],
  'inv.qr': ['Código QR', 'QR code'], 'inv.qrHelp': ['Escanéalo con la cámara del móvil para entrar.', 'Scan it with a phone camera to join.'],
  'inv.msg': ['¡Juega UNO TEAMS conmigo, en equipo! Entra aquí: {url}', 'Play UNO TEAMS with me, as a team! Join here: {url}'],
  'inv.joining': ['Entrando en la sala {code}…', 'Joining room {code}…'],
  'inv.needName': ['Escribe tu nombre y pulsa Unirse para entrar en la sala {code}.', 'Type your name and press Join to enter room {code}.']
});
const inviteURL = () => `${location.origin}${location.pathname}?sala=${currentRoomId}`;
let _qrOpen = false;
function inviteHTML() {
  return `<div class="lobby-row invite">
    <div class="mode-label">${t('inv.title')}</div>
    <div class="invite-btns">
      <button type="button" class="seg-btn" onclick="copyInviteLink(this)">🔗 ${t('inv.copy')}</button>
      <a class="seg-btn inv-wa" href="https://wa.me/?text=${encodeURIComponent(t('inv.msg', { url: inviteURL() }))}" target="_blank" rel="noopener">💬 ${t('inv.whatsapp')}</a>
      ${navigator.share ? `<button type="button" class="seg-btn" onclick="shareInvite()">📤 ${t('inv.share')}</button>` : ''}
      <button type="button" class="seg-btn" onclick="toggleInviteQR()" aria-expanded="${_qrOpen}">▦ ${t('inv.qr')}</button>
    </div>
    <div class="invite-qr ${_qrOpen ? '' : 'hidden'}"><div id="invite-qr-code"></div><p class="mode-desc">${t('inv.qrHelp')}</p></div>
  </div>`;
}
function copyInviteLink(btn) {
  const done = () => { btn.textContent = '✓ ' + t('inv.copied'); setTimeout(() => { btn.textContent = '🔗 ' + t('inv.copy'); }, 1500); };
  navigator.clipboard?.writeText(inviteURL()).then(done, done) ?? done();
}
function shareInvite() { navigator.share?.({ title: 'UNO TEAMS', url: inviteURL() }).catch(() => {}); }
function toggleInviteQR() { _qrOpen = !_qrOpen; if (roomState) renderLobby(roomState); }
let _qrLib = null;
function drawInviteQR() {
  const box = document.getElementById('invite-qr-code');
  if (!box) return;
  _qrLib = _qrLib || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  _qrLib.then(() => {
    if (box.dataset.url === inviteURL()) return;
    box.innerHTML = '';
    box.dataset.url = inviteURL();
    new QRCode(box, { text: inviteURL(), width: 172, height: 172, colorDark: '#0b1226', colorLight: '#ffffff' });
  }).catch(() => { _qrLib = null; box.textContent = t('err.generic'); });
}
async function handleInviteParam() {
  const code = new URLSearchParams(location.search).get('sala');
  if (!code) return;
  history.replaceState(null, '', location.pathname);
  if (currentRoomId) return;
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  document.getElementById('room-code-input').value = clean;
  document.getElementById('join-form').classList.remove('hidden');
  const name = document.getElementById('player-name');
  if (name.value.trim()) {
    showLandingError(t('inv.joining', { code: clean }));
    await waitFor(() => !!localUid, 6000);
    handleJoin();
  } else {
    showLandingError(t('inv.needName', { code: clean }));
    name.focus();
  }
}
(function rememberName() {
  const input = document.getElementById('player-name');
  try { if (!input.value) input.value = localStorage.getItem('unoteamsName') || ''; } catch (_) {}
  input.addEventListener('change', () => { try { localStorage.setItem('unoteamsName', input.value.trim()); } catch (_) {} });
})();

// ============================================================
// LOBBY EXTRAS (invite, match length, turn timer, bot level)
// ============================================================
function renderLobbyExtras(state, isHost) {
  resetGameExtras();
  let area = document.getElementById('lobby-extras-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'lobby-extras-area';
    area.className = 'lobby-extras-area';
    document.querySelector('.lobby-card').insertBefore(area, document.querySelector('.lobby-actions'));
  }
  const seg = (items, cur, fn) => items.map(([val, label]) => isHost
    ? `<button type="button" class="seg-btn ${val === cur ? 'selected' : ''}" onclick="${fn}(${JSON.stringify(val).replace(/"/g, '&quot;')})">${label}</button>`
    : `<span class="seg-btn ${val === cur ? 'selected' : 'dim'}">${label}</span>`).join('');
  const timer = state.turnTimer || 0;
  const level = state.botLevel || 'normal';
  const mode = state.matchMode || 'round';
  const hasBots = state.players.some(p => isBot(p.id));
  area.innerHTML = `${inviteHTML()}
    <div class="lobby-row">
      <div class="mode-label">${t('match.label')}</div>
      <div class="seg">${seg([['round', t('match.round')], ['match', t('match.match')]], mode, 'handleSetMatchMode')}</div>
      <p class="mode-desc">${t('match.' + mode + 'Desc')}</p>
    </div>
    <div class="lobby-row">
      <div class="mode-label">${t('timer.label')}</div>
      <div class="seg">${seg(TURN_TIMER_OPTIONS.map(s => [s, s ? t('timer.s', { n: s }) : t('timer.off')]), timer, 'handleSetTurnTimer')}</div>
      ${timer ? `<p class="mode-desc">${t('timer.desc')}</p>` : ''}
    </div>
    ${hasBots ? `<div class="lobby-row">
      <div class="mode-label">${t('bots.level')}</div>
      <div class="seg">${seg(['easy', 'normal', 'hard'].map(l => [l, t('bots.' + l)]), level, 'handleSetBotLevel')}</div>
      <p class="mode-desc">${t('bots.' + level + 'Desc')}</p>
    </div>` : ''}`;
  if (_qrOpen) drawInviteQR();
}

applyStaticI18n();
syncMenu();
updateStatsLink();
