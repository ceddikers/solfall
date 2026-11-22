# Solfall

A side-on boss rush for the browser: three heroes, four three-phase bosses, played as a run of
ever-harder trials. You pick a hero and a relic before the run and win a boon after each victory.
Version 1.0b.

This is an early slice of a planned boss-rush roguelite (short runs, a boon after each boss,
bosses drawn from a pool). A run meets the four bosses in a shuffled order, then meets them again, harder.

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
| Dash (passes through attacks) | K or C or Shift | B or RB |
| Special (costs one Starlight segment) | L or V, or right click (at the cursor) | Y |
| Mend one health (costs one segment) | hold E or F while standing | LB or LT |
| Dawnbreak (when its bar is full) | Q or I, or middle click | RT |
| Drop through a platform | S + Space | down + A |
| Pause | Esc or P | Start |
| Use something in the camp | E or F, or Enter | LB |

Keyboard keys can be changed in Settings, Controls: choose an action, press the key it should use. A key
does one thing, so it is taken from whatever had it. Prompts in the game follow your bindings. The mouse
and gamepad are fixed.

| | | |
|---|---|---|
| Retry (works the moment you fall) | R | |

## The Vigil (new in v0.9a)

The title screen now leads to a camp, the Vigil, where you move your hero about freely. Since v0.9b it
is a little over three screens wide (4,040 pixels) and the view follows the hero across it. What used to be
menu options are places in it, left to right:

