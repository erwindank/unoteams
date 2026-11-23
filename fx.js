// ============================================================
// FX — sounds, vibration and on-screen effects (¡CAMALEÓN!)
//
//   cards fly: every play (from the player's seat — mine from the card's real spot),
//              draws and penalties
//   spotlight: other players' plays stop in the middle with a caption
//   big moments: 🦎 flex sides, Skip All, everyone drawing, 🎯 targeted draws, ⚡ Power
//              Cards flipping (one, everyone, all back to green), challenge stamps, ¡ÚLTIMA!
//   short synth sound effects (separate switch from the music) + phone vibration
//   calm mode: no flying or particles, only fades (follows "reduce motion")
//
// Unlike the older games, nothing is guessed from the log: the rules engine writes a
// list of events with every move (state.ev = { n, list }), and onState plays the new
// ones. Nothing here writes to Firestore.
// ============================================================

const FX = (() => {

  // ---------- Preferences (saved per device) ----------
  const PREF_KEY = 'camaleonFxPrefs';
  const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const prefs = Object.assign(
    { sfx: true, vol: 0.7, vibrate: true, calm: reduceMotion, colorblind: false },
    readPrefs()
  );
  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (_) { return {}; }
  }
  function setPref(key, value) {
    prefs[key] = value;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (_) {}
    applyBodyClasses();
  }
  function applyBodyClasses() {
    document.body?.classList.toggle('calm', !!prefs.calm);
    document.body?.classList.toggle('colorblind', !!prefs.colorblind);
  }
  applyBodyClasses();

  // ---------- Sound (Web Audio synth, no files to download) ----------
  let ctx = null, master = null, noiseBuf = null;
  function audio() {
    if (!prefs.sfx) return null;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.connect(ctx.destination);
      }
      master.gain.value = Math.max(0, Math.min(1, prefs.vol)) * 0.9;
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (_) { return null; }
  }
  function tone(type, f1, f2, dur, vol, delay = 0) {
    const c = audio(); if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, freq, delay = 0, q = 1, type = 'bandpass') {
    const c = audio(); if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + delay;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }
  const SOUNDS = {
    play:     () => noise(.12, .25, 2600, 0, .8),
    draw:     () => noise(.08, .18, 3400, 0, 1.2),
    buzzer:   () => { tone('square', 140, 90, .45, .16); tone('sawtooth', 145, 92, .45, .1); },
    truth:    () => [523, 659, 784].forEach((f, i) => tone('triangle', f, f, .25, .2, i * .09)),
    suspense: () => { for (let i = 0; i < 3; i++) tone('sine', 330 + i * 40, 330 + i * 40, .14, .1, i * .16); },
    wild:     () => [392, 494, 587, 784].forEach((f, i) => tone('sine', f, f, .2, .18, i * .07)),
    reverse:  () => { tone('sine', 300, 900, .18, .18); tone('sine', 900, 300, .18, .18, .18); },
    skip:     () => { tone('square', 700, 700, .08, .1); tone('square', 450, 450, .12, .1, .1); },
    // 🦎 a flex side played: a quick shimmer up and back
    cham:     () => [660, 880, 990, 880].forEach((f, i) => tone('sine', f, f * 1.02, .12, .13, i * .05)),
    // ⚡ Power Card: to green zaps upward, to red falls away
    charge:   () => { tone('sawtooth', 220, 880, .22, .09); tone('triangle', 880, 1320, .2, .16, .16); },
    drain:    () => { tone('sawtooth', 660, 110, .35, .08); tone('sine', 330, 90, .3, .12, .05); },
    // flex effects: everyone draws (a patter), a target is hit, skip all
    rain:     () => { for (let i = 0; i < 9; i++) noise(.05, .2, 3800 + Math.random() * 1500, i * .06 + Math.random() * .03, 2); },
    gift:     () => [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, .14, .15, i * .07)),
    skipAll:  () => [880, 660, 880, 660].forEach((f, i) => tone('square', f, f, .08, .09, i * .09)),
    uno:      () => { tone('triangle', 784, 784, .14, .25); tone('triangle', 1047, 1047, .3, .25, .14); },
    turn:     () => { tone('sine', 660, 660, .18, .22); tone('sine', 990, 990, .3, .2, .14); },
    danger:   () => { tone('sine', 70, 55, .18, .6); tone('sine', 70, 55, .18, .5, .24); },
    win:      () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, i === 3 ? .6 : .18, .22, i * .13)),
    lose:     () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f, .3, .18, i * .2)),
    pop:      () => tone('sine', 500, 900, .08, .22),
    tick:     () => tone('square', 1200, 1200, .03, .06),
    select:   () => tone('triangle', 700, 900, .06, .12)
  };
  function play(name) {
    if (!prefs.sfx) return;
    try { SOUNDS[name]?.(); } catch (_) {}
  }

  // ---------- Vibration (Android; iPhone ignores it) ----------
  function buzz(pattern) {
    if (!prefs.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (_) {}
  }

  // ---------- On-screen layer + small helpers ----------
  function layer() {
    let l = document.getElementById('fx-layer');
    if (!l) {
      l = document.createElement('div');
      l.id = 'fx-layer';
      l.setAttribute('aria-hidden', 'true');
      document.body.appendChild(l);
    }
    return l;
  }
  const sleep  = ms => new Promise(r => setTimeout(r, ms));
  const mid    = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const motion = () => !prefs.calm;
  // (CARD_HEX lives in app.js, which loads after this file — so look it up when needed)
  const colorsFor = c => CARD_HEX[c] ? [CARD_HEX[c], '#ffffff'] : [...Object.values(CARD_HEX), '#ffffff'];
  const BOLT = ['#ffe14a', '#fff7b0', '#a3e635', '#ffffff'];

  function burst(rect, colors, n = 14, dist = 70, shape = 'dot') {
    if (!rect || !motion()) return;
    const c = mid(rect);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = `fx-p fx-${shape}`;
      s.style.left = c.x + 'px';
      s.style.top  = c.y + 'px';
      s.style.background = colors[i % colors.length];
      s.style.color = colors[i % colors.length];
      layer().appendChild(s);
      const a = Math.random() * Math.PI * 2, d = dist * (.5 + Math.random() * .7);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + (shape === 'shard' ? 30 : 0)}px)) scale(.3) rotate(${Math.random() * 540}deg)`, opacity: 0 }
      ], { duration: 600 + Math.random() * 350, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }
  function ring(rect, color, grow = 2.2, width = 3) {
    if (!rect || !motion()) return;
    const c = mid(rect), size = Math.max(rect.width, rect.height);
    const el = document.createElement('div');
    el.className = 'fx-ring';
    Object.assign(el.style, { left: c.x - size / 2 + 'px', top: c.y - size / 2 + 'px', width: size + 'px', height: size + 'px', borderColor: color, borderWidth: width + 'px' });
    layer().appendChild(el);
    el.animate([{ transform: 'scale(.6)', opacity: 1 }, { transform: `scale(${grow})`, opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => el.remove();
  }
  function popIcon(rect, html, size = 2.2, cls = '') {
    if (!rect) return;
    const c = mid(rect);
    const el = document.createElement('div');
    el.className = 'fx-icon ' + cls;
    el.innerHTML = html;
    el.style.left = c.x + 'px';
    el.style.top  = c.y + 'px';
    el.style.fontSize = size + 'rem';
    layer().appendChild(el);
    const frames = motion()
      ? [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
         { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: .3 },
         { transform: 'translate(-50%,-120%) scale(1)', opacity: 0 }]
      : [{ transform: 'translate(-50%,-50%)', opacity: 0 }, { transform: 'translate(-50%,-50%)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-50%)', opacity: 0 }];
    el.animate(frames, { duration: 1200, easing: 'ease-out' }).onfinish = () => el.remove();
  }
  function shake(el) {
    if (!el || !motion()) return;
    el.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-7px) rotate(-3deg)' },
      { transform: 'translateX(6px) rotate(2deg)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }
    ], { duration: 420 });
  }
  function spin(el) {
    if (!el || !motion()) return;
    el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 650, easing: 'ease-in-out' });
  }
  function showCaption(title, line, y) {
    const cap = document.createElement('div');
    cap.className = 'fx-caption';
    cap.innerHTML = `<b>${esc(title)}</b>${line ? `<span>${line}</span>` : ''}`;
    cap.style.top = y + 'px';
    layer().appendChild(cap);
    return cap;
  }
  async function captionFor(title, line, ms = 900) {
    const c = showCaption(title, line, (pileRect()?.bottom || innerHeight * .45) + 10);
    await sleep(ms);
    c.remove();
  }

  // Big rubber stamp over the table (challenge result). extra = HTML under it.
  async function stamp(text, sub, kind, extra = '') {
    const el = document.createElement('div');
    el.className = `fx-stamp fx-stamp-${kind}`;
    el.innerHTML = `<b>${esc(text)}</b>${sub ? `<span>${sub}</span>` : ''}${extra}`;
    const r = document.getElementById('top-card')?.getBoundingClientRect();
    el.style.top = (r ? r.top + r.height / 2 : innerHeight * .4) + 'px';
    layer().appendChild(el);
    const hold = extra ? 2900 : 1700;
    const frames = motion()
      ? [{ transform: 'translate(-50%,-50%) rotate(-12deg) scale(2.6)', opacity: 0 },
         { transform: 'translate(-50%,-50%) rotate(-6deg) scale(1)', opacity: 1, offset: .1 },
         { transform: 'translate(-50%,-50%) rotate(-6deg) scale(1)', opacity: 1, offset: .88 },
         { transform: 'translate(-50%,-50%) rotate(-6deg) scale(1.05)', opacity: 0 }]
      : [{ transform: 'translate(-50%,-50%) rotate(-6deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-6deg)', opacity: 1, offset: .1 },
         { transform: 'translate(-50%,-50%) rotate(-6deg)', opacity: 1, offset: .88 }, { transform: 'translate(-50%,-50%) rotate(-6deg)', opacity: 0 }];
    try { await el.animate(frames, { duration: hold, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished; } catch (_) {}
    el.remove();
  }

  // A wide banner across the middle of the screen ("Tu turno", danger, ☔ Lluvia, 🦎)
  async function banner(title, sub, kind = 'turn', hold = 1100) {
    const el = document.createElement('div');
    el.className = `fx-banner fx-banner-${kind}`;
    el.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
    layer().appendChild(el);
    const frames = motion()
      ? [{ transform: 'translate(-120vw,-50%) skewX(-12deg)' }, { transform: 'translate(-50%,-50%) skewX(-6deg)', offset: .18 },
         { transform: 'translate(-50%,-50%) skewX(-6deg)', offset: .82 }, { transform: 'translate(120vw,-50%) skewX(-12deg)' }]
      : [{ transform: 'translate(-50%,-50%)', opacity: 0 }, { transform: 'translate(-50%,-50%)', opacity: 1, offset: .15 },
         { transform: 'translate(-50%,-50%)', opacity: 1, offset: .85 }, { transform: 'translate(-50%,-50%)', opacity: 0 }];
    try { await el.animate(frames, { duration: hold + 500, easing: 'cubic-bezier(.3,.8,.3,1)' }).finished; } catch (_) {}
    el.remove();
  }

  // ---------- Flying cards ----------
  const CARD_W = 60, CARD_H = 90;
  const place = (p, s, rot = 0) => `translate(${p.x - CARD_W / 2}px, ${p.y - CARD_H / 2}px) scale(${s}) rotate(${rot}deg)`;
  const fitScale = r => Math.max(.25, Math.min(1.1, r.height / CARD_H));

  async function flyCard(html, from, to, stop) {
    if (!from || !to) return;
    const el = document.createElement('div');
    el.className = 'fx-fly';
    el.innerHTML = html;
    layer().appendChild(el);
    const a = mid(from), b = mid(to);
    try {
      if (stop) {
        const c = { x: innerWidth / 2, y: innerHeight * .4 };
        await el.animate([{ transform: place(a, fitScale(from), -8), opacity: .5 }, { transform: place(c, 1.7, 0), opacity: 1 }],
          { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }).finished;
        // caption above the card, so it never covers the buttons below
        const cap = showCaption(stop.title, stop.line, Math.max(8, c.y - CARD_H * .85 - 62));
        await sleep(stop.hold);
        cap.remove();
        await el.animate([{ transform: place(c, 1.7, 0) }, { transform: place(b, fitScale(to), 4), opacity: .95 }],
          { duration: 330, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).finished;
      } else {
        // new look (step 7): a higher arc, the card grows a little and turns on the way
        const top = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 80 };
        await el.animate([{ transform: place(a, fitScale(from), 0) }, { transform: place(top, 1.15, -12), offset: .5 },
          { transform: place(b, fitScale(to), 4), opacity: .95 }], { duration: 480, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished;
      }
    } catch (_) {}
    el.remove();
  }
  async function staticSpot(html, title, line, hold) {
    const el = document.createElement('div');
    el.className = 'fx-fly';
    el.innerHTML = html;
    const c = { x: innerWidth / 2, y: innerHeight * .4 };
    el.style.transform = place(c, 1.5, 0);
    layer().appendChild(el);
    const cap = showCaption(title, line, Math.max(8, c.y - CARD_H * .8 - 62));
    try { await el.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: hold + 300 }).finished; } catch (_) {}
    el.remove(); cap.remove();
  }

  // ---------- Where things are on screen ----------
  const seatEl = pid => pid === localUid ? document.getElementById('player-hand')
                      : document.querySelector(`.opponent[data-uid="${CSS.escape(pid || '')}"]`);
  const seatRect = pid => seatEl(pid)?.getBoundingClientRect() || null;
  const pileRect = () => document.getElementById('top-card')?.getBoundingClientRect() || null;
  const deckRect = () => document.getElementById('draw-pile-card')?.getBoundingClientRect() || null;
  // (cards from the deck fly face down: backHTML() is in app.js)

  // My hand cards, measured just before I play (app.js calls noteHand in selectCard)
  let handRects = {};
  function noteHand() {
    handRects = {};
    document.querySelectorAll('#player-hand .card[data-id]').forEach(el => {
      handRects[el.dataset.id] = el.getBoundingClientRect();
    });
  }

  // ---------- Moods for the faces on each seat (drawn in extras.js) ----------
  const moods = {};
  function setMood(pid, mood, ms = 4500) {
    if (!pid) return;
    moods[pid] = { mood, until: Date.now() + ms };
    redrawSeats();
    setTimeout(redrawSeats, ms + 50);
  }
  function moodOf(pid) {
    const m = moods[pid];
    return m && m.until > Date.now() ? m.mood : null;
  }
  function redrawSeats() {
    if (roomState?.status === 'playing' && typeof renderOpponents === 'function') renderOpponents(roomState);
  }

  // ---------- ⚡ Power Cards flipping ----------
  // e.pids = whose cards switched over, e.now = their new state (true = green)
  async function powerFlip(e, state, rush) {
    const greens = e.pids.filter((_, i) => e.now[i]);
    if (greens.length) play('charge'); else play('drain');
    e.pids.forEach((id, i) => {
      popIcon(seatRect(id), '⚡', e.pids.length > 1 ? 1.9 : 2.2, e.now[i] ? 'fx-charge' : 'fx-drain');
      if (e.now[i]) ring(seatRect(id), '#4ade80', 1.6, 4);
    });
    if (e.why === 'wildFlip') {
      burst(pileRect(), BOLT, 18, 90, 'spark');
      await banner(t('fx.allFlip'), t('fx.allFlipSub', { name: nameOf(state, e.by) }), 'cham', 950);
      return;
    }
    if (e.why === 'flipCard' && e.pids[0] === localUid && !rush) {
      buzz(40);
      await captionFor(e.now[0] ? t('fx.greenAgain') : t('fx.redNow'), esc(t('fx.flipCardSub')), 900);
    }
  }
  // every Power Card was red → all back to green
  async function powerReset(state) {
    play('charge');
    for (const p of state.players) {
      popIcon(seatRect(p.id), '⚡', 2, 'fx-charge');
      ring(seatRect(p.id), '#4ade80', 1.6, 4);
    }
    await banner(t('fx.allGreen'), t('fx.allGreenSub'), 'cham', 950);
  }

  // ---------- Reading what happened (from the engine's events) ----------
  function onState(prev, cur) {
    if (!prev || !cur || document.hidden) return;
    if (prev.status !== 'playing' || !['playing', 'ended'].includes(cur.status)) return;
    const evs = cur.ev?.n !== prev.ev?.n ? (cur.ev?.list || []) : [];
    for (const e of evs) enqueue(() => run(e, cur, prev));
    if (typeof onFxEvents === 'function' && evs.length) onFxEvents(evs, prev, cur);
  }

  const nameOf = (state, pid) => state.players.find(p => p.id === pid)?.name || '?';

  async function run(e, state, prev) {
    const rush = pending > 1;
    switch (e.t) {
      case 'play': {
        const mine = e.pid === localUid;
        const card = e.card;
        const html = cardHTML(card);
        const from = mine ? (handRects[card.id] || seatRect(localUid)) : seatRect(e.pid);
        play('play');
        const title = t('fx.played', { name: nameOf(state, e.pid) });
        // a wild says the colour named; a flex side says so (and the colour that carries on)
        const line = cardChip(card) + (e.flex ? ` <b class="fx-flexword">🦎 ${esc(t('flex.short'))}</b>` : '') +
          (card.c === WILD_COLOR || e.flex ? ` → ${colorChip(e.color)}` : '');
        if (!motion()) { if (!mine && !rush) await staticSpot(html, title, line, 700); break; }
        await flyCard(cardHTML(card, { flexUp: e.flex }), from, pileRect(), mine || rush ? null : { title, line, hold: 650 });
        ring(pileRect(), CARD_HEX[e.color] || '#fff', 1.7);
        // new look: the pile gives a small bounce as the card lands
        document.getElementById('top-card')?.animate([{ transform: 'scale(1.1) rotate(-3deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 220, easing: 'ease-out' });
        if (e.flex) {
          // 🦎 flex side: the card shimmers and settles on the colour that carries on
          play('cham');
          const top = document.querySelector('#top-card .card');
          top?.classList.remove('cham-settle'); void top?.offsetWidth; top?.classList.add('cham-settle');
          burst(pileRect(), [CARD_HEX[card.c2] || '#c6f432', CARD_HEX[e.color] || '#fff', '#ffffff'], 14, 75, 'spark');
        }
        if (card.c === WILD_COLOR) {
          play('wild');
          ring(pileRect(), CARD_HEX[e.color] || '#fff', 2.4, 5);
          burst(pileRect(), colorsFor(e.color), 16, 80);
        }
        break;
      }
      case 'powerFlip':
        await powerFlip(e, state, rush);
        break;
      case 'powerReset':
        await powerReset(state);
        break;
      case 'skipAll':
        play('skipAll');
        setMood(e.pid, 'smug', 3500);
        for (const p of state.players) if (p.id !== e.pid && !p.disconnected) {
          popIcon(seatRect(p.id), '⊘', 2.2, 'fx-skip');
          setMood(p.id, 'annoyed', 3000);
        }
        if (!rush) await captionFor(t('fx.skipAll'), esc(t('fx.skipAllSub', { name: nameOf(state, e.pid) })), 900);
        break;
      case 'flexEffect':
        // everyone else draws (the draw events after this one fly the cards)
        play('rain');
        setMood(e.pid, 'smug', 3500);
        if (!rush) await captionFor(t('fx.flexAll'), esc(t(e.v === 'draw2' ? 'fx.flexAll1' : 'fx.flexAll2', { name: nameOf(state, e.pid) })), 800);
        break;
      case 'target':
        // a target marker jumps onto the chosen player
        play('gift');
        popIcon(seatRect(e.to), '🎯', 2.4);
        setMood(e.to, 'worried', 3500); setMood(e.pid, 'smug', 3500);
        if (e.to === localUid) buzz([60, 40, 60]);
        if (!rush) await captionFor(t('fx.target'), esc(t('fx.targetSub', { name: nameOf(state, e.pid), target: nameOf(state, e.to), n: e.n })), 900);
        break;
      case 'reverse':
        play('reverse');
        spin(document.getElementById('direction-indicator'));
        popIcon(pileRect(), '⇄', 3);
        if (!rush) await captionFor(t('fx.reverse'), '', 800);
        break;
      case 'skip':
        play('skip');
        setMood(e.pid, 'annoyed', 3000);
        popIcon(seatRect(e.pid), '⊘', 2.4, 'fx-skip');
        if (e.pid === localUid) buzz(50);
        break;
      case 'uno':
        play('uno');
        popIcon(seatRect(e.pid), `<span class="fx-uno-word">${esc(t('fx.uno'))}</span>`, 2);
        // new look (look.js): big ¡ÚLTIMA! over the table with confetti
        if (typeof lookUnoBurst === 'function') lookUnoBurst(pileRect());
        break;
      case 'caught':
        play('buzzer');
        setMood(e.pid, 'caught', 4000); setMood(e.by, 'smug', 4000);
        popIcon(seatRect(e.pid), '🚨', 2.2);
        shake(seatEl(e.pid));
        if (e.pid === localUid) buzz([80, 40, 80]);
        break;
      case 'challengeOpen':
        play('suspense');
        setMood(e.target, 'worried', 4000);
        if (!rush) await captionFor(t('card.wild4'), esc(t('fx.chSub', { name: nameOf(state, e.target) })), 1000);
        break;
      case 'challengeResult': {
        // Everyone sees the hand the card was played from; cards of the old colour glow
        // (wilds glow too: they count as a match)
        const hand = (e.hand || []).map(c => `<span class="${c.c === WILD_COLOR || c.c === e.prevColor ? 'rv-hit' : 'rv-dim'}">${miniHTML(c)}</span>`).join('');
        const reveal = `<div class="fx-reveal"><small>${esc(t('fx.handWas', { name: nameOf(state, e.by) }))}</small><div>${hand || '—'}</div></div>`;
        if (e.ok) {
          play('buzzer');
          setMood(e.by, 'caught', 5000); setMood(e.target, 'smug', 5000);
          if (e.by === localUid) buzz([120, 60, 220]);
          shake(seatEl(e.by));
          burst(pileRect(), ['#ff3b3b', '#ffffff', '#7a0000'], 18, 90, 'shard');
          await stamp(t('fx.chWon'), esc(t('fx.chWonSub', { name: nameOf(state, e.by) })), 'liar', reveal);
        } else {
          play('truth');
          setMood(e.by, 'smug', 5000); setMood(e.target, 'oops', 5000);
          if (e.target === localUid) buzz(100);
          shake(seatEl(e.target));
          burst(pileRect(), ['#4ade80', '#ffffff', '#ffd54a'], 16, 80, 'spark');
          await stamp(t('fx.chFair'), esc(t('fx.chFairSub', { name: nameOf(state, e.target) })), 'truth', reveal);
        }
        break;
      }
      case 'draw': {
        if (!e.n) break;
        const to = seatRect(e.pid), from = deckRect();
        const n = Math.min(e.n, 6);
        if (e.pid === localUid && e.n >= 2) buzz(60);
        if (e.n >= 2) { popIcon(to, `+${e.n}`, 2, 'fx-plus'); setMood(e.pid, e.n >= 4 ? 'worried' : 'oops', 3500); }
        if (!motion()) { play('draw'); break; }
        await Promise.all(Array.from({ length: n }, (_, i) => sleep(i * 110).then(() => { play('draw'); return flyCard(backHTML(), from, to); })));
        break;
      }
    }
    await sleep(rush ? 80 : 180);
  }

  // ---------- Queue: one effect at a time, faster when several pile up ----------
  let queue = Promise.resolve();
  let pending = 0;
  function enqueue(fn) {
    pending++;
    queue = queue.then(fn).catch(e => console.warn('[fx]', e)).finally(() => { pending--; });
  }

  return { prefs, setPref, play, buzz, burst, ring, popIcon, shake, spin, stamp, banner, enqueue, onState,
           noteHand, setMood, moodOf, layer, sleep, motion, colorsFor };
})();

// Effect captions
addStrings({
  'fx.played':   ['{name} juega', '{name} plays'],
  'fx.skipAll':  ['⊘⊘ ¡Salta a todos!', '⊘⊘ Skip all!'],
  'fx.skipAllSub': ['{name} vuelve a jugar', '{name} plays again'],
  'fx.flexAll':  ['🦎 ¡Lado flex!', '🦎 Flex side!'],
  'fx.flexAll1': ['{name}: todos los demás roban 1', '{name}: everyone else draws 1'],
  'fx.flexAll2': ['{name}: todos los demás roban 2', '{name}: everyone else draws 2'],
  'fx.target':   ['🎯 ¡Diana!', '🎯 Target!'],
  'fx.targetSub':['{name} hace robar {n} a {target}', '{name} makes {target} draw {n}'],
  'fx.allFlip':  ['⚡ ¡VOLTEA TODOS!', '⚡ ALL FLIP!'],
  'fx.allFlipSub': ['{name} voltea todas las Cartas de Poder', "{name} flips everyone's Power Card"],
  'fx.allGreen': ['⚡ ¡TODOS EN VERDE!', '⚡ ALL GREEN!'],
  'fx.allGreenSub': ['Todas estaban en rojo: vuelven a verde', 'Everyone was red: all back to green'],
  'fx.greenAgain': ['⚡ ¡Poder en verde!', '⚡ Power green!'],
  'fx.redNow':   ['⚡ Poder en rojo', '⚡ Power red'],
  'fx.flipCardSub': ['Tu carta 🔄 volteó tu Carta de Poder', 'Your 🔄 card flipped your Power Card'],
  'fx.reverse':  ['¡Cambio de sentido!', 'Direction reversed!'],
  'fx.uno':      ['¡ÚLTIMA!', 'LAST CARD!'],
  'fx.chSub':    ['{name}: ¿aceptar o desafiar?', '{name}: accept or challenge?'],
  'fx.chWon':    ['¡PILLADO!', 'CAUGHT!'],
  'fx.chWonSub': ['{name} tenía el color: roba él', '{name} had the colour: they draw'],
  'fx.chFair':   ['¡ERA LIMPIO!', 'IT WAS FAIR!'],
  'fx.chFairSub':['{name} roba de más y pierde el turno', '{name} draws extra and loses the turn'],
  'fx.handWas':  ['Mano de {name} al jugarlo:', "{name}'s hand when they played it:"]
});
