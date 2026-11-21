# Solfall

A side-on boss fight for the browser: one hero, one boss, three phases, played as a run of
ever-harder trials with a boon after each victory. Version 0.2a.

This is the first playable slice of a planned boss-rush roguelite (short runs, a boon after each
boss, bosses drawn from a pool). There is one boss so far, so a run fights it again and again.

## Play

Double-click `index.html`, or run a local server:

```
node tools/serve.js
```

then open http://localhost:8321. There is no build step and no dependency.

## Controls

| Action | Keys | Gamepad |
|---|---|---|
| Move | A / D or arrow keys | stick or d-pad |
| Jump, double jump | Space or Z | A |
| Slash | J or X, or left click (slashes towards the cursor) | X |
| Aim a slash up or down | hold W / S or up / down | stick |
| Dash (passes through attacks) | K or C or Shift | B, RB or RT |
| Star Lance (costs one Starlight segment) | L or V, or right click (fires at the cursor) | Y |
| Mend one health (costs one segment) | hold E or F while standing | LB or LT |
| Drop through a platform | S + Space | down + A |
| Pause | Esc or P | Start |
| Retry (works the moment you fall) | R | |

## The hero

- **Sword:** a three-hit combo on the ground; the third hit is heavier. Hold the button to keep swinging.
  Slash upward to reach the hands; a hit landed in the air holds you up for a moment, so one jump fits
  several slashes. Slash downward in the air to bounce off whatever you hit (this gives the jump and dash back).
- **Dash:** 0.24 s of invulnerability. If an attack would have hit during it, that is a perfect dodge:
  time slows, Starlight fills, and the dash is ready again at once.
- **Starlight:** three segments, filled by landing hits, perfect dodges and cutting orbs out of the air.
  A segment buys a Star Lance (ranged, pierces, eight directions) or one mended health.

## The run

- Beating the Warden offers **three boons; you keep one** and go straight into the next trial.
- Each trial after the first gives the Warden 15% more health, 4% shorter warnings and 6% less rest.
  From trial IV it also uses its Merciless patterns.
- Health is restored between trials. Falling ends the run; the title screen shows the deepest trial reached.

| Boon | Kind | Effect | Times |
|---|---|---|---|
| Third Wind | Movement | one more jump in the air | 2 |
| Twin Dash | Movement | a second dash before landing; dashes recover 30% faster | 1 |
| Comet Step | Movement | dashing through the Warden deals 24 damage | 2 |
| Long Reach | Sword | sword reach +30% | 2 |
| Keen Edge | Sword | sword damage +25% | 3 |
| Quick Hands | Sword | swing 18% faster | 2 |
| Crescent | Sword | the third combo hit throws a wave of light | 1 |
| Bright Vein | Starlight | Starlight fills 40% faster | 2 |
| Fourth Star | Starlight | one more Starlight segment | 2 |
| Split Lance | Starlight | the lance fires three at once, each at 60% | 1 |
| Swift Mend | Starlight | mending takes half as long | 1 |
| Mirror Step | Starlight | a perfect dodge fires a free lance at the core | 1 |
| Steady Heart | Survival | one more health | 3 |
| Second Dawn | Survival | once per trial, a killing blow leaves you on 1 health | 1 |
| Glass Star | Risk | all damage +35%, one less health | 1 |

Boons are defined in `G.BOONS` in `js/run.js`; their effects are applied in `js/player.js` (search for `G.boon(`).

## The boss: The Eclipsed Warden

Every warning is drawn in the same red-orange. It fills up, flashes, then fires.