| Place | Walk up and press E to |
|---|---|
| The Hall of Echoes | become the hero standing in an alcove. Each hero has their own alcove; yours holds only your sigil while you are out of it. |
| The Shrine | open the Shrine and spend Sunshards. One small shard circles the great one for each trophy won. |
| The campfire | nothing: it is where you arrive from the title screen |
| The training yard | nothing to press: hit the sparring post. It shows the damage of your last flurry, cannot be destroyed, and charges Dawnbreak three times as fast, so every move can be tried here. Starlight starts full. |
| The brazier | step the difficulty: Gentle, Standard, Merciless. The flame grows and changes colour with it. |
| The banners | choose the first foe. One banner for each boss hangs on the rail; the lit one comes first, and all four lit means whoever comes. |
| The proving ring | practise against the foe the banners show (or one at random), starting from phase I, II or III. No relic, no omen, no reward, nothing lost; R tries again. |
| The reliquary | take the relic for your run. Each relic on offer (three, or four with the Shrine's Fourth Relic) turns over its own plinth; walk up to one to read it and press E to take it. You can change your mind until you go through the gate. The relic works at once, so it can be tried on the sparring post. |
| The gate | begin the run with the relic you took. If you have not taken one, it asks you to choose from the same relics as a menu. You come back out of it when a run ends. |

The backdrop is painted once into four layers that slide at different speeds as you walk: the sky (with
a thin moon and the dimmed sun low over the gate), far hills, a ruined aqueduct, and near columns,
tents and trees. The places, the fires, the grass (which bends away from you) and the fireflies are
drawn each frame. A marker at the top right points to the gate until it is in view.

Nothing can hurt you in the camp. Esc opens the menu (settings, how to play, quit to title). After a run,
**New run** (or R) goes straight to the relic choice as a menu, so a retry is as quick as before, and
**Back to camp** returns you to the Vigil beside the gate. The relics on offer are drawn afresh each time
you arrive, and again if you change hero or difficulty, since both decide what may be offered.
The camp is `js/hub.js`; the sparring post is a stand-in boss (`G.bosses.dummy`), which is why every
weapon, special and Dawnbreak works on it unchanged.

## Polish and quality of life (v1.0a)

This build came from three things: reading what players and designers say made games of this kind a
treat, looking at every screen as a player sees it, and measuring the playtest questions with a scripted
hero (`tools/feel-check.js`).

**What the reading said, and what was done about it**

| What makes these games a treat | In Solfall |
|---|---|
| Failure should still feel like progress, and getting back in should be quick (Hades) | Every fight already pays Sunshards win or lose. The defeat screen now says what landed the last blow. R is still an instant retry. |
| Players want to practise the boss or phase they failed, not replay everything before it (Furi, Cuphead) | The proving ring in the camp: any boss, from any phase, at no cost. |
| Forgiving input: a jump just after leaving a ledge, a press just before landing (Celeste) | Already here: 0.09 s of coyote time, 0.13 s buffers on jump, attack, dash and special, and presses made during a dash are kept. |
| Attacks must be readable and fair even when fast | Unchanged rule: every warning is the same red-orange. Smoke is drawn behind warnings. |
| Flashes, shake and bindings should be the player's choice (Xbox accessibility guidelines) | New Screen flashes setting (Full, Reduced, Off); flashes less than a third of a second apart are damped whatever the setting; keyboard keys can be rebound. Screen shake already had a setting. |

**What looking at every screen found**

- The How to play panel had grown taller than the screen, hiding its own Back button. Rewritten shorter; it fits.
- The title overlapped the Warden's eye. Moved down.
- The camp had no display for Starlight or Dawnbreak, so charging Dawnbreak on the post could not be seen. It now shows the hero's name and both bars.

**What the measurements found** (scripted hero that cannot be hurt, attacks without stopping, never dodges)

- Dawnbreak fills 2 or 3 times a fight for every hero against every boss, the first at 15 to 36 seconds. That was the aim; left alone.
- A Reckoning's ward breaks in 1 to 4 seconds of steady attacking, against 6.5 allowed. Left alone.
- Flow reached SS within ten seconds of steady attacking and stayed there, so the rank meant nothing. It now always drains, faster the higher it stands; heroes who swing slower earn more per hit; a perfect dodge is worth more. The same scripted hero now peaks at A or S and holds A or better for between a tenth and two thirds of a fight, so reaching the top takes dodges.

**Also new**

- Your fastest first-trial win against each boss is kept per difficulty and shown at the banners, with how often you have beaten it.
- A welcome line the first time you arrive in the camp each session.
- Dawnbreak in the camp only fires within reach of the sparring post.
- The pause menu lists the trial's omen.
- Settings, Reset progress erases Sunshards, upgrades, trophies and records (it has to be chosen twice).

Not done: touch controls, a colour-blind alternative to red-orange warnings, gamepad rebinding.

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

- A run starts in the camp: choose a **hero** at the Hall of Echoes, take **one of three relics** at the reliquary
  (drawn from nine, up to thirteen once trophies are won), and step through the gate. The relic lasts the whole run.
- Each trial is one boss. The four come in a shuffled order, and when all are beaten the order is
  shuffled again. The **banner** in the camp fixes who comes first (handy for practising one boss).
- Beating a boss offers **three boons; you keep one** and go straight into the next trial. The victory
  screen names the boss that is next.
- Each trial after the first gives the boss 15% more health, 4% shorter warnings and 6% less rest.
  From trial V (the second time round) the bosses also use their Merciless patterns.
- Health is restored between trials. Falling ends the run; the gate in the camp shows the deepest trial reached.
- From trial II each trial carries an **omen** (two from trial VI), shown at the top right of the fight.
- Every fight pays **Sunshards**, which buy permanent upgrades at the **Shrine** in the camp.

## Flow and Dawnbreak (new in v0.7a)

- **Flow** is a rank shown under the timer: C, B, A, S, SS. It climbs with every hit, cut-down orb and
  perfect dodge, runs down after 2.2 seconds without one, and loses two thirds when you are hit. Each
  rank adds 3% damage and 2 Sunshards at the end of the fight (counted from the highest rank reached),
  and from rank A light lifts off the hero.
- **Dawnbreak** is each hero's ultimate. Its bar (under Starlight) fills from damage dealt and a little
  from perfect dodges, and carries over between trials. When it is full, one press spends it. While it
  plays you cannot be hurt, and the boss and everything it has thrown run at a twentieth of their speed.
  It cannot be started while the boss cannot be hit.

| Hero | Dawnbreak | What it does |
|---|---|---|
| Vesper | Thousand Stars | she vanishes; eight cuts of 20 from every side, then a cross-cut of 80 |
| Aster | Worldbreaker | she rises and comes down for 250, 110 to anything else the boss has out, and everything that can be cut out of the air is destroyed |
| Lune | Moonfall | one arrow into the sky; twelve fall on the boss for 15 each, then a beam of 70 |

The last blow of each fills the stagger bar like a Star Lance. When a boss falls, a finishing cut crosses the screen.
Numbers are in `js/flow.js`.

## Moments (new in v0.8a)

Set pieces and rewards that punctuate a fight. All of them are in `js/moments.js`.

| Moment | When | What happens |
|---|---|---|
| **Reckoning** | once in phase I (below five sixths of the boss's health) and once in phase II (below half) | The boss goes to the middle of the arena, wraps itself in a ward and gathers a blast while a red ring closes on it for 6.5 seconds. Hits go to the ward, shown as a gold arc. Break it and the boss is thrown down staggered, Dawnbreak gains a quarter of its bar and the fight pays 6 more Sunshards. Let the ring close and two blast rings go out: dash through each. |
| **Riposte** | the first weapon hit within 1.5 seconds of a perfect dodge | double damage, with a freeze and a gold cut |
| **Sunder** | the first finisher on a staggered boss | 2.2 times damage, a longer freeze and a cracked floor. One per stagger. |
| **Clash** | a finisher, a dash thrust or a heavy arrow lands on the Veil or the Knight in the 0.3 seconds before its weapon swing lands, with you inside the swing | the swing is stopped dead; you are pushed back unharmed with 20 Starlight |
| **Last Light** | the first time in a fight a hit leaves you on 1 health | time slows, you cannot be hurt for 2.4 seconds, Dawnbreak gains 35% and Starlight half a segment |
| **One last push** | the boss drops below a tenth of its health | a call-out; the boss bleeds light and the screen pulses until it falls |

The ward's strength is sized to the hero: about 3.3 seconds of steady attacking (158 for Vesper, 165 for
Aster, 86 for Lune on Standard), more in later trials. A Dawnbreak breaks it outright. Each boss names
its own Reckoning: Eclipse, Convergence, Death Mark, Dirge. A Reckoning is skipped if the boss leaves
the phase before it gets the chance, and forced attacks in the tests never trigger one.

## Omens (new in v0.7a)

| Omen | What changes |
|---|---|
| Stormfront | lightning strikes the column you stand in, every 5.6 seconds |
| Emberfall | a burning stone falls somewhere near you, every 3.4 seconds |
| Hunted | a slow wisp follows you; cut it down or let it hit you and it returns 7 seconds later |
| Frenzy | the boss rests a quarter less between attacks |
| Bulwark | the boss has a fifth more health and its staggers are 0.8 seconds shorter |

An omen is never repeated in the next trial, and each one adds 25% to that trial's Sunshards. Lightning
and stones are only called down in the rests between the boss's attacks, with their own 1.1 second
warning, so they land while the next attack is still being shown. Defined in `js/omens.js`.

## Sunshards, the Shrine and trophies (new in v0.7a)

- **Earning:** a victory pays 12 Sunshards, plus 5 for each trial before it, times 1.1 to 1.5 for the
  grade, plus the Flow bonus; then 0.75 on Gentle or 1.4 on Merciless, plus the omen and Prospector bonuses. The first
  victory over each boss pays 25 more. A defeat pays a share for the health taken off the boss.
- **The Shrine** (in the camp) sells permanent upgrades:

| Upgrade | Ranks | Cost per rank | Each rank gives |
|---|---|---|---|
| Vigor | 2 | 60, 160 | +1 health |
| Whetstone | 5 | 20, 35, 55, 80, 110 | +4% damage |
| Kindling | 2 | 25, 60 | each trial starts with 40% of a Starlight segment |
| Momentum | 3 | 30, 55, 90 | Dawnbreak charges 12% faster |
| Fourth Relic | 1 | 90 | four relics to choose from |
| Fourth Boon | 1 | 120 | four boons to choose from |
| Second Thoughts | 2 | 50, 110 | one redraw of the boons on offer per run |
| Prospector | 3 | 30, 60, 100 | +10% Sunshards |

- **Trophies:** the first victory over each boss adds its relic to the pool for every later run.

| Boss | Trophy relic | Effect |
|---|---|---|
| The Warden | Eclipse Eye | hits on a staggered boss deal 30% more |
| The Magus | Magus's Prism | your special deals 40% more |
| The Veil | Silent Shroud | after a perfect dodge, everything you do deals 50% more for 3 seconds |
| The Knight | Unburied Oath | on your last point of health, everything you do deals 50% more |

All of this is kept in the browser's storage under `solfall.meta`, so it belongs to one browser on one
machine; clearing site data resets it. Defined in `js/meta.js`.

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

## The bosses

Every warning, for every boss, is drawn in the same red-orange. It fills up, flashes, then fires.
A marked patch of floor means step off it; a lane with arrows means something will cross at that height;
a line means a cut or a beam along it; a slice of a circle means a weapon will swing through it.

All four have three phases (at two thirds and one third health) and a stagger bar: hits fill it, and
when it is full the boss is helpless for a few seconds and takes 40% more damage.

### The Eclipsed Warden

| Phase | Attack | The simple answer |
|---|---|---|
| I Dusk | Slam: a fist tracks you, then drops and sends out two ground waves | step out on the flash, jump the wave, hit the stuck fist |
| | Sweep: a hand crosses the floor | jump (double jump is safest) or dash through it |
| | Clap: both hands close on a marked column (2 damage) | leave the column on the flash, hit both stuck hands |
| | Sun lance: a beam that tracks, locks, then fires | move once the line locks |
| | Ember rain: marked meteors | step off the markers |
| | Flick: a hand points and fires orbs at where you stand | step aside, jump them, or cut them down |
| | Crossfire: one hand fires along the floor, then the other at jumping height | jump the first beam, be back on the ground for the second |
| II Totality | Double slam, sweep there and back, triple lance, harder rain | as above, faster |
| | Corona pulse: expanding rings | dash through each ring |
| | Comb: alternating columns of light from above | shift one lane each volley |
| | Rocket punch: a fist fired across at your height | jump over it, hit it while it is stuck in the wall |
| | Burning floor: the floor ignites while a lance fires | get onto a platform |
| | Fan: the core throws fans of orbs, each offset from the last | stand in a gap, or cut an orb down |
| | Cage: both hands plant either side of you and embers fall inside | dodge inside, hit the planted hands; breaking one ends it |
| | Duet: a hand and the core attack together (slam with a lance, or sweep with embers) | answer both at once |
| | Swat: a fist knocks down the platform you are resting on | get off when it is marked; it comes back in about 6 s |
| | Flick and Crossfire return | as above |
| III Black Sun | Dive: the core drops on you (2 damage), waves and debris | dash out, jump the wave, stay close and punish |
| | Shard storm: aimed lines, then one flat line | keep moving, jump the last one |
| | Eclipse wheel: two beams turn through the arena | dash through each as it reaches you |
| | Collapse: a pull towards the core, then a blast (2 damage) | run clear of the circle |
| | Halo: the shards become a turning ring of blades around a low, slow core | slip inside the ring, where the core can be hit |
| | Fan returns, faster | as above |
| | Last Light: once, below 12% health: two rings, a half-turn of the wheel, then a collapse | each part as above; the core is spent afterwards |

**Stagger:** hits fill the stagger bar under the boss's health (hands fill it fastest). When it fills, the
core drops to the floor for a few seconds and takes extra damage. The core always takes 1.5x damage.

**Breaking a hand:** each hand has its own health (7% of the boss's), shown as an arc round its sigil.
Damage to a hand still hurts the boss. When a hand runs out it lies broken for 12 seconds: the attacks
that need it are skipped, the boss takes 25% more damage from everything, and if it broke in the middle
of its own attack that attack is cut short. Hands are made whole at each new phase.

**Resting on a platform** for more than a couple of seconds in phase II brings the Swat.

### The Threefold Magus

A floating caster that blinks away from you before most spells and stands still while casting, which is
when to reach it. Its platforms are up from the start. Ice is blue, fire orange, lightning violet.

| Phase | Spell | The simple answer |
|---|---|---|
| I | Shards (ice): shards over its head aim and fire one after another | keep moving; from far away, jump the shallow ones |
| | Rime (ice): spikes run along the floor away from it | jump as the ripple reaches you |
| | Fireball: a slow ball that leans after you and bursts where it lands | get away from where it comes down |
| | Bolts (lightning): strike after strike on marked columns, the last as three | step out of each column |
| | Spheres (lightning): bouncing balls that last six seconds | cut them down, or keep clear |
| II Confluence | Wall of flame: a low wall crosses the floor | stand on a platform, or dash through it |
| | Crystals: two crystals that burst into rings when their timers empty | break them first (they give Starlight and fill the stagger bar) |
| | Storm cloud: a cloud trails you and strikes below itself four times, while other spells go on | keep out from under it |
| | Fireballs now leave burning ground | stay off it for three seconds |
| III Trinity | Every spell ends with one more from another element: a single strike or shard | watch for it as the spell finishes |
| | Blizzard: wind pushes you towards a wall while icicles fall | push against the wind, step off the markers |
| | Cataclysm, once, below 12% health: rime from the centre, a great blast in the middle, three volleys of lightning | jump, run to an edge, change lanes; afterwards it lies spent |

### The Silent Veil

A hooded assassin that vanishes and reappears. It is fast and fragile, and every attack leaves it open
for a moment afterwards.

| Phase | Attack | The simple answer |
|---|---|---|
| I | Lunge: it crouches, a lane lights, it crosses the floor | jump it, or dash through for a perfect dodge |
| | Flurry: it runs in and cuts three times, stepping forward | back out of reach, or dash past it |
| | Knives: it springs back and throws a fan along dashed lines | jump the fan, dash through, or cut a knife down |
| | Ambush: it vanishes, a column follows you, it drops | step out; its blade sticks in the floor and it takes 30% more damage |
| | Backstab: it vanishes and reappears behind you | dash away as the cut is marked |
| II Shadows | Pincer: a lunge, and a shadow lunging the other way | jump both |
| | Mirror: three figures lunge one after another, the last along the platforms | jump, jump, stay down. A shadow dies to one hit |
| | Knife rain: it hangs overhead and throws fans downward | stand between the lines |
| | Cross: two diagonal cuts through where you stand | step aside |
| III Execution | Cuts: seven lines, each through where you are when it is drawn | step off each; jump the flat ones. Then it kneels, spent |
| | Mark: a circle closes on you and everything inside is cut | dash as it shuts |

### The Unburied Knight

A death knight with a greatsword. Slow and very wide: its swings cover everything in front of and above
it, and nothing behind it. **Hits on its back deal 30% more.**

| Phase | Attack | The simple answer |
|---|---|---|
| I The Oath | Cleave: a huge swing in front | dash through it to its back, or back right off |
| | Overhead: it strides after you with the blade up, then brings it down (2 damage, two waves) | leave the column, jump the wave, hit it while the sword is stuck |
| | Charge: wall to wall, too tall for one jump | dash through it or jump twice; the wall stuns it |
| | Grip: it drags you in with a cleave already coming | dash past it before the blade lands |
| | Graves: spikes erupt where you stand, one after another | keep walking |
| II The Host | Wraiths: skulls that drift after you | cut them down |
| | Desecrate: patches of ground rot for five seconds | fight on what is left |
| | Whirl: it spins towards you for a couple of seconds | run, take a platform, or jump twice over it; then it is dizzy |
| | Rend: waves from the blade, low and high in turn | jump the low one, stay on the ground for the high one |
| III Blood Oath | Leap: it comes down on you (2 damage) | get out of the circle; it is stuck afterwards |
| | Reap: cleave, back-cut, overhead | stay behind it |

Each of these three is one file (`js/mage.js`, `js/assassin.js`, `js/knight.js`) built on the shared frame in
`js/bosskit.js`: health, phases, stagger and attack selection live there, and the boss file supplies its
attacks (one generator function each), movement and drawing.

## Weight and life

Since v0.6a every action leaves something behind, and each arena moves on its own.

- **Blows:** a hit leaves a bright cut mark, throws sparks the way the weapon was travelling, knocks
  slivers of the boss's own colour out of it, and kicks the view in that direction. The boss shivers for
  the length of the hit-freeze. Finishers add impact lines and a longer freeze. Damage numbers hop.
- **Ground:** footsteps, turns, jumps, landings and dashes raise dust; a long fall lands harder. Anything
  heavy (a boss landing, the maul's finisher, Starfall, a slam) throws dust and stones and cracks the
  floor; explosions leave smoke, drifting embers and a burnt patch that glows until it cools.
- **The arena reacts:** a hard enough blow lifts dust along the whole floor, dips the platforms and shakes
  grit off them, and startles the birds. Platforms give a little when you land on them.
- **Weather:** embers rise in the Warden's ruin, snow falls on the Magus's spires, it rains on the Veil's
  city, ash drifts through the Knight's graveyard, and it all thickens with each phase. Explosions push
  it aside. The graveyard's grass bends away from whoever walks through it. Stars twinkle; bats and
  crows cross the sky.
- **Sound:** soft footsteps, a harder landing, the Knight's footfalls, more low end on hits, and a small
  random change of pitch on sounds that repeat.

Smoke and dust are drawn behind the hero, the bosses and every warning, so they never hide the fight.
The **Screen shake** setting also scales the view kick and the boss's shiver; Off removes all three.

To use these in a new attack, call the ready-made mixes in `js/fx.js`: `G.fx.hit` (a weapon lands),
`G.fx.thud` (something heavy meets the ground), `G.fx.boom` (what an explosion leaves), `G.fx.shatter`
(something of light breaks), `G.fx.dust`, `G.fx.kick` (knock the view a few pixels in a direction).

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
| `js/meta.js` | what lasts between runs: Sunshards, the Shrine (`G.SHRINE`), trophy relics |
| `js/flow.js` | the Flow rank and each hero's Dawnbreak |
| `js/omens.js` | the omens (`G.OMENS`) and what each one does during a fight |
| `js/moments.js` | Reckoning, Riposte, Sunder, Clash, Last Light and the last push |
| `js/hub.js` | the Vigil: the camp between runs, its places, and the sparring post |
| `tools/feel-check.js` | whole fights played by a scripted hero, to measure Dawnbreak, Flow and Reckonings |
| `js/input.js` | keyboard, mouse and gamepad mapped to actions |
| `js/audio.js` | every sound and the music, synthesised in code (no audio files) |
| `js/fx.js` | particles, smoke, shards, cut marks, floor cracks and scorch marks, screen shake and kick, flashes, hit-freeze, slow motion |
| `js/draw.js` | drawing helpers shared by heroes and bosses: tapered limbs, joints, cloth |
| `js/arena.js` | palettes and skylines for each boss and phase (`G.THEMES`), platforms, weather, birds, grass |
| `js/hazards.js` | beams, waves, orbs, zones, rings, meteors, weapon swings, pools and their warnings |
| `js/player.js` | the hero: shared movement plus each hero's weapon and special; shared numbers are in `G.PLAYER` |
| `js/boss.js` | the Warden; each attack is one generator function, attack pools are in `BAGS` |
| `js/bosskit.js` | the frame the other bosses share (`G.makeBoss`), and `G.setBoss` |
| `js/mage.js`, `js/assassin.js`, `js/knight.js` | the Magus, the Veil and the Knight |
| `js/ui.js` | menus, health bars, result screens |
| `js/game.js` | main loop, game states, draw order |

Most-used tuning numbers: `BASE_HP`, `poise0` and `gaps` at the top of each boss file, `G.PLAYER` in `player.js`,
`G.DIFFS` in `util.js`. Bump `G.VERSION` in `util.js` for each build; it shows on the title screen.

## Testing without playing

Open the browser console on the running game.

- **Dodge tests:** `fetch('/tools/dodge-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs each of the Warden's attacks against a simple scripted player and reports health lost. There are
  32 tests and all lose 0 as of v0.6a. Set `window.TEST_HERO = 'aster'` (or `'lune'`) to test another hero
  and `window.TEST_SEED = 2` for a different, repeatable set of boss choices.
- **Tests for the other three bosses:** `fetch('/tools/boss-tests.js').then(r => r.text()).then(t => console.log((0, eval)(t)))`
  runs every attack of the Magus, the Veil and the Knight in every phase that uses it (134 runs) against one
  scripted player that follows plain rules: step off marked ground, jump low things, leave a swing's reach,
  dash when there is no time to walk. As of v0.6a it loses 0 health as Vesper on seed 1. Across three
  heroes and three seeds it lost between 0 and 6 in 134 runs when last measured (v0.5a), in the Veil's Cuts, the Knight's Whirl and,
  as Lune, things it should cut down but cannot aim at. `window.TEST_BOSSES = ['knight']` limits it to one boss.
  Run the matching test after changing any attack.
- `G.debug.god = true` makes the hero invulnerable. `G.debug.boxes = true` (or `?boxes` in the address)
  draws every hitbox.
- `G.debug.boss = 'knight'` makes every fight that boss (`'warden'`, `'mage'`, `'assassin'`, `'knight'`; `''` to stop).
- `G.debug.omen = 'storm'` forces omens on every fight, the first trial included (`'storm,hunted'` for two; `''` to stop).
  With `G.debug.freeze` on, a forced omen starts at once, so the boss tests run with it on top of every attack.
- Tests and god mode earn no Sunshards. `G.debug.meta = true` lets them, for checking the rewards;
  remove `solfall.meta` from the browser's storage afterwards.
- `G.player.ult = 100` fills the Dawnbreak bar.
- `G.debug.forceAttack = 'wheel'` repeats one attack (names are the keys of `G.boss.ATTACKS`;
  use one that belongs to the current phase). `G.debug.nextPhase()` skips to the next phase.
- `G.debug.sim(10, { random: true })` runs ten simulated seconds with random inputs, to shake out errors.
- `G.debug.give('keen')` adds a boon by id; it takes effect in the next fight (`G.startFight()`).

## Not yet checked

- **Sound and music have not been heard by anyone.** They are generated in code and run without errors,
  but the mix and the music are untested by ear. Volume sliders are in Settings.
- **The v0.6a effects have only been seen as still frames.** They were checked in captures of each arena,
  of hits, landings, slams, explosions, a stagger and each boss's death, and cost about 1.2 ms a frame on
  the machine they were written on. How they feel in motion, whether the hit-freeze is now too long or
  the weather too busy, and how they run on a slow machine are unknown.
- **No person has fought the Magus, the Veil or the Knight** (new in v0.5a). Their attacks were checked
  with scripted players and by looking at captured frames, not by playing. Whether they are fun, readable
  at speed and the right length is unknown.
- **Timings were tuned with scripted players.** For the Warden, an invulnerable, always-attacking player
  wins the first trial on Standard in 67 s as Vesper and 74 s as Aster; Lune takes 129 s firing from the
  ground and 97 s at point-blank range. A cruder chasing player of the same kind beats the Magus (3,900
  health) in 88 s as Vesper and 76 s as Aster, the Veil (3,000) in 76 s and 61 s, and the Knight (4,300) in
  68 s and 64 s. A real fight should be about 3 to 4 minutes.
  Boss health, hero balance, relic and boon strength and the per-trial scaling are first guesses.
- **Fastest first trial** on the title screen compares times against whichever boss came first, so it is
  only a fair record when the camp's banner is set to one boss.
- **Nothing in v0.7a has been played.** The Dawnbreaks, the Shrine, the reward screens and each omen
  were run and looked at in captures, and the numbers above were checked in the running game. Whether
  Flow climbs at a satisfying rate, how often Dawnbreak fills in a real fight (the aim was two to four
  times), and whether Sunshard prices are fair are first guesses.
- **v1.0a was checked on screen and by script, still not by hand.** Every menu and the fight display
  were looked at in screenshots of the real page; rebinding was tested with simulated key presses, not a
  keyboard; practice fights were started, lost, retried and won by script. Flow's new pace is tuned
  against a scripted hero that never gets hit, so a person's numbers will be lower.
- **The camp's look was judged from captures** taken at each place along it; it costs about 0.6 ms a
  frame on the machine it was written on. How the scrolling feels, and whether three screens is too far
  to walk each time, is unknown.
- **The camp has not been walked by a person.** Every place in it was used by a scripted hero (swapping
  hero, the Shrine, brazier, banner, post, gate) and every way in and out was followed (title, pause,
  defeat, victory). Whether it is pleasant to cross each time, and whether the places are obvious
  without being told, is unknown. On a gamepad the use button is LB, untested like the rest of the pad.
- **The v0.8a moments have not been played.** Each one was triggered in the running game and looked at
  in captures: a Reckoning held and broken against all four bosses, a Riposte from a real perfect dodge,
  a Clash against the Knight's cleave, Last Light and the last push. Whether 6.5 seconds and that much
  ward is a fair race, whether a Clash is too easy or too hard to land, and whether the moments come too
  often are guesses. The tests force single attacks, so they never see a Reckoning; the two blast rings
  on failure use the same ring the Warden's Pulse does, but were not tested with a scripted player.
- **Omens make fights harder than the tests show.** With no omen the boss tests still lose no health.
  With Stormfront or Emberfall forced on top of every single attack, the same scripted player loses 4
  to 6 health in 134 runs, mostly in the Knight's Charge and Grip and wherever it steps into a stone
  while dodging something else. In a real fight an omen strikes far less often than that. Hunted lost
  none. Frenzy lost 2 in 134 (the Magus's burning ground).
- **Gamepad support is untested** (no pad was available).
