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
  try { return localStorage.getItem('camaleonLang') === 'en' ? 'en' : 'es'; } catch (_) { return 'es'; }
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
  try { localStorage.setItem('camaleonLang', LANG); } catch (_) {}
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

// ---- Cards, the flex side and the ⚡ Power Card ----
addStrings({
  'color.red': ['Rojo', 'Red'], 'color.yellow': ['Amarillo', 'Yellow'], 'color.green': ['Verde', 'Green'], 'color.blue': ['Azul', 'Blue'],
  'color.wild': ['Comodín', 'Wild'],
  'card.draw2': ['Roba Dos', 'Draw Two'], 'card.reverse': ['Reversa', 'Reverse'], 'card.skip': ['Salto', 'Skip'],
  'card.wildFlip': ['Comodín Voltea Todos', 'Wild All Flip'], 'card.wildTarget2': ['Comodín Diana +2', 'Wild Target Draw 2'],
  'card.wildAllDraw': ['Comodín Todos Roban', 'Wild All Draw'], 'card.wild4': ['Comodín Roba Cuatro', 'Wild Draw Four'],
  'card.flexName': ['{base} · flex {b}', '{base} · flex {b}'],
  'card.flipIcon': ['🔄 Al jugarla, tu ⚡ Carta de Poder se voltea', '🔄 Playing it flips your ⚡ Power Card'],
  // the two sides in the play window
  'flex.side': ['Lado flex', 'Flex side'], 'flex.short': ['flex', 'flex'],
  'flex.normal': ['Lado normal', 'Normal side'], 'flex.flexSide': ['Lado flex', 'Flex side'],
  'flex.normalNo': ['Su lado normal no coincide con la mesa.', "Its normal side doesn't match the table."],
  'flex.cost': ['⚡ Usar el lado flex pone tu Carta de Poder en rojo.', '⚡ Using the flex side turns your Power Card red.'],
  'flex.who': ['¿Quién roba {n}?', 'Who draws {n}?'],
  'side.normal.number': ['Se juega como {color}.', 'Plays as {color}.'],
  'side.normal.draw2': ['El siguiente roba 2 y pierde su turno.', 'The next player draws 2 and loses their turn.'],
  'side.normal.skip': ['El siguiente pierde su turno.', 'The next player loses their turn.'],
  'side.normal.reverse': ['Cambia el sentido.', 'Reverses direction.'],
  'side.normal.wildTarget2': ['Comodín normal: eliges el color.', 'A plain wild: you pick the colour.'],
  'side.normal.wildAllDraw': ['Comodín normal: eliges el color.', 'A plain wild: you pick the colour.'],
  'side.normal.wild4': ['El siguiente roba 4 y pierde su turno (puede desafiarte).', 'The next player draws 4 and loses their turn (they can challenge).'],
  'side.flex.number': ['Coincide con {color}; el siguiente sigue con {keep}.', 'Matches {color}; the next player follows {keep}.'],
  'side.flex.draw2': ['Todos los demás roban 1; el siguiente sí juega.', 'Everyone else draws 1; the next player still plays.'],
  'side.flex.skip': ['¡Salta a todos! Vuelves a jugar.', 'Skip all! You play again.'],
  'side.flex.reverse': ['Cambia el sentido y salta al primero.', 'Reverses and skips the first player.'],
  'side.flex.wildTarget2': ['El jugador que elijas roba 2.', 'The player you choose draws 2.'],
  'side.flex.wildAllDraw': ['Todos los demás roban 2; el siguiente sí juega.', 'Everyone else draws 2; the next player still plays.'],
  'side.flex.wild4': ['El jugador que elijas roba 4 (sin desafío).', 'The player you choose draws 4 (no challenge).'],
  // the Power Card
  'tok.on': ['⚡ Carta de Poder en verde: puede usar lados flex', '⚡ Power Card green: can use flex sides'],
  'tok.off': ['⚡ Carta de Poder en rojo: no puede usar lados flex', '⚡ Power Card red: no flex sides'],
  'tok.mineOn': ['Poder en verde', 'Power green'], 'tok.mineOff': ['Poder en rojo', 'Power red'],
  'tok.helpOn': ['Puedes jugar el lado flex de una carta (y tu Carta de Poder pasará a rojo).', 'You may play a flex side (your Power Card then turns red).'],
  'tok.helpOff': ['Vuelve a verde con una carta 🔄, con un Comodín Voltea Todos o cuando todos están en rojo.', 'It turns green again with a 🔄 card, a Wild All Flip, or when everyone is red.']
});

