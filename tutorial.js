// ============================================================
// Guided first game (UNO TEAMS)
//
// A short game on this device only: me and my bot partner "Compi" (team ⭐) against two
// rivals (team 💗), with a fixed deck and scripted bot moves so every lesson works:
//   1 pass a card to your partner (start)      6 Wild Team Draw Four: both rivals draw 2
//   2 match the colour                          7 keep going (down to one card)
//   3 a 🔁 passing-symbol card                  8 shout ¡UNO!
//   4 …pick the card that goes to your partner  9 play your last card: you're out, and
//   5 Wild Team Play: the turn jumps to Compi     Compi (1 card left) finishes for the team
//
// While LOCAL_GAME is on, mutateRoom() (app.js) sends every change to localMutate()
// below instead of Firestore: the same rules engine runs on an in-memory room and the
// game is redrawn through onRoomUpdate(). Nothing is saved and it doesn't count in
// your stats.
// ============================================================

let LOCAL_GAME = false;
const TUT_MATE = 'bot_compi', TUT_R1 = 'bot_rival1', TUT_R2 = 'bot_rival2', TUT_ME_FALLBACK = 'tut-me';

addStrings({
  'tut.open':  ['🎓 ¿Primera vez? Aprende jugando (2 min)', '🎓 First time? Learn by playing (2 min)'],
  'tut.mate':  ['Compi', 'Buddy'], 'tut.r1': ['Rival Uno', 'Rival One'], 'tut.r2': ['Rival Dos', 'Rival Two'],
  'tut.step':  ['Paso {n} de 9', 'Step {n} of 9'],
  'tut.skip':  ['Salir del tutorial', 'Leave tutorial'],
  'tut.s1': ['Juegas en equipo con <b>Compi</b>, que se sienta enfrente. Antes de empezar, todos pasan una carta a su compañero. Pásale el <b>Rojo 9</b>: a él le vendrá bien.', 'You play as a team with <b>Buddy</b>, sitting across from you. Before the start, everyone passes a card to their partner. Pass him the <b>Red 9</b>: he can use it.'],
  'tut.s2': ['Juega una carta que coincida en <b>color o número</b> con la de la mesa. Toca el <b>Rojo 5</b>.', 'Play a card that matches the table card\'s <b>colour or number</b>. Tap the <b>Red 5</b>.'],
  'tut.s3': ['El <b>Rojo 3</b> lleva el <b>🔁 símbolo de pase</b>: al jugarlo, tú y Compi os pasáis una carta. Tócalo.', 'The <b>Red 3</b> has the <b>🔁 passing symbol</b>: when you play it, you and Buddy pass each other a card. Tap it.'],
  'tut.s4': ['Elige qué le pasas a Compi: el <b>Azul 3</b>.', 'Pick what you pass to Buddy: the <b>Blue 3</b>.'],
  'tut.s5': ['El <b>🤝 Comodín Juego en Equipo</b> hace que el turno salte directamente a Compi. Si él no puede jugar, robas tú 2. Tócalo y elige <b>Azul</b>.', 'The <b>🤝 Wild Team Play</b> makes the turn jump straight to Buddy. If he can\'t play, you draw 2. Tap it and pick <b>Blue</b>.'],
  'tut.s6': ['El <b>✌️ Comodín Equipo Roba Cuatro</b>: el siguiente roba 2 y pierde su turno, ¡y su compañero también roba 2! Tócalo y elige <b>Amarillo</b>.', 'The <b>✌️ Wild Team Draw Four</b>: the next player draws 2 and loses their turn, and their partner draws 2 too! Tap it and pick <b>Yellow</b>.'],
  'tut.s7': ['Sigue: juega el <b>Amarillo 7</b> (la carta que te pasó Compi al principio).', 'Keep going: play the <b>Yellow 7</b> (the card Buddy passed you at the start).'],
  'tut.s8': ['¡Te queda una carta! Grita <b>¡UNO!</b> antes de que te pillen (si te pillan, robas 2). Tu compañero también puede gritarlo por ti.', 'One card left! Shout <b>UNO!</b> before someone catches you (if they do, you draw 2). Your partner can shout it for you too.'],
  'tut.s9': ['Juega tu última carta, el <b>Amarillo 4</b>. Como a Compi solo le queda 1, no te pasa la mitad: te quedas fuera y él termina por el equipo.', 'Play your last card, the <b>Yellow 4</b>. Buddy has just 1 card, so he doesn\'t pass you half: you stay out and he finishes for the team.'],
  'tut.wait':  ['Turno de otro jugador… mira lo que hace.', "Another player's turn… watch what they do."],
  'tut.out':   ['Estás fuera. Si Compi juega su última carta, ¡ganáis los dos!', "You're out. If Buddy plays his last card, you both win!"],
  'tut.doneT': ['¡Tu equipo ganó la ronda!', 'Your team won the round!'],
  'tut.done':  ['Ya sabes lo básico. Recuerda: si te quedas sin cartas y a tu compañero le quedan 2 o más, <b>te pasa la mitad</b>; y si estás fuera y él roba, <b>te vuelve a pasar la mitad</b>. Míralo en las reglas o mantén pulsada una carta.',
                'You know the basics. Remember: if you go out and your partner has 2 or more cards, <b>they pass you half</b>; and if you\'re out and they draw, <b>they pass you half again</b>. See the rules or hold a card.'],
  'tut.again': ['Jugar contra bots', 'Play against bots'],
  'tut.home':  ['Volver al inicio', 'Back to start']
});
// This file loads after extras.js already filled in the page text, so fill it in again
// for the keys added just above (e.g. the winner screen's "Back to start")
applyStaticI18n();