| Phase | Attack | The simple answer |
|---|---|---|
| I Dusk | Slam: a fist tracks you, then drops and sends out two ground waves | step out on the flash, jump the wave, hit the stuck fist |
| | Sweep: a hand crosses the floor | jump (double jump is safest) or dash through it |
| | Clap: both hands close on a marked column (2 damage) | leave the column on the flash, hit both stuck hands |
| | Sun lance: a beam that tracks, locks, then fires | move once the line locks |
| | Ember rain: marked meteors | step off the markers |
| II Totality | Double slam, sweep there and back, triple lance, harder rain | as above, faster |
| | Corona pulse: expanding rings | dash through each ring |
| | Comb: alternating columns of light from above | shift one lane each volley |
| | Rocket punch: a fist fired across at your height | jump over it, hit it while it is stuck in the wall |
| | Burning floor: the floor ignites while a lance fires | get onto a platform |
| III Black Sun | Dive: the core drops on you (2 damage), waves and debris | dash out, jump the wave, stay close and punish |
| | Shard storm: aimed lines, then one flat line | keep moving, jump the last one |
| | Eclipse wheel: two beams turn through the arena | dash through each as it reaches you |
| | Collapse: a pull towards the core, then a blast (2 damage) | run clear of the circle |

**Stagger:** hits fill the stagger bar under the boss's health (hands fill it fastest). When it fills, the
core drops to the floor for a few seconds and takes extra damage. The core always takes 1.5x damage.

## Difficulty

| | Health | Boss health | Warnings | Rest between attacks |
|---|---|---|---|---|
| Gentle | 7 | 85% | 30% longer | 30% longer |
| Standard | 5 | 100% | as designed | as designed |
| Merciless | 4 | 115% | 20% shorter | 30% shorter, plus extra hits in several attacks |

## Files

| File | What it holds |
|---|---|
| `index.html`, `css/style.css` | page, menus and in-fight display |
| `js/util.js` | constants, maths, seedable randomness, saved settings, difficulty table (`G.DIFFS`) |
| `js/run.js` | the run: boon list, boon offers, how each trial scales the boss |
| `js/input.js` | keyboard, mouse and gamepad mapped to actions |
| `js/audio.js` | every sound and the music, synthesised in code (no audio files) |
| `js/fx.js` | particles, screen shake, flashes, hit-freeze, slow motion |
| `js/arena.js` | backdrops for each phase, platforms |
| `js/hazards.js` | beams, waves, orbs, zones, rings, meteors and their warnings |
| `js/player.js` | the hero; tuning numbers are in `G.PLAYER` at the top |
| `js/boss.js` | the boss; each attack is one generator function, attack pools are in `BAGS` |
| `js/ui.js` | menus, health bars, result screens |
| `js/game.js` | main loop, game states, draw order |

Most-used tuning numbers: `B.BASE_HP` and `B.poiseMax` in `boss.js`, `G.PLAYER` in `player.js`,
`G.DIFFS` in `util.js`. Bump `G.VERSION` in `util.js` for each build; it shows on the title screen.

## Testing without playing

Open the browser console on the running game.

- **Dodge tests:** `fetch('/tools/dodge-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs each attack against a simple scripted player and reports health lost. All 20 lose 0 health as of v0.2a.
  Run it after changing any attack.
- `G.debug.god = true` makes the hero invulnerable. `G.debug.boxes = true` (or `?boxes` in the address)
  draws every hitbox.
- `G.debug.forceAttack = 'wheel'` repeats one attack (names are the keys of `ATTACKS` in `boss.js`;
  use one that belongs to the current phase). `G.debug.nextPhase()` skips to the next phase.
- `G.debug.sim(10, { random: true })` runs ten simulated seconds with random inputs, to shake out errors.
- `G.debug.give('keen')` adds a boon by id; it takes effect in the next fight (`G.startFight()`).

## Not yet checked

- **Sound and music have not been heard by anyone.** They are generated in code and run without errors,
  but the mix and the music are untested by ear. Volume sliders are in Settings.
- **No person has played a run through.** Timings were tuned with scripted players: an invulnerable,
  always-attacking one beat the first trial on Standard in 78 s (measured at v0.1b), so a real first
  trial should be about 3 to 4 minutes. Boon strength and the per-trial scaling are first guesses.
- **Gamepad support is untested** (no pad was available).
