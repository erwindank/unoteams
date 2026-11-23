// ============================================================
// UNO TEAMS — rules engine (plays by the official Mattel UNO TEAMS! rules, sheet HXT58)
//
//  👥 You play in teams of 2, sitting across from your partner. 2–4 teams (4–8 players).
//     A team wins when BOTH partners have no cards left.
//  🔁 At the start everyone passes one card to their partner. Number cards 1–5 with the
//     passing symbol make you and your partner swap one card each.
//  🏃 When you go out, your partner passes you half their cards (they keep the bigger half).
//     If they only have 1 card, you stay out. While you're out, if your partner draws cards
//     for any reason they pass you half and you're tagged back in.
//  🤝 Wild Team Play: pick a colour, the turn jumps straight to your partner. If they can't
//     play a card, YOU draw 2.
//  ✌️ Wild Team Draw Four: the next player draws 2 and loses their turn, and their partner
//     draws 2 as well (even if they were out).
//
// This file has NO screen and NO Firebase code. Every move — mine, the bots', the guided
// game's, a timeout — goes through Engine.apply(state, move, actorId), which returns the
// new game state (or an error). app.js saves that result in one Firestore transaction,
// so two players can never half-overwrite each other. Because it is plain logic it runs
// in Node too: `node test-engine.js` plays thousands of bot games to check the rules.
//
// Room fields this engine owns are listed in GAME_KEYS; anything else in the room
// (chat, music, votes…) is left alone.
// ============================================================

