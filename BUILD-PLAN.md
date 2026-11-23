# UNO TEAMS build plan

A team card game that plays by the official **UNO TEAMS!** rules (Mattel sheet HXT58, 2024),
built to the same standard as ¡CAMALEÓN!, GOLF, VOLTEO, UNO Fiesta and UNO Mentiroso, and
dressed in the **UNO Fiesta new look** (the 7-idea mock-up: card faces with a tilted diamond and
outlined numbers, drawn action pictures, a felt table with a wooden rim and a moving direction
ring, a fanned hand, seat rings and tags, a big title screen, Lilita One + Nunito, deal / arc /
confetti movement). The GitHub repo is `unoteams`. Started 2026-11-23 from the ¡CAMALEÓN! code.

## The rules (as on the official sheet)
- 112 cards, 2–4 teams of 2 (4–8 players). Partners sit across from each other.
- Deal 7 each. The first table card can't be an action card (passed over).
- **Before the first turn everyone passes one card to their partner.**
- On your turn play ONE card matching colour, number or symbol, or draw one card (which you may
  play straight away if it fits). You may draw instead of playing even with a playable card.
- Draw Two (next draws 2 and loses their turn), Skip, Reverse (with 2 players left it works as a skip), Wild.
- **Wild Team Play**: pick a colour; the turn jumps straight to your partner. If they can't play a
  card, YOU draw 2. Play then goes on from your partner.
- **Wild Team Draw Four**: the next player draws 2 and loses their turn, and their partner draws 2
  too (even if they are out).
- **🔁 Passing symbol** (on one copy of each 1–5 in every colour): you and your partner pass each other 1 card.
- **Going out**: your partner passes you half their cards (with an odd number they keep the bigger
  half). If they only have 1 card, you stay out (your turns are passed over).
- **Tagging back in**: while you're out, if your partner draws cards for any reason they pass you half.
- **¡UNO!** at one card — your partner may shout it for you. Caught before the next turn: draw 2.
- A team wins when both partners have no cards. Optional scoring: numbers face value, actions 20,
  wilds 50 (from the other teams' hands); first team to 500.

### Where the official sheet is silent (choices made here)
- Deck makeup (from officialgamerules.org, matches the 112 total): per colour two of each 1–9 (no
  zeros), two each of Skip / Reverse / Draw Two; 4 Wild, 8 Wild Team Play, 4 Wild Team Draw Four.
  The passing symbol is on one copy of 1–5 in each colour (20 cards).
- Who picks the cards that are passed: the giver does (going out, tagging back in, swaps).
- Tagged back in by drawing on your own turn: you pass half and your turn ends (no playing the drawn card).
- Wild Team Play when your partner is out: works as a plain wild.
- Wild Team Play: drawing a card that fits and playing it counts as "can play".
- Nobody can join a round that has started (teams must stay full). A player who leaves or loses
  connection is replaced by a bot stand-in in the same seat; coming back takes the seat back.

## How it's built (same setup as ¡CAMALEÓN!)
- `engine.js`: all the rules. Every move goes through `Engine.apply(state, move, actor)`.
  Moves: `play {id, color?}`, `draw`, `pass`, `swap {id}`, `give {ids}`, `shout {pid?}`,
  `catch {pid?}`, `timeout {seq}`, `endVote`, `lastPlayer`.
- Waiting steps are `phase` (`swap` = several players pick a card; `give` = one player passes n
  cards), with more in `queue`. `Engine.waitingFor(state)` says who the game waits for.
- `uno` is a list of `{pid, at}` (more than one player can be on one card after a pass).
- Points are kept per team (`points.A` …), `winner` is a team letter, `winnerIds` its players.
- Rooms are tagged `game: 'unoteams'`. `node test-engine.js [games]` runs the checks.

## Steps
1. ✅ Rules engine + tests
2. Game screen for teams: lobby with team slots, seats with partner across, pass / give
   windows, Wild Team Play, ¡UNO! for your partner, team scoring, bot stand-ins
3. Fiesta new look: card faces, Team Play / Team Draw Four pictures, passing badge, table, hand
   fan, seats, title screen, font, movement
4. Effects, awards, stats and badges for the team rules
5. Guided first game
6. Rules window, icons, invite text, English, final browser tests

## Before going live
- GitHub Pages: Settings → Pages → deploy from `master`, root (erwindank.github.io/unoteams/).
- Add `https://erwindank.github.io/unoteams/` to the Spotify app's Redirect URIs.
