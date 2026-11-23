// ============================================================
// I18N — Spanish / English text
//
// t('key', { name: 'Ana' }) returns the text in the chosen language, with {name}
// replaced. Missing English keys fall back to Spanish, missing keys show the key.
// Loaded before every other script so all of them can use t().
//
// The game log is saved as { k: 'log.play', p: {...} } (see engine.js), so every
// player reads it in their own language — no translating of saved sentences needed.
// ============================================================

const I18N = { es: {}, en: {} };

// The chosen language: saved per device, Spanish by default
let LANG = (() => {
  try { return localStorage.getItem('unoteamsLang') === 'en' ? 'en' : 'es'; } catch (_) { return 'es'; }
})();
try { document.documentElement.lang = LANG; } catch (_) {}

function t(key, params) {
  let s = I18N[LANG]?.[key] ?? I18N.es[key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m));
  return s;
}

// Adds a block of strings: addStrings({ key: ['español', 'English'], ... })
function addStrings(map) {
  for (const [k, [es, en]] of Object.entries(map)) {
    I18N.es[k] = es;
    I18N.en[k] = en ?? es;
  }
}

// English only: for fixed text in index.html, whose Spanish is written in the page
function addEnglish(map) { Object.assign(I18N.en, map); }

// Switches language, saves it, and tells the page to redraw ('langchange' event)
function setLanguage(lang) {
  LANG = lang === 'en' ? 'en' : 'es';
  try { localStorage.setItem('unoteamsLang', LANG); } catch (_) {}
  document.documentElement.lang = LANG;
  applyStaticI18n();
  document.dispatchEvent(new Event('langchange'));
}

// Fixed text in index.html: elements with data-i18n="key" (text) or
// data-i18n-ph="key" (placeholder) / data-i18n-title="key" (tooltip).
// The Spanish text written in the HTML is kept as the fallback.
function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.dataset.i18nEs === undefined) el.dataset.i18nEs = el.innerHTML;
    const k = el.dataset.i18n;
    el.innerHTML = (LANG === 'es' || !I18N.en[k]) ? (I18N.es[k] ?? el.dataset.i18nEs) : I18N.en[k];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    if (el.dataset.i18nPhEs === undefined) el.dataset.i18nPhEs = el.placeholder;
    el.placeholder = I18N[LANG][el.dataset.i18nPh] ?? el.dataset.i18nPhEs;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    if (el.dataset.i18nTitleEs === undefined) el.dataset.i18nTitleEs = el.title;
    el.title = I18N[LANG][el.dataset.i18nTitle] ?? el.dataset.i18nTitleEs;
  });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('selected', b.dataset.lang === LANG));
}

const colorLabel = c => t('color.' + c);

// ---- Cards and teams ----
addStrings({
  'color.red': ['Rojo', 'Red'], 'color.yellow': ['Amarillo', 'Yellow'], 'color.green': ['Verde', 'Green'], 'color.blue': ['Azul', 'Blue'],
  'color.wild': ['Comodín', 'Wild'],
  'card.draw2': ['Roba Dos', 'Draw Two'], 'card.reverse': ['Reversa', 'Reverse'], 'card.skip': ['Salto', 'Skip'],
  'card.wild': ['Comodín', 'Wild'], 'card.teamPlay': ['Comodín Juego en Equipo', 'Wild Team Play'],
  'card.team4': ['Comodín Equipo Roba Cuatro', 'Wild Team Draw Four'],
  'card.passIcon': ['🔁 Símbolo de pase: tú y tu compañero os pasáis una carta', '🔁 Passing symbol: you and your partner pass each other a card'],
  // the four teams: a name, an emoji and a colour each (the colours are in app.js)
  'team.A': ['Estrellas', 'Stars'], 'team.B': ['Corazones', 'Hearts'], 'team.C': ['Rayos', 'Bolts'], 'team.D': ['Lunas', 'Moons'],
  'team.word': ['Equipo', 'Team'], 'team.mate': ['Tu compañero', 'Your partner'], 'team.you': ['Tu equipo', 'Your team'],
  'team.mateShort': ['compañero', 'partner'], 'team.out': ['fuera', 'out'],
  'team.outLong': ['Fuera — espera a que su compañero robe', 'Out — waiting for their partner to draw']
});