(function (root) {
  'use strict';

  // ---------- Cards ----------
  // number: { id, c: 'red', v: '7', pass?: true }       (🔁 passing symbol on one copy of 1–5)
  // action: { id, c: 'red', v: 'skip' | 'reverse' | 'draw2' }
  // wild:   { id, c: 'wild', v: 'wild' | 'teamPlay' | 'team4' }
  const COLORS = ['red', 'yellow', 'green', 'blue'];
  const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];   // UNO TEAMS has no zeros
  const ACTIONS = ['skip', 'reverse', 'draw2'];
  const WILDS = ['wild', 'teamPlay', 'team4'];
  const WILD_COLOR = 'wild';            // colour name stored on wild cards
  const PASS_NUMBERS = ['1', '2', '3', '4', '5'];
  const isWildValue = v => WILDS.includes(v);
  const isWild = card => !!card && card.c === WILD_COLOR;

  // Teams, in the order their seats go round the table
  const TEAMS = ['A', 'B', 'C', 'D'];

  // Points left in the other teams' hands go to the team that wins the hand
  const cardPoints = card => NUMBERS.includes(card.v) ? Number(card.v) : isWild(card) ? 50 : 20;

  const HAND_SIZE = 7;
  const MIN_PLAYERS = 4;                // 2 teams of 2
  const MAX_PLAYERS = 8;                // 4 teams of 2
  const MATCH_TARGET = 500;
  const LOG_MAX = 24;

  // Every room field this engine writes (app.js copies exactly these into Firestore)
  const GAME_KEYS = ['status', 'players', 'hands', 'drawPile', 'discard', 'topColor', 'topValue',
    'currentPlayerIndex', 'direction', 'phase', 'queue', 'drawn', 'uno', 'teamPlay', 'ev', 'log', 'stats', 'seq',
    'winner', 'winnerIds', 'winnerName', 'winnerReason', 'roundPoints', 'points', 'matchWinner', 'matchTarget', 'roundNo'];

  // ---------- Deck: 112 cards ----------
  //  per colour: two of each number 1–9 (one 1–5 of each colour carries the passing symbol),
  //  two Skip, two Reverse, two Draw Two → 24 × 4 = 96
  //  wilds: 4 Wild, 8 Wild Team Play, 4 Wild Team Draw Four → 16
  const CARD_TOTAL = 112;
  function shuffle(arr, rnd = Math.random) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function createDeck(rnd = Math.random) {
    const out = [];
    for (const c of COLORS) {
      for (const n of NUMBERS) {
        out.push(PASS_NUMBERS.includes(n) ? { c, v: n, pass: true } : { c, v: n });
        out.push({ c, v: n });
      }
      for (const a of ACTIONS) { out.push({ c, v: a }); out.push({ c, v: a }); }
    }
    for (let i = 0; i < 4; i++) out.push({ c: WILD_COLOR, v: 'wild' });
    for (let i = 0; i < 8; i++) out.push({ c: WILD_COLOR, v: 'teamPlay' });
    for (let i = 0; i < 4; i++) out.push({ c: WILD_COLOR, v: 'team4' });
    return shuffle(out.map((card, id) => ({ id, ...card })), rnd);
  }

  // ---------- Small helpers ----------
  const clone = o => JSON.parse(JSON.stringify(o));
  const ci = card => (card ? { ...card } : null);   // card as stored in events

  const handOf = (st, pid) => st.hands[pid] || [];
  const isOut = (st, pid) => handOf(st, pid).length === 0;
  const indexOf = (state, pid) => state.players.findIndex(p => p.id === pid);
  const nameOf = (state, pid) => state.players.find(p => p.id === pid)?.name || '?';
  const teamOf = (state, pid) => state.players.find(p => p.id === pid)?.team || null;
  const currentId = state => state.players[state.currentPlayerIndex]?.id;
  // my partner's id (the other player of my team)
  function partnerOf(state, pid) {
    const team = teamOf(state, pid);
    return state.players.find(p => p.team === team && p.id !== pid)?.id || null;
  }
  const teamIds = (state, team) => state.players.filter(p => p.team === team).map(p => p.id);
  const teamName = (state, team) => teamIds(state, team).map(id => nameOf(state, id)).join(' & ');

  // The next player who still has cards (players who are out are passed over)
  function nextActive(state, fromIdx, dir = state.direction, steps = 1) {
    const n = state.players.length;
    let idx = fromIdx;
    for (let s = 0; s < steps; s++) {
      for (let k = 0; k < n; k++) {
        idx = ((idx + dir) % n + n) % n;
        const p = state.players[idx];
        if (!p.disconnected && (state.hands?.[p.id] || []).length > 0) break;
      }
    }
    return idx;
  }
  const activeCount = state => state.players.filter(p => !p.disconnected && (state.hands?.[p.id] || []).length > 0).length;

  // Can this card go down on the table card?
  function isPlayable(card, state) {
    if (!card) return false;
    if (isWild(card)) return true;
    return card.c === state.topColor || card.v === state.topValue;
  }
  // Which cards in this player's hand may be played (indexes)
  function legalPlays(state, pid) {
    if (state.status !== 'playing' || state.phase || currentId(state) !== pid) return [];
    const hand = state.hands[pid] || [];
    if (state.drawn) {
      if (state.drawn.pid !== pid) return [];
      const i = hand.findIndex(c => c.id === state.drawn.id);
      return i >= 0 && isPlayable(hand[i], state) ? [i] : [];
    }
    return hand.map((c, i) => (isPlayable(c, state) ? i : -1)).filter(i => i >= 0);
  }

  // ---------- Drawing (the discard pile is reshuffled when the deck runs out) ----------
  function refill(st) {
    if (st.drawPile.length || st.discard.length <= 1) return;
    const top = st.discard[st.discard.length - 1];
    st.drawPile = shuffle(st.discard.slice(0, -1));
    st.discard = [top];
    addLog(st, 'log.reshuffle', {});
  }
  function take(st, pid, n) {
    const got = [];
    for (let i = 0; i < n; i++) {
      refill(st);
      if (!st.drawPile.length) break;
      got.push(st.drawPile.shift());
    }
    st.hands[pid] = [...(st.hands[pid] || []), ...got];
    if (got.length) (st._drew = st._drew || []).push(pid);   // for "tagging back in"
    return got;
  }

  // ---------- Log, events, stats ----------
  function addLog(st, k, p) {
    st.log = [...(st.log || []), { k, p }].slice(-LOG_MAX);
  }
  function emit(st, e) { st.ev.list.push(e); }
  function stat(st, pid, key, n = 1) {
    if (!pid || pid === 'system') return;
    st.stats = st.stats || {};
    const s = st.stats[pid] || (st.stats[pid] = {});
    s[key] = (s[key] || 0) + n;
  }
  function syncCounts(st) {
    st.players = st.players.map(p => ({ ...p, cardCount: (st.hands[p.id] || []).length }));
  }
  // Someone is forced to take cards: hand + event + stats in one place
  function forceDraw(st, pid, n, by, why) {
    const got = take(st, pid, n);
    emit(st, { t: 'draw', pid, n: got.length, why });
    stat(st, pid, 'taken', got.length);
    if (by && by !== pid && teamOf(st, by) !== teamOf(st, pid)) stat(st, by, 'dealt', got.length);
    return got.length;
  }

  // ---------- Waiting steps (phases) ----------
  // A phase stops normal play until it's done:
  //   { k:'swap', why:'start'|'symbol', pids:[…], picks:{pid: cardId} }  everyone listed picks 1 card for their partner
  //   { k:'give', why:'out'|'tag', from, to, n }                         `from` passes n cards to their partner
  // More than one can be waiting; the others sit in `queue` and start one after another.
  function queuePhase(st, ph) {
    if (!st.phase) startPhase(st, ph);
    else st.queue = [...(st.queue || []), ph];
  }
  // A phase is checked again when it starts (hands may have changed since it was queued)
  function startPhase(st, ph) {
    if (ph.k === 'give') {
      const len = handOf(st, ph.from).length;
      // tag back in: only while the partner is still out; going out: only while I'm still out
      if (!isOut(st, ph.to) || len < 2) return nextPhase(st);
      ph = { ...ph, n: Math.floor(len / 2) };       // the giver keeps the bigger half
    }
    if (ph.k === 'swap') {
      const pids = ph.pids.filter(id => !isOut(st, id) && !isOut(st, partnerOf(st, id)));
      if (!pids.length) return nextPhase(st);
      ph = { ...ph, pids, picks: {} };
    }
    st.phase = ph;
    emit(st, { t: 'phase', k: ph.k, why: ph.why, from: ph.from || null, to: ph.to || null, n: ph.n || 0, pids: ph.pids || null });
  }
  function nextPhase(st) {
    st.phase = null;
    const q = [...(st.queue || [])];
    st.queue = [];
    while (q.length && !st.phase) {
      startPhase(st, q.shift());
      if (st.phase) st.queue = [...q, ...(st.queue || [])];
    }
    if (!st.phase) st.queue = [];
  }
  // Who the game is waiting for right now (everyone still picking, or the giver, or the turn)
  function waitingFor(state) {
    if (!state || state.status !== 'playing') return [];
    const ph = state.phase;
    if (ph?.k === 'swap') return ph.pids.filter(id => ph.picks?.[id] == null);
    if (ph?.k === 'give') return [ph.from];
    const cur = currentId(state);
    return cur ? [cur] : [];
  }

  // "Tagging back in": a player drew cards while their partner is out → pass half
  function checkTagBack(st) {
    const drew = [...new Set(st._drew || [])];
    delete st._drew;
    if (st.status !== 'playing') return;
    for (const pid of drew) {
      const mate = partnerOf(st, pid);
      if (mate && isOut(st, mate) && handOf(st, pid).length >= 2) {
        queuePhase(st, { k: 'give', why: 'tag', from: pid, to: mate });
      }
    }
  }

  // ¡UNO! — a list of players who are down to one card and haven't shouted yet
  function setUno(st, pid) {
    const list = (st.uno || []).filter(u => u.pid !== pid);
    if (handOf(st, pid).length === 1) list.push({ pid, at: st.seq });
    st.uno = list;
  }
  // anyone whose hand is no longer exactly one card can't be caught any more
  function tidyUno(st) {
    st.uno = (st.uno || []).filter(u => handOf(st, u.pid).length === 1 && st.players.some(p => p.id === u.pid));
  }

  // ---------- New round ----------
  // players: [{id, name, team: 'A'…}] — each team exactly 2 players. They are seated so
  // partners sit across from each other: A1 B1 C1 A2 B2 C2 (round the table).
  // opts: { matchTarget, points, roundNo, rnd, first }
  function seatOrder(players) {
    const teams = TEAMS.filter(tm => players.some(p => p.team === tm));
    const seats = [];
    for (let r = 0; r < 2; r++) for (const tm of teams) {
      const p = players.filter(x => x.team === tm)[r];
      if (p) seats.push(p);
    }
    return seats;
  }
  // Are these players ready to play? (2–4 full teams, nobody without a team)
  function teamsReady(players) {
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return false;
    const counts = {};
    for (const p of players) {
      if (!TEAMS.includes(p.team)) return false;
      counts[p.team] = (counts[p.team] || 0) + 1;
    }
    const sizes = Object.values(counts);
    return sizes.length >= 2 && sizes.every(n => n === 2);
  }

  function newRound(players, opts = {}) {
    if (!teamsReady(players)) return null;
    const rnd = opts.rnd || Math.random;
    const seats = seatOrder(players);
    let deck = createDeck(rnd);
    const hands = {};
    for (const p of seats) hands[p.id] = deck.splice(0, HAND_SIZE);
    // The first table card can't be an action or wild card: those are passed over until a
    // number card turns up (they stay in the deck)
    const at = deck.findIndex(c => NUMBERS.includes(c.v));
    const start = deck.splice(at, 1)[0];
    const st = {
      status: 'playing',
      players: seats.map(p => ({ ...p, cardCount: HAND_SIZE, disconnected: !!p.disconnected })),
      hands,
      drawPile: deck,
      discard: [start],
      topColor: start.c,
      topValue: start.v,
      currentPlayerIndex: 0,
      direction: 1,
      phase: null,
      queue: [],
      drawn: null,
      uno: [],
      teamPlay: null,
      ev: { n: 1, list: [{ t: 'start' }] },
      log: [],
      stats: {},
      seq: 1,
      winner: null, winnerIds: null, winnerName: null, winnerReason: null, roundPoints: 0,
      points: opts.points || {},
      matchWinner: null,
      matchTarget: opts.matchTarget || 0,
      roundNo: (opts.roundNo || 0) + 1
    };
    // who starts moves round the table from game to game
    st.currentPlayerIndex = (opts.first || 0) % st.players.length;
    addLog(st, 'log.start', { name: st.players[st.currentPlayerIndex].name });
    // Before the first turn everyone passes one card to their partner
    startPhase(st, { k: 'swap', why: 'start', pids: st.players.map(p => p.id) });
    return st;
  }

  // ---------- Ending a round ----------
  function endRound(st, team, reason = 'out') {
    let pts = 0;
    for (const p of st.players) {
      if (p.team === team) continue;
      pts += handOf(st, p.id).reduce((s, c) => s + cardPoints(c), 0);
    }
    st.status = 'ended';
    st.winner = team;
    st.winnerIds = teamIds(st, team);
    st.winnerName = teamName(st, team);
    st.winnerReason = reason;
    st.roundPoints = pts;
    st.points = { ...(st.points || {}) };
    st.points[team] = (st.points[team] || 0) + pts;
    st.phase = null; st.queue = []; st.drawn = null; st.uno = []; st.teamPlay = null;
    if (st.matchTarget && st.points[team] >= st.matchTarget) st.matchWinner = team;
    for (const id of st.winnerIds) stat(st, id, 'wins');
    emit(st, { t: 'win', team, pids: st.winnerIds, pts });
    addLog(st, 'log.win', { name: st.winnerName, pts });
  }

  // Standings for "end by vote" / last player standing: the team with the fewest cards, then fewest points
  function leader(st) {
    const teams = TEAMS.filter(tm => st.players.some(p => p.team === tm));
    return teams.map(tm => {
      const cards = teamIds(st, tm).flatMap(id => handOf(st, id));
      return { tm, n: cards.length, pts: cards.reduce((s, c) => s + cardPoints(c), 0) };
    }).sort((a, b) => a.n - b.n || a.pts - b.pts)[0]?.tm || null;
  }

  // ---------- Applying a move ----------
  // move.t: play {id|i, color? (wilds)} · draw · pass · swap {id} · give {ids} ·
  //         shout {pid?} · catch {pid?} · timeout {seq} · endVote · lastPlayer
  function apply(state, move, actor) {
    if (!state || state.status !== 'playing') return { error: 'notPlaying' };
    const st = clone(state);
    st.ev = { n: (state.ev?.n || 0) + 1, list: [] };
    st.seq = (state.seq || 0) + 1;
    st.uno = st.uno || [];
    st.queue = st.queue || [];
    const err = run(st, move, actor);
    if (err) return { error: err };
    checkTagBack(st);
    if (st.status === 'playing') {
      // somebody's turn may have landed on a player who is out (e.g. after a give)
      const cur = st.players[st.currentPlayerIndex];
      if (cur && isOut(st, cur.id)) st.currentPlayerIndex = nextActive(st, st.currentPlayerIndex);
      tidyUno(st);
    }
    delete st._drew;
    syncCounts(st);
    return { state: st };
  }

  // My turn ends without me playing a card: a Wild Team Play aimed at me fails
  function endTurn(st, me, myIdx) {
    const tp = st.teamPlay;
    if (tp && tp.to === me) {
      st.teamPlay = null;
      const n = forceDraw(st, tp.by, 2, null, 'teamPlay');
      emit(st, { t: 'teamPlayFail', by: tp.by, to: me, n });
      stat(st, tp.by, 'teamPlayMiss');
      addLog(st, 'log.teamPlayFail', { name: nameOf(st, me), by: nameOf(st, tp.by), n });
    }
    st.drawn = null;
    st.currentPlayerIndex = nextActive(st, myIdx);
  }

  function run(st, move, actor) {
    const me = actor;
    const myIdx = indexOf(st, me);
    const isTurn = currentId(st) === me;
    const ph = st.phase;

    // The ¡UNO! window closes as soon as someone else starts their turn
    const closeUno = () => { st.uno = (st.uno || []).filter(u => u.pid === me); };

    switch (move.t) {
      case 'play': {
        if (!isTurn) return 'notYourTurn';
        if (ph) return 'busy';
        const hand = st.hands[me] || [];
        // cards are chosen by id (safe if the hand changed meanwhile); index still works
        if (move.id != null) move = { ...move, i: hand.findIndex(c => c.id === move.id) };
        const card = hand[move.i];
        if (!card) return 'noCard';
        if (st.drawn && card.id !== st.drawn.id) return 'onlyDrawn';
        if (!isPlayable(card, st)) return 'cantPlay';
        const wild = isWild(card);
        if (wild && !COLORS.includes(move.color)) return 'needColor';

        closeUno();
        // a Wild Team Play aimed at me: I played a card, so nobody draws
        if (st.teamPlay?.to === me) {
          emit(st, { t: 'teamPlayOk', by: st.teamPlay.by, to: me });
          stat(st, st.teamPlay.by, 'teamPlayHit');
          st.teamPlay = null;
        } else st.teamPlay = null;

        const left = hand.length - 1;
        st.hands[me] = hand.filter((_, i) => i !== move.i);
        st.discard = [...st.discard, card];
        st.drawn = null;
        st.topColor = wild ? move.color : card.c;
        st.topValue = card.v;
        emit(st, { t: 'play', pid: me, card: ci(card), color: st.topColor });
        stat(st, me, 'plays');
        if (wild) stat(st, me, 'wilds');
        addLog(st, wild ? 'log.playWild' : 'log.play', { name: nameOf(st, me), c: card.c, v: card.v, color: st.topColor, pass: !!card.pass });

        const mate = partnerOf(st, me);
        const nxt = nextActive(st, myIdx);
        const nxtId = st.players[nxt].id;
        let goTo = nxt;

        // ---- what the card does ----
        switch (card.v) {
          case 'draw2':
            forceDraw(st, nxtId, 2, me, 'draw2');
            emit(st, { t: 'skip', pid: nxtId });
            addLog(st, 'log.drawSkip', { name: nameOf(st, nxtId), n: 2 });
            goTo = nextActive(st, nxt);
            break;
          case 'skip':
            emit(st, { t: 'skip', pid: nxtId });
            stat(st, me, 'skips');
            addLog(st, 'log.skip', { name: nameOf(st, nxtId) });
            goTo = nextActive(st, nxt);
            break;
          case 'reverse': {
            st.direction = -st.direction;
            emit(st, { t: 'reverse', dir: st.direction });
            const first = nextActive(st, myIdx);          // first player in the new direction
            if (activeCount(st) === 2 && left > 0) {       // with two players left a Reverse works as a Skip
              emit(st, { t: 'skip', pid: st.players[first].id });
              addLog(st, 'log.skip', { name: nameOf(st, st.players[first].id) });
              goTo = myIdx;
            } else {
              addLog(st, 'log.reverse', {});
              goTo = first;
            }
            break;
          }
          case 'teamPlay': {
            // the turn jumps straight to my partner (if they still have cards)
            const mIdx = indexOf(st, mate);
            if (mate && !isOut(st, mate) && !st.players[mIdx].disconnected) {
              st.teamPlay = { by: me, to: mate };
              emit(st, { t: 'teamPlay', by: me, to: mate, color: st.topColor });
              stat(st, me, 'teamPlays');
              addLog(st, 'log.teamPlay', { name: nameOf(st, me), mate: nameOf(st, mate), color: st.topColor });
              goTo = mIdx;
            } else {
              addLog(st, 'log.teamPlayNone', { name: nameOf(st, me) });
            }
            break;
          }
          case 'team4': {
            // the next player draws 2 and loses their turn; their partner draws 2 too
            const other = partnerOf(st, nxtId);
            forceDraw(st, nxtId, 2, me, 'team4');
            if (other) forceDraw(st, other, 2, me, 'team4');
            emit(st, { t: 'team4', by: me, pids: [nxtId, other].filter(Boolean) });
            emit(st, { t: 'skip', pid: nxtId });
            stat(st, me, 'team4s');
            addLog(st, 'log.team4', { name: nameOf(st, nxtId), mate: other ? nameOf(st, other) : '?' });
            goTo = nextActive(st, nxt);
            break;
          }
          default:
            break;
        }

        // ---- did I go out? ----
        if (left === 0) {
          stat(st, me, 'outs');
          emit(st, { t: 'out', pid: me });
          if (!mate || isOut(st, mate)) { endRound(st, teamOf(st, me)); return null; }
          if (handOf(st, mate).length >= 2) {
            addLog(st, 'log.out', { name: nameOf(st, me), mate: nameOf(st, mate) });
            // effects of the card (e.g. draws) first, then my partner passes me half
            checkTagBack(st);
            queuePhase(st, { k: 'give', why: 'out', from: mate, to: me });
          } else {
            addLog(st, 'log.outStay', { name: nameOf(st, me), mate: nameOf(st, mate) });
          }
        } else if (card.pass && mate && !isOut(st, mate)) {
          // 🔁 passing symbol: my partner and I swap one card each
          checkTagBack(st);
          queuePhase(st, { k: 'swap', why: 'symbol', pids: [me, mate] });
        }
        setUno(st, me);
        st.currentPlayerIndex = goTo;
        return null;
      }

      case 'draw': {
        if (!isTurn) return 'notYourTurn';
        if (ph) return 'busy';
        if (st.drawn) return 'alreadyDrew';
        closeUno();
        const got = take(st, me, 1);
        if (!got.length) {          // no cards anywhere: just pass
          addLog(st, 'log.pass', { name: nameOf(st, me) });
          endTurn(st, me, myIdx);
          return null;
        }
        emit(st, { t: 'draw', pid: me, n: 1, why: 'self' });
        stat(st, me, 'drew');
        const mate = partnerOf(st, me);
        if (mate && isOut(st, mate) && handOf(st, me).length >= 2) {
          // my partner is out: drawing tags them back in — I pass half and my turn ends
          addLog(st, 'log.drewPass', { name: nameOf(st, me) });
          endTurn(st, me, myIdx);
        } else if (isPlayable(got[0], st)) {
          st.drawn = { pid: me, id: got[0].id };   // may play it now, or pass
        } else {
          addLog(st, 'log.drewPass', { name: nameOf(st, me) });
          endTurn(st, me, myIdx);
        }
        return null;
      }

      case 'pass': {
        if (!isTurn) return 'notYourTurn';
        if (ph) return 'busy';
        if (!st.drawn) return 'drawFirst';
        addLog(st, 'log.drewPass', { name: nameOf(st, me) });
        endTurn(st, me, myIdx);
        return null;
      }

      // 🔁 pick the card that goes to my partner
      case 'swap': {
        if (ph?.k !== 'swap' || !ph.pids.includes(me)) return 'noSwap';
        if (ph.picks?.[me] != null) return 'alreadyPicked';
        const card = handOf(st, me).find(c => c.id === move.id);
        if (!card) return 'noCard';
        st.phase = { ...ph, picks: { ...(ph.picks || {}), [me]: card.id } };
        emit(st, { t: 'picked', pid: me });
        if (ph.pids.every(id => st.phase.picks[id] != null)) finishSwap(st);
        return null;
      }

      // 🏃 pass half my cards to my partner
      case 'give': {
        if (ph?.k !== 'give' || ph.from !== me) return 'noGive';
        const ids = [...new Set(move.ids || [])];
        if (ids.length !== ph.n) return 'wrongCount';
        const hand = handOf(st, me);
        if (!ids.every(id => hand.some(c => c.id === id))) return 'noCard';
        const cards = hand.filter(c => ids.includes(c.id));
        st.hands[me] = hand.filter(c => !ids.includes(c.id));
        st.hands[ph.to] = [...handOf(st, ph.to), ...cards];
        emit(st, { t: 'give', from: me, to: ph.to, n: cards.length, why: ph.why });
        stat(st, me, 'gave', cards.length);
        addLog(st, ph.why === 'tag' ? 'log.tagBack' : 'log.give', { name: nameOf(st, me), mate: nameOf(st, ph.to), n: cards.length });
        // whoever is down to one card now has to shout
        setUno(st, me); setUno(st, ph.to);
        nextPhase(st);
        return null;
      }

      // ¡UNO! — for myself, or for my partner
      case 'shout': {
        const list = st.uno || [];
        const mate = partnerOf(st, me);
        const who = move.pid || (list.some(u => u.pid === me) ? me : mate);
        if (who !== me && who !== mate) return 'noUno';
        if (!list.some(u => u.pid === who)) return 'noUno';
        st.uno = list.filter(u => u.pid !== who);
        emit(st, { t: 'uno', pid: who, by: me });
        stat(st, me, who === me ? 'shouts' : 'mateShouts');
        addLog(st, who === me ? 'log.shout' : 'log.shoutMate', { name: nameOf(st, me), mate: nameOf(st, who) });
        return null;
      }

      // Catch a player (of another team) who didn't shout: they draw 2
      case 'catch': {
        const list = st.uno || [];
        const myTeam = teamOf(st, me);
        if (myIdx < 0) return 'noUno';
        const u = list.find(x => (move.pid ? x.pid === move.pid : true) && teamOf(st, x.pid) !== myTeam);
        if (!u) return 'noUno';
        st.uno = list.filter(x => x.pid !== u.pid);
        if (handOf(st, u.pid).length !== 1) return null;
        forceDraw(st, u.pid, 2, me, 'caught');
        emit(st, { t: 'caught', pid: u.pid, by: me });
        stat(st, me, 'catches');
        addLog(st, 'log.caught', { name: nameOf(st, me), target: nameOf(st, u.pid) });
        return null;
      }

      // The default move for whoever is holding the game up (turn timer, a player who
      // left). move.seq must match, so two clients firing at once only count once.
      case 'timeout': {
        if (move.seq !== (st.seq - 1)) return 'stale';
        if (ph?.k === 'swap') {
          for (const id of ph.pids) {
            if (st.phase?.k !== 'swap' || st.phase.picks?.[id] != null) continue;
            const e = run(st, { t: 'swap', id: passPick(handOf(st, id)) }, id);
            if (e) return e;
          }
          addLog(st, 'log.timeoutSwap', {});
          return null;
        }
        if (ph?.k === 'give') {
          addLog(st, 'log.timeout', { name: nameOf(st, ph.from) });
          return run(st, { t: 'give', ids: givePick(handOf(st, ph.from), ph.n) }, ph.from);
        }
        const cur = currentId(st);
        if (st.drawn) return run(st, { t: 'pass' }, cur);
        if (st.players[st.currentPlayerIndex].disconnected) {
          addLog(st, 'log.skipGone', { name: nameOf(st, cur) });
          endTurn(st, cur, st.currentPlayerIndex);
          return null;
        }
        addLog(st, 'log.timeout', { name: nameOf(st, cur) });
        const e = run(st, { t: 'draw' }, cur);
        if (e) return e;
        if (st.drawn) return run(st, { t: 'pass' }, cur);
        return null;
      }

      // Everybody voted to stop: the team with the fewest cards wins the round
      case 'endVote': {
        const w = leader(st);
        if (!w) return 'nobody';
        endRound(st, w, 'vote');
        return null;
      }
      // Only one player still connected
      case 'lastPlayer': {
        const alive = st.players.filter(p => !p.disconnected);
        if (alive.length !== 1) return 'notLast';
        endRound(st, alive[0].team, 'lastPlayer');
        return null;
      }
    }
    return 'unknownMove';
  }

  // Everyone has picked: each picked card goes to that player's partner
  function finishSwap(st) {
    const ph = st.phase;
    const moves = ph.pids.map(id => ({ from: id, to: partnerOf(st, id), card: handOf(st, id).find(c => c.id === ph.picks[id]) }))
      .filter(m => m.card && m.to);
    for (const m of moves) st.hands[m.from] = handOf(st, m.from).filter(c => c.id !== m.card.id);
    for (const m of moves) st.hands[m.to] = [...handOf(st, m.to), m.card];
    for (const m of moves) stat(st, m.from, 'swaps');
    emit(st, { t: 'swapDone', why: ph.why, pids: ph.pids });
    addLog(st, ph.why === 'start' ? 'log.swapStart' : 'log.swap', { name: nameOf(st, ph.pids[0]), mate: nameOf(st, ph.pids[1] || '') });
    nextPhase(st);
  }

  // ---------- Seats changing hands ----------
  // A player's seat (cards, turn, everything) moves to a new id — a bot standing in for
  // someone who left, or the person coming back. Nothing else about the game changes.
  function replacePlayer(state, oldId, player) {
    const idx = indexOf(state, oldId);
    if (idx < 0) return state;
    const st = clone(state);
    const newId = player.id;
    const swap = id => (id === oldId ? newId : id);
    st.players = st.players.map(p => (p.id === oldId ? { ...p, ...player, team: p.team, cardCount: p.cardCount } : p));
    if (st.hands) { st.hands[newId] = st.hands[oldId] || []; if (newId !== oldId) delete st.hands[oldId]; }
    if (st.stats?.[oldId] && newId !== oldId) { st.stats[newId] = st.stats[oldId]; delete st.stats[oldId]; }
    const fixPhase = ph => {
      if (!ph) return ph;
      const out = { ...ph };
      if (out.from) out.from = swap(out.from);
      if (out.to) out.to = swap(out.to);
      if (out.pids) out.pids = out.pids.map(swap);
      if (out.picks) out.picks = Object.fromEntries(Object.entries(out.picks).map(([k, v]) => [swap(k), v]));
      return out;
    };
    st.phase = fixPhase(st.phase);
    st.queue = (st.queue || []).map(fixPhase);
    st.uno = (st.uno || []).map(u => ({ ...u, pid: swap(u.pid) }));
    if (st.drawn) st.drawn = { ...st.drawn, pid: swap(st.drawn.pid) };
    if (st.teamPlay) st.teamPlay = { by: swap(st.teamPlay.by), to: swap(st.teamPlay.to) };
    if (st.winnerIds) st.winnerIds = st.winnerIds.map(swap);
    return st;
  }

  // ---------- Card choices used by bots and timeouts ----------
  // The card I'd pass my partner: never a wild; a card of the colour I hold least of
  function passPick(hand) {
    if (!hand.length) return null;
    const n = colorCounts(hand);
    const ranked = hand.slice().sort((a, b) =>
      (isWild(a) - isWild(b)) || (n[a.c] || 0) - (n[b.c] || 0) || cardPoints(b) - cardPoints(a));
    return ranked[0].id;
  }
  // The n cards I'd hand over when my partner goes out: the ones I'd least like to keep
  function givePick(hand, n) {
    const cnt = colorCounts(hand);
    const keep = c => (isWild(c) ? 100 : 0) + (ACTIONS.includes(c.v) ? 8 : 0) + (cnt[c.c] || 0) * 4;
    return hand.slice().sort((a, b) => keep(a) - keep(b)).slice(0, n).map(c => c.id);
  }
  function colorCounts(hand) {
    const n = Object.fromEntries(COLORS.map(c => [c, 0]));
    for (const c of hand) if (!isWild(c)) n[c.c]++;
    return n;
  }
  // The colour you hold most of — bots and timeouts use it (action cards count a bit more)
  function bestColor(hand, among = COLORS) {
    const n = Object.fromEntries(COLORS.map(c => [c, 0]));
    for (const c of hand) if (!isWild(c)) n[c.c] += NUMBERS.includes(c.v) ? 1 : 1.3;
    return among.reduce((a, b) => (n[b] > n[a] ? b : a), among[Math.floor(Math.random() * among.length)]);
  }

  // ============================================================
  // BOTS — choose a move for a bot (no peeking: a bot only uses its own hand, card counts
  // and the table — not even its partner's cards, just like the "no hints" rule)
  // ============================================================
  // persona: attacker · teamer · saver · balanced
  // level:   { random: chance of a careless play, rnd }
  function botMove(state, pid, persona = 'balanced', level = {}) {
    const st = state;
    const ph = st.phase;
    const hand = st.hands[pid] || [];
    const rnd = level.rnd || Math.random;

    if (ph?.k === 'swap') {
      if (!ph.pids.includes(pid) || ph.picks?.[pid] != null) return null;
      return { t: 'swap', id: passPick(hand) };
    }
    if (ph?.k === 'give') return ph.from === pid ? { t: 'give', ids: givePick(hand, ph.n) } : null;
    if (currentId(st) !== pid || st.status !== 'playing') return null;

    const legal = legalPlays(st, pid);
    if (!legal.length) return st.drawn ? { t: 'pass' } : { t: 'draw' };
    const myTeam = teamOf(st, pid);
    const mate = partnerOf(st, pid);
    const mateCards = mate ? handOf(st, mate).length : 0;
    const rivals = st.players.filter(p => p.team !== myTeam && !p.disconnected && p.cardCount > 0);
    const threat = rivals.length ? Math.min(...rivals.map(p => p.cardCount)) : 99;
    const nxt = st.players[nextActive(st, indexOf(st, pid))];
    const nextIsMate = nxt && nxt.id === mate;
    const nextIsClose = nxt && !nextIsMate && nxt.cardCount <= 2;
    const colorCount = c => hand.filter(h => h.c === c).length;

    const score = i => {
      const c = hand[i];
      let s = 0;
      const wild = isWild(c);
      if (!wild && NUMBERS.includes(c.v)) s += 10 + Number(c.v) * 0.3;   // shed high numbers first
      if (!wild) s += colorCount(c.c) * 1.5;                              // keep to a colour you are long in
      if (['draw2', 'skip'].includes(c.v)) s += nextIsMate ? -12 : nextIsClose ? 14 : 6;   // never hit my partner
      if (c.v === 'reverse') s += 5;
      if (c.pass) s += 2;                                                 // a swap helps the team
      if (wild) {
        s -= 8;                                                           // keep wilds for later
        if (hand.length <= 2) s += 20;                                    // …unless it wins soon
      }
      if (c.v === 'teamPlay' && mateCards > 0) {
        s += mateCards <= 2 ? 16 : 3;                                      // my partner is close: hand them the turn
        if (persona === 'teamer') s += 8;
      }
      if (c.v === 'team4') s += nextIsMate ? -30 : (threat <= 3 ? 14 : 4);
      if (persona === 'attacker' && ACTIONS.includes(c.v) && !nextIsMate) s += 6;
      if (persona === 'attacker' && c.v === 'team4' && !nextIsMate) s += 6;
      if (persona === 'saver' && wild) s -= 12;
      return s + rnd() * 3;
    };

    let pick;
    if (level.random && rnd() < level.random) {
      pick = legal[Math.floor(rnd() * legal.length)];               // easy bots sometimes play any card
    } else {
      let best = -Infinity;
      for (const i of legal) { const s = score(i); if (s > best) { best = s; pick = i; } }
    }
    const card = hand[pick];
    const move = { t: 'play', i: pick };
    if (isWild(card)) move.color = bestColor(hand.filter((_, k) => k !== pick));
    return move;
  }

  const Engine = {
    COLORS, NUMBERS, ACTIONS, WILDS, WILD_COLOR, TEAMS, HAND_SIZE, MIN_PLAYERS, MAX_PLAYERS, MATCH_TARGET, GAME_KEYS, CARD_TOTAL,
    createDeck, shuffle, newRound, apply, legalPlays, replacePlayer, isPlayable, isWildValue, isWild, isOut,
    nextActive, cardPoints, bestColor, botMove, leader, partnerOf, teamOf, teamIds, teamName, seatOrder, teamsReady,
    waitingFor, passPick, givePick
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