// ---------- In-memory room (used by mutateRoom in app.js) ----------
const LocalRoom = { data: null };
const tutClone = o => JSON.parse(JSON.stringify(o));
let _localTimer = null;
function localMutate(fn) {
  if (!LocalRoom.data) return 'noRoom';
  const patch = fn(tutClone(LocalRoom.data));
  if (!patch || typeof patch === 'string') return patch || 'noChange';
  Object.assign(LocalRoom.data, tutClone(patch));
  // redraw on the next tick, like a database update arriving
  clearTimeout(_localTimer);
  _localTimer = setTimeout(() => {
    if (!LOCAL_GAME || !LocalRoom.data) return;
    roomState = tutClone(LocalRoom.data);
    onRoomUpdate(roomState);
  }, 0);
  return null;
}

// ---------- The lesson's cards ----------
// Seats go me · Rival Uno · Compi · Rival Dos. Every bot holds exactly the cards it
// plays in the script below, in that order (plus spares it never needs).
let _tid = 500;
const tc = (c, v, extra = {}) => ({ id: _tid++, c, v, ...extra });
let TUT = null;
function buildTutorialDeck() {
  _tid = 500;
  const d = {
    // me: Red 9 goes to Compi at the start, Blue 3 at the 🔁 swap
    red9: tc('red', '9'), red5: tc('red', '5'), red3: tc('red', '3', { pass: true }), blue3: tc('blue', '3'),
    teamPlay: tc('wild', 'teamPlay'), team4: tc('wild', 'team4'),
    // Compi: Yellow 7 comes to me at the start, Yellow 4 at the swap
    y7: tc('yellow', '7'), y4: tc('yellow', '4'), red1: tc('red', '1'), y8: tc('yellow', '8'), y2: tc('yellow', '2'), y1: tc('yellow', '1'),
    // Rival Uno and Rival Dos (they swap their green spares at the start)
    g5: tc('green', '5'), red2: tc('red', '2'), red8: tc('red', '8'), y9: tc('yellow', '9'), y6: tc('yellow', '6'),
    g6: tc('green', '6'), red6: tc('red', '6'), red4: tc('red', '4'), blue6: tc('blue', '6'), y5: tc('yellow', '5'), y3: tc('yellow', '3')
  };
  d.hands = {
    me: ['red9', 'red5', 'red3', 'blue3', 'teamPlay', 'team4'],
    [TUT_MATE]: ['y7', 'y4', 'red1', 'y8', 'y2', 'y1'],
    [TUT_R1]: ['g5', 'red2', 'red8', 'y9', 'y6'],
    [TUT_R2]: ['g6', 'red6', 'red4', 'blue6', 'y5', 'y3']
  };
  // what each bot does: the cards it passes (in order) and plays (in order)
  d.script = {
    [TUT_MATE]: { give: ['y7', 'y4'], play: ['red9', 'red1', 'blue3', 'y8', 'y2', 'y1'] },
    [TUT_R1]:   { give: ['g5'], play: ['red2', 'red8', 'y9', 'y6'] },
    [TUT_R2]:   { give: ['g6'], play: ['red6', 'red4', 'blue6', 'y5', 'y3'] }
  };
  // my lessons: which card each step wants
  d.mine = { 1: 'red9', 2: 'red5', 3: 'red3', 4: 'blue3', 5: 'teamPlay', 6: 'team4', 7: 'y7', 9: 'y4' };
  d.playOrder = [2, 3, 5, 6, 7, 9];
  return d;
}