// ---- The game log (engine.js writes {k, p}) ----
// {name}/{target}/{mate} are players, {card} the card played, {color} a colour
addStrings({
  'log.start':        ['¡Partida iniciada! Empieza {name}.', 'Game on! {name} starts.'],
  'log.play':         ['{name} jugó {card}.', '{name} played {card}.'],
  'log.playWild':     ['{name} jugó {card} y eligió {color}.', '{name} played {card} and chose {color}.'],
  'log.drawSkip':     ['{name} roba {n} y pierde su turno.', '{name} draws {n} and loses their turn.'],
  'log.skip':         ['{name} pierde su turno.', '{name} loses their turn.'],
  'log.reverse':      ['¡Cambio de sentido!', 'Direction reversed!'],
  'log.teamPlay':     ['🤝 {name} pasa el turno a {mate} ({color}).', '🤝 {name} hands the turn to {mate} ({color}).'],
  'log.teamPlayNone': ['{name}: su compañero está fuera, cuenta como comodín normal.', '{name}: their partner is out, so it works as a plain wild.'],
  'log.teamPlayFail': ['🤝 {name} no pudo jugar: {by} roba {n}.', "🤝 {name} couldn't play: {by} draws {n}."],
  'log.team4':        ['✌️ {name} roba 2 y pierde su turno, y {mate} también roba 2.', '✌️ {name} draws 2 and loses their turn, and {mate} draws 2 too.'],
  'log.swapStart':    ['🔁 Todos pasaron una carta a su compañero.', '🔁 Everyone passed a card to their partner.'],
  'log.swap':         ['🔁 {name} y {mate} se pasaron una carta.', '🔁 {name} and {mate} passed each other a card.'],
  'log.timeoutSwap':  ['⏰ Se eligió la carta de quien tardaba.', '⏰ A card was picked for whoever was slow.'],
  'log.out':          ['🏃 ¡{name} se quedó sin cartas! {mate} le pasa la mitad.', '🏃 {name} is out of cards! {mate} passes them half.'],
  'log.outStay':      ['🏃 ¡{name} se quedó sin cartas! {mate} solo tiene una, así que {name} queda fuera.', '🏃 {name} is out of cards! {mate} has only one, so {name} stays out.'],
  'log.give':         ['{name} pasó {n} cartas a {mate}.', '{name} passed {n} cards to {mate}.'],
  'log.tagBack':      ['🙌 {name} robó y pasó {n} a {mate}: ¡{mate} vuelve al juego!', '🙌 {name} drew and passed {n} to {mate}: {mate} is back in!'],
  'log.drewPass':     ['{name} robó una carta y pasó.', '{name} drew a card and passed.'],
  'log.pass':         ['{name} pasó (no quedan cartas para robar).', '{name} passed (no cards left to draw).'],
  'log.shout':        ['📣 ¡{name} grita ¡UNO!', '📣 {name} shouts UNO!'],
  'log.shoutMate':    ['📣 ¡{name} grita ¡UNO! por {mate}!', '📣 {name} shouts UNO for {mate}!'],
  'log.caught':       ['🚨 {name} pilló a {target} sin gritar: {target} roba 2.', "🚨 {name} caught {target} not shouting: {target} draws 2."],
  'log.reshuffle':    ['Se acabó el mazo: se barajó el descarte.', 'The deck ran out: the discard pile was shuffled.'],
  'log.win':          ['🏆 ¡{name} se quedaron sin cartas! +{pts} puntos.', '🏆 {name} are out of cards! +{pts} points.'],
  'log.timeout':      ['⏰ {name} se quedó sin tiempo.', '⏰ {name} ran out of time.'],
  'log.skipGone':     ['Se saltó el turno de {name} (desconectado).', "{name}'s turn was skipped (disconnected)."],
  'log.gone':         ['{name} se desconectó.', '{name} disconnected.'],
  'log.standIn':      ['🤖 Un bot juega por {name} hasta que vuelva.', '🤖 A bot plays for {name} until they come back.'],
  'log.back':         ['{name} se reconectó.', '{name} reconnected.'],
  'log.left':         ['{name} salió de la partida.', '{name} left the game.'],
  'log.vote':         ['{name} propone terminar ({n}/{t}).', '{name} wants to end the game ({n}/{t}).'],
  'log.unvote':       ['{name} retiró su voto para terminar.', '{name} withdrew their vote to end.']
});

