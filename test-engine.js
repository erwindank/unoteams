// ============================================================
// Rules check for engine.js — run with:  node test-engine.js [games]
// Hand-made situations for each card and each team rule (passing, going out, tagging back
// in, Wild Team Play, Wild Team Draw Four, ¡UNO! for your partner), then thousands of full
// bot games that check the game always ends, no card is lost or copied, and every state
// can be saved to Firestore.
// ============================================================
const E = require('./engine.js');
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  ✗ ' + msg); } };
// n players in n/2 teams: p0 & p(n/2) are partners, seated across from each other
const P = n => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i, team: E.TEAMS[i % (n / 2)] }));

// Build a round (first card swap already done), then set hands / table by hand.
// A card is written as ['red','5'] · ['red','3','pass'] (passing symbol) · ['wild','teamPlay']
function setup(n, hands, top) {
  const st = E.newRound(P(n));
  st.phase = null; st.queue = [];
  let id = 1000;
  const mk = a => {
    const c = { id: id++, c: a[0], v: a[1] };
    if (a[2] === 'pass') c.pass = true;
    return c;
  };
  const filler = () => [['blue', '8'], ['blue', '7']];
  st.hands = {};
  st.players.forEach((p, i) => { st.hands[p.id] = (hands[i] || filler()).map(mk); });
  st.players = st.players.map(p => ({ ...p, cardCount: st.hands[p.id].length }));
  st.discard = [mk(top)];
  st.topColor = st.discard[0].c; st.topValue = st.discard[0].v;
  st.drawPile = Array.from({ length: 40 }, (_, i) => mk(['green', String(1 + i % 9)]));
  st.currentPlayerIndex = 0;
  return st;
}
const R = ['red', '5'];
const ids = (st, pid) => st.hands[pid].map(c => c.id);