function startTutorial() {
  closeRules();
  LOCAL_GAME = true;
  if (!localUid) localUid = TUT_ME_FALLBACK;
  const me = localUid;
  const raw = document.getElementById('player-name').value.trim() || t('land.defaultName');
  localName = selectedEmoji ? `${selectedEmoji} ${raw}` : raw;
  currentRoomId = 'TUTORIAL';
  TUT = buildTutorialDeck();
  const st = Engine.newRound([
    { id: me, name: localName, team: 'A' },
    { id: TUT_R1, name: `😈 ${t('tut.r1')}`, isBot: true, persona: 'balanced', team: 'B' },
    { id: TUT_MATE, name: `🤝 ${t('tut.mate')}`, isBot: true, persona: 'teamer', team: 'A' },
    { id: TUT_R2, name: `👿 ${t('tut.r2')}`, isBot: true, persona: 'balanced', team: 'B' }
  ], { matchTarget: 0 });
  const cards = ids => ids.map(k => tutClone(TUT[k]));
  st.hands = { [me]: cards(TUT.hands.me) };
  for (const id of [TUT_MATE, TUT_R1, TUT_R2]) st.hands[id] = cards(TUT.hands[id]);
  st.discard = [tc('red', '7')];
  st.topColor = 'red'; st.topValue = '7';
  // the 4 cards from the Team Draw Four come first; none of them is ever needed
  st.drawPile = Array.from({ length: 30 }, (_, i) => tc(['green', 'blue', 'green', 'blue'][i % 4], String(1 + i % 9)));
  st.players = st.players.map(p => ({ ...p, cardCount: st.hands[p.id].length }));
  st.currentPlayerIndex = 0;
  st.log = [];
  LocalRoom.data = { ...st, game: GAME_TAG, hostId: me, endVotes: [], botLevel: 'easy' };
  document.body.classList.add('tutorial');
  fxPrevState = null;
  roomState = tutClone(LocalRoom.data);
  onRoomUpdate(roomState);
}

// Which lesson we're on, read from the game itself
function tutorialStep(state) {
  const me = localUid;
  if (!TUT || state.status !== 'playing') return 0;
  if ((state.uno || []).some(u => u.pid === me)) return 8;
  const ph = state.phase;
  if (ph?.k === 'swap' && Engine.waitingFor(state).includes(me)) return ph.why === 'start' ? 1 : 4;
  if (!isMyTurn(state)) return 0;
  const hand = state.hands?.[me] || [];
  return TUT.playOrder.find(step => hand.some(c => c.id === TUT[TUT.mine[step]].id)) || 0;
}
function tutorialWantId(step) {
  return TUT && TUT.mine[step] ? TUT[TUT.mine[step]].id : null;
}
function tutorialAllowsCard(card) { return card.id === tutorialWantId(tutorialStep(roomState)); }
function tutorialAllowsDraw() { return false; }
function tutorialAllowsShout(kind) { return kind === 'shout'; }

// What each lesson wants from the colour window (shown already picked). Whatever is
// tapped, the move is steered to this so the lesson can go on.
const TUT_PLAY = { 5: { color: 'blue' }, 6: { color: 'yellow' } };
function tutorialPresetPlay(pick) {
  const want = TUT_PLAY[tutorialStep(roomState)];
  if (want?.color) pick.color = want.color;
}
function tutorialFixMove(move) {
  const want = TUT_PLAY[tutorialStep(roomState)];
  return want?.color ? { ...move, color: want.color } : move;
}

