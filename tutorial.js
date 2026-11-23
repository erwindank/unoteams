// ============================================================
// Guided first game (¡CAMALEÓN!)
//
// A short game on this device only, against "Profe Camaleón", with a fixed deck so every
// lesson works:
//   1 match the colour                        5 flex Skip → SKIP ALL (you play again)
//   2 play a Draw Two                         6 Wild All Flip: everybody's Power Card flips
//   3 a flex card: its flex colour matches    7 shout ¡ÚLTIMA!
//     (your ⚡ Power Card turns red)            8 play your last card and win
//   4 a 🔄 number card turns it green again
//
// While LOCAL_GAME is on, mutateRoom() (app.js) sends every change to localMutate()
// below instead of Firestore: the same rules engine runs on an in-memory room and the
// game is redrawn through onRoomUpdate(). Nothing is saved and it doesn't count in
// your stats.
// ============================================================

let LOCAL_GAME = false;
const TUT_BOT = 'bot_profe', TUT_ME_FALLBACK = 'tut-me';

addStrings({
  'tut.open':  ['🎓 ¿Primera vez? Aprende jugando (2 min)', '🎓 First time? Learn by playing (2 min)'],
  'tut.bot':   ['Profe Camaleón', 'Prof. Chameleon'],
  'tut.step':  ['Paso {n} de 8', 'Step {n} of 8'],
  'tut.skip':  ['Salir del tutorial', 'Leave tutorial'],
  'tut.s1': ['Juega una carta que coincida en <b>color o número</b> con la de la mesa. Toca el <b>Rojo 5</b>.', 'Play a card that matches the table card\'s <b>colour or number</b>. Tap the <b>Red 5</b>.'],
  'tut.s2': ['¡Ataca! El <b>Rojo Roba Dos</b> hace que el Profe robe 2 y pierda su turno. Tócalo.', 'Attack! The <b>Red Draw Two</b> makes the Prof draw 2 and lose his turn. Tap it.'],
  'tut.s3': ['Tu <b>Azul 4</b> es una <b>🦎 carta flex</b>: su franja de abajo es roja. Con tu <b>⚡ Carta de Poder</b> en verde puedes jugar ese <b>lado flex</b> sobre el rojo. Tócala y elige <b>Lado flex</b>. Ojo: el siguiente seguirá con <b>azul</b>, y tu ⚡ pasará a rojo.', 'Your <b>Blue 4</b> is a <b>🦎 flex card</b>: its foot is red. With your <b>⚡ Power Card</b> green you may play that <b>flex side</b> on the red. Tap it and pick <b>Flex side</b>. Note: the next player follows <b>blue</b>, and your ⚡ turns red.'],
  'tut.s4': ['Tu ⚡ está en rojo. El <b>Azul 2</b> tiene el icono <b>🔄</b>: al jugarlo, tu Carta de Poder se voltea… ¡de vuelta a verde! Tócalo.', 'Your ⚡ is red. The <b>Blue 2</b> has the <b>🔄</b> icon: playing it flips your Power Card… back to green! Tap it.'],
  'tut.s5': ['El <b>Azul Salto</b> también es flex. Su lado flex es <b>⊘⊘ SALTA A TODOS</b>: el turno vuelve a ti. Tócalo y elige <b>Lado flex</b>.', 'The <b>Blue Skip</b> is flex too. Its flex side is <b>⊘⊘ SKIP ALL</b>: the turn comes back to you. Tap it and pick <b>Flex side</b>.'],
  'tut.s6': ['El <b>Comodín Voltea Todos</b> voltea TODAS las Cartas de Poder: la tuya vuelve a verde y la del Profe pasa a rojo. Tócalo y elige <b>Amarillo</b>.', "The <b>Wild All Flip</b> flips EVERY Power Card: yours goes back to green and the Prof's turns red. Tap it and pick <b>Yellow</b>."],
  'tut.s7': ['¡Te queda una carta! Grita <b>¡ÚLTIMA!</b> antes de que te pillen (si te pillan, robas 2).', 'One card left! Shout <b>LAST CARD!</b> before someone catches you (if they do, you draw 2).'],
  'tut.s8': ['Juega tu última carta, el <b>Amarillo 1</b>, y gana.', 'Play your last card, the <b>Yellow 1</b>, and win.'],
  'tut.wait':  ['Turno del Profe… mira lo que hace.', "The Prof's turn… watch what he does."],
  'tut.doneT': ['¡Ganaste tu primera ronda!', 'You won your first round!'],
  'tut.done':  ['Ya sabes lo básico. Aún te quedan sorpresas: los otros lados flex (<b>Roba Dos</b>: todos roban 1, <b>Reversa</b>: cambia y salta, los comodines <b>🎯 Diana</b> y <b>Todos Roban</b>), el <b>Comodín Roba Cuatro</b> y los <b>⚖️ desafíos</b>. Míralos en las reglas o mantén pulsada una carta.',
                'You know the basics. More surprises are waiting: the other flex sides (<b>Draw Two</b>: everyone draws 1, <b>Reverse</b>: reverse and skip, the <b>🎯 Target</b> and <b>All Draw</b> wilds), the <b>Wild Draw Four</b> and <b>⚖️ challenges</b>. See the rules or hold a card.'],
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
let _tid = 500;
const tc = (c, v, extra = {}) => ({ id: _tid++, c, v, ...extra });     // classic / wild
const tf = (c, c2, v) => ({ id: _tid++, c, c2, v, flex: true });        // flex card
// my hand, in the order the lesson plays it
const TUT_MINE = () => [
  tc('red', '5'),                        // 1
  tc('red', 'draw2'),                    // 2
  tf('blue', 'red', '4'),                // 3  flex side: matches red, blue carries on
  tc('blue', '2', { flip: true }),       // 4  🔄: my Power Card back to green
  tf('blue', 'yellow', 'skip'),          // 5  flex side: skip all
  tc('wild', 'wildFlip'),                // 6  → Yellow
  tc('yellow', '1')                      // 8  (7 = shout)
];
const TUT_STEPS = [1, 2, 3, 4, 5, 6, 8];   // step shown while each of my cards is next
// The Profe's hand is built so exactly one colour fits each time it's his turn
const TUT_BOT_HAND = () => [
  tc('red', '8'),                        // answers my Red 5
  tc('blue', '6'), tc('blue', '8'),      // answer my Blue 4 and my Blue 2
  tc('yellow', '3'),                     // answers my Wild All Flip (Yellow)
  tc('green', '1'), tc('green', '7'), tc('green', '3')
];
let _tutMine = [];

function startTutorial() {
  closeRules();
  LOCAL_GAME = true;
  if (!localUid) localUid = TUT_ME_FALLBACK;
  const me = localUid;
  const raw = document.getElementById('player-name').value.trim() || t('land.defaultName');
  localName = selectedEmoji ? `${selectedEmoji} ${raw}` : raw;
  currentRoomId = 'TUTORIAL';
  _tid = 500;
  _tutMine = TUT_MINE();
  const st = Engine.newRound([
    { id: me, name: localName },
    { id: TUT_BOT, name: `🦎 ${t('tut.bot')}`, isBot: true, persona: 'balanced' }
  ], { matchTarget: 0 });
  st.hands = { [me]: tutClone(_tutMine), [TUT_BOT]: TUT_BOT_HAND() };
  st.discard = [tc('red', '3')];
  st.topColor = 'red'; st.topValue = '3';
  // the 2 cards from my Draw Two come first (they never fit when the Profe has to play)
  st.drawPile = [tc('green', '6'), tc('green', '7'), ...Array.from({ length: 30 }, (_, i) =>
    tc(['green', 'yellow', 'blue', 'red'][i % 4], String(1 + i % 8)))];
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
  if (state.uno?.pid === me) return 7;
  if (!isMyTurn(state)) return 0;
  const hand = state.hands?.[me] || [];
  const k = _tutMine.findIndex(c => hand.some(h => h.id === c.id));
  return k >= 0 ? TUT_STEPS[k] : 0;
}
function tutorialWantId(step) {
  const k = TUT_STEPS.indexOf(step);
  return k >= 0 ? _tutMine[k].id : null;
}
function tutorialAllowsCard(card) { return card.id === tutorialWantId(tutorialStep(roomState)); }
function tutorialAllowsDraw() { return false; }
function tutorialAllowsShout(kind) { return kind === 'shout'; }

// What each lesson wants from the play window: the side (shown already picked) and the colour.
// Whatever is tapped, the move is steered to this so the lesson can go on.
const TUT_PLAY = { 3: { flex: true }, 5: { flex: true }, 6: { color: 'yellow' } };
function tutorialPresetPlay(pick) {
  const want = TUT_PLAY[tutorialStep(roomState)];
  if (!want) return;
  if (want.flex) pick.flex = true;
  if (want.color) pick.color = want.color;
}
function tutorialFixMove(move) {
  const want = TUT_PLAY[tutorialStep(roomState)];
  if (!want) return move;
  const out = { ...move };
  if (want.flex) out.flex = true;
  if (want.color) out.color = want.color;
  return out;
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
  coach.innerHTML = `
    <div class="coach-head"><span class="coach-step">${step ? t('tut.step', { n: step }) : ''}</span>
      <button type="button" class="link-btn coach-skip" onclick="endTutorial()">${t('tut.skip')}</button></div>
    <div class="coach-text">${step ? t('tut.s' + step) : t('tut.wait')}</div>`;
  coach.classList.toggle('waiting', !step);
  const want = tutorialWantId(step);
  document.querySelectorAll('#player-hand .card[data-id]').forEach(el => {
    el.classList.toggle('coach-pulse', +el.dataset.id === want);
  });
}

// The Profe plays whatever fits (his hand is built so the fitting card is the scripted
// one); called from doBotTick instead of the normal bot brain
async function tutorialBotTick(state) {
  if (state.status !== 'playing' || whoActs(state) !== TUT_BOT) return;
  if (state.uno?.pid === localUid) return;   // waiting for me to shout first
  const move = Engine.botMove(state, TUT_BOT, 'balanced', { fair: true, challenge: 0 });
  if (move) await sendMove(move, TUT_BOT);
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
  try { localStorage.setItem('camaleonTutorialDone', '1'); } catch (_) {}
  updateTutorialLink();
}

function endTutorial() {
  LOCAL_GAME = false;
  LocalRoom.data = null;
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
  try { seen = !!localStorage.getItem('camaleonTutorialDone') || loadMyStats().games > 0; } catch (_) {}
  el.classList.toggle('first-time', !seen);
}
document.addEventListener('langchange', updateTutorialLink);
updateTutorialLink();