// ---- Game words (app.js) ----
addStrings({
  'ui.copy': ['Copiar', 'Copy'], 'ui.copied': ['¡Copiado!', 'Copied!'], 'ui.cancel': ['Cancelar', 'Cancel'],
  'ui.close': ['Cerrar', 'Close'], 'ui.retry': ['Reintentar', 'Try again'], 'ui.disconnect': ['Desconectar', 'Disconnect'],
  'ui.someone': ['Alguien', 'Someone'], 'chat.me': ['(yo)', '(me)'],
  'err.name': ['Escribe tu nombre primero', 'Type your name first'],
  'err.connecting': ['Aún conectando… intenta de nuevo', 'Still connecting… try again'],
  'err.code': ['Introduce el código de sala de 6 caracteres', 'Enter the 6-character room code'],
  'err.notFound': ['Sala no encontrada', 'Room not found'],
  'err.ended': ['La partida ya terminó', 'That game has already ended'],
  'err.started': ['La partida ya comenzó (los equipos están completos)', 'That game has already started (the teams are full)'],
  'err.full': ['Sala llena (máximo {n})', 'Room full (max {n})'],
  'lob.removeBot': ['Quitar bot', 'Remove bot'], 'lob.back': ['vuelve', 'back'], 'lob.readyBadge': ['✓ listo', '✓ ready'],
  'lob.dc': ['desconectado', 'disconnected'], 'lob.ready': ['✓ Estás listo para jugar', "✓ You're ready to play"],
  'lob.again': ['¡Quiero jugar de nuevo!', 'I want to play again!'], 'lob.start': ['Iniciar partida', 'Start game'],
  'lob.waitingPlayers': ['Faltan jugadores…', 'Waiting for players…'], 'lob.addBot': ['+ Añadir bot', '+ Add bot'],
  // team slots in the waiting room
  'lob.teamsTitle': ['Equipos', 'Teams'],
  'lob.teamsHelp': ['Cada equipo son 2 compañeros, sentados uno frente al otro. Toca «Unirme» para cambiar de equipo.', 'Each team is 2 partners, sitting across from each other. Tap "Join" to change team.'],
  'lob.join': ['Unirme', 'Join'], 'lob.empty': ['Sitio libre', 'Free seat'],
  'lob.fill': ['🤖 Completar con bots', '🤖 Fill with bots'],
  'lob.needTeams': ['Hacen falta al menos 2 equipos completos (de 2).', 'You need at least 2 full teams (of 2).'],
  'lob.halfTeam': ['Hay un equipo con un solo jugador.', 'One team has only one player.'],
  'lob.shuffle': ['🔀 Mezclar equipos', '🔀 Shuffle teams'],
  'lob.addTeam': ['+ Otro equipo', '+ Another team'],
  'vc.title': ['Chat de voz', 'Voice chat'], 'vc.opened': ['{name} abrió el micrófono', '{name} turned their mic on'],
  'vc.left': ['{name} dejó el chat de voz', '{name} left voice chat'], 'vc.muted': ['{name} silenció el micrófono', '{name} muted their mic'],
  'vc.unmuted': ['{name} activó el micrófono', '{name} unmuted their mic'], 'vc.noMic': ['No se pudo acceder al micrófono', 'Could not use the microphone'],
  'vc.join': ['Unirse al chat de voz', 'Join voice chat'], 'vc.mute': ['Silenciar micrófono', 'Mute microphone'], 'vc.leave': ['Salir del chat de voz', 'Leave voice chat'],
  'uno.mine': ['¡Solo te queda 1 carta!', 'You only have 1 card left!'], 'uno.shout': ['¡UNO!', 'UNO!'],
  'uno.mate': ['¡A {name} le queda 1 carta!', '{name} has 1 card left!'], 'uno.shoutFor': ['¡UNO! POR {name}', 'UNO! FOR {name}'],
  'uno.other': ['¡{name} tiene 1 carta y no ha gritado!', "{name} has 1 card and hasn't shouted!"],
  'uno.callOn': ['¡PILLAR A {name}!', 'CATCH {name}!'],
  'st.yourTurn': ['✨ ¡Tu turno! Elige una carta.', '✨ Your turn! Pick a card.'],
  'st.turnOf': ['Turno de {name}', "{name}'s turn"],
  'st.teamPlayMe': ['🤝 ¡Tu compañero te pasó el turno! Juega una carta o {name} roba 2.', '🤝 Your partner handed you the turn! Play a card or {name} draws 2.'],
  'st.teamPlayOther': ['🤝 {name} tiene el turno de su compañero', "🤝 {name} has their partner's turn"],
  'st.swapMe': ['🔁 Elige una carta para tu compañero', '🔁 Pick a card for your partner'],
  'st.swapWait': ['🔁 Pasando cartas…', '🔁 Passing cards…'],
  'st.giveMe': ['🏃 Pasa {n} cartas a {name}', '🏃 Pass {n} cards to {name}'],
  'st.giveWait': ['🏃 {name} pasa {n} cartas a {mate}…', '🏃 {name} is passing {n} cards to {mate}…'],
  'st.outMe': ['Estás fuera. Si tu compañero roba, te pasa la mitad.', "You're out. If your partner draws, they pass you half."],
  'st.colorNow': ['Color: {color}', 'Colour: {color}'],
  'hand.drawnOk': ['¡Robaste una carta que sirve! Juégala o pasa.', 'You drew a card you can play! Play it or pass.'],
  'hand.pick': ['Tu turno — toca una carta para jugarla', 'Your turn — tap a card to play it'],
  'hand.count': ['Tu mano ({n})', 'Your hand ({n})'],
  'hand.out': ['Estás fuera — tu compañero sigue', "You're out — your partner plays on"],
  'toi.you': ['tu turno', 'your turn'], 'toi.prev': ['anterior', 'previous'], 'toi.next': ['siguiente', 'next'],
  // the pass / give window
  'pass.startTitle': ['🔁 Pasa una carta a {name}', '🔁 Pass a card to {name}'],
  'pass.startBody': ['Antes de empezar, todos pasan una carta a su compañero. Elige una que creas que le sirva. (No vale dar pistas.)', "Before the start, everyone passes a card to their partner. Pick one you think they can use. (No hints allowed.)"],
  'pass.symTitle': ['🔁 ¡Símbolo de pase! Pasa una carta a {name}', '🔁 Passing symbol! Pass a card to {name}'],
  'pass.symBody': ['Tú y tu compañero os pasáis una carta cada uno.', 'You and your partner pass each other one card.'],
  'pass.btn': ['Pasar esta carta', 'Pass this card'],
  'pass.waiting': ['✓ Carta elegida. Esperando a {names}…', '✓ Card picked. Waiting for {names}…'],
  'give.outTitle': ['🏃 ¡{name} se quedó sin cartas!', '🏃 {name} is out of cards!'],
  'give.tagTitle': ['🙌 ¡Robaste! {name} vuelve al juego', '🙌 You drew! {name} is back in'],
  'give.body': ['Elige {n} cartas para pasarle (te quedas con la mitad más grande).', 'Pick {n} cards to pass them (you keep the bigger half).'],
  'give.btn': ['Pasar {k}/{n} cartas', 'Pass {k}/{n} cards'],
  'nt.on': ['🔔 Notificaciones activadas', '🔔 Notifications on'], 'nt.onBody': ['Recibirás avisos del juego.', "You'll get game alerts."],
  'nt.disable': ['Desactivar notificaciones', 'Turn off notifications'], 'nt.enable': ['Activar notificaciones', 'Turn on notifications'],
  'nt.started': ['¡La partida comenzó!', 'The game has started!'], 'nt.first': ['{name} va primero.', '{name} goes first.'],
  'nt.won': ['🏆 ¡Tu equipo ganó!', '🏆 Your team won!'], 'nt.over': ['🎉 Ronda terminada', '🎉 Round over'],
  'nt.congrats': ['¡Felicidades!', 'Congratulations!'], 'nt.whoWon': ['Ganaron {name}', '{name} won'],
  'nt.yourTurn': ['¡Es tu turno!', "It's your turn!"], 'nt.yourTurnBody': ['Elige una carta para jugar.', 'Pick a card to play.'],
  'nt.pick': ['Elige una carta para tu compañero.', 'Pick a card for your partner.'],
  'nt.uno': ['¡Solo te queda 1 carta! Grita ¡UNO! antes de que te pillen.', 'Only 1 card left! Shout UNO before someone catches you.'],
  'mu.mute': ['Silenciar música', 'Mute music'], 'mu.play': ['Activar música', 'Play music'],
  'claim.wildTitle': ['{card}: elige el color', '{card}: pick the colour'],
  'claim.teamPlay': ['🤝 El turno salta a {name}. Si no puede jugar, robas tú 2. (Tu compañero no puede opinar sobre el color.)', "🤝 The turn jumps to {name}. If they can't play, you draw 2. (Your partner may not have a say in the colour.)"],
  'claim.teamPlayNone': ['Tu compañero está fuera: este comodín cuenta como uno normal.', 'Your partner is out: this wild works as a plain wild.'],
  'claim.team4': ['✌️ {name} roba 2 y pierde su turno, y {mate} también roba 2.', '✌️ {name} draws 2 and loses their turn, and {mate} draws 2 too.'],
  'draw.ok': ['Sí, robar', 'Yes, draw'],
  'draw.haveTitle': ['Tienes cartas jugables', 'You have playable cards'],
  'draw.haveBody': ['Tienes cartas que puedes jugar. ¿Quieres robar una de todas formas?', 'You have cards you can play. Draw one anyway?'],
  'draw.teamPlayBody': ['Si robas y no juegas, tu compañero roba 2. ¿Robar de todas formas?', "If you draw and don't play, your partner draws 2. Draw anyway?"],
  'notice.ok': ['Entendido', 'Got it'],
  'notice.cantTitle': ['No puedes jugar esta carta', "You can't play this card"],
  'notice.cantBody': ['Tiene que coincidir en color ({color}), número o símbolo con la carta de la mesa. Elige otra o roba.', 'It must match the colour ({color}), number or symbol of the table card. Pick another or draw.'],
  'notice.onlyDrawnTitle': ['Solo la carta que robaste', 'Only the card you drew'],
  'notice.onlyDrawnBody': ['Después de robar solo puedes jugar esa carta (la que brilla) o pasar.', 'After drawing you can only play that card (the glowing one) or pass.'],
  'g.leaveQ': ['¿Seguro que quieres salir?', 'Are you sure you want to leave?'],
  'g.leaveBody': ['Si sales ahora, un bot jugará por ti para que tu compañero no se quede solo. Si quieres terminar la partida y ver los resultados, vota para finalizar.', "If you leave now, a bot plays your seat so your partner isn't left alone. To end the game and see the results, vote to end instead."],
  'g.leave': ['Salir', 'Leave'], 'g.stay': ['Quedarme', 'Stay'], 'g.voteEnd': ['Votar terminar', 'Vote to end'],
  'g.votes': ['{n}/{t} quieren terminar', '{n}/{t} want to end'], 'g.withdraw': ['Retirar voto', 'Withdraw vote'], 'g.end': ['Terminar', 'End game'],
  'w.vote': ['🤝 ¡Partida terminada!', '🤝 Game over!'], 'w.last': ['🏆 ¡Últimos en pie!', '🏆 Last ones standing!'],
  'w.winner': ['🎉 ¡Equipo ganador!', '🎉 Winning team!'], 'w.roundWin': ['🎉 Ronda {n}', '🎉 Round {n}'],
  'w.champion': ['👑 ¡Campeones de la partida!', '👑 Match champions!'],
  'w.pts': ['+{n} puntos (las cartas de los otros equipos)', '+{n} points (the other teams\' cards)'],
  'w.ptsMatch': ['+{n} puntos en esta ronda · se juega a {target}', '+{n} points this round · playing to {target}'],
  'w.table': ['Cartas que quedaron', 'Cards left'], 'w.tableMatch': ['Cartas que quedaron · puntos del equipo', 'Cards left · team points'],
  'w.standing': ['{c} cartas · {p} pts', '{c} cards · {p} pts'],
  'w.again': ['Jugar de nuevo', 'Play again'], 'w.toLobby': ['Volver a la sala', 'Back to the room'],
  'rc.label': ['Reconectando…', 'Reconnecting…'],
  'sp.cancel': ['Cancelaste la conexión con Spotify.', 'You cancelled the Spotify connection.'],
  'sp.session': ['Error de sesión Spotify. Intenta de nuevo.', 'Spotify session error. Try again.'],
  'sp.fetch': ['No se pudo contactar Spotify. Revisa tu conexión.', "Couldn't reach Spotify. Check your connection."],
  'sp.other': ['Error de Spotify: {e}', 'Spotify error: {e}'], 'sp.nothing': ['Sin reproducción activa ahora mismo.', 'Nothing playing right now.'],
  'sp.connected': ['Conectado a Spotify', 'Connected to Spotify'], 'sp.on': ['Spotify conectado', 'Spotify connected'],
  'sp.connectTitle': ['Conectar Spotify', 'Connect Spotify'],
  'sp.desc': ['Comparte lo que estás escuchando con los demás jugadores. Aparecerá en la barra superior.', "Share what you're listening to with the other players. It shows in the top bar."],
  'sp.connectBtn': ['Conectar cuenta', 'Connect account'], 'sp.errTitle': ['Error de Spotify', 'Spotify error'],
  'lf.notFound': ['Usuario no encontrado en Last.fm.', 'User not found on Last.fm.'], 'lf.netError': ['Error de conexión. Intenta de nuevo.', 'Connection error. Try again.'],
  'lf.now': ['Escuchando ahora', 'Listening now'], 'lf.last': ['Última escuchada', 'Last played'], 'lf.none': ['Sin historial de Last.fm.', 'No Last.fm history.'],
  'lf.as': ['Conectado como {name}', 'Connected as {name}'], 'lf.connectTitle': ['Conectar Last.fm', 'Connect Last.fm'],
  'lf.desc': ['Introduce tu usuario de Last.fm para compartir lo que escuchas (funciona con Spotify, Apple Music, Tidal y más).', 'Enter your Last.fm username to share what you listen to (works with Spotify, Apple Music, Tidal and more).'],
  'lf.placeholder': ['Tu usuario de Last.fm', 'Your Last.fm username'], 'lf.connect': ['Conectar', 'Connect']
});