console.log('Hand-made situations');
{ // Seating: partners sit across; teams must be full
  const st = E.newRound(P(6));
  ok(st.players.map(p => p.team).join('') === 'ABCABC', 'seats go A B C A B C');
  ok(E.partnerOf(st, 'p0') === 'p3' && E.partnerOf(st, 'p4') === 'p1', 'partners across');
  ok(E.newRound([{ id: 'a', team: 'A' }, { id: 'b', team: 'A' }, { id: 'c', team: 'B' }]) === null, 'a team of one cannot start');
  ok(st.phase?.k === 'swap' && st.phase.pids.length === 6, 'round starts with everyone passing a card');
  ok(E.NUMBERS.includes(st.topValue), 'first table card is a number');
}
{ // The first pass: each player gives 1 card to their partner, so everyone still has 7
  let st = E.newRound(P(4));
  const give = {};
  for (const p of st.players) give[p.id] = st.hands[p.id][0].id;
  ok(E.apply(st, { t: 'play', i: 0 }, st.players[st.currentPlayerIndex].id).error === 'busy', 'nobody plays before the pass');
  for (const p of st.players) st = E.apply(st, { t: 'swap', id: give[p.id] }, p.id).state;
  ok(!st.phase && st.players.every(p => st.hands[p.id].length === 7), 'everyone still has 7');
  ok(st.hands.p2.some(c => c.id === give.p0) && st.hands.p0.some(c => c.id === give.p2), 'cards went to the partner');
}
{ // Draw Two, Skip, Reverse
  let st = setup(4, [[['red', 'draw2'], R]], R);
  let r = E.apply(st, { t: 'play', i: 0 }, 'p0');
  ok(r.state.hands.p1.length === 4 && r.state.currentPlayerIndex === 2, 'draw two');
  st = setup(4, [[['red', 'skip'], R]], R);
  ok(E.apply(st, { t: 'play', i: 0 }, 'p0').state.currentPlayerIndex === 2, 'skip');
  st = setup(4, [[['red', 'reverse'], R]], R);
  r = E.apply(st, { t: 'play', i: 0 }, 'p0');
  ok(r.state.currentPlayerIndex === 3 && r.state.direction === -1, 'reverse');
}
{ // Wild Team Play: the turn jumps to my partner; if they can't play I draw 2
  let st = setup(6, [[['wild', 'teamPlay'], R], null, null, [['green', '1'], ['blue', '2']]], R);
  ok(E.apply(st, { t: 'play', i: 0 }, 'p0').error === 'needColor', 'wild needs a colour');
  let r = E.apply(st, { t: 'play', i: 0, color: 'green' }, 'p0');
  ok(r.state.currentPlayerIndex === 3 && r.state.teamPlay?.to === 'p3', 'turn jumps to the partner (p3)');
  const ok1 = E.apply(r.state, { t: 'play', i: 0 }, 'p3');
  ok(ok1.state.hands.p0.length === 1 && !ok1.state.teamPlay && ok1.state.currentPlayerIndex === 4, 'partner played: nobody draws, play goes on from them');
  r.state.drawPile[0] = { id: 1, c: 'yellow', v: '9' };
  const miss = E.apply(r.state, { t: 'draw' }, 'p3');
  ok(miss.state.hands.p0.length === 3 && miss.state.currentPlayerIndex === 4, "partner couldn't play: I draw 2");
}
{ // …drawing a card that fits and playing it counts as playing
  let st = setup(4, [[['wild', 'teamPlay'], R], null, [['blue', '1'], ['blue', '2']]], R);
  let r = E.apply(st, { t: 'play', i: 0, color: 'green' }, 'p0');
  r.state.drawPile[0] = { id: 1, c: 'green', v: '9' };
  r = E.apply(r.state, { t: 'draw' }, 'p2');
  ok(r.state.drawn, 'drew a green');
  r = E.apply(r.state, { t: 'play', id: 1 }, 'p2');
  ok(r.state.hands.p0.length === 1, 'played the drawn card: no penalty');
}
{ // Wild Team Draw Four: next +2 and skipped, their partner +2 too
  const st = setup(4, [[['wild', 'team4'], R]], R);
  const r = E.apply(st, { t: 'play', i: 0, color: 'blue' }, 'p0');
  ok(r.state.hands.p1.length === 4 && r.state.hands.p3.length === 4 && r.state.currentPlayerIndex === 2, 'team draw four');
  ok(r.state.topColor === 'blue', 'colour named');
}
{ // Passing symbol: me and my partner swap one card each
  const st = setup(4, [[['red', '3', 'pass'], ['blue', '9'], ['yellow', '9']], null, [['green', '1'], ['green', '2']]], R);
  st.topValue = '3';
  let r = E.apply(st, { t: 'play', i: 0 }, 'p0');
  ok(r.state.phase?.k === 'swap' && r.state.phase.pids.join() === 'p0,p2', 'swap opens for the team');
  ok(r.state.currentPlayerIndex === 1 && E.apply(r.state, { t: 'draw' }, 'p1').error === 'busy', 'the next player waits for the swap');
  r = E.apply(r.state, { t: 'swap', id: r.state.hands.p0[0].id }, 'p0');
  ok(E.apply(r.state, { t: 'swap', id: 99999 }, 'p2').error === 'noCard', 'only your own cards');
  r = E.apply(r.state, { t: 'swap', id: r.state.hands.p2[1].id }, 'p2');
  ok(!r.state.phase && r.state.hands.p0.some(c => c.v === '2' && c.c === 'green') && r.state.hands.p2.some(c => c.c === 'blue'), 'cards swapped');
}
{ // Going out: partner passes half (keeps the bigger half)
  const st = setup(4, [[R], null, Array(9).fill(['blue', '4'])], R);
  let r = E.apply(st, { t: 'play', i: 0 }, 'p0');
  ok(r.state.status === 'playing' && r.state.phase?.k === 'give' && r.state.phase.from === 'p2' && r.state.phase.n === 4, '9 cards → pass 4');
  ok(E.apply(r.state, { t: 'give', ids: ids(r.state, 'p2').slice(0, 3) }, 'p2').error === 'wrongCount', 'must pass exactly 4');
  r = E.apply(r.state, { t: 'give', ids: ids(r.state, 'p2').slice(0, 4) }, 'p2');
  ok(r.state.hands.p0.length === 4 && r.state.hands.p2.length === 5 && !r.state.phase, 'p0 back in with 4');
}
{ // …partner has only 1 card: I stay out and am passed over
  const st = setup(4, [[R], null, [['blue', '4']]], R);
  let r = E.apply(st, { t: 'play', i: 0 }, 'p0');
  ok(r.state.status === 'playing' && !r.state.phase && r.state.hands.p0.length === 0, 'stay out');
  ok(E.Engine === undefined && E.nextActive(r.state, 3) === 1, 'turn order skips the player who is out');
}
{ // …both out: the team wins and scores the other team's cards
  const st = setup(4, [[R], [['red', 'skip'], ['wild', 'wild']], [], [['red', '3'], ['blue', 'draw2']]], R);
  const r = E.apply(st, { t: 'play', i: 0 }, 'p0');
  ok(r.state.status === 'ended' && r.state.winner === 'A' && r.state.roundPoints === 93 && r.state.points.A === 93, 'team wins: 20+50+3+20');
}
{ // Tagging back in: my partner is out; I draw → I pass half
  const st = setup(4, [[], null, [['blue', '4']]], R);
  st.currentPlayerIndex = 2;
  st.drawPile[0] = { id: 1, c: 'yellow', v: '9' };
  let r = E.apply(st, { t: 'draw' }, 'p2');
  ok(r.state.phase?.k === 'give' && r.state.phase.why === 'tag' && r.state.phase.n === 1, 'tag back in after drawing');
  r = E.apply(r.state, { t: 'give', ids: [1] }, 'p2');
  ok(r.state.hands.p0.length === 1 && r.state.hands.p2.length === 1, 'both back with 1');
  ok(r.state.uno.length === 2, 'both must shout ¡UNO!');
}
{ // …Wild Team Draw Four brings a player who is out back in
  const st = setup(4, [[['wild', 'team4'], R], [['red', '1'], ['red', '2']], null, []], R);
  const r = E.apply(st, { t: 'play', i: 0, color: 'red' }, 'p0');
  ok(r.state.hands.p3.length === 2 && r.state.hands.p1.length === 4 && !r.state.phase, 'out player draws 2 even when out');
}
{ // ¡UNO!: the partner may shout for you; only the other team can catch
  const st = setup(4, [[R, ['red', '7']]], R);
  const r = E.apply(st, { t: 'play', i: 0 }, 'p0');
  ok(r.state.uno.some(u => u.pid === 'p0'), 'one card → must shout');
  ok(E.apply(r.state, { t: 'catch' }, 'p2').error === 'noUno', 'partner cannot catch');
  ok(E.apply(r.state, { t: 'catch' }, 'p1').state.hands.p0.length === 3, 'caught → +2');
  const safe = E.apply(r.state, { t: 'shout' }, 'p2');
  ok(safe.state && !safe.state.uno.length && E.apply(safe.state, { t: 'catch' }, 'p1').error, 'partner shouted → safe');
}
{ // Drawing: you may draw even with a playable card; a drawn card that fits may be played
  const st = setup(4, [[['red', '1']]], R);
  st.drawPile[0] = { id: 1, c: 'green', v: '2' };
  let r = E.apply(st, { t: 'draw' }, 'p0');
  ok(r.state.currentPlayerIndex === 1 && !r.state.drawn, 'unplayable draw passes (even with a playable card in hand)');
  const st2 = setup(4, [[['blue', '1']]], R);
  st2.drawPile[0] = { id: 1, c: 'red', v: '2' };
  r = E.apply(st2, { t: 'draw' }, 'p0');
  ok(r.state.drawn && E.apply(r.state, { t: 'play', i: 0 }, 'p0').error === 'onlyDrawn' && E.apply(r.state, { t: 'play', i: 1 }, 'p0').state, 'drawn card playable');
}
{ // Timeouts: only count once; they also finish a swap or a give
  const st = setup(4, [], R);
  const r = E.apply(st, { t: 'timeout', seq: st.seq }, 'sys');
  ok(r.state && r.state.currentPlayerIndex !== 0, 'timeout moves on');
  ok(E.apply(r.state, { t: 'timeout', seq: st.seq }, 'sys').error === 'stale', 'stale timeout ignored');
  let s2 = E.newRound(P(4));
  s2 = E.apply(s2, { t: 'timeout', seq: s2.seq }, 'sys').state;
  ok(!s2.phase && s2.players.every(p => s2.hands[p.id].length === 7), 'timeout finishes the first pass');
}
{ // The deck
  const d = E.createDeck();
  ok(d.length === 112 && new Set(d.map(c => c.id)).size === 112, '112 unique cards');
  ok(d.filter(c => c.c === 'wild').length === 16 && d.filter(c => c.v === 'teamPlay').length === 8 && d.filter(c => c.v === 'team4').length === 4, 'wilds');
  ok(d.filter(c => c.pass).length === 20 && !d.some(c => c.v === '0'), '20 passing cards, no zeros');
}
{ // A seat changes hands (bot stands in, person comes back)
  let st = E.newRound(P(4));
  st = E.replacePlayer(st, 'p1', { id: 'bot_x', name: 'Bot' });
  ok(st.hands.bot_x?.length === 7 && !st.hands.p1 && st.phase.pids.includes('bot_x') && E.partnerOf(st, 'bot_x') === 'p3', 'seat moved to the bot');
}

