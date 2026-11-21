# Solfall

A side-on boss fight for the browser: three heroes, one three-phase boss, played as a run of
ever-harder trials. You pick a hero and a relic before the run and win a boon after each victory.
Version 0.3c.

This is the first playable slice of a planned boss-rush roguelite (short runs, a boon after each
boss, bosses drawn from a pool). There is one boss so far, so a run fights it again and again.

## Play

**Play in your browser: https://ceddikers.github.io/solfall/**

To run it from this folder instead, double-click `index.html`, or run a local server:

```
node tools/serve.js
```

then open http://localhost:8321. There is no build step and no dependency.

## Controls

| Action | Keys | Gamepad |
|---|---|---|
| Move | A / D or arrow keys | stick or d-pad |
| Jump, double jump | Space or Z | A |
| Attack | J or X, or left click (towards the cursor) | X |
| Aim an attack up or down | hold W / S or up / down | stick |
| Dash (passes through attacks) | K or C or Shift | B, RB or RT |
| Special (costs one Starlight segment) | L or V, or right click (at the cursor) | Y |
| Mend one health (costs one segment) | hold E or F while standing | LB or LT |
| Drop through a platform | S + Space | down + A |
| Pause | Esc or P | Start |
| Retry (works the moment you fall) | R | |

## The heroes

All three share movement, the dash, Starlight and mending. Weapon and special differ.

| | Vesper, the Starblade | Aster, the Starmaul | Lune, the Moonbow |
|---|---|---|---|
| Health (Standard) | 5 | 6 | 4 |
| Weapon | sword: 9, 11, then a 24 finisher | maul: 14, 17, then a 36 finisher that shakes the ground; slow and wide | bow: arrows of 4, 5, then a piercing 10, in any direction; up to 60% stronger within 120px, up to 30% weaker past 240px |
| Special | Star Lance: a piercing shot at any range | Starfall: a blast around her; from the air she plunges first and passes through attacks | Moon Volley: a fan of five arrows and a leap backwards |
| Extra | a slash out of a dash is a thrust | fills the stagger bar 35% faster; a little slower on foot | triple jump; firing downward in the air lifts her; moves at 60% speed while firing; arrows give less Starlight than melee hits |

- **Combo:** every third attack in a chain is the finisher. It winds up for a beat and is worth more than the
  first two together; the weapon glows gold when it is next. Hold the button to keep the chain going.
  The chain resets after 0.6 s without an attack, but a dash does not use up that time.
- **With the sword or maul:** a hit landed in the air holds you up, a slash straight out of a dash is a thrust
  (40% more damage, longer reach), and a downward strike in the air bounces off whatever it hits.
- **Dash:** 0.24 s of invulnerability. If an attack would have hit during it, that is a perfect dodge:
  time slows, Starlight fills, and the dash is ready again at once.
- **Starlight:** three segments, filled by landing hits, perfect dodges and cutting orbs out of the air.
  A segment buys the hero's special or one mended health.

Heroes are defined in `G.HEROES` in `js/run.js` (numbers, colours, text); the weapon and special code is in `js/player.js`.

## The run

- A run starts by choosing a **hero**, then **one of three relics** drawn from nine. The relic lasts the whole run.
- Beating the Warden offers **three boons; you keep one** and go straight into the next trial.
- Each trial after the first gives the Warden 15% more health, 4% shorter warnings and 6% less rest.
  From trial IV it also uses its Merciless patterns.
- Health is restored between trials. Falling ends the run; the title screen shows the deepest trial reached.

| Relic | Effect |
|---|---|
| Ember Chalice | mending restores 2 health instead of 1 |
| Comet Shard | finishers deal 50% more damage |
| Twin Moons | one more Starlight segment; every trial starts with Starlight full |
| Thorn Crown | all damage +40%, 2 less health |
| Wardstone | the first hit taken in each of the boss's phases is blocked |
| Feather Cloak | one more air jump; move 12% faster |
| Stormcaller | every fifth hit calls lightning for 30 damage |
| Phoenix Feather | once per run, a killing blow leaves you on 3 health |
| Sunstone | the stagger bar fills 40% faster; staggers last 1.5 s longer |

| Boon | Kind | Effect | Times |
|---|---|---|---|
| Third Wind | Movement | one more jump in the air | 2 |
| Twin Dash | Movement | a second dash before landing; dashes recover 30% faster | 1 |
| Comet Step | Movement | dashing through the Warden deals 24 damage | 2 |
| Long Reach | Weapon | weapon reach +30% | 2 |
| Keen Edge | Weapon | weapon damage +25% | 3 |
| Quick Hands | Weapon | attack 18% faster | 2 |
| Crescent | Weapon | each finisher also throws a wave of light | 1 |
| Bright Vein | Starlight | Starlight fills 40% faster | 2 |
| Fourth Star | Starlight | one more Starlight segment | 2 |
| Split Lance | Starlight | Vesper only: the lance fires three at once, each at 60% | 1 |
| Aftershock | Starlight | Aster only: Starfall strikes a second time at half strength | 1 |
| Full Quiver | Starlight | Lune only: Moon Volley fires eight arrows | 1 |
| Swift Mend | Starlight | mending takes half as long | 1 |
| Mirror Step | Starlight | Vesper and Lune: a perfect dodge fires a free shot at the core | 1 |
| Steady Heart | Survival | one more health | 3 |
| Second Dawn | Survival | once per trial, a killing blow leaves you on 1 health | 1 |
| Glass Star | Risk | all damage +35%, one less health | 1 |

Relics and boons are defined in `G.RELICS` and `G.BOONS` in `js/run.js`; their effects are applied in `js/player.js` and `js/boss.js` (search for `G.relic(` and `G.boon(`).

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
| `js/run.js` | the run: heroes, relics, boons, offers, how each trial scales the boss |
| `js/input.js` | keyboard, mouse and gamepad mapped to actions |
| `js/audio.js` | every sound and the music, synthesised in code (no audio files) |
| `js/fx.js` | particles, screen shake, flashes, hit-freeze, slow motion |
| `js/arena.js` | backdrops for each phase, platforms |
| `js/hazards.js` | beams, waves, orbs, zones, rings, meteors and their warnings |
| `js/player.js` | the hero: shared movement plus each hero's weapon and special; shared numbers are in `G.PLAYER` |
| `js/boss.js` | the boss; each attack is one generator function, attack pools are in `BAGS` |
| `js/ui.js` | menus, health bars, result screens |
| `js/game.js` | main loop, game states, draw order |

Most-used tuning numbers: `B.BASE_HP` and `B.poiseMax` in `boss.js`, `G.PLAYER` in `player.js`,
`G.DIFFS` in `util.js`. Bump `G.VERSION` in `util.js` for each build; it shows on the title screen.

## Testing without playing

Open the browser console on the running game.

- **Dodge tests:** `fetch('/tools/dodge-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs each attack against a simple scripted player and reports health lost. All 20 lose 0 health with each
  hero as of v0.3c. Set `window.TEST_HERO = 'aster'` (or `'lune'`) first to test another hero.
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
  always-attacking one beats the first trial on Standard (5,400 boss health) in 70 s as Vesper and 75 s as
  Aster. Lune takes 129 s firing from the ground, 135 s firing on the move and 97 s at point-blank range
  (v0.3b; she was 89 s from the ground before a player reported her as too strong). A real first trial
  should be about 3 to 4 minutes.
  Hero balance, relic and boon strength and the per-trial scaling are first guesses.
- **Gamepad support is untested** (no pad was available).