// ---- The game log (engine.js writes {k, p}) ----
// {name}/{target} are players, {card} the card played, {color} a colour
addStrings({
  'log.start':        ['¡Partida iniciada! Empieza {name}.', 'Game on! {name} starts.'],
  'log.play':         ['{name} jugó {card}.', '{name} played {card}.'],
  'log.playWild':     ['{name} jugó {card} y eligió {color}.', '{name} played {card} and chose {color}.'],
  'log.drawSkip':     ['{name} roba {n} y pierde su turno.', '{name} draws {n} and loses their turn.'],
  'log.skip':         ['{name} pierde su turno.', '{name} loses their turn.'],
  'log.skipAll':      ['⊘⊘ ¡{name} salta a todos y vuelve a jugar!', '⊘⊘ {name} skips everyone and plays again!'],
  'log.reverse':      ['¡Cambio de sentido!', 'Direction reversed!'],
  'log.reverseSkip':  ['⇄ ¡Cambio de sentido y {name} pierde su turno!', '⇄ Direction reversed and {name} loses their turn!'],
  'log.flexDraw2':    ['{name}: todos los demás roban 1.', '{name}: everyone else draws 1.'],
  'log.flexAllDraw':  ['{name}: todos los demás roban 2.', '{name}: everyone else draws 2.'],
  'log.target':       ['🎯 {name} hizo robar {n} a {target}.', '🎯 {name} made {target} draw {n}.'],
  'log.wildFlip':     ['⚡ {name} volteó todas las Cartas de Poder ({color}).', "⚡ {name} flipped everyone's Power Card ({color})."],
  'log.flipCard':     ['🔄 La Carta de Poder de {name} se volteó.', "🔄 {name}'s Power Card flipped."],
  'log.allRed':       ['⚡ ¡Todas las Cartas de Poder estaban en rojo: todas vuelven a verde!', '⚡ Every Power Card was red: all back to green!'],
  'log.wildDraw':     ['{name} jugó un Comodín Roba Cuatro ({color}). {target}: ¿aceptar o desafiar?', '{name} played a Wild Draw Four ({color}). {target}: accept or challenge?'],
  'log.accept':       ['{name} aceptó y robó {n}.', '{name} accepted and drew {n}.'],
  'log.challengeWon': ['⚖️ ¡{name} ganó el desafío! {by} tenía el color y roba {n}.', '⚖️ {name} won the challenge! {by} had the colour and draws {n}.'],
  'log.challengeLost':['⚖️ El juego de {by} era limpio: {name} roba {n} y pierde su turno.', "⚖️ {by}'s play was fair: {name} draws {n} and loses their turn."],
  'log.drewPass':     ['{name} robó una carta y pasó.', '{name} drew a card and passed.'],
  'log.pass':         ['{name} pasó (no quedan cartas para robar).', '{name} passed (no cards left to draw).'],
  'log.shout':        ['📣 ¡{name} grita ¡ÚLTIMA!', '📣 {name} shouts LAST CARD!'],
  'log.caught':       ['🚨 {name} pilló a {target} sin gritar: {target} roba 2.', "🚨 {name} caught {target} not shouting: {target} draws 2."],
  'log.reshuffle':    ['Se acabó el mazo: se barajó el descarte.', 'The deck ran out: the discard pile was shuffled.'],
  'log.win':          ['🏆 ¡{name} se quedó sin cartas! +{pts} puntos.', '🏆 {name} is out of cards! +{pts} points.'],
  'log.timeout':      ['⏰ {name} se quedó sin tiempo.', '⏰ {name} ran out of time.'],
  'log.skipGone':     ['Se saltó el turno de {name} (desconectado).', "{name}'s turn was skipped (disconnected)."],
  'log.gone':         ['{name} se desconectó.', '{name} disconnected.'],
  'log.back':         ['{name} se reconectó.', '{name} reconnected.'],
  'log.joined':       ['{name} se unió a la partida.', '{name} joined the game.'],
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
  'err.started': ['La partida ya comenzó', 'That game has already started'],
  'err.full': ['Sala llena (máximo {n})', 'Room full (max {n})'],
  'lob.removeBot': ['Quitar bot', 'Remove bot'], 'lob.back': ['vuelve', 'back'], 'lob.readyBadge': ['✓ listo', '✓ ready'],
  'lob.dc': ['desconectado', 'disconnected'], 'lob.ready': ['✓ Estás listo para jugar', "✓ You're ready to play"],
  'lob.again': ['¡Quiero jugar de nuevo!', 'I want to play again!'], 'lob.start': ['Iniciar partida', 'Start game'],
  'lob.waitingPlayers': ['Esperando jugadores…', 'Waiting for players…'], 'lob.addBot': ['+ Añadir bot', '+ Add bot'],
  'vc.title': ['Chat de voz', 'Voice chat'], 'vc.opened': ['{name} abrió el micrófono', '{name} turned their mic on'],
  'vc.left': ['{name} dejó el chat de voz', '{name} left voice chat'], 'vc.muted': ['{name} silenció el micrófono', '{name} muted their mic'],
  'vc.unmuted': ['{name} activó el micrófono', '{name} unmuted their mic'], 'vc.noMic': ['No se pudo acceder al micrófono', 'Could not use the microphone'],
  'vc.join': ['Unirse al chat de voz', 'Join voice chat'], 'vc.mute': ['Silenciar micrófono', 'Mute microphone'], 'vc.leave': ['Salir del chat de voz', 'Leave voice chat'],
  'uno.mine': ['¡Solo te queda 1 carta!', 'You only have 1 card left!'], 'uno.shout': ['¡ÚLTIMA!', 'LAST CARD!'],
  'uno.other': ['¡{name} tiene 1 carta y no ha gritado!', "{name} has 1 card and hasn't shouted!"],
  'uno.callOn': ['¡PILLAR A {name}!', 'CATCH {name}!'],
  'st.yourTurn': ['✨ ¡Tu turno! Elige una carta.', '✨ Your turn! Pick a card.'],
  'st.turnOf': ['Turno de {name}', "{name}'s turn"],
  'st.youDecide': ['⚖️ ¿Aceptas o desafías?', '⚖️ Accept or challenge?'],
  'st.decides': ['⚖️ {name} decide si desafiar…', '⚖️ {name} is deciding whether to challenge…'],
  'st.colorNow': ['Color: {color}', 'Colour: {color}'],
  'hand.drawnOk': ['¡Robaste una carta que sirve! Juégala o pasa.', 'You drew a card you can play! Play it or pass.'],
  'hand.pick': ['Tu turno — toca una carta para jugarla', 'Your turn — tap a card to play it'],
  'hand.count': ['Tu mano ({n})', 'Your hand ({n})'],
  'toi.you': ['tu turno', 'your turn'], 'toi.prev': ['anterior', 'previous'], 'toi.next': ['siguiente', 'next'],
  'nt.on': ['🔔 Notificaciones activadas', '🔔 Notifications on'], 'nt.onBody': ['Recibirás avisos del juego.', "You'll get game alerts."],
  'nt.disable': ['Desactivar notificaciones', 'Turn off notifications'], 'nt.enable': ['Activar notificaciones', 'Turn on notifications'],
  'nt.started': ['¡La partida comenzó!', 'The game has started!'], 'nt.first': ['{name} va primero.', '{name} goes first.'],
  'nt.won': ['🏆 ¡Ganaste!', '🏆 You won!'], 'nt.over': ['🎉 Ronda terminada', '🎉 Round over'],
  'nt.congrats': ['¡Felicidades!', 'Congratulations!'], 'nt.whoWon': ['Ganó {name}', '{name} won'],
  'nt.yourTurn': ['¡Es tu turno!', "It's your turn!"], 'nt.yourTurnBody': ['Elige una carta para jugar.', 'Pick a card to play.'],
  'nt.challenge': ['Te jugaron un Comodín Roba Cuatro: ¿aceptas o desafías?', 'Someone played a Wild Draw Four on you: accept or challenge?'],
  'nt.uno': ['¡Solo te queda 1 carta! Grita ¡ÚLTIMA! antes de que te pillen.', 'Only 1 card left! Shout LAST CARD before someone catches you.'],
  'mu.mute': ['Silenciar música', 'Mute music'], 'mu.play': ['Activar música', 'Play music'],
  'claim.wildTitle': ['{card}: elige el color', '{card}: pick the colour'],
  'claim.flexTitle': ['🦎 ¿Qué lado juegas?', '🦎 Which side do you play?'],
  'claim.unfair': ['⚠️ Ojo: tienes cartas de {color} (o un comodín). Si te desafían, robas tú 4.', '⚠️ Careful: you hold {color} cards (or a wild). If you get challenged, you draw 4.'],
  'draw.ok': ['Sí, robar', 'Yes, draw'],
  'draw.haveTitle': ['Tienes cartas jugables', 'You have playable cards'],
  'draw.haveBody': ['Tienes cartas que puedes jugar. ¿Quieres robar una de todas formas?', 'You have cards you can play. Draw one anyway?'],
  'notice.ok': ['Entendido', 'Got it'],
  'notice.cantTitle': ['No puedes jugar esta carta', "You can't play this card"],
  'notice.cantBody': ['Tiene que coincidir en color ({color}), número o símbolo con la carta de la mesa — o, con tu ⚡ en verde, por el color de su lado flex. Elige otra o roba.', 'It must match the colour ({color}), number or symbol of the table card — or, with your ⚡ green, by its flex colour. Pick another or draw.'],
  'notice.onlyDrawnTitle': ['Solo la carta que robaste', 'Only the card you drew'],
  'notice.onlyDrawnBody': ['Después de robar solo puedes jugar esa carta (la que brilla) o pasar.', 'After drawing you can only play that card (the glowing one) or pass.'],
  'ch.title': ['{c} te jugó un <b>{card}</b> y eligió {color}.', '{c} played a <b>{card}</b> on you and chose {color}.'],
  'ch.rule': ['Solo es limpio si no tenía ninguna carta de {prev} ni comodines. Le quedan {n} cartas.', 'It is only fair if they held no {prev} card and no wild. They have {n} cards left.'],
  'ch.acceptT': ['Aceptar', 'Accept'], 'ch.challengeT': ['Desafiar', 'Challenge'],
  'ch.take4': ['Robas 4 y pierdes el turno.', 'You draw 4 and lose your turn.'],
  'ch.challengeWhy4': ['Si {c} tenía el color (o un comodín), roba 4 él y tú juegas. Si no, robas 6 y pierdes el turno.', 'If {c} had the colour (or a wild), they draw 4 and you play. If not, you draw 6 and lose your turn.'],
  'ch.accept': ['Aceptar', 'Accept'], 'ch.challenge': ['Desafiar', 'Challenge'],
  'ch.waitMine': ['{t} decide si desafiar tu {card}…', '{t} is deciding whether to challenge your {card}…'],
  'ch.waitOther': ['{t} decide si desafiar el {card} de {c}…', "{t} is deciding whether to challenge {c}'s {card}…"],
  'g.leaveQ': ['¿Seguro que quieres salir?', 'Are you sure you want to leave?'],
  'g.leaveBody': ['Si sales ahora tus cartas vuelven al mazo y no saldrás en la puntuación. Si quieres terminar la partida y ver los resultados, vota para finalizar.', "If you leave now your cards go back into the deck and you won't be in the score. To end the game and see the results, vote to end instead."],
  'g.leave': ['Salir', 'Leave'], 'g.stay': ['Quedarme', 'Stay'], 'g.voteEnd': ['Votar terminar', 'Vote to end'],
  'g.votes': ['{n}/{t} quieren terminar', '{n}/{t} want to end'], 'g.withdraw': ['Retirar voto', 'Withdraw vote'], 'g.end': ['Terminar', 'End game'],
  'w.vote': ['🤝 ¡Partida terminada!', '🤝 Game over!'], 'w.last': ['🏆 ¡Último en pie!', '🏆 Last one standing!'],
  'w.winner': ['🎉 ¡Ganador!', '🎉 Winner!'], 'w.roundWin': ['🎉 Ronda {n}', '🎉 Round {n}'],
  'w.champion': ['👑 ¡Campeón de la partida!', '👑 Match champion!'],
  'w.pts': ['+{n} puntos (las cartas de los demás)', '+{n} points (everyone else\'s cards)'],
  'w.ptsMatch': ['+{n} puntos en esta ronda · se juega a {target}', '+{n} points this round · playing to {target}'],
  'w.table': ['Cartas que quedaron', 'Cards left'], 'w.tableMatch': ['Cartas que quedaron · puntos totales', 'Cards left · total points'],
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
  'land.tagline':  'Cards with a second colour, one ⚡ Power Card in front of you. Flex at the right moment.',
  'land.howTitle': 'How to play',
  'land.how1':     'Play a card that matches the table card\'s <strong>colour, number or symbol</strong>, or a wild. Can\'t (or don\'t want to)? Draw one. Down to one card? Shout <strong>LAST CARD!</strong>',
  'land.how2':     '<strong>🦎 Flex cards</strong> have a normal colour and a second <strong>flex</strong> colour. While your <strong>⚡ Power Card</strong> is green you may play the flex side: match its flex colour, or set off the stronger flex action. The next player still follows the card\'s normal colour. Using a flex side turns your Power Card red.',
  'land.how3':     '<li>Flex actions: <strong>Draw Two</strong> → everyone else draws 1 · <strong>Skip</strong> → skip everyone · <strong>Reverse</strong> → reverse and skip · <strong>Wild Target Draw 2 / Draw Four</strong> → the player you pick draws · <strong>Wild All Draw</strong> → everyone else draws 2.</li><li>Your Power Card flips when you play a number card with <strong>🔄</strong>, when anyone plays a <strong>Wild All Flip</strong>, and all go green when <strong>everyone is red</strong>.</li><li>The Wild Draw Four (normal side) is only fair with no card of the colour and no wild in your hand — the next player can <strong>challenge</strong>.</li>',
  'land.how4':     'Empty your hand to win the round and score the cards everyone else holds. Play a single round or a match to 500. 2 to 8 players.',
  'land.allRules': 'See all the rules →',
  'land.emoji': 'Pick an emoji', 'land.name': 'Your name', 'land.create': 'Create room', 'land.joinCode': 'Join with a code',
  'land.codePh': 'Room code (e.g. XK7M2P)', 'land.join': 'Join', 'land.players': 'Up to 8 players · No account needed',
  'lob.title': 'Waiting room', 'lob.code': 'Code:', 'lob.waitHost': 'Waiting for the host…', 'lob.leave': 'Leave room',
  'lob.share': 'Share the code with friends so they can join',
  'g.copyCode': 'Copy code', 'g.rules': 'Rules', 'g.chat': 'Chat', 'g.drawPile': 'Draw', 'g.discardPile': 'Table',
  'g.pass': 'Pass turn', 'g.playCard': 'Play card',
  'w.other': 'Join another room', 'w.next': 'Next round ▶', 'w.nextWait': 'Waiting for the host to deal the next round…',
  'chat.ph': 'Message…',
  'mp.title': 'Background music?', 'mp.desc': 'Adds some atmosphere to the game', 'mp.yes': 'Yes, with music', 'mp.no': 'No music',
  'rules.title': '📖 ¡CAMALEÓN! rules',
  'rules.goalT': 'Goal', 'rules.goal': 'Be the first to run out of cards. On your turn play ONE card that matches the table card\'s <strong>colour, number or symbol</strong>, or a wild. If you have no match, draw one card: if it fits you may play it straight away. You may also draw instead of playing, even with a playable card.',
  'rules.flexT': '🦎 Flex cards', 'rules.flex': 'A flex card has a normal side (its main colour) and a <strong>flex side</strong> (a second colour along its foot, and the 🦎 corner). It plays on its normal side unless you choose the flex side. A flex <strong>number</strong> card\'s flex side lets it match its flex colour — but the next player must still match its <strong>normal</strong> colour.',
  'rules.powerT': '⚡ Power Card', 'rules.power': 'Everyone starts with their Power Card on <strong>green</strong>. Only with it green may you play a flex side; doing so turns it <strong>red</strong>. It stays red until: every player\'s card is red at the same time (all turn green), you play a number card with the <strong>🔄</strong> icon (you MUST flip yours, green to red or red to green), or someone plays a <strong>Wild All Flip</strong> (everybody flips theirs).',
  'rules.actionsT': 'Action cards', 'rules.actions': '<strong>Draw Two</strong> the next player draws 2 and loses their turn · <strong>Skip</strong> the next player loses their turn · <strong>Reverse</strong> changes direction (with 2 players it works like a skip) · <strong>Wild All Flip</strong> everyone flips their Power Card, and you call the colour. Action cards may go on action cards of the same colour or symbol.',
  'rules.flexActT': 'Flex sides', 'rules.flexAct': '<strong>Flex Draw Two</strong> every other player draws 1; the next player still plays · <strong>Flex Skip</strong> SKIP ALL, the turn comes back to you · <strong>Flex Reverse</strong> reverse, then the first player in the new direction is skipped · <strong>Flex Wild Target Draw 2</strong> the player you choose draws 2 · <strong>Flex Wild All Draw</strong> every other player draws 2; the next player still plays · <strong>Flex Wild Draw Four</strong> the player you choose draws 4. On their normal side the Target Draw 2 and All Draw are plain wilds. After a targeted draw, play goes on with the next player.',
  'rules.chT': '⚖️ Wild Draw Four', 'rules.ch': 'On its normal side it goes on anything, but you may only play it with NO card of the table colour in your hand (wilds count as a match). The next player either draws 4 and loses their turn, or challenges: if you did have a match, YOU draw 4 and they draw none; if not, they draw 6 and lose their turn. The colour you called stands either way.',
  'rules.unoT': '📣 LAST CARD!', 'rules.uno': 'When you have one card left, shout <strong>LAST CARD!</strong>. If someone catches you before the next player takes their turn, you draw 2.',
  'rules.ptsT': '🏆 Points', 'rules.pts': 'The round winner scores everyone else\'s cards: numbers (1–8) = their value, any action card = 20, any wild = 50. In a match, the first to 500 wins.',
  'rules.hereT': 'How to play here', 'rules.here': 'On your turn the cards you can play <strong>rise and glow</strong>; the others go dim. Tapping a wild, or a flex card while your ⚡ is green, opens a window to pick the colour and the side. Hold a card to see it big with its rule. Tap another player to throw something at them.',
  'rules.ok': 'Got it'
});