// ---------- Many full bot games ----------
const PERSONAS = ['attacker', 'teamer', 'saver', 'balanced'];
function nested(v) {   // Firestore forbids arrays directly inside arrays, and undefined
  if (Array.isArray(v)) return v.some(x => Array.isArray(x) || nested(x));
  if (v && typeof v === 'object') return Object.values(v).some(x => nested(x));
  return v === undefined;
}
let games = 0, moves = 0, tags = 0, outs = 0, teamPlays = 0, longest = 0;
const wins = {};
const N = Number(process.argv[2] || 3000);
for (let g = 0; g < N; g++) {
  const n = [4, 6, 8][g % 3];
  let st = E.newRound(P(n), { matchTarget: g % 3 ? 0 : 500, first: g });
  let steps = 0;
  while (st.status === 'playing' && steps < 5000) {
    steps++;
    // somebody shouts (for themselves or their partner) or gets caught
    if (st.uno.length && Math.random() < 0.5) {
      const u = st.uno[0];
      const r = Math.random() < 0.6 ? E.apply(st, { t: 'shout' }, Math.random() < 0.5 ? u.pid : E.partnerOf(st, u.pid))
        : E.apply(st, { t: 'catch' }, st.players.find(p => p.team !== E.teamOf(st, u.pid)).id);
      if (r.state) st = r.state;
    }
    if (Math.random() < 0.003) { st = E.replacePlayer(st, st.players[0].id, { id: 'r' + steps, name: 'R' }); }
    const waiting = E.waitingFor(st);
    if (!waiting.length) { ok(false, 'nobody to move'); break; }
    let actor = waiting[Math.floor(Math.random() * waiting.length)];
    let move;
    if (Math.random() < 0.01) { move = { t: 'timeout', seq: st.seq }; actor = 'sys'; }
    else move = E.botMove(st, actor, PERSONAS[g % 4], { random: g % 4 === 0 ? 0.3 : 0 });
    if (!move) { ok(false, 'bot found no move ' + JSON.stringify(st.phase)); break; }
    const r = E.apply(st, move, actor);
    if (r.error) { ok(false, `move error ${r.error} ${JSON.stringify(move)} phase=${JSON.stringify(st.phase)}`); break; }
    st = r.state;
    moves++;
    for (const e of st.ev.list) {
      if (e.t === 'give' && e.why === 'tag') tags++;
      if (e.t === 'out') outs++;
      if (e.t === 'teamPlay') teamPlays++;
    }
    const all = [...st.drawPile, ...st.discard, ...Object.values(st.hands).flat()];
    if (all.length !== 112 || new Set(all.map(c => c.id)).size !== 112) { ok(false, `card count ${all.length}`); break; }
    if (st.players.some(p => p.cardCount !== st.hands[p.id].length)) { ok(false, 'cardCount out of sync'); break; }
    if (st.status === 'playing') {
      const cur = st.players[st.currentPlayerIndex];
      if (!st.phase && st.hands[cur.id].length === 0) { ok(false, 'turn is on a player who is out'); break; }
      if (E.TEAMS.some(tm => { const m = E.teamIds(st, tm); return m.length && m.every(id => !st.hands[id].length); })) { ok(false, 'a team is out but the game goes on'); break; }
    }
    if (st.phase === undefined || nested(st)) { ok(false, 'not saveable to Firestore'); break; }
  }
  if (st.status !== 'ended') ok(false, `game ${g} did not end (${steps} steps, ${n} players)`);
  else wins[st.winner] = (wins[st.winner] || 0) + 1;
  longest = Math.max(longest, steps);
  games++;
}
console.log(`${games} bot games, ${moves} moves, ${outs} players out, ${tags} tagged back in, ${teamPlays} team plays, longest ${longest} moves, wins ${JSON.stringify(wins)}`);
console.log(fails ? `${fails} FAILED` : 'All good ✓');
process.exit(fails ? 1 : 0);