function tutorialRender(state) {
  let coach = document.getElementById('coach');
  if (!coach) {
    coach = document.createElement('div');
    coach.id = 'coach';
    coach.className = 'coach';
    document.querySelector('.hand-area')?.before(coach);
  }
  const step = tutorialStep(state);
  const out = !(state.hands?.[localUid] || []).length;
  coach.innerHTML = `
    <div class="coach-head"><span class="coach-step">${step ? t('tut.step', { n: step }) : ''}</span>
      <button type="button" class="link-btn coach-skip" onclick="endTutorial()">${t('tut.skip')}</button></div>
    <div class="coach-text">${step ? t('tut.s' + step) : out ? t('tut.out') : t('tut.wait')}</div>`;
  coach.classList.toggle('waiting', !step);
  // the wanted card pulses, in the hand and in the pass window
  const want = tutorialWantId(step);
  document.querySelectorAll('#player-hand .card[data-id], .pass-hand .card[data-id]').forEach(el => {
    el.classList.toggle('coach-pulse', +el.dataset.id === want);
  });
}

// The bots follow the script; called from doBotTick instead of the normal bot brain
async function tutorialBotTick(state) {
  if (state.status !== 'playing' || !TUT) return;
  // a bot down to one card shouts for itself
  const loud = (state.uno || []).find(u => u.pid !== localUid);
  if (loud) { await sendMove({ t: 'shout' }, loud.pid); return; }
  if ((state.uno || []).some(u => u.pid === localUid)) return;   // waiting for me to shout first
  const botId = Engine.waitingFor(state).find(id => isBot(id));
  if (!botId) return;
  const hand = state.hands[botId] || [];
  const plan = TUT.script[botId];
  const has = k => hand.find(c => c.id === TUT[k].id);
  let move = null;
  if (state.phase?.k === 'swap') {
    const k = plan.give.find(has);
    move = { t: 'swap', id: k ? TUT[k].id : hand[0]?.id };
  } else if (state.phase?.k === 'give') {
    move = { t: 'give', ids: Engine.givePick(hand, state.phase.n) };
  } else {
    const k = plan.play.find(k => has(k) && Engine.isPlayable(TUT[k], state));
    move = k ? { t: 'play', id: TUT[k].id } : Engine.botMove(state, botId, 'balanced', {});
  }
  if (move) await sendMove(move, botId);
}

function tutorialOutro() {
  document.getElementById('coach')?.remove();
  let m = document.getElementById('tut-outro');
  if (!m) {
    m = document.createElement('div');
    m.id = 'tut-outro';
    m.className = 'spotify-modal';
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="spotify-modal-card tut-card">
    <div class="tut-trophy">🏆</div>
    <h3 class="spotify-modal-title">${t('tut.doneT')}</h3>
    <p class="spotify-modal-desc">${t('tut.done')}</p>
    <div class="spotify-modal-btns">
      <button class="btn btn-primary" onclick="endTutorial(); handleQuickBots();">🤖 ${t('tut.again')}</button>
      <button class="btn btn-ghost" onclick="endTutorial()">${t('tut.home')}</button>
    </div>
  </div>`;
  m.classList.remove('hidden');
  try { localStorage.setItem('unoteamsTutorialDone', '1'); } catch (_) {}
  updateTutorialLink();
}

function endTutorial() {
  LOCAL_GAME = false;
  LocalRoom.data = null;
  TUT = null;
  if (localUid === TUT_ME_FALLBACK) localUid = auth.currentUser?.uid || null;
  _celebrated = null;
  roomState = null;
  currentRoomId = null;
  fxPrevState = null;
  document.body.classList.remove('tutorial');
  document.getElementById('coach')?.remove();
  document.getElementById('tut-outro')?.remove();
  ['uno-call-overlay', 'claim-dialog', 'challenge-area'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  FX.layer().innerHTML = '';
  showScreen('landing');
}

function updateTutorialLink() {
  const el = document.getElementById('tutorial-link');
  if (!el) return;
  el.innerHTML = t('tut.open');
  let seen = false;
  try { seen = !!localStorage.getItem('unoteamsTutorialDone') || loadMyStats().games > 0; } catch (_) {}
  el.classList.toggle('first-time', !seen);
}
document.addEventListener('langchange', updateTutorialLink);
updateTutorialLink();