// ---- Fixed text in index.html (its Spanish is written in the page) ----
addEnglish({
  'land.tagline':  'UNO in pairs: pass cards to your partner, hand them the turn, and win together!',
  'land.howTitle': 'How to play',
  'land.how1':     'Play a card that matches the table card\'s <strong>colour, number or symbol</strong>, or a wild. Can\'t (or don\'t want to)? Draw one. Down to one card? Shout <strong>UNO!</strong> — your partner can shout it for you.',
  'land.how2':     'You play in <strong>teams of 2</strong>, sitting across from your partner. Your team wins when <strong>both of you</strong> have no cards left.',
  'land.how3':     '<li>When you go out, your partner passes you <strong>half their cards</strong>. While you\'re out, if they draw, they pass you half again.</li><li><strong>🔁 Passing symbol</strong>: you and your partner swap a card. <strong>🤝 Wild Team Play</strong>: the turn jumps to your partner. <strong>✌️ Wild Team Draw Four</strong>: the next player and their partner draw 2 each.</li>',
  'land.how4':     'Play a single round or a match to 500. 2 to 4 teams (4 to 8 players).',
  'land.allRules': 'See all the rules →',
  'land.emoji': 'Pick an emoji', 'land.name': 'Your name', 'land.create': 'Create room', 'land.joinCode': 'Join with a code',
  'land.codePh': 'Room code (e.g. XK7M2P)', 'land.join': 'Join', 'land.players': '4 to 8 players in teams of 2 · No account needed',
  'lob.title': 'Waiting room', 'lob.code': 'Code:', 'lob.waitHost': 'Waiting for the host…', 'lob.leave': 'Leave room',
  'lob.share': 'Share the code with friends so they can join',
  'g.copyCode': 'Copy code', 'g.rules': 'Rules', 'g.chat': 'Chat', 'g.drawPile': 'Draw', 'g.discardPile': 'Table',
  'g.pass': 'Pass turn', 'g.playCard': 'Play card',
  'w.other': 'Join another room', 'w.next': 'Next round ▶', 'w.nextWait': 'Waiting for the host to deal the next round…',
  'chat.ph': 'Message…',
  'mp.title': 'Background music?', 'mp.desc': 'Adds some atmosphere to the game', 'mp.yes': 'Yes, with music', 'mp.no': 'No music',
  'rules.title': '📖 UNO TEAMS rules',
  'rules.goalT': 'Goal', 'rules.goal': 'Be the first <strong>team</strong> to get rid of every card in <strong>both</strong> partners\' hands. On your turn play ONE card that matches the table card\'s <strong>colour, number or symbol</strong>, or a wild. If you have no match, draw one card: if it fits you may play it straight away. You may also draw instead of playing, even with a playable card.',
  'rules.teamsT': '👥 Teams', 'rules.teams': '2 to 4 teams of 2. Partners sit across from each other. At the start, after the deal, <strong>everyone passes one card to their partner</strong>. Partners may talk, but never about the cards in their hands, and not about the colour when a wild is played.',
  'rules.outT': '🏃 Going out', 'rules.out': 'When you play your last card, your partner passes you <strong>half their cards</strong> (with an odd number they keep the bigger half: 9 cards → pass 4, keep 5). If your partner has only 1 card, they pass nothing and you stay out — your turns are skipped. <strong>Tagging back in</strong>: while you\'re out, if your partner draws cards for any reason, they pass you half straight away.',
  'rules.actionsT': 'Action cards', 'rules.actions': '<strong>Draw Two</strong> the next player draws 2 and loses their turn · <strong>Skip</strong> the next player loses their turn · <strong>Reverse</strong> changes direction (with 2 players left it works like a skip) · <strong>Wild</strong> goes on anything; you pick the colour. There are no zeros in this deck.',
  'rules.teamCardsT': '🤝 Team cards', 'rules.teamCards': '<strong>Wild Team Play</strong>: pick a colour; the turn jumps straight to your partner. If they can play a card, they do; if they CAN\'T, YOU draw 2. Play then carries on from your partner. · <strong>Wild Team Draw Four</strong>: the next player draws 2 and loses their turn, and their partner draws 2 as well (even if they are out). You pick the colour.',
  'rules.passT': '🔁 Passing symbol', 'rules.pass': 'Some number cards (1 to 5) carry the passing symbol. When you play one, you and your partner pass each other 1 card — without hinting which one you want.',
  'rules.unoT': '📣 UNO!', 'rules.uno': 'When you have one card left, shout <strong>UNO!</strong> — your partner may shout it for you. If a player of another team catches you before the next player starts their turn, you draw 2.',
  'rules.ptsT': '🏆 Points', 'rules.pts': 'The winning team scores the cards left in the other teams\' hands: numbers = their value, Skip / Reverse / Draw Two = 20, any wild = 50. In a match, the first team to 500 wins.',
  'rules.hereT': 'How to play here', 'rules.here': 'On your turn the cards you can play <strong>rise and glow</strong>; the others go dim. Your partner sits across the table with a coloured ring in your team\'s colour. When you have to pass cards, a window opens: tap the cards to choose them. Hold a card to see it big with its rule.',
  'rules.ok': 'Got it'
});
